# Difficulty-Based Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make exercise difficulty match the selected level (Starter/Explorer/Challenger) by skipping easy units, adding harder content, and shuffling exercise order.

**Architecture:** Extract a `skipUnitsForBand` helper that marks lessons as completed for units below the user's level. Add two new lesson data files (addition-3, subtraction-2). Shuffle exercises in LessonEngine via Fisher-Yates before slicing.

**Tech Stack:** React, Zustand, Dexie (IndexedDB), Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/skipUnits.js` | Create | Pure function: given ageBand, return lesson IDs to auto-complete |
| `src/utils/__tests__/skipUnits.test.js` | Create | Tests for skipUnits |
| `src/utils/shuffle.js` | Create | Fisher-Yates shuffle utility |
| `src/utils/__tests__/shuffle.test.js` | Create | Tests for shuffle |
| `src/data/math/units.js` | Modify | Add Addition 3 and Subtraction 2 units |
| `src/data/math/lessons/addition-3.js` | Create | 5 lessons, sums 50-100 |
| `src/data/math/lessons/subtraction-2.js` | Create | 5 lessons, numbers 10-50 |
| `src/stores/useGameStore.js` | Modify | Call skipUnits in createUser and updateSettings |
| `src/stores/__tests__/useGameStore.test.js` | Modify | Add tests for skip behavior |
| `src/components/lesson/LessonEngine.jsx` | Modify | Shuffle exercises before slicing |

---

### Task 1: Shuffle Utility

**Files:**
- Create: `src/utils/shuffle.js`
- Create: `src/utils/__tests__/shuffle.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/shuffle.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { shuffleArray } from '../shuffle';

