# Fact Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Today progress is tracked only per *lesson*; `recordAnswer` is fact-blind, so the app can never know a child reliably fails `7 × 8`. Add a per-fact mastery store (Dexie `facts` table) keyed by a normalized fact signature, populated by threading fact metadata through `recordAnswer`. Layer a kid-friendly Leitner spaced-review schedule on top, then bias exercise generation toward *due weak facts*. Surface this to the child as (1) a gentle **"Review"** lesson on the home path when facts are due, and (2) a **"Practice for you"** button that builds a live set targeting weak spots — both using the existing no-hearts / no-XP practice mode.

**Architecture:** Two new pure utils (`factTracking.js` for the signature scheme + strength model, `leitner.js` for the spaced-review schedule) carry all the logic and are unit-tested in isolation. A new Dexie `facts` table (db.version(2)) persists state. `recordAnswer` is extended to accept the exercise and record fact outcomes. A `generateWeakFactExercises` wrapper around the untouched `generateExercises` biases a generated set toward due/weak facts. Two thin React surfaces (`ReviewCallout` on the path, a `practice` lesson route variant) consume it.

**Tech Stack:** React 19, Zustand, Dexie/IndexedDB, Vitest. No backend.

---

## Overview & user goal

A child practising multiplication may breeze through `2 × 3` and consistently miss `7 × 8`. The lesson-level model rewards them with stars and moves on; the weak fact is never revisited deliberately. Fact Vault closes that loop:

- Every answered exercise updates a per-fact record (seen / correct / lastSeen / strength).
- A Leitner schedule decides *when* a missed fact comes back: missed → tomorrow, then growing intervals (1d → 2d → 4d → 7d → 14d), with a wrong answer dropping the fact back down a box.
- When facts are **due** the home path shows a soft, optional **"Review"** lesson (no pressure, no lock).
- A always-available **"Practice for you"** button assembles a live set weighted toward the weakest due facts.

Both child surfaces reuse the established **practice mode** (`location.state.isPractice`): no hearts lost, no XP, identical to the existing "practice a completed lesson to earn a heart" flow — except these target facts, not a single lesson.

---

## KEY DESIGN DECISIONS

Concrete, opinionated calls. Each is **decision + one-line why**.

### 1. Fact signature scheme — normalized operands, commutative ops sorted
- **Decision:** Signature = `"{a}{op}{b}"` with `op ∈ {+, -, x, /}` and, for the *commutative* ops (`+`, `x`), operands sorted ascending so `7x8` and `8x7` collapse to one fact (`7x8`). Subtraction/division keep operand order (not commutative). Parsed from the exercise's `equation` string (`"7 × 8 = []"`), normalizing the unicode `×`→`x` and `÷`→`/`. Stored as the Dexie primary key `sig`.
- **Why:** The equation string is the only fact identity the generator already emits; collapsing commutative pairs means a child who masters `8×7` isn't re-drilled on `7×8`, matching how kids actually learn tables.

### 2. What counts as a "fact" — first two operands of a single-step equation only
- **Decision:** Only `type-answer` and `select-answer` exercises produce facts (single equation `a op b = []`). `follow-pattern` exercises are **skipped** (no fact recorded) — they teach sequence reasoning, not a discrete fact, and their last-step equation is incidental.
- **Why:** Keeps signatures clean and avoids polluting the vault with pattern artefacts; the generator already cycles types `[type, select, follow]`, so ~2/3 of exercises still feed the vault.

