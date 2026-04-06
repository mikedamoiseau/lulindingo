# Dynamic Exercise Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static hardcoded exercises with a runtime generator that scales number ranges by ageBand and adds multiplication/division for Explorer/Challenger.

**Architecture:** A pure `generateExercises(operation, ageBand, tier, count)` function creates exercises at lesson start. Units become operation-based (Addition, Subtraction, Multiplication, Division). Lessons are lightweight metadata with a `tier` field that controls difficulty ramp. LessonEngine calls the generator instead of reading stored exercises.

**Tech Stack:** React, Zustand, Dexie (IndexedDB), Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/exerciseGenerator.js` | Create | Pure function: generates exercises for an operation + ageBand + tier |
| `src/utils/__tests__/exerciseGenerator.test.js` | Create | Tests for all operations × ageBands × tiers |
| `src/data/math/units.js` | Replace | 4 operation-based units with `operation` field |
| `src/db/seed.js` | Rewrite | Seed lightweight lessons (5 per unit, tier 1-5, no exercises) |
| `src/db/__tests__/seed.test.js` | Rewrite | Update counts and assertions for new schema |
| `src/utils/skipUnits.js` | Rewrite | New unit IDs, new skip mapping |
| `src/utils/__tests__/skipUnits.test.js` | Rewrite | Tests for new skip mapping |
| `src/components/lesson/LessonEngine.jsx` | Modify | Call generator, look up unit operation |
| `src/data/math/lessons/*.js` | Delete | No longer needed |

---

### Task 1: Exercise Generator — Core + Addition

**Files:**
- Create: `src/utils/exerciseGenerator.js`
- Create: `src/utils/__tests__/exerciseGenerator.test.js`

- [ ] **Step 1: Write failing tests for addition generation**

Create `src/utils/__tests__/exerciseGenerator.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { generateExercises } from '../exerciseGenerator';

describe('generateExercises', () => {
  describe('addition', () => {
    it('returns the requested number of exercises', () => {
      const exercises = generateExercises('addition', '6-7', 1, 10);
      expect(exercises).toHaveLength(10);
    });

    it('each exercise has type, equation, and correctAnswer', () => {
      const exercises = generateExercises('addition', '6-7', 1, 10);
      for (const ex of exercises) {
        expect(ex.type).toMatch(/^(type-answer|select-answer|follow-pattern)$/);
        expect(ex.equation).toBeDefined();
        expect(ex.correctAnswer).toBeDefined();
      }
    });

    it('select-answer exercises have options containing correctAnswer', () => {
      const exercises = generateExercises('addition', '8-10', 3, 20);
      const selectExercises = exercises.filter((e) => e.type === 'select-answer');
      expect(selectExercises.length).toBeGreaterThan(0);
      for (const ex of selectExercises) {
        expect(ex.options).toContain(ex.correctAnswer);
        expect(ex.options).toHaveLength(3);
      }
    });

    it('follow-pattern exercises have valid pattern', () => {
      const exercises = generateExercises('addition', '8-10', 3, 20);
      const patternExercises = exercises.filter((e) => e.type === 'follow-pattern');
      expect(patternExercises.length).toBeGreaterThan(0);
      for (const ex of patternExercises) {
        expect(ex.pattern).toHaveLength(3);
        expect(ex.pattern[0].result).toEqual(expect.any(Number));
        expect(ex.pattern[1].result).toEqual(expect.any(Number));
        expect(ex.pattern[2].result).toBeNull();
        expect(ex.options).toHaveLength(2);
        expect(ex.options).toContain(ex.correctAnswer);
      }
    });

    it('Starter (6-7) addition stays within 0-10', () => {
      const exercises = generateExercises('addition', '6-7', 5, 30);
      for (const ex of exercises) {
        expect(ex.correctAnswer).toBeLessThanOrEqual(10);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });

    it('Explorer (8-10) addition stays within 0-1000', () => {
      const exercises = generateExercises('addition', '8-10', 5, 30);
      for (const ex of exercises) {
        expect(ex.correctAnswer).toBeLessThanOrEqual(1000);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });

    it('Challenger (11-12) addition stays within 0-1000000', () => {
      const exercises = generateExercises('addition', '11-12', 5, 30);
      for (const ex of exercises) {
        expect(ex.correctAnswer).toBeLessThanOrEqual(1000000);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });

    it('higher tiers produce larger numbers on average', () => {
      const tier1 = generateExercises('addition', '8-10', 1, 50);
      const tier5 = generateExercises('addition', '8-10', 5, 50);
      const avg1 = tier1.reduce((s, e) => s + e.correctAnswer, 0) / tier1.length;
      const avg5 = tier5.reduce((s, e) => s + e.correctAnswer, 0) / tier5.length;
      expect(avg5).toBeGreaterThan(avg1);
    });

    it('equations have correct arithmetic', () => {
      const exercises = generateExercises('addition', '8-10', 3, 30);
      for (const ex of exercises) {
        if (ex.type === 'type-answer' || ex.type === 'select-answer') {
          const match = ex.equation.match(/(\d+)\s*\+\s*(\d+)/);
          if (match) {
            expect(ex.correctAnswer).toBe(Number(match[1]) + Number(match[2]));
          }
        }
      }
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/exerciseGenerator.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the exercise generator with addition support**

Create `src/utils/exerciseGenerator.js`:

```js
const RANGES = {
  '6-7': 10,
  '8-10': 1000,
  '11-12': 1000000,
};

function getTierRange(ageBand, tier) {
  const max = RANGES[ageBand] || 1000;
  const sliceSize = max / 5;
  const lo = Math.floor((tier - 1) * sliceSize);
  const hi = Math.floor(tier * sliceSize);
  return { lo: Math.max(lo, 1), hi };
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeDistractors(correct, count, ageBand) {
  const distractors = new Set();
  const range = correct < 20 ? 3 : correct < 1000 ? Math.ceil(correct * 0.15) : Math.ceil(correct * 0.1);
  while (distractors.size < count) {
    const offset = randInt(1, Math.max(range, 1)) * (Math.random() < 0.5 ? -1 : 1);
    const d = correct + offset;
    if (d >= 0 && d !== correct) distractors.add(d);
  }
  return [...distractors];
}

function generateAddition(ageBand, tier) {
  const { lo, hi } = getTierRange(ageBand, tier);
  const halfHi = Math.floor(hi / 2);
  const a = randInt(lo, Math.max(halfHi, lo));
  const b = randInt(lo, Math.max(halfHi, lo));
  return { a, b, answer: a + b, equation: `${a} + ${b} = []` };
}

function generateSubtraction(ageBand, tier) {
  const { lo, hi } = getTierRange(ageBand, tier);
  let a = randInt(lo, hi);
  let b = randInt(lo, Math.min(a, hi));
  if (b > a) [a, b] = [b, a];
  return { a, b, answer: a - b, equation: `${a} - ${b} = []` };
}

function generateMultiplication(ageBand, tier) {
  const maxFactor = ageBand === '11-12' ? 1000 : 50;
  const sliceSize = maxFactor / 5;
  const lo = Math.max(Math.floor((tier - 1) * sliceSize), 2);
  const hi = Math.floor(tier * sliceSize);
  const a = randInt(lo, hi);
  const b = randInt(lo, hi);
  return { a, b, answer: a * b, equation: `${a} × ${b} = []` };
}

function generateDivision(ageBand, tier) {
  if (ageBand === '11-12') {
    const { lo, hi } = getTierRange(ageBand, tier);
    const a = randInt(Math.max(lo, 2), hi);
    const b = randInt(2, Math.min(Math.floor(Math.sqrt(a)), 1000) || 2);
    const answer = Math.round((a / b) * 100) / 100;
    return { a, b, answer, equation: `${a} ÷ ${b} = []` };
  }
  // Explorer: integer division
  const maxFactor = 50;
  const sliceSize = maxFactor / 5;
  const lo = Math.max(Math.floor((tier - 1) * sliceSize), 2);
  const hi = Math.floor(tier * sliceSize);
  const b = randInt(lo, hi);
  const answer = randInt(lo, hi);
  const a = b * answer;
  return { a, b, answer, equation: `${a} ÷ ${b} = []` };
}

const GENERATORS = {
  addition: generateAddition,
  subtraction: generateSubtraction,
  multiplication: generateMultiplication,
  division: generateDivision,
};

function makeTypeAnswer(gen, ageBand, tier) {
  const { equation, answer } = gen(ageBand, tier);
  return { type: 'type-answer', equation, correctAnswer: answer };
}

function makeSelectAnswer(gen, ageBand, tier) {
  const { equation, answer } = gen(ageBand, tier);
  const distractors = makeDistractors(answer, 2, ageBand);
  const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
  return { type: 'select-answer', equation, correctAnswer: answer, options };
}

function makeFollowPattern(gen, ageBand, tier) {
  // Generate a base, then increment one operand
  const base = gen(ageBand, tier);
  const step = base.a < 100 ? 1 : base.a < 10000 ? 10 : 100;
  const op = GENERATORS[Object.keys(GENERATORS).find((k) => GENERATORS[k] === gen)];

  let expr1, expr2, expr3, res1, res2, res3;

  if (gen === generateAddition) {
    const a0 = base.a;
    expr1 = `${a0} + ${base.b}`;     res1 = a0 + base.b;
    expr2 = `${a0 + step} + ${base.b}`; res2 = a0 + step + base.b;
    expr3 = `${a0 + step * 2} + ${base.b}`; res3 = a0 + step * 2 + base.b;
  } else if (gen === generateSubtraction) {
    const a0 = base.a + step * 2;
    expr1 = `${a0} - ${base.b}`;     res1 = a0 - base.b;
    expr2 = `${a0 + step} - ${base.b}`; res2 = a0 + step - base.b;
    expr3 = `${a0 + step * 2} - ${base.b}`; res3 = a0 + step * 2 - base.b;
  } else if (gen === generateMultiplication) {
    const a0 = base.a;
    expr1 = `${a0} × ${base.b}`;     res1 = a0 * base.b;
    expr2 = `${a0 + 1} × ${base.b}`; res2 = (a0 + 1) * base.b;
    expr3 = `${a0 + 2} × ${base.b}`; res3 = (a0 + 2) * base.b;
  } else {
    // Division: use integer-friendly patterns
    const b = base.b || 2;
    const ans0 = Math.max(base.answer || 2, 2);
    expr1 = `${b * ans0} ÷ ${b}`;       res1 = ans0;
    expr2 = `${b * (ans0 + 1)} ÷ ${b}`; res2 = ans0 + 1;
    expr3 = `${b * (ans0 + 2)} ÷ ${b}`; res3 = ans0 + 2;
  }

  const distractor = res3 + (Math.random() < 0.5 ? -1 : 1);
  return {
    type: 'follow-pattern',
    equation: expr3 + ' = []',
    correctAnswer: res3,
    options: [res3, distractor >= 0 ? distractor : res3 + 1].sort(() => Math.random() - 0.5),
    pattern: [
      { expression: expr1, result: res1 },
      { expression: expr2, result: res2 },
      { expression: expr3, result: null },
    ],
  };
}

/**
 * Generate exercises for a given operation, ageBand, and tier.
 * @param {'addition'|'subtraction'|'multiplication'|'division'} operation
 * @param {'6-7'|'8-10'|'11-12'} ageBand
 * @param {number} tier - 1 to 5
 * @param {number} count - number of exercises to generate
 * @returns {Array} exercise objects compatible with LessonEngine
 */
