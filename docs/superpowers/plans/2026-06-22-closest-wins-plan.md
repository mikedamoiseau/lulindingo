# Estimation Challenge ("Closest Wins") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Estimation Challenge" mode that reuses the existing larger-number exercise generator but hides the exact-answer expectation. The child estimates the answer to a hundreds/thousands-scale problem — picking the nearest of several rounded buckets *or* typing an estimate scored correct if within a tolerance band. It rewards being *close*, not exact, teaching number sense and rounding.

**Architecture:** A new pure util `src/utils/estimation.js` does all the math: given a generator-produced `correctAnswer`, it produces (a) a set of rounded bucket options with exactly one bucket "owning" the true answer and (b) a `isWithinTolerance(guess, answer)` check for typed estimates. The mode reuses `generateExercises` unchanged for the qualifying age bands/operations, then *wraps* each generated exercise with estimation metadata. It is entered as a **mode flag** (`location.state.isEstimation`, mirroring the existing `isPractice` pattern) on the normal `/lesson/:id` route — **not** a new exercise `type` and **not** a new generator branch. `LessonEngine` branches on the flag to render a new `EstimationChallenge` component instead of the three normal exercise components, and uses the estimation scorer instead of strict equality. No DB schema change; no new lesson records.

**Tech Stack:** React 19, Zustand, Dexie, Vitest. Pure logic in `src/utils/`, components stay thin.

---

## Key Design Decisions

Each decision is an opinionated, concrete call with a one-line rationale.

### D1 — Mode, not exercise type

**Decision:** Estimation is a *mode* entered via `navigate('/lesson/:id', { state: { isEstimation: true } })`, exactly like Practice mode. The generator and its `type-answer / select-answer / follow-pattern` types are untouched.
**Why:** The prompt says "the only additions are a tolerance check and bucket generation" — keeping it a mode avoids touching the validated generator and the `validate-exercises.js` invariants, and reuses every existing `correctAnswer`.

### D2 — Qualifying age bands & operations

**Decision:** Estimation is offered only for age bands `8-10` and `11-12` (operands in hundreds/thousands). Within those, it qualifies for **addition, subtraction, multiplication** (large clean-ish magnitudes) and **excludes division** in v1 (decimal/quotient answers make "round to nearest hundred" pedagogically muddy). It always pulls the **upper tiers (4 and 5)** of the chosen age band so numbers are genuinely large.
**Why:** Estimation only makes sense when exact mental arithmetic is hard; small `6-7` answers (≤20) round to trivial buckets. Division's decimals fight the "nice round bucket" idea.

### D3 — Bucket-generation algorithm (the multiple-choice variant)

**Decision:** `makeBuckets(answer)` produces **exactly 4 buckets**, all multiples of a magnitude-derived `granularity`, with **exactly one** bucket being the one the true answer rounds to.

Granularity by magnitude of `answer`:

| answer magnitude | granularity (round step) |
|---|---|
| `< 100`        | 10   |
| `100 – 999`    | 100  |
| `1,000 – 9,999`| 1,000 |
| `10,000 – 99,999` | 10,000 |
| `≥ 100,000`    | round to 1 significant figure of the magnitude (e.g. 100,000) |

Algorithm:
1. `granularity = granularityFor(answer)`.
2. `trueBucket = Math.round(answer / granularity) * granularity` — the bucket the answer belongs to. (Guaranteed to be the closest multiple, so the answer genuinely "lives" here.)
3. Generate 3 distractor buckets at `trueBucket + k*granularity` for `k` drawn from `{-2, -1, +1, +2}` (and widening to `±3` if needed), all `>= 0`, all distinct, none equal to `trueBucket`. Prefer a spread that **straddles** the true bucket (at least one below and one above) so the answer isn't always the largest/smallest — that would leak the answer.
4. Sort ascending for display, return `{ buckets: number[4], correctBucket: trueBucket, granularity }`.

