# Story Problem Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth exercise type — **Story Problem** — that wraps the numbers the generator already produces in a short, age-banded narrative ("Dingo found 7 acorns, then 5 more. How many now?"). The kid types the answer; the math is identical to the existing arithmetic, so answers stay verifiable with no new arithmetic. Separately, add a genuinely-new **remainder division** mode for Explorer/Challenger ("17 ÷ 5 = 3 r 2") — the one real curriculum concept the current decimal-only division skips.

**Architecture:** A new pure util `src/utils/storyTemplates.js` owns a theme bank (per operation) and a `wrapStory(operation, a, b, correctAnswer, ageBand)` function that returns `{ prompt, instruction }`. `exerciseGenerator.js` gains (1) a new `'story-problem'` type appended to the type cycle, built by a thin builder that reuses the existing per-operation number generators and calls `wrapStory`, and (2) a remainder branch in the division builders gated by a new `variant` argument. A new `StoryProblem.jsx` exercise component renders the narrative + number pad (it is a typed-answer variant). `LessonEngine`'s type switch and answer-equality check are extended for the remainder answer shape. `scripts/validate-exercises.js` is taught the new type and the `"q r r"` remainder string.

**Tech Stack:** React 19, Zustand, Dexie, Vitest, framer-motion

---

## Key design decisions

- **Story problems are a typed-answer variant, not a new answer mechanic.** The `story-problem` exercise still has a numeric `correctAnswer` and is answered through the number pad. *Why:* reuses `LessonEngine`'s `answer === correctAnswer` check, the retry-before-heart-loss rule that already applies to `type-answer`, and avoids new input UI.

- **Exercise object shape extends, never replaces.** A story-problem object is `{ type: 'story-problem', equation, prompt, instruction, correctAnswer }`. `equation` is kept (the bare `"7 + 5 = []"`) so existing tooling — the validator's `parseEquation`, the FeedbackBanner's "correct answer was …" display — keeps working unchanged; `prompt` holds the narrative sentence shown to the kid. *Why:* every consumer that reads `equation`/`correctAnswer` today keeps working; only the component reads the new `prompt`.

- **Template data structure: arrays of functions per operation, selected by age band.** `storyTemplates.js` exports `THEME_BANK[operation] = { '6-7': [...templates], '8-10': [...], '11-12': [...] }` where each template is `(a, b, answer) => string`. Substitution is positional — the template decides how `a`, `b`, and (optionally) `answer` map into the sentence and handles its own pluralisation via a `plural(n, singular, plural)` helper exported from the same file. *Why:* functions (not string-with-placeholders) let each template own plural/number-agreement logic locally, which is the main correctness risk; banding by age controls reading length (single clause for 6-7, multi-clause for 11-12).

- **Theme bank per operation maps to the operation's real-world meaning.** addition = "found / then more" (combining), subtraction = "had / gave away / ate" (take-away), multiplication = "N bags of M each" (groups), division = "share D items among d friends" (sharing). Remainder division gets its own sub-bank ("D cookies shared among d kids — how many left over?"). *Why:* the narrative must match the operation so the math is intuitive and the answer is unambiguous.

- **Type cycle becomes length-4; story-problem is appended.** `EXERCISE_TYPES = ['type-answer', 'select-answer', 'follow-pattern', 'story-problem']` and the `i % 4` cycle keeps deterministic ordering. `getMaxExercises` returns 6/8/10, so every lesson of ≥4 exercises shows at least one story problem. *Why:* appending (not inserting) keeps the existing first-three-exercises ordering stable, so existing generator tests that assert positions 0–2 don't break.

- **Story problems are skipped for the 6-7 band's multiplication/division? No — story mode is available for all operations and bands.** The 6-7 band already never reaches mul/div units (skipUnits), so 6-7 templates only need add/sub themes; mul/div theme banks need only 8-10 and 11-12 entries. *Why:* avoids writing reading-heavy mul/div narratives for the youngest readers who never see those units.

- **Remainder division is a `variant`, not a new operation.** `buildDivisionExercise(exType, ageBand, tier, variant)` takes `variant ∈ {'decimal','exact','remainder'}`. The remainder variant returns a **string** `correctAnswer` of the form `"3 r 2"` plus structured `quotient`/`remainder` fields. *Why:* it is still the `division` operation/unit; gating by an argument avoids touching the unit/lesson schema. A string answer is the natural representation a kid types ("3 r 2") and keeps the answer self-describing.

