/**
 * Pure progression logic extracted from LearningPath for testability.
 * Determines unit and lesson states based on progress data.
 */

/**
 * Determine the status of each unit: completed, current, or locked.
 * Only one unit can be "current" — the first incomplete one.
 */
export function getUnitStates(units, lessons, progressMap) {
  let foundIncomplete = false;

  return units.map((unit) => {
    const unitLessons = lessons
      .filter((l) => l.unitId === unit.id)
      .sort((a, b) => a.order - b.order);
    const allComplete =
      unitLessons.length > 0 &&
      unitLessons.every((l) => progressMap[l.id]?.completed);
    const isCurrentUnit = !allComplete && !foundIncomplete;
    if (isCurrentUnit) foundIncomplete = true;
    return { unit, lessons: unitLessons, allComplete, isCurrentUnit };
  });
}

/**
 * Determine the status of a lesson within a unit.
 * Returns: 'completed', 'current', or 'locked'
 */
export function getLessonStatus(unitLessons, lessonIndex, progressMap) {
  const lesson = unitLessons[lessonIndex];
  if (progressMap[lesson.id]?.completed) return 'completed';

  if (
    lessonIndex === 0 ||
    progressMap[unitLessons[lessonIndex - 1]?.id]?.completed
  ) {
    const firstIncomplete = unitLessons.findIndex(
      (l) => !progressMap[l.id]?.completed
    );
    return lessonIndex === firstIncomplete ? 'current' : 'locked';
  }

  return 'locked';
}

/**
 * Get the number of exercises to show based on age band.
 */
export function getMaxExercises(ageBand) {
  if (ageBand === '6-7') return 6;
  if (ageBand === '8-10') return 8;
  return 10;
}
