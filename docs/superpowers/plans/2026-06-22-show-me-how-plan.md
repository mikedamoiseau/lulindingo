# Show Me How — Worked Strategy on a Miss — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a kid gets a wrong answer, today's `FeedbackBanner` only restates "The answer is 56" with the filled equation. Add a tappable **"Show me how"** button that reveals an age-appropriate, operation-specific *worked strategy* built from the SAME operands in the missed exercise: counting-up dots for addition, a number-line jump for subtraction, a skip-count chain for multiplication, and equal-grouping for division. Because the strategy is **derived from the numbers** (not authored per-question), it works for every dynamically generated exercise.

**Architecture:** A pure builder `buildStrategy(equation, operation, ageBand)` (`src/utils/strategyBuilder.js`) parses the operands out of the equation string and returns a serializable **strategy descriptor** (a tagged union: `{ kind, ... }`). A new presentational `StrategyView` component switches on `descriptor.kind` and renders one of four sub-renderers (`CountUpDots`, `NumberLineJump`, `SkipCountChain`, `EqualGrouping`), each animated with framer-motion (already in the stack). `FeedbackBanner` gains a "Show me how" toggle on the wrong branch that mounts `StrategyView`. `LessonEngine` passes `operation` and `ageBand` through to the banner so the builder has everything it needs.

**Tech Stack:** React 19, framer-motion, Vitest + jsdom, CSS Modules.

---

## Overview & User Goal

- **User goal (kid):** "I got it wrong — *why?* Show me a way to figure it out next time." Not just the answer, but a concrete, visual method they can re-use.
- **User goal (parent/teacher):** Reinforce one canonical mental-math strategy per operation, age-tuned, without authoring content for thousands of generated questions.
- **Scope:** Purely additive to the wrong-answer feedback. No change to scoring, hearts, XP, generator, or DB. The strategy is opt-in per miss (tap to reveal) so it never slows down a confident kid.

---

## KEY DESIGN DECISIONS

Each is a concrete, opinionated call plus a one-line *why*.

1. **Operand parsing lives in the builder, off the existing equation string — no generator change.**
   Equations are always `"A <op> B = []"` (e.g. `5 + 3 = []`, `12 - 4 = []`, `6 × 7 = []`, `20 ÷ 4 = []`). The builder regex-matches `/^(\d+(?:\.\d+)?)\s*([+\-×÷])\s*(\d+(?:\.\d+)?)\s*=/` to pull `{ a, operator, b }`. *Why:* the generator already encodes operands and the literal `×`/`÷` glyphs in the string; re-deriving from it keeps the generator untouched and means a single source of truth for the numbers shown.

2. **The builder returns a serializable descriptor, not JSX.** Shape is a tagged union:
   `{ kind: 'count-up', from, addBy, total }` · `{ kind: 'number-line', start, jumpBack, end }` · `{ kind: 'skip-count', step, times, chain: number[], product }` · `{ kind: 'equal-groups', total, groups, perGroup }` · `{ kind: 'none', reason }`.
   *Why:* keeps all logic pure and trivially unit-testable; renderers become dumb and swappable; descriptors can later be logged/analytics'd.

3. **Operation → renderer mapping is fixed (operation drives the *visual*); ageBand drives *suitability and caps* (whether we show it at all + element counts).**

   | Operation | Renderer | Visual |
   |---|---|---|
   | addition | `CountUpDots` | render `b` dots appearing one-by-one onto a base of `a`, counting `a → a+1 → … → total` |
   | subtraction | `NumberLineJump` | a number line from `0..a`, an arc jumping back `b` from `a` to land on `a-b` |
   | multiplication | `SkipCountChain` | skip-count tokens `step, 2·step, …` shown as a growing chain "5, 10, 15, 20" with `times` hops |
   | division | `EqualGrouping` | `total` dots dealt into `groups` bins, `perGroup` per bin |

   *Why:* one strategy per operation keeps the mental model consistent for a kid across every miss; matches the feature brief exactly.