**Tie / trivial guard:** If `answer` is *exactly* on a bucket boundary midpoint (e.g. 250 with granularity 100) the standard `Math.round` half-up rule still yields a single deterministic owner (300), so exactly one bucket always owns it. If the magnitude is so small that `granularity >= answer` (only possible if D2 is bypassed), fall back to `granularity = 10`.
**Why:** Four buckets is the kid-friendly sweet spot (more than select-answer's 3, still scannable). Magnitude-scaled granularity keeps buckets "about 200 / 400 / 600"-shaped at every scale. Straddling prevents the position-leak distractor bug.

### D4 — Tolerance-band formula (the typed-estimate variant)

**Decision:** `isWithinTolerance(guess, answer)` returns true when
`Math.abs(guess - answer) <= max(ABSOLUTE_FLOOR, answer * TOLERANCE_PCT)`
with **`TOLERANCE_PCT = 0.10`** (within 10% of the true answer) and **`ABSOLUTE_FLOOR = 5`** (so tiny answers still have a usable band).
**Why:** A flat percentage scales naturally across hundreds→thousands; 10% is forgiving enough to reward genuine estimation while still rejecting a wild guess. The absolute floor stops the band collapsing to near-zero for small answers.

### D5 — Bucket vs typed: one variant per exercise, alternating

**Decision:** Within an estimation lesson, exercises **alternate** between the bucket variant (`estimationMode: 'bucket'`) and the typed variant (`estimationMode: 'type'`), starting with bucket (easier to grasp). The wrapper assigns the variant by index parity; both share the same underlying generated `correctAnswer`.
**Why:** Buckets teach the concept (recognising the right ballpark); typed estimation tests it (producing a ballpark). Alternating gives both without a second screen or setting.

### D6 — Scoring & feedback that rewards "close"

**Decision:** No retry, no hearts cost differences from a normal lesson, but feedback is reframed: a correct estimate (right bucket, or typed within tolerance) shows **"Great estimate! The exact answer was N"**; a miss shows **"So close! It was about `correctBucket` (exactly N)"** — always revealing both the rounded ballpark and the exact value so kids learn the relationship. XP is awarded per correct estimate exactly like a normal correct answer (10 XP), and lesson completion still grants the bonus. Stars use the existing accuracy thresholds.
**Why:** The whole point is to reward proximity, not exactness; surfacing both the bucket and exact value turns every answer into a teaching moment. Reusing XP/stars keeps it a first-class lesson, not a toy.

### D7 — Distinct visual identity

**Decision:** The `EstimationChallenge` component uses a visually distinct treatment so kids immediately know exact answers aren't expected: a "~" / "≈ ABOUT" badge in the header, the prompt reads **"About how much?"** (not "What is..."), the equation shows `247 + 581 ≈ []` (approx sign, not `=`), and the accent color switches from `--blue` to `--orange`. The bucket variant shows 4 large pill buttons labelled `about 600` etc.; the typed variant shows the number pad with an "estimate" hint.
**Why:** Estimation requires a different *mindset*; the UI must signal "ballpark, not exact" or kids will agonise over precision. Orange + "≈" + "About how much?" is an unmistakable, low-text cue for young readers.

### D8 — Entry point

**Decision:** Add an "Estimation Challenge ⚡" entry button in the existing `LessonNode` action area (or unit header) for *completed* lessons in qualifying units/age bands, navigating with `{ state: { isEstimation: true } }`. (Exact placement is a small UI call left to the implementer; the contract is the nav state flag.)
**Why:** Reuses the existing per-lesson nav surface; gating on completed + qualifying keeps it as an enrichment activity, not a blocker.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/estimation.js` | Create | `granularityFor`, `makeBuckets`, `isWithinTolerance`, `buildEstimationExercise`, constants |
| `src/utils/__tests__/estimation.test.js` | Create | Tests for all pure estimation logic |
| `src/components/lesson/exercises/EstimationChallenge.jsx` | Create | Estimation exercise component (bucket + typed variants) |
| `src/components/lesson/exercises/EstimationChallenge.module.css` | Create | Distinct estimation styling (orange accent, ≈ badge) |
| `src/components/lesson/LessonEngine.jsx` | Modify | Read `isEstimation` flag; build estimation exercises; branch rendering + scoring |
| `src/components/lesson/FeedbackBanner.jsx` | Modify | Support "close"/estimate feedback copy (or pass through a `variant`) |
| `src/components/home/LessonNode.jsx` | Modify | Add "Estimation Challenge" entry for qualifying completed lessons |
| `src/utils/estimationMode.js` *(optional small helper)* | Create | `isEstimationEligible(operation, ageBand)` predicate, shared by LessonNode + LessonEngine |
| `scripts/validate-exercises.js` | **No change** | See "Validation" section — estimation reuses validated output |

---

## Validation — does `scripts/validate-exercises.js` apply?

**No new sweep needed in the script.** `validate-exercises.js` validates the *generator's* output, which is unchanged. Estimation only *transforms* an already-valid `correctAnswer` into buckets + a tolerance check. The correctness of that transform is fully covered by `estimation.test.js` (unit tests over a wide range of magnitudes). Do **not** wire estimation into `validate-exercises.js` — it would couple the content-invariant sweep to UI-mode logic.

**However**, add one defensive invariant *as a vitest property test* inside `estimation.test.js` (not the script): sweep `makeBuckets` over many magnitudes and assert exactly one bucket equals `correctBucket` and that `correctBucket` is the closest bucket to the answer. This is the estimation analogue of the script's "exactly one null" / "options include correctAnswer" checks.

---

## The pure module: `src/utils/estimation.js`

Target shape (implementers: TDD this — tests first, in Task 1):

```js
// src/utils/estimation.js

export const TOLERANCE_PCT = 0.10;
export const ABSOLUTE_FLOOR = 5;
export const BUCKET_COUNT = 4;

/** Rounding step for a value, scaled by its order of magnitude. */
export function granularityFor(answer) {
  const n = Math.abs(answer);
  if (n < 100) return 10;
  if (n < 1_000) return 100;
  if (n < 10_000) return 1_000;
  if (n < 100_000) return 10_000;
  return 100_000;
}

/** True if `guess` is within the tolerance band of `answer`. */
export function isWithinTolerance(guess, answer) {
  const band = Math.max(ABSOLUTE_FLOOR, Math.abs(answer) * TOLERANCE_PCT);
  return Math.abs(guess - answer) <= band;
}

/**
 * Produce BUCKET_COUNT rounded buckets around `answer`, exactly one of which
 * (`correctBucket`) is the multiple of `granularity` the answer rounds to.
 * Buckets straddle the true bucket when possible, are >= 0, distinct, sorted asc.
 * @param {number} answer
 * @param {() => number} [rng] - injectable [0,1) source for deterministic tests
 * @returns {{ buckets: number[], correctBucket: number, granularity: number }}
 */
export function makeBuckets(answer, rng = Math.random) {
  // granularity, trueBucket = round(answer/g)*g, then pick 3 distinct
  // straddling offsets from {-2,-1,1,2} (widen to ±3 if blocked by the >=0
  // floor), assemble, sort. See D3.
}

/**
 * Wrap a generator exercise into an estimation exercise.
 * Keeps `correctAnswer`; adds estimation fields; rewrites equation to use ≈.
 * @param {object} ex - exercise from generateExercises (any type)
 * @param {'bucket'|'type'} variant
 * @returns {{ estimation: true, estimationMode, equation, correctAnswer,
 *             buckets?, correctBucket?, granularity? }}
 */
export function buildEstimationExercise(ex, variant, rng = Math.random) {
  // Normalise the source equation "247 + 581 = []" → "247 + 581 ≈ []".
  // For 'bucket', attach makeBuckets(ex.correctAnswer, rng).
  // For 'type', no buckets — scoring uses isWithinTolerance.
}
```

> **Determinism note:** existing generator tests mock `Math.random` via `vi`. Mirror that — `makeBuckets`/`buildEstimationExercise` take an optional `rng` arg defaulting to `Math.random`, so tests can inject a deterministic sequence without `vi.mock`.

---

## TDD Milestones

### Task 1: Pure estimation logic

**Files:** Create `src/utils/estimation.js`, `src/utils/__tests__/estimation.test.js`

- [ ] **Step 1: Write failing tests.** Create `src/utils/__tests__/estimation.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  granularityFor,
  isWithinTolerance,
  makeBuckets,
  buildEstimationExercise,
  TOLERANCE_PCT,
  ABSOLUTE_FLOOR,
  BUCKET_COUNT,
} from '../estimation';

