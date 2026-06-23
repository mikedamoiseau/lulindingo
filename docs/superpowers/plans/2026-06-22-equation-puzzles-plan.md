# Equation Puzzles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow TDD: write the failing test, watch it fail, implement, watch it pass.

**Goal:** Stop forcing every problem into "compute the result." Add two new exercise interaction types that reuse the triple the generator already computes, so kids practice the *inverse* of forward arithmetic:

- **Find-the-Missing-Number** — the blank moves onto an operand. `7 + [] = 15`, `[] ÷ 4 = 6`. Kid types the missing operand.
- **Build-the-Equation** — the result is shown; the kid drags/taps real operands plus a couple of decoys from a tray into the equation slots to assemble a true statement. Teaches fact families (24 is `6 × 4` and `8 × 3`).

**Architecture:** Both types are pure extensions of `exerciseGenerator.js`. The generator already computes a full `(a, operator, b, result)` triple for every problem; today it only ever exposes `a` and `b` and hides `result` behind `[]`. The new types expose a *different* slice of the same triple. No new math, no DB changes (exercises are generated at runtime, never stored — see `CLAUDE.md`), no store changes. The work is: two new builder functions + a small change to how `generateExercises` cycles types, two new React exercise components wired into `LessonEngine`'s `switch`, and an extension of the validator and unit tests to understand the new shapes (the answer is now an operand, not the result).

**Tech Stack:** React 19, Zustand, Dexie, Vitest, framer-motion (already a dependency).

---

## Key Design Decisions

These are the load-bearing calls. Read them before writing code; the tasks below assume them.

### 1. The equation string stays the source of truth — `[]` marks the blank, wherever it is

Today `equation` is always `"a <op> b = []"` and components do `equation.split('[]')` to render. We keep that exact contract. For Find-the-Missing-Number we **move the `[]` token** onto an operand:

- blank on first operand: `"[] + 8 = 15"`
- blank on second operand: `"7 + [] = 15"`

`correctAnswer` becomes the value that belongs in the blank (the missing operand), **not** the result. `equation.split('[]')` still yields exactly two render parts, so `TypeTheAnswer`'s rendering model is reused verbatim — we only need a thin wrapper component because the *instruction* and the *type tag* differ. The `MissingNumber` exercise object adds one explicit field, `blankSlot: 'a' | 'b'`, purely so the validator and tests can verify *which* operand was blanked without re-parsing intent out of the string. The renderer does not need it (it just splits on `[]`), but the validator does (to reconstruct the full equation and check it is true).

```
{ type: 'missing-number', equation: '7 + [] = 15', correctAnswer: 8,
  blankSlot: 'b', operator: '+', a: 7, b: 8, result: 15 }
```

We carry `a`, `b`, `result`, `operator` on the object (the full triple) so the validator can check truth without string surgery, and so Build-the-Equation generation can share the same triple-producing helper. These extra fields are inert for the existing engine.

### 2. Subtraction & division: blank only the operand that stays non-negative / integer and is unambiguous

The whole risk of inverting is producing a puzzle with a negative, fractional, or **non-unique** answer. Rules per operation, decided up front:

- **Addition** (`a + b = r`): blank either operand freely. Missing operand = `r - known`, always ≥ 0 because both addends were ≥ 0. Safe.
- **Subtraction** (`a - b = r`, generator guarantees `a ≥ b ≥ 0`, `r ≥ 0`):
  - Blank the **minuend** `a`: `[] - b = r` → answer `r + b`. Always valid (positive, integer).
  - Blank the **subtrahend** `b`: `a - [] = r` → answer `a - r`. Always ≥ 0 because `a ≥ r`. Valid.
  - Both are safe, so allow both. No negatives possible given the generator's existing `a ≥ b` invariant.