4. **Age + magnitude gating returns `{ kind: 'none' }` when a visual would be unhelpful (too many dots, decimals, huge numbers).** Caps: count-up only when `b <= 12` and `total <= 20` (brief calls out "6-7 addition"); number-line only when `a <= 20`; skip-count only when `times <= 12` and `step <= 12`; equal-groups only when `groups <= 12` and `perGroup <= 12`. Any non-integer operand or result → `none`. *Why:* a number line to 999 or 200 dots is noise; falling back to `none` lets the banner simply hide the button rather than render garbage. This is the **decimals/large-number/Challenger-division escape hatch**.

5. **Hook point is `FeedbackBanner`, state-local, lazy.** The banner already owns the wrong-answer branch. It computes the descriptor with `useMemo` and only when the user taps "Show me how" does it set `revealed = true` and mount `StrategyView`. *Why:* zero extra render cost on the common path; no new global state; the banner remounts per exercise (keyed by feedback) so reveal state resets naturally.

6. **`LessonEngine` passes `operation` + `ageBand` into the banner** (currently it only passes `correctAnswer` + `equation`). It already has `lesson.operation` and `ageBand` in scope. *Why:* the builder needs operation explicitly (the glyph alone is enough, but passing operation avoids re-deriving and matches the generator's vocabulary) and needs ageBand for gating.

7. **Animation via framer-motion `staggerChildren` + `AnimatePresence`.** Dots/tokens/hops are `motion` children with a parent `variants` stagger (~80ms) so the strategy "plays out" like a teacher drawing it. A "Replay" affordance re-triggers by bumping a `key`. *Why:* the stagger *is* the pedagogy (you watch it build); framer-motion is already imported in this component tree, no new dep.

8. **`prefers-reduced-motion` short-circuits the stagger to an instant render.** *Why:* accessibility + the strategy must still be fully legible as a static diagram.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/strategyBuilder.js` | Create | `parseOperands(equation)` + `buildStrategy(equation, operation, ageBand)` → descriptor |
| `src/utils/__tests__/strategyBuilder.test.js` | Create | Tests for parsing, mapping, gating, edge cases |
| `src/components/lesson/StrategyView.jsx` | Create | Switches on `descriptor.kind`, renders the right sub-renderer |
| `src/components/lesson/StrategyView.module.css` | Create | Shared layout + per-renderer styles |
| `src/components/lesson/strategies/CountUpDots.jsx` | Create | Addition visual |
| `src/components/lesson/strategies/NumberLineJump.jsx` | Create | Subtraction visual |
| `src/components/lesson/strategies/SkipCountChain.jsx` | Create | Multiplication visual |
| `src/components/lesson/strategies/EqualGrouping.jsx` | Create | Division visual |
| `src/components/lesson/FeedbackBanner.jsx` | Modify | Add "Show me how" toggle + mount `StrategyView` |
| `src/components/lesson/FeedbackBanner.module.css` | Modify | Style the toggle button + reveal region |
| `src/components/lesson/__tests__/FeedbackBanner.test.jsx` | Create | Button appears on wrong only; reveals view; hidden on `none`/correct |
| `src/components/lesson/LessonEngine.jsx` | Modify | Pass `operation` + `ageBand` to `FeedbackBanner` |

---

### Task 1: Strategy Builder (pure logic)

**Files:**
- Create: `src/utils/strategyBuilder.js`
- Create: `src/utils/__tests__/strategyBuilder.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/strategyBuilder.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseOperands, buildStrategy } from '../strategyBuilder';

describe('parseOperands', () => {
  it('parses addition', () => {
    expect(parseOperands('5 + 3 = []')).toEqual({ a: 5, operator: '+', b: 3 });
  });
  it('parses subtraction', () => {
    expect(parseOperands('12 - 4 = []')).toEqual({ a: 12, operator: '-', b: 4 });
  });
  it('parses multiplication with × glyph', () => {
    expect(parseOperands('6 × 7 = []')).toEqual({ a: 6, operator: '×', b: 7 });
  });
  it('parses division with ÷ glyph', () => {
    expect(parseOperands('20 ÷ 4 = []')).toEqual({ a: 20, operator: '÷', b: 4 });
  });
  it('parses decimals', () => {
    expect(parseOperands('7.5 ÷ 2 = []')).toEqual({ a: 7.5, operator: '÷', b: 2 });
  });
  it('returns null for unparseable input', () => {
    expect(parseOperands('what is x = []')).toBeNull();
    expect(parseOperands(undefined)).toBeNull();
  });
});

