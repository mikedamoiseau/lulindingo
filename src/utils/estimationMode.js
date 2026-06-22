// Shared predicate for whether estimation challenge mode is offered for a
// given operation + age band. Used by LessonNode (entry gating) and
// LessonEngine. See D2 in the closest-wins plan.

const ESTIMATION_OPERATIONS = new Set(['addition', 'subtraction', 'multiplication']);
const ESTIMATION_AGE_BANDS = new Set(['8-10', '11-12']);

/**
 * Estimation is offered only for add/sub/mul (division's decimal quotients are
 * excluded in v1) and only for the 8-10 / 11-12 bands (small 6-7 answers round
 * to trivial buckets).
 *
 * @param {string} operation
 * @param {string} ageBand
 * @returns {boolean}
 */
export function isEstimationEligible(operation, ageBand) {
  return ESTIMATION_OPERATIONS.has(operation) && ESTIMATION_AGE_BANDS.has(ageBand);
}