- **Multiplication** (`a × b = r`): blank either factor → answer = `r / known`. This is exact (integer) **only because the generator built `r` as `a × b`**. Safe for both slots. **Edge case:** if a factor is `0` (addition/sub can produce 0 operands, but multiplication factors are `randInt(max(1,lo), hi)` so ≥ 1 — no division-by-zero). Still, guard: if a known operand is `0`, fall back to blanking the other operand; if both `0`, regenerate. In practice multiplication operands are ≥ 1, so this guard is belt-and-suspenders.
- **Division** (`dividend ÷ divisor = quotient`):
  - Blank the **dividend**: `[] ÷ divisor = quotient` → answer `quotient × divisor` = the original dividend. Always exact integer. **Safe — this is the only division slot we blank.**
  - Do **not** blank the divisor: `dividend ÷ [] = quotient` has the answer `dividend / quotient`, which for the **challenger** decimal-division path (`quotient` rounded to 2dp) is *not* recoverable exactly and may be ambiguous/fractional. Blanking the divisor is therefore disallowed for division across the board (keeps one simple rule rather than a per-ageBand special case).

**Decision:** a `MISSING_SLOTS` map declares the legal blank slots per operation. Division → `['dividend']` only. Others → both. The builder picks uniformly among the legal slots.

```
const MISSING_SLOTS = {
  addition:       ['a', 'b'],
  subtraction:    ['a', 'b'],
  multiplication: ['a', 'b'],
  division:       ['a'],   // 'a' = dividend; never blank the divisor
};
```

### 3. Build-the-Equation object shape, decoys, and "is this assembled equation true?"

Shape: show the result and the operator; the child fills two operand slots from a tray.

```
{ type: 'build-equation',
  operator: '×',
  result: 24,
  slots: 2,                       // always two operand slots for binary ops
  solution: [6, 4],               // ONE canonical true assignment (a, b)
  tray: [6, 4, 3, 9, 8],          // solution operands + decoys, shuffled
  correctAnswer: 24 }             // kept for engine symmetry; truth is validated structurally
```

- `tray` = the two real operands plus **3 decoys** (5 tiles total — comfortable for a kid, fits one mobile row/grid). Decoys are generated with the **existing `generateDistractors` helper** seeded off each operand and off the result, then filtered so that **no decoy accidentally forms a second true equation** with a tray tile (see truth check below). This keeps decoys "near miss" plausible (e.g. for `6 × 4 = 24`: `5, 3, 8`) rather than random noise.
- **Truth validation is structural, not string-based.** The child's two placed tiles `[x, y]` are accepted iff `applyOp(operator, x, y) === result` **OR**, for commutative ops, `applyOp(operator, y, x) === result`. So for `× 24` both `6 × 4` and `4 × 6` are accepted, and a *different* true fact family member that the kid happens to assemble from tray tiles (e.g. `8 × 3` if both are present) is **also** accepted — that is the fact-family teaching goal, so it is a feature, not a bug. This is why decoy generation must guarantee no *unintended* second solution sneaks in for ops where we don't want it; we explicitly **allow** intended fact-family members only when both are placed in the tray on purpose. For v1, to keep it deterministic, decoys are filtered to NOT create any additional true pair, so the only accepted answers are `solution` and (for commutative ops) its swap. Order of operands matters for subtraction and division (non-commutative): only `applyOp(op, x, y) === result` is accepted, not the swap.
- `applyOp` reuses the same arithmetic as the validator's `computeExpected` (`+ - × ÷` with 2dp rounding on `÷`). Comparison uses an epsilon (`Math.abs(diff) < 0.005`) to match the rest of the codebase.
- For division, `result` is the quotient and `solution = [dividend, divisor]`; the slots render as `[] ÷ [] = quotient`. We restrict Build-the-Equation division to the **explorer integer path** (clean dividend/divisor) and skip it for challenger decimal division (no clean draggable operands) — handled by the same per-op gating as missing-number.

### 4. Drag interaction: tap-to-place, not drag-and-drop

**Decision: tap-to-place** (tap a tray tile → it flies into the next empty slot; tap a filled slot → tile returns to tray). framer-motion is used only for the tile's `layout`/spring animation between tray and slot, not for pointer-following drag.

