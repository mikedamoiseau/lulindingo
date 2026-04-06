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