describe('buildStrategy — addition (count-up)', () => {
  it('builds count-up for small addition', () => {
    const s = buildStrategy('5 + 3 = []', 'addition', '6-7');
    expect(s).toEqual({ kind: 'count-up', from: 5, addBy: 3, total: 8 });
  });
  it('counts up from the LARGER operand (count-on strategy)', () => {
    const s = buildStrategy('2 + 9 = []', 'addition', '6-7');
    expect(s).toEqual({ kind: 'count-up', from: 9, addBy: 2, total: 11 });
  });
  it('falls back to none when total is too big to draw', () => {
    expect(buildStrategy('40 + 30 = []', 'addition', '8-10').kind).toBe('none');
  });
});

describe('buildStrategy — subtraction (number-line)', () => {
  it('builds a backward jump', () => {
    const s = buildStrategy('12 - 4 = []', 'subtraction', '6-7');
    expect(s).toEqual({ kind: 'number-line', start: 12, jumpBack: 4, end: 8 });
  });
  it('falls back to none for a large minuend', () => {
    expect(buildStrategy('250 - 30 = []', 'subtraction', '8-10').kind).toBe('none');
  });
});

describe('buildStrategy — multiplication (skip-count)', () => {
  it('builds a skip-count chain', () => {
    const s = buildStrategy('5 × 4 = []', 'multiplication', '8-10');
    expect(s.kind).toBe('skip-count');
    expect(s.product).toBe(20);
    // skip-counts by the SMALLER factor, repeated the LARGER number of times
    expect(s.step).toBe(4);
    expect(s.times).toBe(5);
    expect(s.chain).toEqual([4, 8, 12, 16, 20]);
  });
  it('falls back to none when factors are large', () => {
    expect(buildStrategy('40 × 30 = []', 'multiplication', '11-12').kind).toBe('none');
  });
});

describe('buildStrategy — division (equal-groups)', () => {
  it('builds equal groups for a clean division', () => {
    const s = buildStrategy('20 ÷ 4 = []', 'division', '8-10');
    expect(s).toEqual({ kind: 'equal-groups', total: 20, groups: 4, perGroup: 5 });
  });
  it('falls back to none for a decimal (Challenger) result', () => {
    expect(buildStrategy('7 ÷ 2 = []', 'division', '11-12').kind).toBe('none');
  });
  it('falls back to none when the dividend is too large to draw as dots', () => {
    expect(buildStrategy('144 ÷ 12 = []', 'division', '8-10').kind).toBe('none');
  });
});