### 3. Strength model — integer Leitner box 0–5, not a float score
- **Decision:** Each fact stores an integer `box` (0 = brand-new/struggling, 5 = mastered) plus raw `seen`/`correct` counters and `lastSeen`/`dueAt` ISO-date strings. Correct answer: `box = min(box + 1, 5)`. Wrong answer: `box = max(box - 2, 0)` (miss costs more than a hit earns — kid-appropriate: one slip shouldn't undo, but a real gap should resurface fast). "Weak" = `box <= 2`. "Due" = `dueAt <= today`.
- **Why:** Integer boxes map directly to a fixed interval table (decision 4), are trivial to test deterministically, and "miss drops 2" makes genuinely shaky facts re-appear without a single fluke demoting a solid one to zero.

### 4. Leitner buckets / intervals — fixed kid-friendly ladder in *days*
- **Decision:** `BOX_INTERVALS_DAYS = [1, 1, 2, 4, 7, 14]` indexed by box. A miss always sets `dueAt = today + 1` (tomorrow), regardless of prior box, *after* the box drop — "I got it wrong, show me again tomorrow." A hit sets `dueAt = today + BOX_INTERVALS_DAYS[newBox]`. All date math at **local-day granularity** reusing `getLocalDateString` from `streakTracker.js` (consistent with streaks; no time-of-day surprises).
- **Why:** A short, comprehensible ladder (tomorrow → couple days → a week → two weeks) is enough spacing for the 6–12 age range; capping at 14 days avoids facts vanishing for a month and the child forgetting them entirely.

### 5. How facts thread through the lesson loop — extend `recordAnswer(correct, exercise)`
- **Decision:** `recordAnswer` gains an optional second arg, the `exercise` object. When present and the exercise yields a signature (decision 2), the store calls `updateFactOutcome(sig, correct)` which reads-modifies-writes the `facts` row (Dexie `db.facts`). The transient lesson counters (`lessonCorrect`/`lessonTotal`) behave exactly as today. Fact recording happens in **both** normal *and* practice mode (a child reviewing weak facts must update those facts), but is gated by a `trackFacts` flag defaulting `true` — placement-test answers pass `trackFacts: false` to stay diagnostic-only.
- **Why:** `recordAnswer` is the single chokepoint every answer already flows through in `LessonEngine.handleAnswer`; the optional arg is backward-compatible (existing callers/tests that pass only `correct` still pass), avoiding a parallel code path.

### 6. Weak-fact generator wrapper — over-generate then bias by replacement, never break invariants
- **Decision:** New pure `selectWeakFactTargets(facts, { operation, ageBand, max })` returns up to `max` due/weak fact signatures (ordered: due-and-weak first, lowest box, then oldest `lastSeen`). A new `generateWeakFactExercises({ facts, operation, ageBand, tier, count })` calls the **unchanged** `generateExercises` to produce a `count`-length set, then for each weak-fact target attempts to *steer* one slot: it generates extra candidate exercises (small over-sample, e.g. `count * 4`) and swaps in the first candidate whose parsed signature matches a target, until targets or candidates are exhausted. Slots with no matching candidate keep their original generated exercise. The output is always a valid `count`-length array of standard exercise objects.
- **Why:** `generateExercises` is locked behind `npm run validate` invariants — wrapping (not rewriting) it means the generator stays untouched and provably correct, while best-effort steering biases toward weak facts without ever guaranteeing-and-failing to hit an arbitrary fact (some signatures may be unreachable for a given tier/age window). "Practice for you" is diagnostic-flavoured, so approximate targeting is acceptable.

### 7. Review surface — soft callout, dedicated practice route, no path lock
- **Decision:** A `<ReviewCallout>` card renders at the top of `LearningPath` **only when** `getDueFactCount(facts) > 0`, showing e.g. "🔁 5 facts to review". Tapping it navigates to `/lesson/review` (a reserved id) with `state: { isPractice: true, factReview: true }`. "Practice for you" is the same destination triggered from a second button. `LessonEngine` special-cases `id === 'review'`: instead of a seeded lesson it builds its set via `generateWeakFactExercises` across the child's *active* operations. It never blocks or replaces normal lesson progression.
- **Why:** Kids respond to invitations, not chores; making review optional and additive (never gating the path) keeps the core Duolingo-style progression intact while giving motivated kids a targeted loop.

### 8. Operation scope for review — only operations the child has started
- **Decision:** Review/practice pulls weak facts only for operations whose unit is the current-or-completed unit (derived from existing progress + `getUnitStates`), and uses the child's `ageBand` with `tier` = the child's current tier in that operation (fallback `startingTier`, then 1).
- **Why:** Avoids surfacing `division` facts to a 6-year-old who's only done addition; keeps difficulty aligned with where the child actually is.

---

## Dexie schema change

`src/db/database.js` — bump to `version(2)`, add the `facts` table. **Additive only**; existing tables and data are preserved (Dexie carries forward unchanged stores across versions; no data migration callback needed since we only *add* a store).

```js
import Dexie from 'dexie';

export const db = new Dexie('LuLinDingo');

db.version(1).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
});

// v2: per-fact mastery vault (Fact Vault feature)
db.version(2).stores({
  facts: 'sig, operation, box, dueAt',
});
```

**`facts` row shape** (written by `useFactStore`/`recordAnswer`, not seeded):

| Field | Type | Notes |
|---|---|---|
| `sig` | string (PK) | Normalized signature, e.g. `"7x8"`, `"12-5"`, `"20/4"` |
| `operation` | string | `addition` \| `subtraction` \| `multiplication` \| `division` (indexed, for per-op queries) |
| `a`, `b` | number | Parsed operands (denormalized for debugging / future surfaces) |
| `seen` | number | Total times this fact was answered |
| `correct` | number | Total correct answers |
| `box` | integer 0–5 | Leitner box (indexed) |
| `lastSeen` | string | Local date string `YYYY-MM-DD` |
| `dueAt` | string | Local date string `YYYY-MM-DD`; due when `<= today` (indexed) |

The vault is **never seeded** — rows are created lazily on first encounter of a fact, mirroring the "exercises are generated, not stored" philosophy.

---

## Pure logic in `src/utils/`

All game rules live here, unit-tested in isolation (per CLAUDE.md convention). Components stay thin.

### `src/utils/factTracking.js`
- `parseFactSignature(equation)` → `{ sig, operation, a, b } | null`. Parses `"7 × 8 = []"` style strings, normalizes `× → x`, `÷ → /`, sorts operands for commutative ops, returns `null` for unparseable / multi-step input.
- `signatureForExercise(exercise)` → `{ sig, operation, a, b } | null`. Returns `null` for `follow-pattern` (decision 2); otherwise delegates to `parseFactSignature(exercise.equation)`.
- `applyOutcome(fact, correct, today)` → new fact object (pure; `fact` may be `undefined` for a first encounter — produces a fresh row at `box` 1 if correct / `box` 0 if wrong). Updates `seen`, `correct`, `box`, `lastSeen`, `dueAt` using `leitner.js`.
- `isWeak(fact)` → `box <= 2`. `isDue(fact, today)` → `fact.dueAt <= today`.
- `selectWeakFactTargets(facts, { operation, max })` → ordered array of signatures (due-and-weak first, then by ascending box, then oldest `lastSeen`).

### `src/utils/leitner.js`
- `export const BOX_INTERVALS_DAYS = [1, 1, 2, 4, 7, 14];`
- `export const MAX_BOX = 5;`
- `nextBox(box, correct)` → `correct ? min(box+1, MAX_BOX) : max(box-2, 0)`.
- `nextDueDate(box, correct, today)` → local date string. Wrong → `today + 1`. Correct → `today + BOX_INTERVALS_DAYS[box]`. Uses an injectable `addDays(dateStr, n)` helper built on `getLocalDateString` for testability.

### `src/utils/factGenerator.js` (the wrapper — decision 6)
- `generateWeakFactExercises({ facts, operation, ageBand, tier, count, oversample = 4 })` → `Exercise[]` of length `count`. Imports and calls the **unchanged** `generateExercises`. Pure except for `Math.random` inside `generateExercises` (tests mock with `vi`, same pattern as the generator's own tests).

> Note: `factGenerator.js` does **not** change `exerciseGenerator.js`, so `npm run validate` invariants are untouched. The wrapper only *selects among* outputs the generator already guarantees valid.

---

## UI components (CSS-modules-per-component convention)

### `src/components/home/ReviewCallout.jsx` + `ReviewCallout.module.css`
Soft card shown at top of `LearningPath` when due facts exist. Props: `{ dueCount }`. Renders "🔁 Review — {dueCount} facts" and a "Practice for you" secondary action. Both navigate to `/lesson/review` with `state: { isPractice: true, factReview: true }`. Hidden entirely when `dueCount === 0`. Uses existing global tokens from `src/index.css` (`--blue`, `--space-*`, `--radius-md`).

### `src/stores/useFactStore.js` (or fold into `useGameStore`)
- **Decision:** Fold fact actions into the existing `useGameStore` to keep one store (CLAUDE.md describes it as "the single global store"). Add: `recordAnswer(correct, exercise, opts)` extension and a `loadDueFacts()` / live read via `useLiveQuery(() => db.facts.toArray())` in components.

### `LessonEngine.jsx` changes
- Read `factReview = state?.factReview`. When `id === 'review'`: skip the `db.lessons.get` dependency, instead build `activeExercises` via `generateWeakFactExercises` using `useLiveQuery(() => db.facts.toArray())` + the child's active operation/tier (decision 8). Render with the existing practice-mode chrome (label "Review"). Pass the `exercise` into `recordAnswer(isCorrect, currentExercise)` for **all** lessons (normal + review), so the vault updates everywhere.

### `LearningPath.jsx` changes
- Add `const facts = useLiveQuery(() => db.facts.toArray(), [])` and render `<ReviewCallout dueCount={getDueFactCount(facts ?? [])} />` above the units block.

---

## Step-by-step TDD milestones

Each milestone: **write failing tests → run (confirm fail) → implement → run (confirm pass) → commit.** Per user workflow memory: one branch for the feature, TDD, PR for review.

### Task 1: Leitner schedule (`leitner.js`)
**Files:** Create `src/utils/leitner.js`, `src/utils/__tests__/leitner.test.js`

- [ ] **Step 1: Write failing tests.** Cover: `BOX_INTERVALS_DAYS` length 6; `nextBox` increments to cap 5, decrements by 2 to floor 0; `nextDueDate` wrong → today+1 regardless of box; correct at box 0 → +1 day, box 3 → +4 days, box 5 → +14 days; `addDays` crosses month boundaries correctly (`2026-01-31` +1 → `2026-02-01`).
- [ ] **Step 2:** Run `npx vitest run src/utils/__tests__/leitner.test.js` — expect FAIL (module not found).
- [ ] **Step 3:** Implement `leitner.js`.
- [ ] **Step 4:** Run tests — expect PASS.
- [ ] **Step 5:** Commit `feat: add Leitner spaced-review schedule`.

### Task 2: Fact tracking (`factTracking.js`)
**Files:** Create `src/utils/factTracking.js`, `src/utils/__tests__/factTracking.test.js`

- [ ] **Step 1: Write failing tests.** Cover:
  - `parseFactSignature("7 × 8 = []")` → `{ sig:'7x8', operation:'multiplication', a:7, b:8 }`.
  - Commutative sort: `parseFactSignature("8 × 7 = []").sig === '7x8'`; `parseFactSignature("3 + 9 = []").sig === '3+9'` and `"9 + 3"` also `'3+9'`.
  - Non-commutative preserved: `"12 - 5 = []"` → `'12-5'`; `"20 ÷ 4 = []"` → `'20/4'`.
  - Garbage / multi-operand → `null`.
  - `signatureForExercise` returns `null` for `{ type:'follow-pattern', ... }`; returns sig for `type-answer`/`select-answer`.
  - `applyOutcome(undefined, true, '2026-06-22')` → fresh fact `box:1`, `seen:1`, `correct:1`, `dueAt:'2026-06-23'`.
  - `applyOutcome({box:3,seen:4,correct:3,...}, false, today)` → `box:1`, `dueAt: today+1`, `seen:5`, `correct:3`.
  - `isWeak`/`isDue` boundaries (box 2 weak, box 3 not; `dueAt === today` is due).
  - `selectWeakFactTargets` ordering: due-weak before not-due, lower box first, oldest `lastSeen` tiebreak; respects `max`; filters by `operation`.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement `factTracking.js` (depends on `leitner.js`).
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit `feat: add fact signature parsing + Leitner strength model`.

### Task 3: Weak-fact generator wrapper (`factGenerator.js`)
**Files:** Create `src/utils/factGenerator.js`, `src/utils/__tests__/factGenerator.test.js`

- [ ] **Step 1: Write failing tests.** Mock `Math.random` deterministically (per generator test convention). Cover:
  - Always returns exactly `count` exercises, each a valid exercise object (has `type`, `equation`, `correctAnswer`).
  - With no weak facts → behaves like a plain `generateExercises` call (length + shape).
  - With a reachable weak target (e.g. a low-box multiplication fact whose operands fall in the tier window) → at least one output exercise's parsed signature matches a target (when achievable in the over-sample).
  - Unreachable target (signature impossible for the tier/age window) → still returns `count` valid exercises, no throw.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement `factGenerator.js`.
- [ ] **Step 4:** Run — expect PASS. Also run `npm run validate` to confirm generator invariants are **unchanged** (we only wrapped it).
- [ ] **Step 5:** Commit `feat: add weak-fact-biased exercise generator wrapper`.

### Task 4: Dexie schema + store threading
**Files:** Modify `src/db/database.js`, `src/stores/useGameStore.js`, `src/stores/__tests__/useGameStore.test.js`

- [ ] **Step 1: Write failing tests** in the store test (uses `fake-indexeddb`):
  - `recordAnswer(true)` with no exercise → counters update, no fact row created (backward compat).
  - `recordAnswer(true, { type:'type-answer', equation:'7 × 8 = []', correctAnswer:56 })` → `db.facts.get('7x8')` exists with `box:1`, `seen:1`.
  - Second call with `correct:false` for same fact → `box` drops, `dueAt` = tomorrow, `seen:2`.
  - `recordAnswer(true, followPatternExercise)` → no fact row (skipped).
  - `recordAnswer(true, exercise, { trackFacts:false })` → no fact row (placement diagnostic).
  - A `getDueFactCount(facts)` selector helper test (counts rows with `dueAt <= today`).
- [ ] **Step 2:** Run `npx vitest run src/stores/__tests__/useGameStore.test.js` — expect FAIL.
- [ ] **Step 3:** Implement: bump `db.version(2)` with `facts` store; extend `recordAnswer` signature to `(correct, exercise, opts = {})`; on a non-null signature and `opts.trackFacts !== false`, read `db.facts.get(sig)`, `applyOutcome`, `db.facts.put`. Note: `recordAnswer` becomes `async` for the DB write — confirm callers `await` or fire-and-forget appropriately (the Zustand action can do the DB write without blocking the synchronous counter `set`).
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit `feat: persist per-fact mastery via recordAnswer (Dexie v2 facts table)`.

### Task 5: Thread exercise into `recordAnswer` from `LessonEngine`
**Files:** Modify `src/components/lesson/LessonEngine.jsx`

- [ ] **Step 1:** Update `handleAnswer` to call `recordAnswer(true, currentExercise)` / `recordAnswer(false, currentExercise)` (both correct and wrong branches, after retry resolution). Existing behaviour otherwise unchanged.
- [ ] **Step 2:** Run full suite `npx vitest run` — expect PASS (no regressions).
- [ ] **Step 3:** Commit `feat: thread current exercise into recordAnswer`.

### Task 6: Review route in `LessonEngine`
**Files:** Modify `src/components/lesson/LessonEngine.jsx`, add `App.jsx` route note

- [ ] **Step 1:** Special-case `id === 'review'`: read `db.facts` via `useLiveQuery`, derive active operation + tier (decision 8), build `activeExercises` with `generateWeakFactExercises`. Force `isPractice = true` for this route. Render label "Review" instead of "Practice Mode". Ensure no `loseHeart`/`addXp` paths fire (already gated by `isPractice`). Completion of a review set should NOT call `completeLesson` (there is no lesson row) — guard the `completeLesson(id, ...)` call when `id === 'review'`.
- [ ] **Step 2:** Confirm route `/lesson/:id` already matches `review` (it does — `:id` is a wildcard). Verify `lesson` (`useLiveQuery(db.lessons.get('review'))`) returning `undefined` is handled by the review branch *before* the `if (!lesson) return loading` guard.
- [ ] **Step 3:** Run `npx vitest run` + manual smoke (below).
- [ ] **Step 4:** Commit `feat: add fact-review lesson route`.

### Task 7: Path surfaces — `ReviewCallout` + "Practice for you"
**Files:** Create `src/components/home/ReviewCallout.jsx` + `.module.css`; modify `src/components/home/LearningPath.jsx`

- [ ] **Step 1:** Build `ReviewCallout` (hidden when `dueCount === 0`; "Review" + "Practice for you" actions → navigate to `/lesson/review`).
- [ ] **Step 2:** Wire into `LearningPath` with a `useLiveQuery(db.facts.toArray())` + `getDueFactCount`.
- [ ] **Step 3:** Run `npx vitest run`, `npm run lint`.
- [ ] **Step 4:** Commit `feat: add Review callout and Practice-for-you entry on home path`.

### Task 8: Full verification
- [ ] Run `npx vitest run` (all pass).
- [ ] Run `npm run validate` (generator invariants intact — should be untouched).
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Manual / Playwright smoke (below).

---

## Test plan

- **Unit (vitest):** `leitner.test.js`, `factTracking.test.js`, `factGenerator.test.js`, plus new cases in `useGameStore.test.js`. Use `fake-indexeddb` (already in `src/test-setup.js`) for store/DB tests; mock `Math.random` with `vi` for generator-dependent tests (matches existing convention).
- **Determinism:** `factTracking` date math takes an injected `today` (string) so tests never depend on the real clock; `leitner.addDays` is pure.
- **`npm run validate`:** The exercise *generator itself is not modified*, so invariants should hold unchanged. **Run it anyway** after Task 3 to prove the wrapper didn't accidentally import-time mutate generator constants. If any generator constant ever moves into the wrapper, the validate answer-cap constants must stay in sync (per CLAUDE.md).
- **Backward compatibility:** Existing `recordAnswer(correct)` call sites and tests must still pass — the second/third args are optional.
- **Manual smoke (3 paths):**
  1. New child → do a multiplication lesson, intentionally miss `7 × 8` → confirm `db.facts` has `7x8` at low box, `dueAt` tomorrow (inspect via devtools IndexedDB).
  2. Set a fact's `dueAt` to today/past → reload home → `ReviewCallout` shows count > 0 → tap Review → answer set → no hearts lost, no XP, facts update.
  3. "Practice for you" with weak multiplication facts → confirm the set skews toward those operands; no path progression changes.

---

## Risks / edge cases / out-of-scope

**Risks & edge cases**
- **Signature parse drift:** generator equation format (`"7 × 8 = []"`, unicode `×`/`÷`) is the contract `parseFactSignature` depends on. If the generator's equation string format ever changes, signatures break silently. *Mitigation:* tests assert exact parse of each operation's real equation strings; `signatureForExercise` returns `null` (no crash) on mismatch.
- **Unreachable targets:** a weak fact's operands may not fall in the current tier/age window, so the wrapper can't surface it. *Accepted:* best-effort steering (decision 6); never throws, always returns `count`.
- **Commutative collapse vs. division/subtraction:** must NOT sort operands for `-` and `/`. Covered explicitly in tests.
- **`recordAnswer` becoming async:** the synchronous Zustand counter `set` must not regress (UI reads counters immediately). Keep counter update synchronous; do the DB write without awaiting in the render path.
- **Review route has no lesson row:** guard every `db.lessons`-dependent and `completeLesson` path when `id === 'review'`.
- **Empty vault:** brand-new child has no facts → `ReviewCallout` hidden, "Practice for you" falls back to a normal generated set for the current operation (no crash).
- **Migration:** adding a store in `db.version(2)` is additive; existing users' data is preserved. No destructive migration.
- **Decimal-result division facts** (`"123 ÷ 4 = []"` → non-integer): signature still parses on operands (`123/4`); fine.

**Out of scope (v1)**
- Per-operation independent placement (the linear difficulty assumption stays).
- Parent/teacher dashboards or fact analytics surfaces.
- Cross-device sync (no backend — by design).
- Tuning interval constants from real usage data; the ladder is fixed for v1.
- Recording facts for `follow-pattern` exercises.