describe('shuffleArray', () => {
  it('returns an array with the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(5);
  });

  it('contains all original elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it('returns empty array for empty input', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('returns single-element array unchanged', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('produces different orders over multiple runs', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      results.add(JSON.stringify(shuffleArray(input)));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/shuffle.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/shuffle.js`:

```js
/**
 * Fisher-Yates shuffle. Returns a new array; does not mutate input.
 */
export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/shuffle.test.js`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/shuffle.js src/utils/__tests__/shuffle.test.js
git commit -m "feat: add Fisher-Yates shuffle utility"
```

---

### Task 2: New Lesson Data — Addition 3

**Files:**
- Modify: `src/data/math/units.js`
- Create: `src/data/math/lessons/addition-3.js`

- [ ] **Step 1: Add Addition 3 unit to units.js**

Add after the last unit in `src/data/math/units.js`:

```js
{
  id: 'math-addition-3',
  moduleId: 'math',
  title: 'Addition 3',
  topic: 'addition',
  order: 4,
  iconEmoji: '➕',
  description: 'Adding numbers 50-100',
},
```

- [ ] **Step 2: Create addition-3.js lesson data**

Create `src/data/math/lessons/addition-3.js` with 5 lessons, each containing 10 exercises. Operands range from 20-60, sums target 50-100. Use all three exercise types (`type-answer`, `select-answer`, `follow-pattern`) in a mix. Each lesson progressively increases difficulty:

- Lesson 1: sums 50-65
- Lesson 2: sums 60-75
- Lesson 3: sums 70-85
- Lesson 4: sums 80-95
- Lesson 5: sums 90-100

Follow the exact same data structure as `addition-2.js`. Unit ID: `math-addition-3`. Lesson IDs: `math-addition-3-lesson-1` through `math-addition-3-lesson-5`.

Example structure for lesson 1 (all 5 lessons follow this pattern with increasing numbers):

```js
const lessons = [
  {
    id: 'math-addition-3-lesson-1',
    unitId: 'math-addition-3',
    order: 1,
    exercises: [
      {
        type: 'select-answer',
        equation: '25 + 25 = []',
        correctAnswer: 50,
        options: [48, 50, 52],
      },
      {
        type: 'type-answer',
        equation: '[] = 30 + 22',
        correctAnswer: 52,
      },
      {
        type: 'follow-pattern',
        equation: '28 + 25 = []',
        correctAnswer: 53,
        options: [53, 52],
        pattern: [
          { expression: '26 + 25', result: 51 },
          { expression: '27 + 25', result: 52 },
          { expression: '28 + 25', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '32 + 22 = []',
        correctAnswer: 54,
        options: [52, 54, 56],
      },
      {
        type: 'type-answer',
        equation: '[] = 35 + 20',
        correctAnswer: 55,
      },
      {
        type: 'follow-pattern',
        equation: '30 + 27 = []',
        correctAnswer: 57,
        options: [57, 56],
        pattern: [
          { expression: '30 + 25', result: 55 },
          { expression: '30 + 26', result: 56 },
          { expression: '30 + 27', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '28 + 30 = []',
        correctAnswer: 58,
        options: [56, 58, 60],
      },
      {
        type: 'type-answer',
        equation: '[] = 34 + 26',
        correctAnswer: 60,
      },
      {
        type: 'follow-pattern',
        equation: '33 + 30 = []',
        correctAnswer: 63,
        options: [63, 62],
        pattern: [
          { expression: '31 + 30', result: 61 },
          { expression: '32 + 30', result: 62 },
          { expression: '33 + 30', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '35 + 30 = []',
        correctAnswer: 65,
        options: [63, 65, 67],
      },
    ],
  },
  // ... lessons 2-5 follow same structure with increasing sums
];

export default lessons;
```

Write all 5 complete lessons with correct arithmetic.

- [ ] **Step 3: Verify seed picks up the new file**

Run: `npx vitest run src/db/__tests__/seed.test.js`
Expected: PASS (seed uses `import.meta.glob('../data/math/lessons/*.js')` which auto-discovers)

- [ ] **Step 4: Commit**

```bash
git add src/data/math/units.js src/data/math/lessons/addition-3.js
git commit -m "feat: add Addition 3 unit with lessons for sums 50-100"
```

---

### Task 3: New Lesson Data — Subtraction 2

**Files:**
- Modify: `src/data/math/units.js`
- Create: `src/data/math/lessons/subtraction-2.js`

- [ ] **Step 1: Add Subtraction 2 unit to units.js**

Add after Addition 3 in `src/data/math/units.js`:

```js
{
  id: 'math-subtraction-2',
  moduleId: 'math',
  title: 'Subtraction 2',
  topic: 'subtraction',
  order: 5,
  iconEmoji: '➖',
  description: 'Subtracting numbers 10-50',
},
```

- [ ] **Step 2: Create subtraction-2.js lesson data**

Create `src/data/math/lessons/subtraction-2.js` with 5 lessons, each containing 10 exercises. Minuends range from 20-50, subtrahends from 5-25. Use all three exercise types. Progressively harder:

- Lesson 1: results 10-15
- Lesson 2: results 12-20
- Lesson 3: results 15-25
- Lesson 4: results 18-30
- Lesson 5: results 20-35

Follow exact same data structure as `subtraction-1.js`. Unit ID: `math-subtraction-2`. Lesson IDs: `math-subtraction-2-lesson-1` through `math-subtraction-2-lesson-5`.

Write all 5 complete lessons with correct arithmetic.

- [ ] **Step 3: Verify seed picks up the new file**

Run: `npx vitest run src/db/__tests__/seed.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/data/math/units.js src/data/math/lessons/subtraction-2.js
git commit -m "feat: add Subtraction 2 unit with lessons for numbers 10-50"
```

---

### Task 4: Skip Units Logic

**Files:**
- Create: `src/utils/skipUnits.js`
- Create: `src/utils/__tests__/skipUnits.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/skipUnits.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getSkippedLessonIds } from '../skipUnits';

// Mirror the real lesson data structure
const allLessons = [
  { id: 'math-addition-1-lesson-1', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-2', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-3', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-4', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-5', unitId: 'math-addition-1' },
  { id: 'math-addition-2-lesson-1', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-2', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-3', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-4', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-5', unitId: 'math-addition-2' },
  { id: 'math-subtraction-1-lesson-1', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-2', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-3', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-4', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-5', unitId: 'math-subtraction-1' },
];

describe('getSkippedLessonIds', () => {
  it('returns empty array for Starter (6-7)', () => {
    expect(getSkippedLessonIds('6-7', allLessons)).toEqual([]);
  });

  it('returns Addition 1 lessons for Explorer (8-10)', () => {
    const skipped = getSkippedLessonIds('8-10', allLessons);
    expect(skipped).toHaveLength(5);
    expect(skipped.every((id) => id.startsWith('math-addition-1'))).toBe(true);
  });

  it('returns Addition 1 + Addition 2 lessons for Challenger (11-12)', () => {
    const skipped = getSkippedLessonIds('11-12', allLessons);
    expect(skipped).toHaveLength(10);
    expect(skipped.filter((id) => id.startsWith('math-addition-1'))).toHaveLength(5);
    expect(skipped.filter((id) => id.startsWith('math-addition-2'))).toHaveLength(5);
  });

  it('returns empty array for unknown ageBand', () => {
    expect(getSkippedLessonIds('unknown', allLessons)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/skipUnits.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/skipUnits.js`:

```js
const SKIP_UNITS_BY_BAND = {
  '6-7': [],
  '8-10': ['math-addition-1'],
  '11-12': ['math-addition-1', 'math-addition-2'],
};

/**
 * Returns lesson IDs that should be auto-completed for a given ageBand.
 * @param {string} ageBand - '6-7', '8-10', or '11-12'
 * @param {Array<{id: string, unitId: string}>} allLessons - all lessons from DB
 * @returns {string[]} lesson IDs to mark as completed
 */
export function getSkippedLessonIds(ageBand, allLessons) {
  const unitsToSkip = SKIP_UNITS_BY_BAND[ageBand] || [];
  return allLessons
    .filter((lesson) => unitsToSkip.includes(lesson.unitId))
    .map((lesson) => lesson.id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/skipUnits.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/skipUnits.js src/utils/__tests__/skipUnits.test.js
git commit -m "feat: add skipUnits utility for difficulty-based starting position"
```

---

### Task 5: Wire Skip Logic into Game Store

**Files:**
- Modify: `src/stores/useGameStore.js`
- Modify: `src/stores/__tests__/useGameStore.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `src/stores/__tests__/useGameStore.test.js`, after the existing `createUser` describe block:

```js
describe('createUser skip logic', () => {
  beforeEach(async () => {
    // Seed units and lessons so skipUnits has data to work with
    const { default: units } = await import('../../data/math/units.js');
    await db.units.bulkAdd(units);
    const lessonModules = {
      'addition-1': (await import('../../data/math/lessons/addition-1.js')).default,
      'addition-2': (await import('../../data/math/lessons/addition-2.js')).default,
      'subtraction-1': (await import('../../data/math/lessons/subtraction-1.js')).default,
      'addition-3': (await import('../../data/math/lessons/addition-3.js')).default,
      'subtraction-2': (await import('../../data/math/lessons/subtraction-2.js')).default,
    };
    for (const lessons of Object.values(lessonModules)) {
      await db.lessons.bulkAdd(lessons);
    }
  });

  it('Starter (6-7) skips no units', async () => {
    await getStore().createUser('Starter', '6-7');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });

  it('Explorer (8-10) skips Addition 1', async () => {
    await getStore().createUser('Explorer', '8-10');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(5);
    expect(progress.every((p) => p.lessonId.startsWith('math-addition-1'))).toBe(true);
    expect(progress.every((p) => p.completed === true)).toBe(true);
  });

  it('Challenger (11-12) skips Addition 1 and Addition 2', async () => {
    await getStore().createUser('Challenger', '11-12');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(10);
    const add1 = progress.filter((p) => p.lessonId.startsWith('math-addition-1'));
    const add2 = progress.filter((p) => p.lessonId.startsWith('math-addition-2'));
    expect(add1).toHaveLength(5);
    expect(add2).toHaveLength(5);
  });
});

describe('updateSettings re-applies skip logic', () => {
  beforeEach(async () => {
    const { default: units } = await import('../../data/math/units.js');
    await db.units.bulkAdd(units);
    const lessonModules = {
      'addition-1': (await import('../../data/math/lessons/addition-1.js')).default,
      'addition-2': (await import('../../data/math/lessons/addition-2.js')).default,
      'subtraction-1': (await import('../../data/math/lessons/subtraction-1.js')).default,
      'addition-3': (await import('../../data/math/lessons/addition-3.js')).default,
      'subtraction-2': (await import('../../data/math/lessons/subtraction-2.js')).default,
    };
    for (const lessons of Object.values(lessonModules)) {
      await db.lessons.bulkAdd(lessons);
    }
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

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: New tests FAIL (createUser doesn't insert progress, updateSettings doesn't re-apply)

- [ ] **Step 3: Update createUser in useGameStore.js**

In `src/stores/useGameStore.js`, add the import at the top:

```js
import { getSkippedLessonIds } from '../utils/skipUnits';
```

Replace the `createUser` method:

```js
createUser: async (name, ageBand) => {
  const id = await db.users.add({
    name,
    totalXp: 0,
    hearts: 5,
    heartsLastRefill: new Date(),
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    ageBand,
    createdAt: new Date(),
  });
  const user = await db.users.get(id);

  const allLessons = await db.lessons.toArray();
  const skippedIds = getSkippedLessonIds(ageBand, allLessons);
  if (skippedIds.length > 0) {
    await db.progress.bulkPut(
      skippedIds.map((lessonId) => ({
        lessonId,
        completed: true,
        stars: 3,
        bestAccuracy: 100,
        attempts: 0,
        completedAt: new Date(),
      }))
    );
  }

  set({ user });
},
```

- [ ] **Step 4: Update updateSettings in useGameStore.js**

Replace the `updateSettings` method:

```js
updateSettings: async (settings) => {
  const { user } = get();
  if (!user) return;
  await db.users.update(user.id, settings);

  if (settings.ageBand) {
    await db.progress.clear();
    const allLessons = await db.lessons.toArray();
    const skippedIds = getSkippedLessonIds(settings.ageBand, allLessons);
    if (skippedIds.length > 0) {
      await db.progress.bulkPut(
        skippedIds.map((lessonId) => ({
          lessonId,
          completed: true,
          stars: 3,
          bestAccuracy: 100,
          attempts: 0,
          completedAt: new Date(),
        }))
      );
    }
  }

  set({ user: { ...user, ...settings } });
},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: All tests PASS (both old and new)

- [ ] **Step 6: Commit**

```bash
git add src/stores/useGameStore.js src/stores/__tests__/useGameStore.test.js
git commit -m "feat: wire skip-units logic into createUser and updateSettings"
```

---

### Task 6: Shuffle Exercises in LessonEngine

**Files:**
- Modify: `src/components/lesson/LessonEngine.jsx`

- [ ] **Step 1: Add shuffle import and apply it**

In `src/components/lesson/LessonEngine.jsx`, add the import:

```js
import { shuffleArray } from '../../utils/shuffle';
```

Change line 47-49 from:

```js
const exercises = lesson?.exercises || [];
const maxExercises = getMaxExercises(ageBand);
const activeExercises = exercises.slice(0, Math.min(exercises.length, maxExercises));
```

To:

```js
const exercises = lesson?.exercises || [];
const maxExercises = getMaxExercises(ageBand);
const [activeExercises] = useState(() =>
  shuffleArray(exercises).slice(0, Math.min(exercises.length, maxExercises))
);
```

Note: Using `useState` with an initializer ensures the shuffle only happens once per lesson mount, not on every re-render. Import `useState` is already imported on line 1.

- [ ] **Step 2: Verify the app still works**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/lesson/LessonEngine.jsx
git commit -m "feat: shuffle exercise order each time a lesson starts"
```

---

### Task 7: Manual Verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Start the dev server and verify**

Run: `npx vite dev`

Manual checks:
1. Reset progress in Settings
2. Pick **Starter** — should start at Addition 1 (0+1, 1+0, etc.)
3. Reset again, pick **Explorer** — should start at Addition 2 (10+5, etc.), Addition 1 shows as completed
4. Reset again, pick **Challenger** — should start at Subtraction 1, Addition 1 & 2 show as completed
5. Start any lesson twice — exercise order should differ

- [ ] **Step 3: Final commit if any fixes needed**

Only if manual verification revealed issues.
