import { describe, it, expect } from 'vitest';
import { isEstimationEligible } from '../estimationMode';

describe('isEstimationEligible', () => {
  it('is true for addition/subtraction/multiplication in 8-10 and 11-12', () => {
    for (const op of ['addition', 'subtraction', 'multiplication']) {
      expect(isEstimationEligible(op, '8-10')).toBe(true);
      expect(isEstimationEligible(op, '11-12')).toBe(true);
    }
  });

  it('is false for division', () => {
    expect(isEstimationEligible('division', '8-10')).toBe(false);
    expect(isEstimationEligible('division', '11-12')).toBe(false);
  });

  it('is false for the 6-7 age band', () => {
    for (const op of ['addition', 'subtraction', 'multiplication', 'division']) {
      expect(isEstimationEligible(op, '6-7')).toBe(false);
    }
  });

  it('is false for unknown inputs', () => {
    expect(isEstimationEligible('addition', undefined)).toBe(false);
    expect(isEstimationEligible(undefined, '8-10')).toBe(false);
  });
});