- **Remainder answer comparison is normalised, not raw `===`.** `LessonEngine` and the StoryProblem/TypeTheAnswer input compare via a small `matchesAnswer(exercise, raw)` helper: for remainder exercises it parses `"3 r 2"`, `"3r2"`, `"3 R 2"` etc. into `{q, r}` and compares to `exercise.quotient`/`exercise.remainder`; otherwise it does the existing numeric equality. *Why:* kids type spacing/casing inconsistently; a strict string compare would reject correct answers. Keeping the helper pure makes it unit-testable.

- **Remainder of 0 is never generated as a remainder exercise.** When the remainder variant happens to produce `r === 0`, regenerate (bounded retries) so the exercise actually teaches remainders; a true `r 0` would be indistinguishable from exact division and confusing. *Why:* a remainder mode whose answer is "… r 0" defeats its own purpose. (Exact-division content is still covered by the existing `exact` variant for Explorers.)

- **Validator gains a `story-problem` branch and a remainder answer parser.** For story problems it asserts `prompt` is a non-empty string, the embedded `equation` still parses and matches arithmetic, and (for remainder) `correctAnswer` matches `"<int> r <int>"` with `quotient*divisor + remainder === dividend` and `0 < remainder < divisor`. *Why:* the generator's correctness guarantees must extend to the new shapes; `npm run validate` is the safety net per CLAUDE.md.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/storyTemplates.js` | Create | Theme bank + `wrapStory()` + `plural()` helper |
| `src/utils/__tests__/storyTemplates.test.js` | Create | Tests for templates, banding, pluralisation, substitution |
| `src/utils/answerMatch.js` | Create | `matchesAnswer(exercise, raw)` + `parseRemainder(str)` (pure) |
| `src/utils/__tests__/answerMatch.test.js` | Create | Tests for numeric + remainder answer matching |
| `src/utils/exerciseGenerator.js` | Modify | Add `story-problem` type + builder; add remainder `variant` to division builders |
| `src/utils/__tests__/exerciseGenerator.test.js` | Modify | Tests for story-problem shape + remainder generation |
| `src/components/lesson/exercises/StoryProblem.jsx` | Create | Narrative + number pad, supports remainder input |
| `src/components/lesson/exercises/StoryProblem.module.css` | Create | Styling |
| `src/components/lesson/LessonEngine.jsx` | Modify | Add `story-problem` case to type switch; use `matchesAnswer` |
| `scripts/validate-exercises.js` | Modify | Add `story-problem` to VALID_TYPES; validate prompt + remainder answers |

---

### Task 1: Story Templates Util

**Files:**
- Create: `src/utils/storyTemplates.js`
- Create: `src/utils/__tests__/storyTemplates.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/storyTemplates.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { wrapStory, plural, THEME_BANK } from '../storyTemplates';

describe('plural', () => {
  it('uses singular for 1', () => {
    expect(plural(1, 'acorn', 'acorns')).toBe('acorn');
  });
  it('uses plural for 0 and >1', () => {
    expect(plural(0, 'acorn', 'acorns')).toBe('acorns');
    expect(plural(5, 'acorn', 'acorns')).toBe('acorns');
  });
  it('auto-pluralises by appending s when no plural given', () => {
    expect(plural(3, 'acorn')).toBe('acorns');
    expect(plural(1, 'acorn')).toBe('acorn');
  });
});

describe('THEME_BANK', () => {
  it('has entries for all four operations', () => {
    for (const op of ['addition', 'subtraction', 'multiplication', 'division']) {
      expect(THEME_BANK[op]).toBeDefined();
    }
  });

  it('addition and subtraction have 6-7 templates; mul/div do not require them', () => {
    expect(THEME_BANK.addition['6-7'].length).toBeGreaterThan(0);
    expect(THEME_BANK.subtraction['6-7'].length).toBeGreaterThan(0);
    expect(THEME_BANK.multiplication['8-10'].length).toBeGreaterThan(0);
    expect(THEME_BANK.division['11-12'].length).toBeGreaterThan(0);
  });
});

describe('wrapStory', () => {
  it('returns a non-empty prompt string containing both operands', () => {
    const { prompt } = wrapStory('addition', 7, 5, 12, '6-7');
    expect(typeof prompt).toBe('string');
    expect(prompt).toMatch(/7/);
    expect(prompt).toMatch(/5/);
  });

  it('6-7 prompts are short (single sentence, <= 90 chars)', () => {
    for (let i = 0; i < 20; i++) {
      const { prompt } = wrapStory('addition', 3, 4, 7, '6-7');
      expect(prompt.length).toBeLessThanOrEqual(90);
    }
  });

  it('11-12 prompts are longer / multi-clause than 6-7', () => {
    const short = wrapStory('multiplication', 6, 4, 24, '8-10').prompt;
    const long = wrapStory('multiplication', 6, 4, 24, '11-12').prompt;
    expect(long.length).toBeGreaterThan(short.length);
  });

  it('falls back to a nearby band when the requested band has no templates', () => {
    // 6-7 has no multiplication templates; should still return a usable prompt
    const { prompt } = wrapStory('multiplication', 2, 3, 6, '6-7');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('agrees number/noun: "1 acorn" not "1 acorns"', () => {
    // Force the deterministic single-template path via THEME_BANK directly.
    const tmpl = THEME_BANK.addition['6-7'][0];
    const sentence = tmpl(1, 1, 2);
    expect(sentence).not.toMatch(/\b1 \w+s\b/); // no "1 <plural>"
  });
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npx vitest run src/utils/__tests__/storyTemplates.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `storyTemplates.js`**

Create `src/utils/storyTemplates.js`:

```js
/**
 * storyTemplates.js
 *
 * Pure templating layer for Story Problem Mode. Wraps the numbers the
 * exercise generator already produced in an age-banded narrative. No new
 * arithmetic happens here — `answer` is passed in and never recomputed.
 *
 * wrapStory(operation, a, b, answer, ageBand) → { prompt, instruction }
 */

