# Dynamic Exercise Generation Design

## Problem

Exercise content is hardcoded in static JSON files. All levels get trivially easy problems. Number ranges don't match the selected difficulty. No multiplication or division exists.

## Solution

Replace static exercise data with a runtime generator. Exercises are created fresh each time a lesson starts, scaled by operation, ageBand, and lesson position within the unit.

## Operations by Level

| Level | Operations | Number Range | Division Rules |
|-------|-----------|-------------|----------------|
| Starter (6-7) | + − | 0–10 | n/a |
| Explorer (8-10) | + − × ÷ | 0–1,000 | Integer results only |
| Challenger (11-12) | + − × ÷ | 0–1,000,000 | Decimal results (rounded to 2dp) |

## Units

4 units, replacing the current 5:

| Unit ID | Title | Operation | Available to |
|---------|-------|-----------|-------------|
| math-addition | Addition | + | All |
| math-subtraction | Subtraction | − | All |
| math-multiplication | Multiplication | × | Explorer, Challenger |
| math-division | Division | ÷ | Explorer, Challenger |

Each unit has 5 lessons. Lessons are lightweight metadata — no stored exercises.

## Lesson Metadata

Each lesson record in the DB describes a generator profile:

```js
{
  id: 'math-addition-lesson-3',
  unitId: 'math-addition',
  order: 3,
  tier: 3,       // 1-5, controls difficulty within the unit
}
```

The `tier` drives how the generator picks numbers within the ageBand's range:
- Tier 1: bottom 20% of range
- Tier 2: 20–40%
- Tier 3: 40–60%
- Tier 4: 60–80%
- Tier 5: 80–100% of range

Example for Explorer Addition (range 0–1,000):
- Tier 1: operands 0–200
- Tier 3: operands 200–600
- Tier 5: operands 400–1,000

## Exercise Generator

Pure function: `generateExercises(operation, ageBand, tier, count)` → array of exercise objects.

Returns `count` exercises (default 10) using a mix of the 3 existing types:
- ~40% `type-answer`
- ~30% `select-answer`
- ~30% `follow-pattern`

### Generation Rules

**Addition** (`a + b = ?`):
- `a` and `b` random within tier range

**Subtraction** (`a - b = ?`):
- `a > b` always (no negative results)
- `a` within tier range, `b` random up to `a`

**Multiplication** (`a × b = ?`):
- Explorer: factors up to 50 (tier scales within 1–50)
- Challenger: factors up to 1,000 (tier scales within 1–1,000)
- Starter: n/a

**Division** (`a ÷ b = ?`):
- Explorer: pick `b` and `answer` randomly, set `a = b * answer` (guarantees integer result)
- Challenger: pick `a` and `b` randomly, answer = `a / b` rounded to 2 decimal places
- Starter: n/a

### Distractor Generation (select-answer)

- Options array has 3 values: 1 correct + 2 distractors
- Small numbers (< 20): distractors are ±1 to ±3
- Medium numbers (20–1,000): distractors are ±5% to ±15%
- Large numbers (> 1,000): distractors are ±2% to ±10%
- Distractors are always positive integers (or 2dp for Challenger division)
- Distractors must not equal the correct answer

### Pattern Generation (follow-pattern)

- Pick an incrementing operand (e.g., 5+1, 5+2, 5+3)
- 3 pattern entries: first two have results, third has `result: null`
- Options array has 2 values: correct + one distractor

## Skip Logic

Updated skip mapping:

| Level | Skipped Units |
|-------|--------------|
| Starter | none |
| Explorer | none (Multiplication/Division are new, all units available) |
| Challenger | math-addition, math-subtraction (starts at Multiplication) |

Note: Explorer gets all 4 units since multiplication/division are new for them. Challenger skips the basic operations.

## LessonEngine Changes

Currently reads `lesson.exercises` from IndexedDB. Change to:

1. Read lesson metadata (unitId, tier) from DB
2. Look up the unit's operation
3. Read user's ageBand from store
4. Call `generateExercises(operation, ageBand, tier, maxExercises)`
5. Render as before — all 3 exercise components remain unchanged

The `useMemo` shuffle from Milestone 1 is no longer needed since exercises are generated fresh each time. Can simplify back to a direct call.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/exerciseGenerator.js` | Create | Pure generator function |
| `src/utils/__tests__/exerciseGenerator.test.js` | Create | Tests for all operations × ageBands |
| `src/data/math/units.js` | Replace | 4 units with operation field |
| `src/db/seed.js` | Modify | Seed lightweight lessons (5 per unit, tier 1-5) |
| `src/db/__tests__/seed.test.js` | Modify | Update counts (4 units, 20 lessons) |
| `src/components/lesson/LessonEngine.jsx` | Modify | Call generator instead of reading static exercises |
| `src/utils/skipUnits.js` | Modify | Update skip mapping for new unit IDs |
| `src/utils/__tests__/skipUnits.test.js` | Modify | Update tests |
| `src/data/math/lessons/*.js` | Delete | Static data no longer needed |

## What Doesn't Change

- Exercise components (TypeTheAnswer, SelectTheAnswer, FollowThePattern)
- Database schema
- Progression logic (getUnitStates, getLessonStatus)
- Hearts, XP, streaks
- Settings panel, onboarding (ageBand selection)
- Overall UX flow