describe('granularityFor', () => {
  it('scales the rounding step by magnitude', () => {
    expect(granularityFor(47)).toBe(10);
    expect(granularityFor(247)).toBe(100);
    expect(granularityFor(3_400)).toBe(1_000);
    expect(granularityFor(42_000)).toBe(10_000);
    expect(granularityFor(640_000)).toBe(100_000);
  });
});

describe('isWithinTolerance', () => {
  it('accepts a guess within 10% of the answer', () => {
    expect(isWithinTolerance(900, 1000)).toBe(true);   // 10% exactly
    expect(isWithinTolerance(1050, 1000)).toBe(true);
  });
  it('rejects a guess outside 10%', () => {
    expect(isWithinTolerance(1200, 1000)).toBe(false);
    expect(isWithinTolerance(800, 1000)).toBe(false);
  });
  it('uses an absolute floor for small answers', () => {
    // 10% of 30 = 3, but floor is 5 → 34 is within band
    expect(isWithinTolerance(34, 30)).toBe(true);
    expect(isWithinTolerance(36, 30)).toBe(false);
  });
  it('exposes the tuning constants', () => {
    expect(TOLERANCE_PCT).toBe(0.10);
    expect(ABSOLUTE_FLOOR).toBe(5);
  });
});

describe('makeBuckets', () => {
  it('returns BUCKET_COUNT distinct, sorted, non-negative buckets', () => {
    const { buckets } = makeBuckets(247);
    expect(buckets).toHaveLength(BUCKET_COUNT);
    expect(new Set(buckets).size).toBe(BUCKET_COUNT);
    expect([...buckets].sort((a, b) => a - b)).toEqual(buckets);
    expect(buckets.every((b) => b >= 0)).toBe(true);
  });

  it('all buckets are multiples of the granularity', () => {
    const { buckets, granularity } = makeBuckets(3_400);
    expect(granularity).toBe(1_000);
    expect(buckets.every((b) => b % granularity === 0)).toBe(true);
  });

  it('exactly one bucket is the correctBucket and it owns the answer', () => {
    const { buckets, correctBucket, granularity } = makeBuckets(247);
    expect(buckets.filter((b) => b === correctBucket)).toHaveLength(1);
    // correctBucket is the closest multiple of granularity to the answer
    expect(correctBucket).toBe(Math.round(247 / granularity) * granularity); // 200
  });

  // Property sweep — the estimation analogue of validate-exercises invariants
  it('over many magnitudes, exactly one owning bucket, straddled when possible', () => {
    let seq = 0;
    const rng = () => ((seq = (seq * 9301 + 49297) % 233280) / 233280);
    for (const answer of [123, 580, 999, 1234, 7777, 40500, 612345]) {
      const { buckets, correctBucket } = makeBuckets(answer, rng);
      expect(buckets).toContain(correctBucket);
      expect(buckets.filter((b) => b === correctBucket)).toHaveLength(1);
      expect(new Set(buckets).size).toBe(BUCKET_COUNT);
      // straddled: when correctBucket > smallest possible, expect a bucket below
      const below = buckets.filter((b) => b < correctBucket).length;
      const above = buckets.filter((b) => b > correctBucket).length;
      if (correctBucket > 0) expect(below).toBeGreaterThanOrEqual(1);
      expect(above).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildEstimationExercise', () => {
  const source = { type: 'type-answer', equation: '247 + 581 = []', correctAnswer: 828 };

  it('preserves correctAnswer and rewrites = to ≈', () => {
    const est = buildEstimationExercise(source, 'bucket');
    expect(est.estimation).toBe(true);
    expect(est.correctAnswer).toBe(828);
    expect(est.equation).toContain('≈');
    expect(est.equation).not.toContain('=');
  });

  it('bucket variant attaches buckets containing the owning bucket', () => {
    const est = buildEstimationExercise(source, 'bucket');
    expect(est.estimationMode).toBe('bucket');
    expect(est.buckets).toContain(est.correctBucket);
    expect(est.buckets).toHaveLength(BUCKET_COUNT);
  });

  it('type variant has no buckets', () => {
    const est = buildEstimationExercise(source, 'type');
    expect(est.estimationMode).toBe('type');
    expect(est.buckets).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run src/utils/__tests__/estimation.test.js`, module not found).
- [ ] **Step 3: Implement `src/utils/estimation.js`** per the shape above and D3/D4. For `makeBuckets`: compute `trueBucket`; build a candidate offset pool `[-2,-1,1,2]` (then `[-3,3]` as overflow), shuffle with the injected `rng`, pick offsets that yield distinct `>= 0` buckets, *guaranteeing at least one negative and one positive offset survive the `>=0` floor* (if the floor eats all negatives because `trueBucket` is small, shift the window upward so the straddle invariant still holds where `correctBucket > 0`). Assemble 3 distractors + `trueBucket`, sort ascending.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat: add estimation pure logic (buckets + tolerance band)`.

### Task 2: Eligibility helper

**Files:** Create `src/utils/estimationMode.js` + test (or fold into `estimation.js`).

- [ ] **Step 1: Failing test** — `isEstimationEligible(operation, ageBand)` is `true` only for `addition|subtraction|multiplication` × `8-10|11-12`, `false` for division and for `6-7`.
- [ ] **Step 2: Implement** the predicate (D2).
- [ ] **Step 3: Run + Commit** `feat: add estimation eligibility predicate`.

### Task 3: EstimationChallenge component

**Files:** Create `src/components/lesson/exercises/EstimationChallenge.jsx` + `.module.css`.

- [ ] **Step 1: Build the component.** Props mirror the other exercise components: `{ exercise, onAnswer }`. Branch on `exercise.estimationMode`:
  - `'bucket'`: render 4 pill buttons labelled `about ${bucket}`; on CHECK, call `onAnswer({ kind: 'bucket', value: selectedBucket })`.
  - `'type'`: render the existing `NumberPad` + input (reuse `TypeTheAnswer`'s pattern); on CHECK, call `onAnswer({ kind: 'type', value: parseFloat(value) })`.
  - Header shows an `≈ ABOUT` badge and the prompt **"About how much?"**; equation rendered with `≈`.

  > **Scoring boundary:** the component reports the *raw* guess; `LessonEngine` (Task 4) decides correctness via `isWithinTolerance` / bucket equality. Keep correctness logic out of the component.

- [ ] **Step 2: CSS module** — orange accent (`--orange`), reuse spacing/radius tokens, distinct from blue exercise components. Mirror `SelectTheAnswer.module.css` / `TypeTheAnswer.module.css` structure (the existing `.container/.equation/.blank/.options/.checkButton` patterns) but recolor and add `.aboutBadge`.
- [ ] **Step 3: Commit** `feat: add EstimationChallenge component`.

### Task 4: Wire estimation mode into LessonEngine

**Files:** Modify `src/components/lesson/LessonEngine.jsx`, `src/components/lesson/FeedbackBanner.jsx`.

- [ ] **Step 1:** Read the flag: `const isEstimation = state?.isEstimation ?? false;`
- [ ] **Step 2:** When `isEstimation`, force qualifying tiers and wrap exercises:

```js
const activeExercises = useMemo(() => {
  if (!lesson) return [];
  if (isEstimation) {
    const tier = lesson.tier >= 4 ? lesson.tier : 5; // upper tiers only (D2)
    const base = generateExercises(lesson.operation, ageBand, tier, maxExercises);
    return base.map((ex, i) =>
      buildEstimationExercise(ex, i % 2 === 0 ? 'bucket' : 'type') // alternate (D5)
    );
  }
  return generateExercises(lesson.operation, ageBand, lesson.tier, maxExercises);
}, [lesson?.id, ageBand, isEstimation]);
```

- [ ] **Step 3:** Update `handleAnswer` to score estimation answers. When `currentExercise.estimation`:
  - `'bucket'`: `isCorrect = answer.value === currentExercise.correctBucket`.
  - `'type'`: `isCorrect = isWithinTolerance(answer.value, currentExercise.correctAnswer)`.
  - **No retry** for estimation (`canRetry = false`), since "close" already is the reward.
  - On wrong, hearts: estimation **does not cost hearts** (it's enrichment) — gate `loseHeart()` on `!isPractice && !isEstimation`. *(Decision: enrichment shouldn't punish; revisit if play-testing wants stakes.)*
- [ ] **Step 4:** Render branch in `exerciseComponent`: if `currentExercise.estimation`, return `<EstimationChallenge key={exerciseIndex} {...props} />`.
- [ ] **Step 5:** Feedback copy — pass a `variant`/`isEstimation` prop to `FeedbackBanner` so it shows "Great estimate! The exact answer was N" / "So close! It was about `correctBucket` (exactly N)" (D6). Keep the banner backwards-compatible for normal lessons.
- [ ] **Step 6:** Show an "Estimation Challenge" label in the header (like the existing `practiceLabel`).
- [ ] **Step 7:** Run full suite `npx vitest run` — expect PASS.
- [ ] **Step 8: Commit** `feat: wire estimation mode into LessonEngine`.

### Task 5: Entry point

**Files:** Modify `src/components/home/LessonNode.jsx`.

- [ ] **Step 1:** For a completed lesson whose `operation`/`ageBand` satisfy `isEstimationEligible`, add an "Estimation Challenge ⚡" action that does `navigate('/lesson/${lesson.id}', { state: { isEstimation: true } })`.
- [ ] **Step 2:** Commit `feat: add estimation challenge entry on completed lessons`.

### Task 6: Full verification

- [ ] `npx vitest run` — all pass.
- [ ] `npm run validate` — still passes (proves the generator path is untouched).
- [ ] `npm run lint`.
- [ ] `npx vite build` — succeeds.
- [ ] Manual smoke (Playwright or dev server): complete an `8-10` addition lesson → tap Estimation Challenge → confirm bucket question shows 4 "about N" pills and "≈"/orange treatment → pick the right ballpark → "Great estimate!" with exact value → next is a typed question → type within 10% → correct → finish, XP awarded, no hearts lost on a miss.

---

## Test Plan

**Pure logic (`estimation.test.js`)** — the bulk of coverage:
- `granularityFor` across all magnitude bands.
- `isWithinTolerance`: boundary (exactly 10%), inside, outside, small-answer floor.
- `makeBuckets`: count, distinctness, sorted, non-negative, multiples of granularity, exactly-one owning bucket, straddle invariant, **property sweep over many magnitudes** (the validate-exercises analogue).
- `buildEstimationExercise`: preserves `correctAnswer`, rewrites `=`→`≈`, bucket variant attaches a valid bucket set, type variant has none.
- `isEstimationEligible`: matrix of operations × age bands.

**Component (optional, light):** render `EstimationChallenge` for each variant; assert bucket variant shows 4 buttons and the typed variant shows a number pad; confirm `onAnswer` payload shape (`{kind,value}`).

**Integration:** `npm run validate` proves generator invariants are unaffected. Manual smoke covers the LessonEngine wiring.

---

## Risks & Edge Cases

- **Small answers make buckets trivial.** Mitigated by D2 (only `8-10`/`11-12`, upper tiers) so answers are reliably ≥ hundreds. The `granularity < answer` fallback covers any leak-through.
- **Answer-position leak.** If the true bucket were always the largest or smallest option, kids could game it. Mitigated by the straddle requirement in D3 (≥1 bucket below and ≥1 above the true bucket where possible).
- **Boundary answers** (e.g. 250 with granularity 100): `Math.round` is deterministic (half-up → 300), so exactly one bucket owns it; the property test asserts this.
- **`correctBucket` near zero** can't straddle below. The straddle invariant is asserted only when `correctBucket > 0`; the implementation shifts the window up rather than producing negative buckets.
- **Multiplication magnitudes can be huge** (`11-12` up to 1,000×1,000 = 1,000,000). Granularity caps at 100,000 so there are at most a handful of plausible buckets; verify the sweep includes a 6-figure case (it does: 612345).
- **Typed estimate exactly equal to the answer** is trivially within tolerance — that's fine (exact is a subset of "close").

## Out of Scope (v1)

- Division estimation (decimal quotients) — deferred (D2).
- `6-7` age band estimation — numbers too small to be meaningful.
- A dedicated estimation route, persistent estimation stats, or a separate XP/streak track — it rides the normal lesson lifecycle.
- Difficulty adaptation within an estimation session.
- Changing `validate-exercises.js` — explicitly not wired in (see Validation).