/** Pick a noun form by count. Defaults plural to singular + 's'. */
export function plural(n, singular, pluralForm) {
  const p = pluralForm ?? `${singular}s`;
  return n === 1 ? singular : p;
}

// Each template: (a, b, answer) => string. Templates own their own
// pluralisation so "1 acorn" / "2 acorns" agree. Keep 6-7 to ONE clause.
export const THEME_BANK = {
  addition: {
    '6-7': [
      (a, b) => `Dingo found ${a} ${plural(a, 'acorn')}, then ${b} more. How many now?`,
      (a, b) => `You have ${a} ${plural(a, 'sticker')} and get ${b} more. How many in all?`,
    ],
    '8-10': [
      (a, b) =>
        `The class collected ${a} ${plural(a, 'leaf', 'leaves')} on Monday and ${b} on Tuesday. How many leaves altogether?`,
    ],
    '11-12': [
      (a, b) =>
        `A library had ${a} ${plural(a, 'book')} on its shelves. After a donation of ${b} more ${plural(b, 'book')} arrived, how many books does the library hold in total?`,
    ],
  },
  subtraction: {
    '6-7': [
      (a, b) => `Dingo had ${a} ${plural(a, 'berry', 'berries')} and ate ${b}. How many are left?`,
      (a, b) => `There were ${a} ${plural(a, 'duck')} in the pond. ${b} swam away. How many remain?`,
    ],
    '8-10': [
      (a, b) =>
        `A baker made ${a} ${plural(a, 'muffin')} and sold ${b} of them before lunch. How many muffins are still on the tray?`,
    ],
    '11-12': [
      (a, b) =>
        `A stadium with ${a} ${plural(a, 'seat')} sold ${b} ${plural(b, 'ticket')} for tonight's match. How many seats are still empty?`,
    ],
  },
  multiplication: {
    // 6-7 never reaches the multiplication unit; no templates needed.
    '8-10': [
      (a, b) => `There are ${a} ${plural(a, 'basket')} with ${b} ${plural(b, 'apple')} in each. How many apples in all?`,
    ],
    '11-12': [
      (a, b) =>
        `A school orders ${a} ${plural(a, 'crate')} of juice boxes, and each crate holds ${b} ${plural(b, 'box', 'boxes')}. How many juice boxes did the school order in total?`,
    ],
  },
  division: {
    // 6-7 never reaches the division unit.
    '8-10': [
      // a = dividend, b = divisor, answer = quotient (exact division path)
      (a, b) => `Dingo shares ${a} ${plural(a, 'treat')} equally among ${b} ${plural(b, 'friend')}. How many does each friend get?`,
    ],
    '11-12': [
      (a, b) =>
        `A farmer packs ${a} ${plural(a, 'egg')} into cartons that each hold ${b}. How many full cartons can be filled?`,
    ],
  },
};

const INSTRUCTION = 'Read the story and type the answer';

/** Bands to try in order when the requested band has no templates. */
const BAND_FALLBACK = {
  '6-7': ['6-7', '8-10', '11-12'],
  '8-10': ['8-10', '11-12', '6-7'],
  '11-12': ['11-12', '8-10', '6-7'],
};

function pickTemplates(operation, ageBand) {
  const byBand = THEME_BANK[operation] || {};
  for (const band of BAND_FALLBACK[ageBand] || ['8-10']) {
    if (byBand[band] && byBand[band].length) return byBand[band];
  }
  return null;
}