describe('buildStrategy — guards', () => {
  it('returns none for unparseable equation', () => {
    expect(buildStrategy('???', 'addition', '6-7').kind).toBe('none');
  });
  it('returns none for any decimal operand', () => {
    expect(buildStrategy('5.5 + 3 = []', 'addition', '6-7').kind).toBe('none');
  });
  it('descriptor is always a plain serializable object', () => {
    const s = buildStrategy('5 + 3 = []', 'addition', '6-7');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail** — `npx vitest run src/utils/__tests__/strategyBuilder.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement the builder**

Create `src/utils/strategyBuilder.js`:

```js
/**
 * strategyBuilder.js
 *
 * Pure logic: turn a missed exercise's equation + operation into a
 * serializable "strategy descriptor" describing ONE worked mental-math
 * method built from the SAME operands. Renderers switch on descriptor.kind.
 *
 * Equations always look like "A <op> B = []" where <op> is + - × ÷.
 */

const EQUATION_RE = /^\s*(\d+(?:\.\d+)?)\s*([+\-×÷])\s*(\d+(?:\.\d+)?)\s*=/;

// Caps keep the visuals legible. Past these, fall back to { kind: 'none' }.
const CAPS = {
  addUpBy: 12,     // dots added (count-on)
  addTotal: 20,    // max running total to count to
  subStart: 20,    // max minuend for a hand-drawn number line
  mulStep: 12,     // skip-count step size
  mulTimes: 12,    // number of hops
  divDots: 30,     // max dividend rendered as dots
  divGroups: 12,   // max bins
  divPerGroup: 12, // max dots per bin
};

const NONE = (reason) => ({ kind: 'none', reason });

/** Parse "A op B = []" → { a, operator, b } or null. */
export function parseOperands(equation) {
  if (typeof equation !== 'string') return null;
  const m = equation.match(EQUATION_RE);
  if (!m) return null;
  return { a: parseFloat(m[1]), operator: m[2], b: parseFloat(m[3]) };
}

const isWhole = (n) => Number.isInteger(n);

/**
 * @param {string} equation  - e.g. "5 + 3 = []"
 * @param {string} operation - 'addition'|'subtraction'|'multiplication'|'division'
 * @param {string} ageBand   - reserved for future age tuning; caps already cover it
 * @returns descriptor (tagged union, always serializable)
 */
export function buildStrategy(equation, operation /*, ageBand */) {
  const ops = parseOperands(equation);
  if (!ops) return NONE('unparseable');
  const { a, b } = ops;
  if (!isWhole(a) || !isWhole(b)) return NONE('non-integer-operand');

  switch (operation) {
    case 'addition': {
      const total = a + b;
      const from = Math.max(a, b);
      const addBy = Math.min(a, b);
      if (addBy > CAPS.addUpBy || total > CAPS.addTotal) return NONE('too-large');
      return { kind: 'count-up', from, addBy, total };
    }
    case 'subtraction': {
      const end = a - b;
      if (end < 0) return NONE('negative');
      if (a > CAPS.subStart) return NONE('too-large');
      return { kind: 'number-line', start: a, jumpBack: b, end };
    }
    case 'multiplication': {
      const product = a * b;
      const step = Math.min(a, b);   // skip-count by the smaller factor
      const times = Math.max(a, b);  // repeated the larger number of times
      if (step > CAPS.mulStep || times > CAPS.mulTimes) return NONE('too-large');
      const chain = Array.from({ length: times }, (_, i) => step * (i + 1));
      return { kind: 'skip-count', step, times, chain, product };
    }
    case 'division': {
      if (b === 0) return NONE('divide-by-zero');
      const perGroup = a / b;
      if (!isWhole(perGroup)) return NONE('non-integer-result'); // Challenger decimals
      if (a > CAPS.divDots || b > CAPS.divGroups || perGroup > CAPS.divPerGroup) {
        return NONE('too-large');
      }
      return { kind: 'equal-groups', total: a, groups: b, perGroup };
    }
    default:
      return NONE('unknown-operation');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass** — `npx vitest run src/utils/__tests__/strategyBuilder.test.js` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/strategyBuilder.js src/utils/__tests__/strategyBuilder.test.js
git commit -m "feat: add strategyBuilder — operand parsing + worked-strategy descriptors"
```

---

### Task 2: Strategy Renderers + StrategyView

**Files:**
- Create: `src/components/lesson/strategies/CountUpDots.jsx`
- Create: `src/components/lesson/strategies/NumberLineJump.jsx`
- Create: `src/components/lesson/strategies/SkipCountChain.jsx`
- Create: `src/components/lesson/strategies/EqualGrouping.jsx`
- Create: `src/components/lesson/StrategyView.jsx`
- Create: `src/components/lesson/StrategyView.module.css`

- [ ] **Step 1: Create the four sub-renderers**

Each is a dumb presentational component taking a typed descriptor. Use framer-motion `staggerChildren`; respect reduced motion via `useReducedMotion()`.

`src/components/lesson/strategies/CountUpDots.jsx` — counting-on for addition:

```jsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function CountUpDots({ from, addBy, total }) {
  const reduce = useReducedMotion();
  const dots = Array.from({ length: addBy }, (_, i) => from + i + 1);
  return (
    <div className={styles.countUp}>
      <p className={styles.caption}>
        Start at <strong>{from}</strong>, then count on <strong>{addBy}</strong> more:
      </p>
      <motion.div
        className={styles.dotRow}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.18 } } }}
      >
        {dots.map((label) => (
          <motion.span
            key={label}
            className={styles.dot}
            variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
          >
            {label}
          </motion.span>
        ))}
      </motion.div>
      <p className={styles.result}>{from} + {addBy} = <strong>{total}</strong></p>
    </div>
  );
}
```

`src/components/lesson/strategies/NumberLineJump.jsx` — backward jump for subtraction. Render ticks `0..start`, a marker at `start`, and an animated arc/label jumping back to `end`:

```jsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function NumberLineJump({ start, jumpBack, end }) {
  const reduce = useReducedMotion();
  const ticks = Array.from({ length: start + 1 }, (_, i) => i);
  return (
    <div className={styles.numberLine}>
      <p className={styles.caption}>
        Start at <strong>{start}</strong> and jump back <strong>{jumpBack}</strong>:
      </p>
      <div className={styles.line}>
        {ticks.map((t) => (
          <span
            key={t}
            className={`${styles.tick} ${t === end ? styles.tickLanding : ''} ${t === start ? styles.tickStart : ''}`}
          >
            {t}
          </span>
        ))}
        <motion.span
          className={styles.jumper}
          initial={{ left: `${(start / start) * 100}%` }}
          animate={{ left: `${(end / start) * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.8, ease: 'easeInOut' }}
        >
          🐸
        </motion.span>
      </div>
      <p className={styles.result}>{start} − {jumpBack} = <strong>{end}</strong></p>
    </div>
  );
}
```

> Note: the jumper uses `left` percentage along the line; the CSS marks `.line` `position: relative` and `.jumper` `position: absolute`. If exact pixel alignment to a tick proves fiddly, an acceptable simpler v1 is a static arc label "−{jumpBack}" over the line with the landing tick highlighted — the descriptor already carries `end`.

`src/components/lesson/strategies/SkipCountChain.jsx` — skip-count chain for multiplication:

```jsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function SkipCountChain({ step, times, chain, product }) {
  const reduce = useReducedMotion();
  return (
    <div className={styles.skipCount}>
      <p className={styles.caption}>
        Count by <strong>{step}</strong>, <strong>{times}</strong> times:
      </p>
      <motion.div
        className={styles.chain}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.2 } } }}
      >
        {chain.map((n, i) => (
          <motion.span
            key={i}
            className={`${styles.chainToken} ${i === chain.length - 1 ? styles.chainLast : ''}`}
            variants={{ hidden: { y: 8, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          >
            {n}
          </motion.span>
        ))}
      </motion.div>
      <p className={styles.result}>{step} × {times} = <strong>{product}</strong></p>
    </div>
  );
}
```

`src/components/lesson/strategies/EqualGrouping.jsx` — deal dots into bins for division:

```jsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function EqualGrouping({ total, groups, perGroup }) {
  const reduce = useReducedMotion();
  return (
    <div className={styles.equalGroups}>
      <p className={styles.caption}>
        Share <strong>{total}</strong> into <strong>{groups}</strong> equal groups:
      </p>
      <motion.div
        className={styles.groupRow}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.12 } } }}
      >
        {Array.from({ length: groups }).map((_, g) => (
          <div key={g} className={styles.bin}>
            {Array.from({ length: perGroup }).map((_, d) => (
              <motion.span
                key={d}
                className={styles.groupDot}
                variants={{ hidden: { scale: 0 }, show: { scale: 1 } }}
              />
            ))}
          </div>
        ))}
      </motion.div>
      <p className={styles.result}>{total} ÷ {groups} = <strong>{perGroup}</strong> in each</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `StrategyView.jsx`** — the switch + a Replay control:

```jsx
import { useState } from 'react';
import CountUpDots from './strategies/CountUpDots';
import NumberLineJump from './strategies/NumberLineJump';
import SkipCountChain from './strategies/SkipCountChain';
import EqualGrouping from './strategies/EqualGrouping';
import styles from './StrategyView.module.css';

export default function StrategyView({ descriptor }) {
  const [playKey, setPlayKey] = useState(0);
  if (!descriptor || descriptor.kind === 'none') return null;

  const body = (() => {
    switch (descriptor.kind) {
      case 'count-up':     return <CountUpDots {...descriptor} />;
      case 'number-line':  return <NumberLineJump {...descriptor} />;
      case 'skip-count':   return <SkipCountChain {...descriptor} />;
      case 'equal-groups': return <EqualGrouping {...descriptor} />;
      default:             return null;
    }
  })();

  return (
    <div className={styles.strategy}>
      <div key={playKey}>{body}</div>
      <button className={styles.replay} onClick={() => setPlayKey((k) => k + 1)}>
        ▶ Play again
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `StrategyView.module.css`** using `src/index.css` tokens. Key rules:

```css
.strategy {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
}
.caption { font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-sm); }
.result  { font-size: var(--text-base); font-weight: 800; margin-top: var(--space-sm); }

/* count-up */
.dotRow { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
.dot {
  width: 36px; height: 36px; border-radius: var(--radius-full);
  display: flex; align-items: center; justify-content: center;
  background: var(--green); color: #06310a; font-weight: 800; font-size: var(--text-sm);
}

/* number line */
.line { position: relative; display: flex; gap: 2px; padding-top: 28px; overflow-x: auto; }
.tick { min-width: 22px; text-align: center; font-size: var(--text-xs); color: var(--text-secondary); }
.tickStart { color: var(--text-primary); font-weight: 800; }
.tickLanding { color: var(--green); font-weight: 800; }
.jumper { position: absolute; top: 0; transform: translateX(-50%); font-size: var(--text-lg); }

/* skip-count */
.chain { display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: center; }
.chainToken {
  padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm);
  background: var(--surface); border: 2px solid var(--blue); font-weight: 800;
}
.chainLast { background: var(--blue); color: #04293b; }

/* equal groups */
.groupRow { display: flex; flex-wrap: wrap; gap: var(--space-md); }
.bin {
  display: flex; flex-wrap: wrap; gap: 4px; padding: var(--space-sm);
  border: 2px dashed var(--border); border-radius: var(--radius-sm);
  max-width: 96px;
}
.groupDot { width: 14px; height: 14px; border-radius: var(--radius-full); background: var(--yellow); }

.replay {
  margin-top: var(--space-sm); font-size: var(--text-sm); font-weight: 700;
  color: var(--blue); background: transparent; padding: var(--space-xs) 0;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/lesson/StrategyView.jsx src/components/lesson/StrategyView.module.css src/components/lesson/strategies/
git commit -m "feat: add StrategyView and four worked-strategy renderers"
```

---

### Task 3: Wire "Show me how" into FeedbackBanner

**Files:**
- Modify: `src/components/lesson/FeedbackBanner.jsx`
- Modify: `src/components/lesson/FeedbackBanner.module.css`
- Create: `src/components/lesson/__tests__/FeedbackBanner.test.jsx`

- [ ] **Step 1: Write failing component tests**

Create `src/components/lesson/__tests__/FeedbackBanner.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackBanner from '../FeedbackBanner';

const baseWrong = {
  isCorrect: false,
  correctAnswer: 8,
  equation: '5 + 3 = []',
  operation: 'addition',
  ageBand: '6-7',
  onContinue: () => {},
};

describe('FeedbackBanner — Show me how', () => {
  it('shows the button on a wrong answer with a drawable strategy', () => {
    render(<FeedbackBanner {...baseWrong} />);
    expect(screen.getByRole('button', { name: /show me how/i })).toBeInTheDocument();
  });

  it('does NOT show the button on a correct answer', () => {
    render(<FeedbackBanner {...baseWrong} isCorrect correctAnswer={8} />);
    expect(screen.queryByRole('button', { name: /show me how/i })).toBeNull();
  });

  it('does NOT show the button when the strategy is not drawable (decimal)', () => {
    render(<FeedbackBanner {...baseWrong} equation="7 ÷ 2 = []" operation="division" correctAnswer={3.5} />);
    expect(screen.queryByRole('button', { name: /show me how/i })).toBeNull();
  });

  it('reveals the strategy when tapped', () => {
    render(<FeedbackBanner {...baseWrong} />);
    fireEvent.click(screen.getByRole('button', { name: /show me how/i }));
    expect(screen.getByText(/count on/i)).toBeInTheDocument();
  });

  it('still renders nothing extra in retry mode', () => {
    render(<FeedbackBanner {...baseWrong} isRetry />);
    expect(screen.queryByRole('button', { name: /show me how/i })).toBeNull();
  });
});
```

> If `@testing-library/react` is not yet a dev dependency, add it: `npm i -D @testing-library/react @testing-library/jest-dom`. The repo already runs vitest + jsdom (`src/test-setup.js`); import `@testing-library/jest-dom` matchers there or at the top of the test. Verify with `grep` in `package.json` first; the placement-test plan's Playwright smoke implies UI testing exists but unit-level RTL may need adding.

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/components/lesson/__tests__/FeedbackBanner.test.jsx` → FAIL.

- [ ] **Step 3: Modify `FeedbackBanner.jsx`**

Add imports and props; compute the descriptor lazily; add the toggle in the wrong branch only:

```jsx
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildStrategy } from '../../utils/strategyBuilder';
import StrategyView from './StrategyView';
import styles from './FeedbackBanner.module.css';
```

Extend the signature:

```jsx
export default function FeedbackBanner({
  isCorrect, correctAnswer, equation, operation, ageBand, onContinue, isRetry,
}) {
```

Retry branch unchanged. In the main banner, inside the wrong branch, after the existing `<div className={styles.wrongContent}>…</div>`:

```jsx
const [revealed, setRevealed] = useState(false);
const descriptor = useMemo(
  () => (!isCorrect && !isRetry ? buildStrategy(equation, operation, ageBand) : null),
  [isCorrect, isRetry, equation, operation, ageBand]
);
const canShow = descriptor && descriptor.kind !== 'none';
```

> Hooks must be called unconditionally — declare `revealed`/`descriptor` at the top of the component, before the `isRetry` early return is reached. Restructure so the `isRetry` return comes *after* the hook calls (move the hooks above it).

Render, within the wrong `<div className={styles.wrongContent}>`:

```jsx
{canShow && !revealed && (
  <button className={styles.showMeBtn} onClick={() => setRevealed(true)}>
    💡 Show me how
  </button>
)}
{canShow && revealed && (
  <AnimatePresence>
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
    >
      <StrategyView descriptor={descriptor} />
    </motion.div>
  </AnimatePresence>
)}
```

- [ ] **Step 4: Add styles to `FeedbackBanner.module.css`**

```css
.showMeBtn {
  align-self: flex-start;
  margin-top: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  background: var(--blue);
  color: #04293b;
  font-size: var(--text-sm);
  font-weight: 800;
}
```

- [ ] **Step 5: Run tests** — `npx vitest run src/components/lesson/__tests__/FeedbackBanner.test.jsx` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/lesson/FeedbackBanner.jsx src/components/lesson/FeedbackBanner.module.css src/components/lesson/__tests__/FeedbackBanner.test.jsx
git commit -m "feat: add Show me how toggle to FeedbackBanner"
```

---

### Task 4: Pass operation + ageBand from LessonEngine

**Files:**
- Modify: `src/components/lesson/LessonEngine.jsx`

- [ ] **Step 1: Pass the new props.** `LessonEngine` already has `lesson.operation` and `ageBand` in scope. Update the `<FeedbackBanner>` render (around lines 202–209):

```jsx
<FeedbackBanner
  isCorrect={feedback.isCorrect}
  isRetry={feedback.isRetry}
  correctAnswer={feedback.correctAnswer}
  equation={feedback.equation}
  operation={lesson.operation}
  ageBand={ageBand}
  onContinue={handleContinue}
/>
```

No other change needed — `feedback.equation` is already set on the wrong branch in `handleAnswer`.

- [ ] **Step 2: Run the full suite** — `npx vitest run` → all PASS. Then `npm run lint`.

- [ ] **Step 3: Commit**

```bash
git add src/components/lesson/LessonEngine.jsx
git commit -m "feat: pass operation + ageBand to FeedbackBanner for Show me how"
```

---

### Task 5: Full Verification

- [ ] **Step 1:** `npx vitest run` — all green.
- [ ] **Step 2:** `npm run lint` — clean.
- [ ] **Step 3:** `npm run build` — succeeds.
- [ ] **Step 4: Manual / Playwright smoke** — start a Starter (6-7) addition lesson, deliberately answer wrong twice (exhaust the retry on type-answer), tap **Show me how**, confirm the count-up dots animate and read correctly. Repeat for a subtraction lesson (number line), an Explorer multiplication lesson (skip-count), and an Explorer division lesson (equal groups). Confirm a Challenger division miss with a decimal result shows **no** button.

---

## Test Plan

**Pure builder (`strategyBuilder.test.js`)** — the bulk of coverage:
- `parseOperands`: each operator incl. `×`/`÷` glyphs, decimals, unparseable, non-string.
- One happy-path descriptor per operation with exact expected shape.
- Count-on picks the larger operand as `from`.
- Skip-count uses smaller factor as `step`, larger as `times`, and builds the right `chain`.
- Division returns `equal-groups` only for clean integer quotients.
- Gating returns `kind: 'none'` for: decimals, large totals/minuends/factors/dividends, divide-by-zero, unknown operation.
- Descriptor is JSON round-trippable (serializable invariant).

**Component (`FeedbackBanner.test.jsx`)**:
- Button present only on wrong + drawable; absent on correct, retry, and `none` (decimal) cases.
- Tapping reveals the strategy body (assert on caption text).

**Full sweep:** existing `npm run validate` is unaffected (no generator change) but run it once to confirm. `npx vitest run` + `npm run lint` + `npm run build` gate the merge.

---

## Risks / Edge Cases / Out of Scope

**Edge cases handled by `{ kind: 'none' }` (button simply hidden):**
- **Challenger division decimals** (`7 ÷ 2 = 3.5`) — non-integer quotient → `none`. This is the headline edge case in the brief.
- **Large numbers** — 8-10 addition to 1,000 / Challenger multiplication to 1,000,000 would mean thousands of dots; caps reject them. The strategy is a *teaching aid for small numbers*; for big ones the plain "the answer is N" feedback stands.
- **Decimal operands** anywhere → `none`.
- **Divide-by-zero / negative subtraction** — guarded (generator shouldn't produce these, but the builder is defensive since it parses arbitrary strings).
- **Number-line layout for `start` near the cap (20 ticks)** — the line scrolls horizontally (`overflow-x: auto`); acceptable.

**Risks:**
- **Hooks-order regression in FeedbackBanner** — the `isRetry` early return must move below the hook calls or React will throw. Called out explicitly in Task 3 Step 3.
- **RTL not yet a dev dep** — Task 3 Step 1 notes adding `@testing-library/react` if `package.json` lacks it. If the team prefers no new test dep, the builder tests alone give the critical coverage and the component can be smoke-tested via Playwright instead.
- **Number-line pixel alignment of the jumper** — flagged with a simpler static-arc fallback that still uses the descriptor's `end`.
- **`follow-pattern` exercises** — their `equation` is the final step's `"A op B = []"`, so the builder works unchanged; the strategy explains the last step, which is the one the kid missed. Acceptable.

**Out of scope:**
- Changing the exercise generator, DB schema, scoring, hearts, XP, or streaks.
- Authored / textual hints beyond the four visual strategies.
- Strategy for `select-answer` distractor reasoning or `follow-pattern` sequence logic (we explain the final equation only).
- Per-child preference to auto-expand the strategy, analytics on taps, or localized captions (English only for v1).
- Strategies for numbers above the caps (intentionally left to the existing plain feedback).
