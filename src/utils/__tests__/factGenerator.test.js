import { describe, it, expect } from 'vitest';
import { generateWeakFactExercises } from '../factGenerator.js';
import { signatureForExercise } from '../factTracking.js';

function isValidExercise(ex) {
  // build-equation has no `equation`/`correctAnswer` string the same way, but
  // every exercise the generator emits has a `type`. The forward types carry an
  // equation + correctAnswer.
  expect(ex).toBeTruthy();
  expect(typeof ex.type).toBe('string');
  expect('correctAnswer' in ex).toBe(true);
}

describe('generateWeakFactExercises', () => {
  it('always returns exactly `count` valid exercises', () => {
    const out = generateWeakFactExercises({
      facts: [],
      operation: 'multiplication',
      ageBand: '8-10',
      tier: 1,
      count: 8,
    });
    expect(out).toHaveLength(8);
    out.forEach(isValidExercise);
  });

  it('with no weak facts behaves like a plain generated set (length + shape)', () => {
    const out = generateWeakFactExercises({
      facts: [{ sig: '4x4', operation: 'multiplication', box: 5, dueAt: '2099-01-01' }],
      operation: 'multiplication',
      ageBand: '8-10',
      tier: 3,
      count: 6,
    });
    expect(out).toHaveLength(6);
    out.forEach(isValidExercise);
  });

  it('steers at least one slot toward a reachable weak target', () => {
    // multiplication 8-10 tier 1 → factor window ~[1,10]; "2x3" is reachable.
    const facts = [
      { sig: '2x3', operation: 'multiplication', a: 2, b: 3, box: 0, dueAt: '2000-01-01', lastSeen: '2000-01-01' },
    ];
    // Run several times to absorb RNG; the oversample should land the target
    // in the overwhelming majority of runs. Assert it lands at least once.
    let everHit = false;
    for (let i = 0; i < 25 && !everHit; i++) {
      const out = generateWeakFactExercises({
        facts,
        operation: 'multiplication',
        ageBand: '8-10',
        tier: 1,
        count: 8,
        oversample: 8,
      });
      expect(out).toHaveLength(8);
      everHit = out.some((ex) => {
        const s = signatureForExercise(ex);
        return s && s.sig === '2x3';
      });
    }
    expect(everHit).toBe(true);
  });

  it('with an unreachable target still returns count valid exercises and never throws', () => {
    // "999x999" cannot occur in the 8-10 tier-1 window — wrapper must not loop
    // forever or crash, just return a normal set.
    const facts = [
      { sig: '999x999', operation: 'multiplication', a: 999, b: 999, box: 0, dueAt: '2000-01-01', lastSeen: '2000-01-01' },
    ];
    const out = generateWeakFactExercises({
      facts,
      operation: 'multiplication',
      ageBand: '8-10',
      tier: 1,
      count: 8,
      oversample: 4,
    });
    expect(out).toHaveLength(8);
    out.forEach(isValidExercise);
  });
});