**Why:** kid-friendly + touch-reliable. HTML5 drag-and-drop does not work on touch at all; pointer-based dragging needs hit-testing, scroll-locking, and accidental-drag handling that is fragile for small fingers on a phone. Tap-to-place is a two-tap interaction every child understands, works identically on mouse and touch, and is trivially testable in jsdom (it's just click handlers). framer-motion `layoutId` gives the satisfying "tile slides into the slot" motion for free.

### 5. Type rotation: opt-in, not a forced replacement

`generateExercises` currently cycles `['type-answer', 'select-answer', 'follow-pattern']` by `i % 3`. We **extend the cycle** to interleave the new types rather than replacing existing ones, so existing lessons gain variety without losing the forward-computation practice that's still pedagogically core:

```
const EXERCISE_TYPES = [
  'type-answer', 'select-answer', 'missing-number',
  'follow-pattern', 'build-equation',
];   // length 5
```

Gating: `build-equation` and `missing-number` fall back to `type-answer` when the operation/ageBand combo can't safely produce them (challenger division for build-equation; any future unsafe combo). The fallback is silent and produces a valid forward exercise, so `getMaxExercises` counts and `LessonEngine` are unaffected. The validator must tolerate the fallback (a `missing-number` slot may legitimately emit a `type-answer` object). Document this in the validator.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/exerciseGenerator.js` | Modify | Add `buildMissingNumberExercise`, `buildBuildEquationExercise`, `applyOp`, `MISSING_SLOTS`; extend `EXERCISE_TYPES` + dispatch with safe fallback |
| `src/utils/__tests__/exerciseGenerator.test.js` | Modify | Add `describe` blocks for both new types |
| `scripts/validate-exercises.js` | Modify | Teach `parseEquation`/`validateExercise` the operand-blank and tray shapes |
| `src/components/lesson/exercises/MissingNumber.jsx` | Create | Operand-blank renderer (NumberPad input) |
| `src/components/lesson/exercises/MissingNumber.module.css` | Create | Styling |
| `src/components/lesson/exercises/BuildEquation.jsx` | Create | Tap-to-place tray + slots renderer |
| `src/components/lesson/exercises/BuildEquation.module.css` | Create | Styling, mobile grid |
| `src/components/lesson/exercises/__tests__/BuildEquation.test.jsx` | Create | Component interaction tests (tap to fill/clear/submit) |
| `src/components/lesson/exercises/__tests__/MissingNumber.test.jsx` | Create | Component render + submit test |
| `src/components/lesson/LessonEngine.jsx` | Modify | Two new `case`s in the type `switch`; pass-through `onAnswer` |

No store, DB, seed, or progression changes.

---

### Task 1: Generator — Find-the-Missing-Number

**Files:**
- Modify: `src/utils/exerciseGenerator.js`
- Modify: `src/utils/__tests__/exerciseGenerator.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/utils/__tests__/exerciseGenerator.test.js`. Use a small helper that parses a missing-number equation (the blank can be in any of the three positions) and reconstructs the full equation by substituting `correctAnswer` into the `[]`, then asserts it is arithmetically true.

```js
import { vi, afterEach } from 'vitest';

// Helper: substitute correctAnswer into the [] and verify the equation is true.
function assertMissingNumberTrue(ex) {
  expect(ex.type).toBe('missing-number');
  expect(['a', 'b']).toContain(ex.blankSlot);
  // exactly one [] in the equation, on an operand (left of '=')
  const [lhs, rhs] = ex.equation.split('=').map((s) => s.trim());
  expect(rhs).not.toContain('[]');           // result is shown
  expect(lhs).toContain('[]');               // blank is an operand
  // reconstruct
  const filledLhs = lhs.replace('[]', String(ex.correctAnswer));
  const m = filledLhs.match(/^([\d.]+)\s*([+\-×÷])\s*([\d.]+)$/);
  expect(m).toBeTruthy();
  const a = parseFloat(m[1]); const b = parseFloat(m[3]);
  const r = parseFloat(rhs);
  const got = { '+': a + b, '-': a - b, '×': a * b,
                '÷': parseFloat((a / b).toFixed(2)) }[m[2]];
  expect(Math.abs(got - r)).toBeLessThan(0.005);
}

describe('generateExercises — missing-number', () => {
  // Force only the missing-number type by requesting many and filtering.
  function missingOnly(operation, ageBand, tier, n = 200) {
    return generateExercises(operation, ageBand, tier, n)
      .filter((e) => e.type === 'missing-number');
  }

  it.each(['addition', 'subtraction', 'multiplication', 'division'])(
    '%s missing-number puzzles are arithmetically true with a non-negative answer',
    (op) => {
      const band = op === 'division' || op === 'multiplication' ? '8-10' : '6-7';
      const list = missingOnly(op, band, 3);
      expect(list.length).toBeGreaterThan(0);
      for (const ex of list) {
        assertMissingNumberTrue(ex);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(ex.correctAnswer)).toBe(true);
      }
    }
  );

  it('division only ever blanks the dividend (never the divisor)', () => {
    const list = missingOnly('division', '8-10', 3);
    for (const ex of list) {
      expect(ex.blankSlot).toBe('a');           // dividend
      expect(ex.equation.startsWith('[]')).toBe(true);
    }
  });

  it('explorer division missing-number answers are integers', () => {
    for (const ex of missingOnly('division', '8-10', 3)) {
      expect(Number.isInteger(ex.correctAnswer)).toBe(true);
    }
  });

  it('carries the full triple (a, b, result, operator) for validation', () => {
    const [ex] = missingOnly('addition', '6-7', 3, 60);
    expect(ex).toMatchObject({
      a: expect.any(Number), b: expect.any(Number),
      result: expect.any(Number), operator: expect.any(String),
    });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npx vitest run src/utils/__tests__/exerciseGenerator.test.js` → FAIL (no `missing-number` type emitted yet).

- [ ] **Step 3: Implement.** In `exerciseGenerator.js`:

  1. Add an `applyOp` helper near `computeExpected`-style logic (it doesn't exist in the generator yet — add it):
     ```js
     function applyOp(operator, a, b) {
       switch (operator) {
         case '+': return a + b;
         case '-': return a - b;
         case '×': return a * b;
         case '÷': return parseFloat((a / b).toFixed(2));
         default: throw new Error(`Unknown operator: ${operator}`);
       }
     }
     const MISSING_SLOTS = {
       addition: ['a', 'b'], subtraction: ['a', 'b'],
       multiplication: ['a', 'b'], division: ['a'],
     };
     const OP_SYMBOL = { addition: '+', subtraction: '-', multiplication: '×', division: '÷' };
     ```
  2. Refactor the per-operation number generation so each operation can produce a raw triple `{ a, b, operator, result }` **without** building the equation string. The cleanest approach: extract a `makeTriple(operation, ageBand, tier)` that returns the same numbers the existing `buildXxxExercise` functions compute, reusing `tierWindow` and the exact same ranges/guards (so difficulty is identical). For division it returns `{ a: dividend, b: divisor, operator: '÷', result: quotient }`.
  3. Add `buildMissingNumberExercise(operation, ageBand, tier)`:
     ```js
     function buildMissingNumberExercise(operation, ageBand, tier) {
       const t = makeTriple(operation, ageBand, tier);   // {a,b,operator,result}
       const legal = MISSING_SLOTS[operation];
       let blankSlot = legal[randInt(0, legal.length - 1)];
       // guard against blanking a slot whose known operand is 0 for × (avoids /0 recovery ambiguity)
       if (operation === 'multiplication') {
         if (blankSlot === 'a' && t.b === 0) blankSlot = 'b';
         else if (blankSlot === 'b' && t.a === 0) blankSlot = 'a';
       }
       const correctAnswer = blankSlot === 'a' ? t.a : t.b;
       const aStr = blankSlot === 'a' ? '[]' : String(t.a);
       const bStr = blankSlot === 'b' ? '[]' : String(t.b);
       const equation = `${aStr} ${t.operator} ${bStr} = ${t.result}`;
       return { type: 'missing-number', equation, correctAnswer, blankSlot, ...t };
     }
     ```
  4. Add `'missing-number'` to `EXERCISE_TYPES` (see Key Decision 5 ordering) and a dispatch branch in `generateExercises` that calls `buildMissingNumberExercise`. (Build-equation branch comes in Task 2.)

- [ ] **Step 4: Run tests, verify pass.**

- [ ] **Step 5: Commit** — `feat(generator): add find-the-missing-number puzzle type`.

---

### Task 2: Generator — Build-the-Equation

**Files:**
- Modify: `src/utils/exerciseGenerator.js`
- Modify: `src/utils/__tests__/exerciseGenerator.test.js`

- [ ] **Step 1: Write failing tests.**

```js
describe('generateExercises — build-equation', () => {
  function buildOnly(operation, ageBand, tier, n = 250) {
    return generateExercises(operation, ageBand, tier, n)
      .filter((e) => e.type === 'build-equation');
  }
  const apply = { '+': (a,b)=>a+b, '-': (a,b)=>a-b, '×': (a,b)=>a*b,
                  '÷': (a,b)=>parseFloat((a/b).toFixed(2)) };

  it('solution operands actually produce the result', () => {
    for (const op of ['addition', 'subtraction', 'multiplication']) {
      for (const ex of buildOnly(op, '8-10', 3)) {
        const [a, b] = ex.solution;
        expect(Math.abs(apply[ex.operator](a, b) - ex.result)).toBeLessThan(0.005);
      }
    }
  });

  it('tray contains both solution operands plus exactly 3 decoys (5 tiles)', () => {
    for (const ex of buildOnly('multiplication', '8-10', 3)) {
      expect(ex.tray).toHaveLength(5);
      expect(ex.tray).toEqual(expect.arrayContaining(ex.solution));
      expect(ex.slots).toBe(2);
    }
  });

  it('decoys never form a second true equation (no unintended solution)', () => {
    for (const ex of buildOnly('multiplication', '8-10', 3)) {
      const sol = new Set([ex.solution.join(','), [...ex.solution].reverse().join(',')]);
      let truePairs = 0;
      for (const x of ex.tray) for (const y of ex.tray) {
        if (x === y) continue;
        if (Math.abs(apply[ex.operator](x, y) - ex.result) < 0.005) {
          if (!sol.has(`${x},${y}`)) truePairs++;
        }
      }
      expect(truePairs).toBe(0);
    }
  });

  it('subtraction/division build-equations are non-commutative (order fixed)', () => {
    for (const ex of buildOnly('subtraction', '8-10', 3)) {
      const [a, b] = ex.solution;
      expect(a).toBeGreaterThanOrEqual(b);   // minuend >= subtrahend, result >= 0
    }
  });

  it('challenger division never emits build-equation (falls back)', () => {
    expect(buildOnly('division', '11-12', 3)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `buildBuildEquationExercise(operation, ageBand, tier)`:**
  1. Gate: if `operation === 'division' && ageBand === '11-12'` → return `null` so the dispatcher falls back to `type-answer`.
  2. `const t = makeTriple(...)`. `solution = [t.a, t.b]`, `result = t.result`, `operator = t.operator`.
  3. Decoys: `const decoys = generateDistractors(t.a, ...)` combined with distractors of `t.b` and `t.result`; collect candidates, exclude values equal to either solution operand, then **filter out any decoy that, paired with another tray tile, makes the equation true** (use `applyOp` with epsilon, in both orders for commutative ops). Take the first 3 surviving decoys; if fewer than 3 survive after filtering, pad with safe far-away integers (`t.result + k` style) that also pass the no-second-solution filter. Cap attempts to avoid infinite loops (mirror the `attempts < 500` pattern already in `generateDistractors`).
  4. `tray = shuffle([...solution, ...decoys])`.
  5. Return `{ type: 'build-equation', operator, result, slots: 2, solution, tray, correctAnswer: result }`.
  6. Dispatcher: add `'build-equation'` branch; if the builder returns `null`, fall back to the operation's `buildTypeAnswer`-producing path (reuse `makeTriple` + `buildExerciseForType('type-answer', ...)`).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** — `feat(generator): add build-the-equation puzzle type with decoy guard`.

---

### Task 3: Extend `scripts/validate-exercises.js`

The validator's current model assumes `equation` is `"a <op> b = []"` and `correctAnswer` is the *result*. Both assumptions break for the new types.

**Files:** Modify `scripts/validate-exercises.js`.

- [ ] **Step 1: Add `VALID_TYPES` entries** — `'missing-number'` and `'build-equation'`.

- [ ] **Step 2: Branch validation by type** before the existing result-equation logic:

  - **`missing-number`:**
    - Parse with a new regex that allows `[]` on either operand and a numeric RHS: `^(\[\]|[\d.]+)\s*([+\-×÷])\s*(\[\]|[\d.]+)\s*=\s*([\d.]+)$`. Assert exactly one side of the `*` is `[]` and it's an operand (RHS is numeric).
    - Assert `ex.operator === OP_SYMBOL[operation]` and matches the parsed operator.
    - Reconstruct: substitute `ex.correctAnswer` into the blank, compute via `computeExpected`, assert it equals the parsed RHS within `0.005`.
    - Assert `ex.correctAnswer >= 0`, finite, and `<= maxAnswer(operation, ageBand)` (the missing operand is bounded by the same ranges).
    - Division: assert `ex.blankSlot === 'a'` (dividend) — divisor is never blanked.
    - Explorer division: assert integer answer (mirror existing rule).
  - **`build-equation`:**
    - Assert `ex.slots === 2`, `Array.isArray(ex.solution)` length 2, `Array.isArray(ex.tray)` length 5, all tray values ≥ 0 and finite.
    - Assert `ex.operator === OP_SYMBOL[operation]`.
    - Assert `applyOp(ex.operator, ...ex.solution)` equals `ex.result` within `0.005`.
    - Assert both solution operands are present in `tray`.
    - Assert **no unintended second solution**: scan ordered pairs of distinct tray tiles; the only pairs producing `result` must be the solution (and its swap for `+`/`×`).
    - Subtraction: assert `solution[0] >= solution[1]` (no negative result).
  - **Fallback tolerance:** because `missing-number`/`build-equation` slots may emit a `type-answer` object on unsafe combos, the per-combo loop must accept `type-answer` everywhere without error (it already does — `type-answer` is in `VALID_TYPES`). Add a comment noting the fallback so future readers don't "fix" it.

- [ ] **Step 3: Keep the answer-cap constants in sync** — the missing-operand can equal the original operand, which is always ≤ the same `maxAnswer`. No new cap constant needed; document this reasoning in a comment (the cap comment block in the script must mention operands are bounded by the same ranges).

- [ ] **Step 4: Run** `npm run validate` → exits 0. (~18k existing + new-type samples.)

- [ ] **Step 5: Commit** — `test(validate): teach exercise validator the operand-blank and tray shapes`.

---

### Task 4: MissingNumber component

**Files:**
- Create: `src/components/lesson/exercises/MissingNumber.jsx`
- Create: `src/components/lesson/exercises/MissingNumber.module.css`
- Create: `src/components/lesson/exercises/__tests__/MissingNumber.test.jsx`

This is `TypeTheAnswer` with a different instruction and the blank possibly on the left. Because rendering is just `equation.split('[]')` (which yields the two parts around the blank regardless of position), the component is nearly identical — but a separate component keeps the type tag clean and lets us tune the copy ("What number is missing?").

- [ ] **Step 1: Write a failing component test** (`MissingNumber.test.jsx`): render with `exercise = { type:'missing-number', equation:'7 + [] = 15', correctAnswer:8 }`, type `8` via the rendered NumberPad keys, click CHECK, assert `onAnswer` called with `8` (number). Also assert the visible equation contains `7 +` and `= 15`.

- [ ] **Step 2: Implement.** Mirror `TypeTheAnswer.jsx` exactly, but:
  - `instruction` default → `'What number is missing?'`.
  - Same NumberPad + `parseFloat(value)` submit, same `value.length < 10` guard, same `.` dedupe.
  - Render `parts[0]` / `blank` / `parts[1]` from `equation.split('[]')`.

- [ ] **Step 3: CSS** — copy `TypeTheAnswer.module.css`; the blank box (`.blank` with `--blue` border) already reads as "fill me." No new tokens.

- [ ] **Step 4: Run** `npx vitest run src/components/lesson/exercises/__tests__/MissingNumber.test.jsx` → pass.

- [ ] **Step 5: Commit** — `feat(ui): add MissingNumber exercise component`.

---

### Task 5: BuildEquation component (tap-to-place)

**Files:**
- Create: `src/components/lesson/exercises/BuildEquation.jsx`
- Create: `src/components/lesson/exercises/BuildEquation.module.css`
- Create: `src/components/lesson/exercises/__tests__/BuildEquation.test.jsx`

- [ ] **Step 1: Write failing component tests** (`BuildEquation.test.jsx`):
  - Fixture: `{ type:'build-equation', operator:'×', result:24, slots:2, solution:[6,4], tray:[6,4,3,9,8], correctAnswer:24 }`.
  - **Renders** the result `24`, the operator `×`, two empty slots, and 5 tray tiles.
  - **Tap to fill:** tap tile `6` then `4` → both slots filled, tray shows those tiles as used/removed. CHECK enabled only when both slots filled.
  - **Tap filled slot to clear:** returns the tile to the tray, CHECK disabled again.
  - **Correct submit:** fill `6`,`4`, click CHECK → `onAnswer` called with the **result** (`24`) so it matches `currentExercise.correctAnswer` in `LessonEngine`'s `answer === correctAnswer` check.
  - **Wrong submit:** fill `3`,`9` (= 27 ≠ 24), click CHECK → `onAnswer` called with a value that does **not** equal `24` (e.g. pass the computed product `27`, or a sentinel `NaN`). Decide: pass `applyOp(operator, x, y)` so the engine's equality check naturally fails for wrong assemblies and succeeds for any *true* assembly (supports fact-family duplicates if present). **This is the key wiring decision: the component computes the assembled value and reports it; the engine compares to `result`.**

- [ ] **Step 2: Implement `BuildEquation.jsx`:**
  - State: `slots = [null, null]`, `usedTrayIndices = Set`.
  - Tap a tray tile (by index, since values can repeat) → place its value into the first empty slot, mark index used. Tap a filled slot → clear it, free the tray index.
  - Compute assembled value with an inline `applyOp` (`+ - × ÷`, 2dp on `÷`).
  - CHECK disabled until both slots non-null; on click call `onAnswer(applyOp(operator, slots[0], slots[1]))`.
  - framer-motion: wrap tiles in `motion.button` with `layout` and a shared `layoutId` per tile index so a tile animates between tray and slot. `whileTap={{ scale: 0.95 }}` to match existing buttons.
  - Render: `slots[0] <op> slots[1] = result`, slots shown as bordered drop targets (reuse `.blank` look), tray as a grid of tiles below.

- [ ] **Step 3: CSS** (`BuildEquation.module.css`):
  - `.container` flex column, mirror SelectTheAnswer layout.
  - `.equation` row with `.slot` boxes (same `--blue` bordered 72px box as `.blank`) and the fixed `=result` on the right.
  - `.tray` → CSS grid, `grid-template-columns: repeat(auto-fit, minmax(64px, 1fr))`, gap `--space-sm`, so 5 tiles wrap nicely on a narrow phone. Tiles ≥ 56px tall for touch targets.
  - Used tiles get a `.tileUsed` faded/disabled style (kept in DOM for layout animation, `pointer-events:none`).
  - `.checkButton` identical to SelectTheAnswer's.

- [ ] **Step 4: Run** the component test → pass.

- [ ] **Step 5: Commit** — `feat(ui): add BuildEquation tap-to-place exercise component`.

---

### Task 6: Wire into LessonEngine

**Files:** Modify `src/components/lesson/LessonEngine.jsx`.

- [ ] **Step 1:** Import `MissingNumber` and `BuildEquation`.

- [ ] **Step 2:** Add two `case`s to the `exerciseComponent` switch:
  ```jsx
  case 'missing-number':
    return <MissingNumber key={exerciseIndex} {...props} />;
  case 'build-equation':
    return <BuildEquation key={exerciseIndex} {...props} />;
  ```

- [ ] **Step 3: Retry semantics.** `LessonEngine` allows one retry only when `type === 'type-answer'`. **Decision:** extend the retry allowance to `'missing-number'` (it's a typed numeric answer, same "oops typo" risk). Change the `canRetry` line:
  ```js
  const RETRYABLE = new Set(['type-answer', 'missing-number']);
  const canRetry = RETRYABLE.has(currentExercise.type) && !retryUsed;
  ```
  `build-equation` gets **no** retry (it's selection-based like select-answer). The wrong-answer `FeedbackBanner` shows `correctAnswer` + `equation`; for build-equation the `equation` field doesn't exist, so pass a friendly reconstruction (e.g. for build-equation set `feedback.equation` to ``${solution[0]} ${operator} ${solution[1]} = ${result}``). Simplest: in `handleAnswer`, when building the wrong-answer feedback, prefer `currentExercise.equation` and fall back to a reconstructed string for build-equation. Add that fallback.

- [ ] **Step 4: Run** the full suite `npx vitest run` → all green. Confirm `LessonEngine` existing tests still pass (no behavior change for the three legacy types).

- [ ] **Step 5: Commit** — `feat(lesson): render missing-number and build-equation exercises`.

---

### Task 7: Full verification

- [ ] **Step 1:** `npx vitest run` — all pass.
- [ ] **Step 2:** `npm run validate` — exits 0 (new types validated across every combo).
- [ ] **Step 3:** `npm run lint` — clean.
- [ ] **Step 4: Manual smoke (Playwright or dev server).** Start a lesson in each operation; confirm:
  - a `missing-number` problem renders with the blank on an operand and accepts the typed operand,
  - a `build-equation` problem renders 5 tray tiles + 2 slots, tap-to-place fills/clears, CHECK validates, fact-family swap (`4 × 6` for `6 × 4`) is accepted,
  - challenger division never shows a build-equation,
  - hearts/XP/streak behave (missing-number costs a heart after one retry like type-answer; build-equation costs a heart on first wrong, no retry).
- [ ] **Step 5:** `npx vite build` — succeeds.

---

## Test Plan

**Unit (vitest, generator):**
- Missing-number truth: substitute `correctAnswer` into `[]`, recompute, assert equal for all four operations across tiers/age bands.
- Missing-number safety: answer ≥ 0, finite; explorer division answer integer; division blanks only the dividend.
- Build-equation: solution produces result; tray = 5 (2 solution + 3 decoy); no unintended second solution; subtraction/division operand order fixed (result ≥ 0); challenger division falls back (zero build-equations emitted).
- Determinism: existing tests `vi.mock` `Math.random`; reuse that to pin a known triple and assert exact equation strings for one case per new type.

**Unit (vitest, components):**
- MissingNumber: renders blank in correct position; NumberPad typing + CHECK calls `onAnswer(Number)`.
- BuildEquation: render counts; tap-fill; tap-clear; CHECK disabled until full; correct assembly reports the result; wrong assembly reports a non-matching value; fact-family swap accepted.

**Integration:**
- `scripts/validate-exercises.js` sweep (the ~18k+ sample) passes with the new branches — this is the broad fuzz net for the generator.

**Manual:** the Task 7 Step 4 smoke list.

---

## Risks / Edge Cases / Out of Scope

**Risks & edge cases:**
- **Division-by-zero on recovery.** Avoided: multiplication factors are ≥ 1 by the generator's `randInt(max(1,lo), hi)`; division never blanks the divisor. Guard added for the theoretical `0` factor anyway.
- **Ambiguous Build-the-Equation (multiple true pairs from decoys).** The decoy filter explicitly rejects any decoy forming a second true pair; the validator re-checks this across the full fuzz sweep, so a generation bug fails CI rather than shipping a puzzle with two right answers.
- **Decoy starvation.** If `generateDistractors` + filter can't find 3 clean decoys (tiny number ranges, e.g. tier 1 starter), pad with bounded far values and cap attempts — same defensive pattern the existing distractor code uses. Tier-1 starter addition (range 0–4) is the worst case; verify the padding path produces 5 distinct non-second-solution tiles there.
- **FeedbackBanner expects an `equation`.** build-equation objects have no `[]` equation; we reconstruct one for the wrong-answer banner (Task 6 Step 3).
- **`getMaxExercises` count unaffected** because fallbacks always yield a valid exercise — no slot is ever empty.
- **Touch double-fire.** Tap-to-place uses plain `onClick`; framer-motion `whileTap` is cosmetic. Avoid attaching both `onClick` and a pointer drag handler (we deliberately don't do drag), which sidesteps the classic touch double-event bug.

**Out of scope:**
- Independent per-operation placement (the linear ladder note in the placement spec is unrelated here).
- Three-operand or multi-step equations; Build-the-Equation is binary (2 slots) only.
- Persisting which interaction type a kid struggles with / adaptive type selection.
- Drag-and-drop with pointer following (explicitly rejected in favor of tap-to-place).
- Challenger decimal-division Build-the-Equation (no clean draggable operands) — gated off, not attempted.
- Changing the `type-answer` / `select-answer` / `follow-pattern` legacy behavior.
