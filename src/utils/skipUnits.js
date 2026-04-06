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

/**
 * Returns the first active unit ID (first unit not fully skipped).
 * @param {Array<{id: string, order: number}>} units - all units sorted by order
 * @param {string[]} skippedLessonIds - lesson IDs already skipped by unit-level skip
 * @returns {string|undefined}
 */
export function getFirstActiveUnitId(units, skippedLessonIds) {
  const skippedSet = new Set(skippedLessonIds);
  const sorted = [...units].sort((a, b) => a.order - b.order);
  for (const unit of sorted) {
    // Check if this unit has any non-skipped lessons
    const unitLessonId = unit.id + '-lesson-1';
    if (!skippedSet.has(unitLessonId)) return unit.id;
  }
  return undefined;
}

/**
 * Returns lesson IDs within a specific unit that should be skipped
 * based on startingTier (lessons with order < startingTier).
 */
export function getPlacementSkippedLessonIds(startingTier, unitId, allLessons) {
  if (startingTier <= 1) return [];
  return allLessons
    .filter((l) => l.unitId === unitId && l.order < startingTier)
    .map((l) => l.id);
}
