# Difficulty-Based Exercise Design

## Problem

All three difficulty levels (Starter, Explorer, Challenger) produce the same trivially easy exercises (0+1, 1+1, etc.). The `ageBand` setting only controls how many exercises per lesson (6/8/10), not the actual difficulty of the content. Even an 11-12 year old starts at `0+1`.

## Solution

Three changes:

### 1. Difficulty controls starting unit

When a user picks their level during onboarding, mark earlier units as "completed" so they begin at an appropriate difficulty:

- **Starter (6-7):** Starts at Addition 1 (sums 0-10) — current behavior
- **Explorer (8-10):** Starts at Addition 2 (sums 10-50). Addition 1 auto-completed.
- **Challenger (11-12):** Starts at Subtraction 1, then Addition 3 and Subtraction 2. Addition 1 & 2 auto-completed.

Implementation: In `createUser` (useGameStore.js), after inserting the user, insert progress records for all lessons in skipped units with `completed: true` and `accuracy: 100`.

When changing ageBand in Settings, the same logic applies — clear existing progress and re-apply skip logic for the new band.

### 2. New lesson content

Add two new units with 5 lessons each (matching existing lesson structure):

- **Addition 3** (unit order 4): Two-digit addition, sums 50-100. Operands range from 20-60.
- **Subtraction 2** (unit order 5): Two-digit subtraction, numbers 10-50. Differences involve teens and twenties.

Each lesson has 10 exercises using the same three types: `type-answer`, `select-answer`, `follow-pattern`.

### 3. Exercise order shuffling

Shuffle the exercise array each time a lesson is started, so repeated plays feel fresh. Use Fisher-Yates shuffle in LessonEngine before slicing to `maxExercises`.

## Files Changed

- `src/stores/useGameStore.js` — `createUser` inserts skip progress; `updateSettings` re-applies on ageBand change
- `src/components/lesson/LessonEngine.jsx` — shuffle exercises before slicing
- `src/data/math/units.js` — add Addition 3 (order 4) and Subtraction 2 (order 5)
- `src/data/math/lessons/addition-3.js` — new file, 5 lessons with sums 50-100
- `src/data/math/lessons/subtraction-2.js` — new file, 5 lessons with numbers 10-50

## Files Unchanged

- LessonEngine exercise components (TypeTheAnswer, SelectTheAnswer, FollowThePattern)
- Database schema
- Progression logic (getUnitStates, getLessonStatus)
- Seed logic (already uses import.meta.glob, will pick up new files automatically)

## Edge Cases

- User resets progress: all progress cleared, then skip logic re-applied for current ageBand
- User changes ageBand in settings: progress cleared and re-applied (same as reset + re-onboard)
- Shuffling preserves all exercises — just reorders them before the maxExercises slice