export function generateExercises(operation, ageBand, tier, count = 10) {
  const gen = GENERATORS[operation];
  if (!gen) throw new Error(`Unknown operation: ${operation}`);

  const makers = [makeTypeAnswer, makeSelectAnswer, makeFollowPattern];
  const exercises = [];
  for (let i = 0; i < count; i++) {
    const maker = makers[i % 3];
    exercises.push(maker(gen, ageBand, tier));
  }
  return exercises;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/exerciseGenerator.test.js`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/exerciseGenerator.js src/utils/__tests__/exerciseGenerator.test.js
git commit -m "feat: add exercise generator with addition support"
```

---

### Task 2: Exercise Generator — Subtraction, Multiplication, Division Tests

**Files:**
- Modify: `src/utils/__tests__/exerciseGenerator.test.js`

- [ ] **Step 1: Add tests for subtraction**

Append to the `describe('generateExercises')` block in `src/utils/__tests__/exerciseGenerator.test.js`:

```js
  describe('subtraction', () => {
    it('results are never negative', () => {
      const exercises = generateExercises('subtraction', '8-10', 3, 30);
      for (const ex of exercises) {
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });

    it('equations have correct arithmetic', () => {
      const exercises = generateExercises('subtraction', '8-10', 3, 30);
      for (const ex of exercises) {
        if (ex.type === 'type-answer' || ex.type === 'select-answer') {
          const match = ex.equation.match(/(\d+)\s*-\s*(\d+)/);
          if (match) {
            expect(ex.correctAnswer).toBe(Number(match[1]) - Number(match[2]));
          }
        }
      }
    });

    it('Starter stays within 0-10', () => {
      const exercises = generateExercises('subtraction', '6-7', 5, 30);
      for (const ex of exercises) {
        expect(ex.correctAnswer).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('multiplication', () => {
    it('Explorer factors produce results within range', () => {
      const exercises = generateExercises('multiplication', '8-10', 5, 30);
      for (const ex of exercises) {
        expect(ex.correctAnswer).toBeGreaterThan(0);
      }
    });

    it('equations have correct arithmetic', () => {
      const exercises = generateExercises('multiplication', '8-10', 3, 30);
      for (const ex of exercises) {
        if (ex.type === 'type-answer' || ex.type === 'select-answer') {
          const match = ex.equation.match(/(\d+)\s*×\s*(\d+)/);
          if (match) {
            expect(ex.correctAnswer).toBe(Number(match[1]) * Number(match[2]));
          }
        }
      }
    });
  });

  describe('division', () => {
    it('Explorer division always produces integer results', () => {
      const exercises = generateExercises('division', '8-10', 3, 30);
      for (const ex of exercises) {
        expect(Number.isInteger(ex.correctAnswer)).toBe(true);
      }
    });

    it('Challenger division can produce decimal results', () => {
      // Generate many and check at least some are non-integer
      const exercises = generateExercises('division', '11-12', 3, 50);
      const hasDecimal = exercises.some((e) => !Number.isInteger(e.correctAnswer));
      expect(hasDecimal).toBe(true);
    });

    it('Challenger division rounds to 2dp', () => {
      const exercises = generateExercises('division', '11-12', 3, 30);
      for (const ex of exercises) {
        const str = String(ex.correctAnswer);
        const decimals = str.includes('.') ? str.split('.')[1].length : 0;
        expect(decimals).toBeLessThanOrEqual(2);
      }
    });

    it('equations have correct arithmetic', () => {
      const exercises = generateExercises('division', '8-10', 3, 30);
      for (const ex of exercises) {
        if (ex.type === 'type-answer' || ex.type === 'select-answer') {
          const match = ex.equation.match(/(\d+)\s*÷\s*(\d+)/);
          if (match) {
            expect(ex.correctAnswer).toBe(Number(match[1]) / Number(match[2]));
          }
        }
      }
    });
  });

  it('throws on unknown operation', () => {
    expect(() => generateExercises('modulo', '8-10', 1, 5)).toThrow('Unknown operation');
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/exerciseGenerator.test.js`
Expected: All tests PASS (the generator already handles all operations from Task 1)

- [ ] **Step 3: Commit**

```bash
git add src/utils/__tests__/exerciseGenerator.test.js
git commit -m "test: add subtraction, multiplication, division generator tests"
```

---

### Task 3: New Units + Seed

**Files:**
- Rewrite: `src/data/math/units.js`
- Rewrite: `src/db/seed.js`
- Rewrite: `src/db/__tests__/seed.test.js`
- Delete: `src/data/math/lessons/addition-1.js`
- Delete: `src/data/math/lessons/addition-2.js`
- Delete: `src/data/math/lessons/addition-3.js`
- Delete: `src/data/math/lessons/subtraction-1.js`
- Delete: `src/data/math/lessons/subtraction-2.js`

- [ ] **Step 1: Replace units.js**

Replace `src/data/math/units.js` entirely:

```js
const units = [
  {
    id: 'math-addition',
    moduleId: 'math',
    title: 'Addition',
    operation: 'addition',
    order: 1,
    iconEmoji: '➕',
    description: 'Adding numbers',
  },
  {
    id: 'math-subtraction',
    moduleId: 'math',
    title: 'Subtraction',
    operation: 'subtraction',
    order: 2,
    iconEmoji: '➖',
    description: 'Subtracting numbers',
  },
  {
    id: 'math-multiplication',
    moduleId: 'math',
    title: 'Multiplication',
    operation: 'multiplication',
    order: 3,
    iconEmoji: '✖️',
    description: 'Multiplying numbers',
  },
  {
    id: 'math-division',
    moduleId: 'math',
    title: 'Division',
    operation: 'division',
    order: 4,
    iconEmoji: '➗',
    description: 'Dividing numbers',
  },
];

export default units;
```

- [ ] **Step 2: Rewrite seed.js**

Replace `src/db/seed.js` entirely:

```js
import { db } from './database';

export async function seedDatabase() {
  const unitCount = await db.units.count();
  if (unitCount > 0) return;

  const { default: units } = await import('../data/math/units.js');
  await db.units.bulkAdd(units);

  const lessons = [];
  for (const unit of units) {
    for (let tier = 1; tier <= 5; tier++) {
      lessons.push({
        id: `${unit.id}-lesson-${tier}`,
        unitId: unit.id,
        order: tier,
        tier,
        operation: unit.operation,
      });
    }
  }
  await db.lessons.bulkAdd(lessons);
}
```

- [ ] **Step 3: Delete static lesson files**

```bash
rm src/data/math/lessons/addition-1.js src/data/math/lessons/addition-2.js src/data/math/lessons/addition-3.js src/data/math/lessons/subtraction-1.js src/data/math/lessons/subtraction-2.js
rmdir src/data/math/lessons
```

- [ ] **Step 4: Rewrite seed test**

Replace `src/db/__tests__/seed.test.js` entirely:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../database';
import { seedDatabase } from '../seed';

beforeEach(async () => {
  await db.users.clear();
  await db.units.clear();
  await db.lessons.clear();
  await db.progress.clear();
  await db.streakHistory.clear();
});

describe('seedDatabase', () => {
  it('seeds 4 units', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    expect(units).toHaveLength(4);
    const titles = units.map((u) => u.title);
    expect(titles).toContain('Addition');
    expect(titles).toContain('Subtraction');
    expect(titles).toContain('Multiplication');
    expect(titles).toContain('Division');
  });

  it('seeds 20 lessons (5 per unit)', async () => {
    await seedDatabase();
    const lessons = await db.lessons.toArray();
    expect(lessons).toHaveLength(20);
  });

  it('each lesson has tier, operation, and no exercises', async () => {
    await seedDatabase();
    const lessons = await db.lessons.toArray();
    for (const lesson of lessons) {
      expect(lesson.tier).toBeGreaterThanOrEqual(1);
      expect(lesson.tier).toBeLessThanOrEqual(5);
      expect(lesson.operation).toBeDefined();
      expect(lesson.exercises).toBeUndefined();
    }
  });

  it('each unit has exactly 5 lessons with tiers 1-5', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    const lessons = await db.lessons.toArray();
    for (const unit of units) {
      const unitLessons = lessons.filter((l) => l.unitId === unit.id);
      expect(unitLessons).toHaveLength(5);
      const tiers = unitLessons.map((l) => l.tier).sort();
      expect(tiers).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('every lesson references a valid unit', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    const unitIds = new Set(units.map((u) => u.id));
    const lessons = await db.lessons.toArray();
    for (const lesson of lessons) {
      expect(unitIds.has(lesson.unitId)).toBe(true);
    }
  });

  it('is idempotent', async () => {
    await seedDatabase();
    const firstCount = await db.units.count();
    await seedDatabase();
    const secondCount = await db.units.count();
    expect(firstCount).toBe(secondCount);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/db/__tests__/seed.test.js`
Expected: All 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/math/units.js src/db/seed.js src/db/__tests__/seed.test.js
git rm src/data/math/lessons/addition-1.js src/data/math/lessons/addition-2.js src/data/math/lessons/addition-3.js src/data/math/lessons/subtraction-1.js src/data/math/lessons/subtraction-2.js
git commit -m "feat: replace static lessons with lightweight metadata + 4 operation-based units"
```

---

### Task 4: Update Skip Logic

**Files:**
- Rewrite: `src/utils/skipUnits.js`
- Rewrite: `src/utils/__tests__/skipUnits.test.js`

- [ ] **Step 1: Rewrite skipUnits.js**

Replace `src/utils/skipUnits.js`:

```js
const SKIP_UNITS_BY_BAND = {
  '6-7': [],
  '8-10': [],
  '11-12': ['math-addition', 'math-subtraction'],
};

/**
 * Returns lesson IDs that should be auto-completed for a given ageBand.
 * @param {string} ageBand
 * @param {Array<{id: string, unitId: string}>} allLessons
 * @returns {string[]}
 */
export function getSkippedLessonIds(ageBand, allLessons) {
  const unitsToSkip = SKIP_UNITS_BY_BAND[ageBand] || [];
  return allLessons
    .filter((lesson) => unitsToSkip.includes(lesson.unitId))
    .map((lesson) => lesson.id);
}
```

- [ ] **Step 2: Rewrite skipUnits test**

Replace `src/utils/__tests__/skipUnits.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getSkippedLessonIds } from '../skipUnits';

const allLessons = [
  { id: 'math-addition-lesson-1', unitId: 'math-addition' },
  { id: 'math-addition-lesson-2', unitId: 'math-addition' },
  { id: 'math-addition-lesson-3', unitId: 'math-addition' },
  { id: 'math-addition-lesson-4', unitId: 'math-addition' },
  { id: 'math-addition-lesson-5', unitId: 'math-addition' },
  { id: 'math-subtraction-lesson-1', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-2', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-3', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-4', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-5', unitId: 'math-subtraction' },
  { id: 'math-multiplication-lesson-1', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-2', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-3', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-4', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-5', unitId: 'math-multiplication' },
  { id: 'math-division-lesson-1', unitId: 'math-division' },
  { id: 'math-division-lesson-2', unitId: 'math-division' },
  { id: 'math-division-lesson-3', unitId: 'math-division' },
  { id: 'math-division-lesson-4', unitId: 'math-division' },
  { id: 'math-division-lesson-5', unitId: 'math-division' },
];

describe('getSkippedLessonIds', () => {
  it('Starter (6-7) skips nothing', () => {
    expect(getSkippedLessonIds('6-7', allLessons)).toEqual([]);
  });

  it('Explorer (8-10) skips nothing', () => {
    expect(getSkippedLessonIds('8-10', allLessons)).toEqual([]);
  });

  it('Challenger (11-12) skips Addition + Subtraction', () => {
    const skipped = getSkippedLessonIds('11-12', allLessons);
    expect(skipped).toHaveLength(10);
    expect(skipped.filter((id) => id.includes('addition'))).toHaveLength(5);
    expect(skipped.filter((id) => id.includes('subtraction'))).toHaveLength(5);
  });

  it('unknown ageBand skips nothing', () => {
    expect(getSkippedLessonIds('unknown', allLessons)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/utils/__tests__/skipUnits.test.js`
Expected: All 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/skipUnits.js src/utils/__tests__/skipUnits.test.js
git commit -m "feat: update skip logic for new operation-based unit IDs"
```

---

### Task 5: Update Store Tests

**Files:**
- Modify: `src/stores/__tests__/useGameStore.test.js`

- [ ] **Step 1: Update createUser skip tests**

The existing skip tests import static lesson files that no longer exist. Replace the `createUser skip logic` and `updateSettings re-applies skip logic` describe blocks. The new seed creates lessons inline, so the beforeEach just calls `seedDatabase()`:

Find and replace the `describe('createUser skip logic'` block and `describe('updateSettings re-applies skip logic'` block with:

```js
describe('createUser skip logic', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
  });

  it('Starter (6-7) skips no units', async () => {
    await getStore().createUser('Starter', '6-7');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });

  it('Explorer (8-10) skips no units', async () => {
    await getStore().createUser('Explorer', '8-10');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });

  it('Challenger (11-12) skips Addition and Subtraction', async () => {
    await getStore().createUser('Challenger', '11-12');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(10);
    const add = progress.filter((p) => p.lessonId.includes('addition'));
    const sub = progress.filter((p) => p.lessonId.includes('subtraction'));
    expect(add).toHaveLength(5);
    expect(sub).toHaveLength(5);
  });
});

describe('updateSettings re-applies skip logic', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
    await getStore().createUser('Settings', '6-7');
  });

  it('changing from Starter to Challenger marks 10 lessons complete', async () => {
    await getStore().updateSettings({ ageBand: '11-12' });
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(10);
  });

  it('changing from Challenger to Starter clears skip progress', async () => {
    await getStore().updateSettings({ ageBand: '11-12' });
    await getStore().updateSettings({ ageBand: '6-7' });
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run all store tests**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/__tests__/useGameStore.test.js
git commit -m "test: update store tests for new unit IDs and seed"
```

---

### Task 6: Wire Generator into LessonEngine

**Files:**
- Modify: `src/components/lesson/LessonEngine.jsx`

- [ ] **Step 1: Update LessonEngine to use the generator**

In `src/components/lesson/LessonEngine.jsx`:

Replace the imports (lines 1-17):

```js
import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import { calculateXp, getLessonBonus } from '../../utils/xpCalculator';
import { getMaxExercises } from '../../utils/progression';
import { generateExercises } from '../../utils/exerciseGenerator';
import ProgressBar from './ProgressBar';
import FeedbackBanner from './FeedbackBanner';
import LessonSummary from './LessonSummary';
import XpFlyUp from '../shared/XpFlyUp';
import TypeTheAnswer from './exercises/TypeTheAnswer';
import SelectTheAnswer from './exercises/SelectTheAnswer';
import FollowThePattern from './exercises/FollowThePattern';
import styles from './LessonEngine.module.css';
```

Replace the exercises/activeExercises block (lines 48-55):

```js
  const maxExercises = getMaxExercises(ageBand);
  const activeExercises = useMemo(
    () => lesson ? generateExercises(lesson.operation, ageBand, lesson.tier, maxExercises) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson?.id, ageBand]
  );
  const currentExercise = activeExercises[exerciseIndex];
```

This removes the `shuffleArray` import (no longer needed — exercises are generated fresh) and the static `exercises` variable.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/lesson/LessonEngine.jsx
git commit -m "feat: wire exercise generator into LessonEngine"
```

---

### Task 7: Full Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Playwright smoke test**

Run the same Playwright test from earlier against localhost to verify:
1. Starter sees addition with small numbers (0-10)
2. Explorer sees all 4 units with numbers up to 1,000
3. Challenger skips Addition/Subtraction, starts at Multiplication with large numbers

- [ ] **Step 3: Build**

Run: `npx vite build`
Expected: Build succeeds, output smaller (no static lesson chunks)

- [ ] **Step 4: Final commit if any fixes needed**

Only if verification revealed issues.