/**
 * Wrap pre-computed operands in a narrative.
 *
 * @param {string} operation
 * @param {number} a - first operand as it appears in the equation
 * @param {number} b - second operand
 * @param {number} answer - the already-computed correct answer
 * @param {string} ageBand
 * @returns {{ prompt: string, instruction: string }}
 */
export function wrapStory(operation, a, b, answer, ageBand) {
  const templates = pickTemplates(operation, ageBand);
  if (!templates) {
    // Last-resort generic prompt; should not happen for valid operations.
    return { prompt: `What is the answer? (${a}, ${b})`, instruction: INSTRUCTION };
  }
  const tmpl = templates[Math.floor(Math.random() * templates.length)];
  return { prompt: tmpl(a, b, answer), instruction: INSTRUCTION };
}
```

- [ ] **Step 4: Run tests, verify pass.** Adjust any template wording if the "1 <plural>" agreement test trips — every count interpolated immediately before a noun must go through `plural()`.

- [ ] **Step 5: Commit** — `feat: add story-problem template bank and wrapStory util`.

---

### Task 2: Answer Matching Util

**Files:**
- Create: `src/utils/answerMatch.js`
- Create: `src/utils/__tests__/answerMatch.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/answerMatch.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { matchesAnswer, parseRemainder } from '../answerMatch';

describe('parseRemainder', () => {
  it('parses "3 r 2"', () => expect(parseRemainder('3 r 2')).toEqual({ q: 3, r: 2 }));
  it('parses tight "3r2"', () => expect(parseRemainder('3r2')).toEqual({ q: 3, r: 2 }));
  it('parses uppercase "3 R 2"', () => expect(parseRemainder('3 R 2')).toEqual({ q: 3, r: 2 }));
  it('returns null for plain number', () => expect(parseRemainder('7')).toBeNull());
  it('returns null for garbage', () => expect(parseRemainder('abc')).toBeNull());
});

