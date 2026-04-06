/**
 * Placement scoring algorithm for the LuLinDingo placement test.
 *
 * DIFFICULTY_LADDER defines the 8 questions used during placement,
 * ordered from easiest to hardest.
 *
 * scorePlacement() takes the child's answers and maps them to a
 * starting ageBand + tier using three signals to avoid brittleness:
 *   1. Final ladder position (last level answered)
 *   2. Total correct count (guards against lucky guessing)
 *   3. Highest sustained level (guards against a single late lucky answer)
 */

export const DIFFICULTY_LADDER = [
  { level: 1, ageBand: '6-7',   operation: 'addition',        tier: 2 },
  { level: 2, ageBand: '6-7',   operation: 'subtraction',     tier: 2 },
  { level: 3, ageBand: '8-10',  operation: 'addition',        tier: 3 },
  { level: 4, ageBand: '8-10',  operation: 'subtraction',     tier: 3 },
  { level: 5, ageBand: '8-10',  operation: 'multiplication',  tier: 3 },
  { level: 6, ageBand: '8-10',  operation: 'division',        tier: 3 },
  { level: 7, ageBand: '11-12', operation: 'multiplication',  tier: 3 },
  { level: 8, ageBand: '11-12', operation: 'division',        tier: 3 },
];

/**
 * Maps an effective level (1–8) to the placement result.
 * startingTier values are intentionally one step below the question tier
 * so the child starts where they clearly belong rather than where they
 * barely reached.
 */
const PLACEMENT_MAP = [
  { level: 1, ageBand: '6-7',   startingTier: 1 },
  { level: 2, ageBand: '6-7',   startingTier: 3 },
  { level: 3, ageBand: '8-10',  startingTier: 1 },
  { level: 4, ageBand: '8-10',  startingTier: 2 },
  { level: 5, ageBand: '8-10',  startingTier: 3 },
  { level: 6, ageBand: '8-10',  startingTier: 4 },
  { level: 7, ageBand: '11-12', startingTier: 2 },
  { level: 8, ageBand: '11-12', startingTier: 4 },
];

/**
 * Score a placement test.
 *
 * @param {Array<{level: number, correct: boolean}>} answers - 8 answer objects
 * @returns {{ ageBand: string, startingTier: number }}
 */
export function scorePlacement(answers) {
  // Signal 1: final ladder position (level of the last answer in the array)
  const finalLevel = answers[answers.length - 1].level;

  // Signal 2: total number of correct answers
  const totalCorrect = answers.filter((a) => a.correct).length;

  // Signal 3: highest sustained level — the highest level where the child
  // answered correctly AND had already established a correct answer at a
  // lower level before it (i.e. the correct answer is backed up, not isolated).
  // A single lucky correct answer in isolation does not count as "sustained".
  let highestSustained = 0;
  let priorCorrectExists = false;
  answers.forEach((a) => {
    if (a.correct) {
      if (priorCorrectExists) {
        // This correct answer is backed up by at least one earlier correct answer
        highestSustained = Math.max(highestSustained, a.level);
      }
      priorCorrectExists = true;
    }
  });

  let effectiveLevel = finalLevel;

  // Guard 1: if fewer than 3 correct, the child may have been guessing —
  // cap effective level one step down.
  if (totalCorrect < 3) {
    effectiveLevel = Math.max(finalLevel - 1, 1);
  }

  // Guard 2: if the highest sustained level is more than one step below the
  // effective level, the child got a lucky late answer — pull back to just
  // above their real sustained ceiling.
  if (highestSustained < effectiveLevel - 1) {
    effectiveLevel = highestSustained + 1;
  }

  // Clamp to valid range
  effectiveLevel = Math.min(Math.max(effectiveLevel, 1), 8);

  const placement = PLACEMENT_MAP[effectiveLevel - 1];
  return { ageBand: placement.ageBand, startingTier: placement.startingTier };
}