describe('matchesAnswer', () => {
  it('numeric exercise matches by equality', () => {
    expect(matchesAnswer({ correctAnswer: 12 }, 12)).toBe(true);
    expect(matchesAnswer({ correctAnswer: 12 }, 13)).toBe(false);
  });

  it('numeric exercise accepts a numeric string', () => {
    expect(matchesAnswer({ correctAnswer: 12 }, '12')).toBe(true);
  });

  it('remainder exercise matches on quotient + remainder regardless of spacing/case', () => {
    const ex = { type: 'story-problem', isRemainder: true, quotient: 3, remainder: 2, correctAnswer: '3 r 2' };
    expect(matchesAnswer(ex, '3 r 2')).toBe(true);
    expect(matchesAnswer(ex, '3r2')).toBe(true);
    expect(matchesAnswer(ex, '3 R 2')).toBe(true);
    expect(matchesAnswer(ex, '3 r 3')).toBe(false);
    expect(matchesAnswer(ex, '3')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `answerMatch.js`**

```js
/** Parse "3 r 2" / "3r2" / "3 R 2" → { q, r } or null. */
export function parseRemainder(str) {
  if (typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d+)\s*[rR]\s*(\d+)$/);
  if (!m) return null;
  return { q: parseInt(m[1], 10), r: parseInt(m[2], 10) };
}

/**
 * True if `raw` (string or number) is a correct answer for `exercise`.
 * Remainder exercises (isRemainder) compare quotient+remainder leniently;
 * everything else falls back to numeric equality.
 */
export function matchesAnswer(exercise, raw) {
  if (exercise?.isRemainder) {
    const parsed = parseRemainder(String(raw));
    if (!parsed) return false;
    return parsed.q === exercise.quotient && parsed.r === exercise.remainder;
  }
  const num = typeof raw === 'number' ? raw : parseFloat(raw);
  return num === exercise.correctAnswer;
}
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: add answerMatch util for numeric + remainder answers`.

---

### Task 3: Generator — Story Problem Type + Remainder Variant

**Files:**
- Modify: `src/utils/exerciseGenerator.js`
- Modify: `src/utils/__tests__/exerciseGenerator.test.js`

- [ ] **Step 1: Write failing tests** — add to `src/utils/__tests__/exerciseGenerator.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateExercises } from '../exerciseGenerator';
import { parseRemainder } from '../answerMatch';

afterEach(() => vi.restoreAllMocks());

describe('story-problem type', () => {
  it('appears in the type cycle as the 4th type', () => {
    const ex = generateExercises('addition', '6-7', 1, 4);
    expect(ex[3].type).toBe('story-problem');
  });

  it('story problem keeps a numeric correctAnswer and a parseable equation', () => {
    const ex = generateExercises('addition', '6-7', 2, 4)[3];
    expect(typeof ex.correctAnswer).toBe('number');
    expect(ex.equation).toMatch(/\[\]/);
    expect(typeof ex.prompt).toBe('string');
    expect(ex.prompt.length).toBeGreaterThan(0);
  });

  it('story prompt math is consistent with the equation', () => {
    const ex = generateExercises('addition', '6-7', 3, 4)[3];
    const m = ex.equation.match(/^(\d+) \+ (\d+) = \[\]$/);
    expect(Number(m[1]) + Number(m[2])).toBe(ex.correctAnswer);
  });
});

describe('division remainder variant', () => {
  it('produces "q r r" answers with 0 < r < divisor for explorer remainder', () => {
    const ex = generateExercises('division', '8-10', 3, 12, { variant: 'remainder' });
    for (const e of ex) {
      expect(e.isRemainder).toBe(true);
      const parsed = parseRemainder(e.correctAnswer);
      expect(parsed).not.toBeNull();
      const m = e.equation.match(/^(\d+) ÷ (\d+) = \[\]$/);
      const dividend = Number(m[1]);
      const divisor = Number(m[2]);
      expect(parsed.q * divisor + parsed.r).toBe(dividend);
      expect(parsed.r).toBeGreaterThan(0);
      expect(parsed.r).toBeLessThan(divisor);
    }
  });

  it('never emits a remainder of 0', () => {
    const ex = generateExercises('division', '11-12', 5, 30, { variant: 'remainder' });
    for (const e of ex) expect(parseRemainder(e.correctAnswer).r).not.toBe(0);
  });

  it('default division stays decimal/exact (no isRemainder)', () => {
    const ex = generateExercises('division', '8-10', 3, 6);
    for (const e of ex) expect(e.isRemainder).toBeFalsy();
  });
});
```

> Note: the third arg to `generateExercises` in the new division tests is `tier`; `count` and an `options` object follow. See Step 3 for the signature change.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement generator changes**

In `src/utils/exerciseGenerator.js`:

1. Import the templating util at the top:
   ```js
   import { wrapStory } from './storyTemplates';
   ```

2. Extend the type list (append, do not reorder):
   ```js
   const EXERCISE_TYPES = ['type-answer', 'select-answer', 'follow-pattern', 'story-problem'];
   ```

3. Each per-operation number builder currently returns immediately via `buildExerciseForType`. Refactor them to expose their `(a, b, correctAnswer)` so a story wrapper can reuse them. The lowest-touch approach: have each `buildXxxExercise` compute `a`, `b`, `correctAnswer`, `equation`, `isDecimal`, then route through a shared helper that also handles `story-problem`. Add a `buildStoryProblem` helper:

   ```js
   function buildStoryProblem(operation, ageBand, a, b, correctAnswer, equation) {
     const { prompt, instruction } = wrapStory(operation, a, b, correctAnswer, ageBand);
     return { type: 'story-problem', equation, prompt, instruction, correctAnswer };
   }
   ```

   Extend `buildExerciseForType` to accept the context it needs for stories. Simplest: pass `operation`, `ageBand`, `a`, `b` through:

   ```js
   function buildExerciseForType(exType, equation, correctAnswer, isDecimal, ctx) {
     switch (exType) {
       case 'type-answer':   return buildTypeAnswer(equation, correctAnswer);
       case 'select-answer': return buildSelectAnswer(equation, correctAnswer, isDecimal);
       case 'story-problem':
         return buildStoryProblem(ctx.operation, ctx.ageBand, ctx.a, ctx.b, correctAnswer, equation);
       case 'follow-pattern':
         return buildTypeAnswer(equation, correctAnswer); // safe fallback (unused on main path)
       default:
         throw new Error(`Unknown exercise type: ${exType}`);
     }
   }
   ```

   Update each `buildXxxExercise` to pass `ctx`, e.g. addition:
   ```js
   return buildExerciseForType(exType, equation, correctAnswer, false,
     { operation: 'addition', ageBand, a, b });
   ```
   (Thread `ageBand` into `buildAdditionExercise`/`buildSubtractionExercise`; they currently take `rangeMax` — add an `ageBand` param. Mul/div builders already know the ageBand.)

4. **Remainder variant.** Change the public signature to accept options:
   ```js
   export function generateExercises(operation, ageBand, tier, count, options = {}) {
     const { variant } = options; // 'remainder' for the division remainder mode
     ...
   ```
   Thread `variant` into the division builders only. In `buildDivisionExercise`, add a remainder branch (place it first so it wins when requested, for both Explorer and Challenger):

   ```js
   function buildDivisionExercise(exType, ageBand, tier, variant) {
     if (variant === 'remainder') {
       const factorMax = ageBand === '11-12' ? 1000 : 50;
       const [lo, hi] = tierWindow(factorMax, tier);
       let dividend, divisor, quotient, remainder, attempts = 0;
       do {
         divisor = randInt(2, Math.max(2, Math.min(12, hi))); // small divisor keeps it kid-friendly
         dividend = randInt(Math.max(divisor + 1, lo), Math.max(divisor + 1, hi));
         quotient = Math.floor(dividend / divisor);
         remainder = dividend % divisor;
         attempts++;
       } while (remainder === 0 && attempts < 50);
       if (remainder === 0) { remainder = 1; dividend = quotient * divisor + 1; } // guaranteed non-zero
       const correctAnswer = `${quotient} r ${remainder}`;
       const equation = `${dividend} ÷ ${divisor} = []`;
       const base = { equation, correctAnswer, isRemainder: true, quotient, remainder, divisor, dividend };
       if (exType === 'story-problem') {
         const { prompt, instruction } = wrapStory('division', dividend, divisor, quotient, ageBand);
         return { type: 'story-problem', ...base, prompt, instruction };
       }
       return { type: 'type-answer', ...base }; // remainder answers are always typed
     }
     // ... existing decimal (challenger) / exact (explorer) code unchanged ...
   }
   ```
   Apply the same `variant` plumbing to `buildDivisionFollowPattern` only if you want remainder follow-patterns — **out of scope for v1** (see Risks); for `variant === 'remainder'`, force the type to type-answer or story-problem and skip follow-pattern in the main loop.

5. In the main loop, when `variant === 'remainder'` and the cycled `exType` would be `'follow-pattern'`, substitute `'type-answer'` (remainder has no pattern representation in v1).

- [ ] **Step 4: Run, verify pass.** Run the full generator test file too — existing tests asserting positions 0–2 must still pass (story-problem only occupies index 3+).

- [ ] **Step 5: Commit** — `feat: add story-problem type and remainder division variant to generator`.

---

### Task 4: StoryProblem Component

**Files:**
- Create: `src/components/lesson/exercises/StoryProblem.jsx`
- Create: `src/components/lesson/exercises/StoryProblem.module.css`

- [ ] **Step 1: Create `StoryProblem.jsx`**

A typed-answer variant: shows the `prompt` paragraph, then a number pad. For remainder exercises it shows an `r` key and accepts the `"q r r"` string; otherwise it submits a number. It calls `onAnswer(rawString)` and lets `LessonEngine` decide correctness via `matchesAnswer`.

```jsx
import { useState } from 'react';
import NumberPad from './NumberPad';
import styles from './StoryProblem.module.css';

export default function StoryProblem({ exercise, onAnswer }) {
  const [value, setValue] = useState('');
  const isRemainder = !!exercise.isRemainder;

  const handleDigit = (d) => {
    if (d === '.' && (value.includes('.') || isRemainder)) return; // no decimals in remainder mode
    if (value.length < 12) setValue(value + d);
  };
  const handleR = () => {
    if (isRemainder && value && !/[rR]/.test(value)) setValue(value + ' r ');
  };
  const handleDelete = () => setValue(value.replace(/ r $/, '').slice(0, -1));

  const handleCheck = () => {
    if (value.trim() === '') return;
    onAnswer(isRemainder ? value.trim() : parseFloat(value));
  };

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Read the story and type the answer'}</p>
      <div className={styles.storyCard}>
        <span className={styles.emoji}>📖</span>
        <p className={styles.prompt}>{exercise.prompt}</p>
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputField}>
          {value || <span className={styles.placeholder}>{isRemainder ? 'Example: 3 r 2' : 'Example: 12'}</span>}
        </div>
        <button className={styles.checkButton} onClick={handleCheck} disabled={value.trim() === ''}>
          CHECK
        </button>
      </div>
      <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
      {isRemainder && (
        <button className={styles.remainderKey} onClick={handleR}>
          remainder ( r )
        </button>
      )}
    </div>
  );
}
```

> NumberPad's `.` key is harmless in remainder mode because `handleDigit` ignores it. If you prefer, add an optional `hideDecimal` prop to NumberPad later — out of scope for v1.

- [ ] **Step 2: Create `StoryProblem.module.css`** (mirror `TypeTheAnswer.module.css` tokens; add a `.storyCard`/`.prompt` block):

```css
.container { display: flex; flex-direction: column; flex: 1; }
.instruction { font-size: var(--text-base); font-weight: 700; padding: var(--space-md) var(--space-lg) 0; color: var(--text-secondary); }
.storyCard {
  margin: var(--space-md) var(--space-lg);
  padding: var(--space-lg);
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  display: flex; gap: var(--space-md); align-items: flex-start;
}
.emoji { font-size: 32px; line-height: 1; }
.prompt { font-size: var(--text-lg); font-weight: 700; line-height: 1.4; color: var(--text-primary); }
.inputArea { padding: 0 var(--space-lg) var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.inputField {
  width: 100%; padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md); border: 2px solid var(--border);
  background: var(--surface); color: var(--text-primary);
  font-size: var(--text-lg); font-weight: 700; min-height: 56px;
  display: flex; align-items: center;
}
.placeholder { color: var(--text-secondary); font-weight: 400; }
.checkButton {
  width: 100%; padding: var(--space-md); border-radius: var(--radius-md);
  background: var(--border); color: var(--text-secondary);
  font-size: var(--text-base); font-weight: 800; letter-spacing: 1px;
  transition: background 0.2s, color 0.2s;
}
.checkButton:not(:disabled) { background: var(--green); color: var(--text-primary); }
.remainderKey {
  margin: 0 var(--space-lg) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background: var(--blue); color: #fff; font-weight: 800;
}
```

- [ ] **Step 3: Commit** — `feat: add StoryProblem exercise component`.

---

### Task 5: Wire into LessonEngine

**Files:**
- Modify: `src/components/lesson/LessonEngine.jsx`

- [ ] **Step 1: Import the component and the matcher**

```js
import StoryProblem from './exercises/StoryProblem';
import { matchesAnswer } from '../../utils/answerMatch';
```

- [ ] **Step 2: Use `matchesAnswer` for correctness**

In `handleAnswer`, replace:
```js
const isCorrect = answer === currentExercise.correctAnswer;
```
with:
```js
const isCorrect = matchesAnswer(currentExercise, answer);
```

The retry-before-heart-loss rule should also apply to story problems (they are typed). Update the `canRetry` line:
```js
const canRetry =
  (currentExercise.type === 'type-answer' || currentExercise.type === 'story-problem') &&
  !retryUsed;
```

- [ ] **Step 3: Add the switch case**

In the `exerciseComponent` IIFE switch:
```js
case 'story-problem':
  return <StoryProblem key={exerciseIndex} {...props} />;
```

> FeedbackBanner still receives `currentExercise.correctAnswer`; for remainder exercises that is the `"3 r 2"` string, which displays correctly as "the answer was 3 r 2".

- [ ] **Step 4: Run the full suite** — `npx vitest run`. Confirm no LessonEngine test regressions.
- [ ] **Step 5: Commit** — `feat: render story problems in LessonEngine; lenient answer matching`.

---

### Task 6: Extend the Validator

**Files:**
- Modify: `scripts/validate-exercises.js`

- [ ] **Step 1: Add the new type and a remainder parser**

```js
const VALID_TYPES = ['type-answer', 'select-answer', 'follow-pattern', 'story-problem'];

function parseRemainderStr(s) {
  const m = typeof s === 'string' && s.match(/^(\d+)\s*r\s*(\d+)$/i);
  return m ? { q: +m[1], r: +m[2] } : null;
}
```

- [ ] **Step 2: Branch in `validateExercise`**

The function currently asserts `correctAnswer` is a finite number early and returns. That guard now needs to allow remainder strings. Restructure:

```js
// Remainder exercises carry a string answer "q r r"; validate separately.
if (ex.isRemainder) {
  const parsed = parseRemainderStr(ex.correctAnswer);
  if (!parsed) { err(ctx, `remainder answer not "q r r": ${JSON.stringify(ex.correctAnswer)}`); return; }
  if (parsed.q !== ex.quotient || parsed.r !== ex.remainder)
    err(ctx, `remainder fields mismatch answer "${ex.correctAnswer}" (q=${ex.quotient}, r=${ex.remainder})`);
  if (!(parsed.r > 0 && parsed.r < ex.divisor))
    err(ctx, `remainder ${parsed.r} not in (0, divisor=${ex.divisor})`);
  if (parsed.q * ex.divisor + parsed.r !== ex.dividend)
    err(ctx, `remainder arithmetic wrong: ${parsed.q}*${ex.divisor}+${parsed.r} != ${ex.dividend}`);
  // equation still parses + uses ÷
  const p = parseEquation(ex.equation);
  if (!p || p.operator !== '÷') err(ctx, `remainder equation bad: "${ex.equation}"`);
  return;
}
```

For `story-problem` (non-remainder), after the existing numeric/arithmetic checks, assert the prompt:
```js
if (ex.type === 'story-problem') {
  if (typeof ex.prompt !== 'string' || ex.prompt.trim() === '')
    err(ctx, `story-problem missing prompt ("${ex.equation}")`);
}
```
The existing `equation`-parse + arithmetic checks already cover non-remainder story problems because they keep a numeric `correctAnswer` and a real `equation`.

- [ ] **Step 3: Sweep the remainder variant too**

After the main triple loop, add a division-remainder pass:
```js
for (const ageBand of ['8-10', '11-12']) {
  for (const tier of TIERS) {
    const ctx = `division(remainder) / ${ageBand} / tier ${tier}`;
    const exercises = generateExercises('division', ageBand, tier, SAMPLES_PER_COMBO, { variant: 'remainder' });
    for (const ex of exercises) { validateExercise(ctx, 'division', ageBand, ex); totalChecked++; }
  }
}
```

- [ ] **Step 4: Run** — `npm run validate`. Expect green (`✅ Validated N …`). Fix any generator edge cases it surfaces (likely small-tier ranges where `hi` is tiny — clamp divisor/dividend as in the builder).
- [ ] **Step 5: Commit** — `test: validate story-problem and remainder division exercises`.

---

### Task 7: Full Verification

- [ ] **Step 1** — `npx vitest run` (all green).
- [ ] **Step 2** — `npm run validate` (all green).
- [ ] **Step 3** — `npm run lint`.
- [ ] **Step 4** — `npx vite build` (succeeds).
- [ ] **Step 5: Manual smoke (`npm run dev`)** — start an Addition lesson (Starter), confirm the 4th exercise is a story problem answered via the number pad; start a Division lesson (Explorer) — confirm decimal/exact still works; (if a remainder lesson is later surfaced) confirm the `r` key and "3 r 2" entry. For v1 the remainder variant is exercised through tests + validator since no lesson record requests `variant: 'remainder'` yet (see Out of Scope).

---

## Test Plan

| Area | Coverage |
|------|----------|
| `storyTemplates` unit | plural agreement, band selection + fallback, prompt length grows with age band, both operands present, no "1 <plural>" |
| `answerMatch` unit | numeric equality (number + string), remainder parse spacing/case, mismatch rejection |
| `exerciseGenerator` unit | story-problem at cycle index 3, numeric answer + parseable equation, prompt non-empty, story math == equation; remainder: `q*d+r==dividend`, `0<r<d`, never `r 0`, default division unchanged |
| `validate-exercises.js` | full sweep incl. story prompts + a dedicated remainder pass over (8-10, 11-12) × tiers |
| LessonEngine (existing) | no regressions; retry now applies to story problems |
| Manual | dev smoke for story rendering + number-pad answer |

---

## Risks & Edge Cases

- **Number/noun agreement ("1 acorns").** Every count printed immediately before a noun must go through `plural()`. Covered by the templates test; reviewer should eyeball each template. Irregular plurals (leaf→leaves, berry→berries, box→boxes) pass the explicit plural form.
- **Remainder of 0.** The generator regenerates on `r === 0` and has a deterministic non-zero fallback; the validator asserts `0 < r < divisor`. A `r 0` would be pedagogically wrong and is treated as a bug.
- **Small-tier ranges.** At tier 1 the `tierWindow` `hi` can be tiny (e.g. 6-7 has rangeMax 20 → tier 1 hi≈4). The remainder builder clamps `divisor ≥ 2` and `dividend ≥ divisor+1`; the validator's full sweep is the guard. Remainder is only offered for 8-10/11-12, so the 6-7 range isn't hit.
- **String vs numeric `correctAnswer`.** Mixing types is the main new footgun. Contained by routing all comparisons through `matchesAnswer` and the validator's early `isRemainder` branch (which runs *before* the finite-number guard).
- **Reading load for youngest band.** 6-7 templates are capped at one short clause (test asserts ≤90 chars); mul/div have no 6-7 templates because that band never reaches those units.
- **Type-cycle length change (3→4).** Any test asserting `EXERCISE_TYPES.length === 3` or `i % 3` ordering must be updated; story-problem is appended so indices 0–2 are unchanged.

## Out of Scope (v1)

- Surfacing remainder lessons in the UI: no lesson record sets `variant: 'remainder'` yet. The capability is generator-complete and test-covered; a follow-up adds a remainder tier/lesson (or a "challenge" toggle) and threads `variant` from `LessonEngine` → `generateExercises`. **This is the one wiring gap to flag to the user.**
- Remainder follow-pattern exercises (no clean 3-row pattern representation for "q r r").
- Localisation / non-English narratives.
- Story problems for the `follow-pattern` slot (story problems are a typed variant only).
- Distractor-based (select-answer) story problems.
```