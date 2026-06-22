import { describe, it, expect } from 'vitest';
import {
  parseFactSignature,
  signatureForExercise,
  applyOutcome,
  isWeak,
  isDue,
  selectWeakFactTargets,
} from '../factTracking';

describe('parseFactSignature', () => {
  it('parses a multiplication equation', () => {
    expect(parseFactSignature('7 × 8 = []')).toEqual({
      sig: '7x8',
      operation: 'multiplication',
      a: 7,
      b: 8,
    });
  });

  it('sorts operands for commutative ops (multiplication)', () => {
    expect(parseFactSignature('8 × 7 = []').sig).toBe('7x8');
  });

  it('sorts operands for commutative ops (addition)', () => {
    expect(parseFactSignature('3 + 9 = []').sig).toBe('3+9');
    expect(parseFactSignature('9 + 3 = []').sig).toBe('3+9');
    expect(parseFactSignature('3 + 9 = []').operation).toBe('addition');
  });

  it('preserves operand order for subtraction (non-commutative)', () => {
    expect(parseFactSignature('12 - 5 = []')).toEqual({
      sig: '12-5',
      operation: 'subtraction',
      a: 12,
      b: 5,
    });
  });

  it('preserves operand order for division and normalizes ÷', () => {
    expect(parseFactSignature('20 ÷ 4 = []')).toEqual({
      sig: '20/4',
      operation: 'division',
      a: 20,
      b: 4,
    });
  });

  it('handles decimal-result division (operands still parse)', () => {
    expect(parseFactSignature('123 ÷ 4 = []').sig).toBe('123/4');
  });

  it('returns null for garbage / multi-operand', () => {
    expect(parseFactSignature('garbage')).toBeNull();
    expect(parseFactSignature('1 + 2 + 3 = []')).toBeNull();
    expect(parseFactSignature(undefined)).toBeNull();
    expect(parseFactSignature('')).toBeNull();
  });
});

describe('signatureForExercise', () => {
  it('returns null for follow-pattern', () => {
    expect(
      signatureForExercise({ type: 'follow-pattern', equation: '7 × 8 = []' })
    ).toBeNull();
  });

  it('returns a sig for type-answer', () => {
    expect(
      signatureForExercise({ type: 'type-answer', equation: '7 × 8 = []' }).sig
    ).toBe('7x8');
  });

  it('returns a sig for select-answer', () => {
    expect(
      signatureForExercise({ type: 'select-answer', equation: '3 + 9 = []' }).sig
    ).toBe('3+9');
  });

  it('returns a sig for story-problem (a op b)', () => {
    expect(
      signatureForExercise({ type: 'story-problem', equation: '12 - 5 = []' }).sig
    ).toBe('12-5');
  });

  it('returns null for an exercise with no parseable equation', () => {
    expect(signatureForExercise({ type: 'build-equation', result: 9 })).toBeNull();
    expect(signatureForExercise(null)).toBeNull();
    expect(signatureForExercise(undefined)).toBeNull();
  });
});

describe('applyOutcome', () => {
  it('creates a fresh correct fact at box 1', () => {
    const fact = applyOutcome(undefined, true, '2026-06-22', {
      sig: '7x8',
      operation: 'multiplication',
      a: 7,
      b: 8,
    });
    expect(fact).toMatchObject({
      sig: '7x8',
      operation: 'multiplication',
      a: 7,
      b: 8,
      seen: 1,
      correct: 1,
      box: 1,
      lastSeen: '2026-06-22',
      dueAt: '2026-06-23',
    });
  });

  it('creates a fresh wrong fact at box 0, due tomorrow', () => {
    const fact = applyOutcome(undefined, false, '2026-06-22', {
      sig: '7x8',
      operation: 'multiplication',
      a: 7,
      b: 8,
    });
    expect(fact.box).toBe(0);
    expect(fact.seen).toBe(1);
    expect(fact.correct).toBe(0);
    expect(fact.dueAt).toBe('2026-06-23');
  });

  it('demotes an existing fact by 2 on a wrong answer, due tomorrow', () => {
    const existing = {
      sig: '7x8',
      operation: 'multiplication',
      a: 7,
      b: 8,
      seen: 4,
      correct: 3,
      box: 3,
      lastSeen: '2026-06-20',
      dueAt: '2026-06-24',
    };
    const fact = applyOutcome(existing, false, '2026-06-22');
    expect(fact.box).toBe(1);
    expect(fact.seen).toBe(5);
    expect(fact.correct).toBe(3);
    expect(fact.dueAt).toBe('2026-06-23');
    expect(fact.lastSeen).toBe('2026-06-22');
  });

  it('promotes an existing fact by 1 on a correct answer', () => {
    const existing = {
      sig: '7x8',
      operation: 'multiplication',
      a: 7,
      b: 8,
      seen: 2,
      correct: 1,
      box: 3,
      lastSeen: '2026-06-20',
      dueAt: '2026-06-22',
    };
    const fact = applyOutcome(existing, true, '2026-06-22');
    expect(fact.box).toBe(4);
    expect(fact.seen).toBe(3);
    expect(fact.correct).toBe(2);
    expect(fact.dueAt).toBe('2026-06-29'); // box 4 → +7 days
  });
});

describe('isWeak / isDue', () => {
  it('box 2 is weak, box 3 is not', () => {
    expect(isWeak({ box: 0 })).toBe(true);
    expect(isWeak({ box: 2 })).toBe(true);
    expect(isWeak({ box: 3 })).toBe(false);
  });

  it('dueAt <= today is due (boundary inclusive)', () => {
    expect(isDue({ dueAt: '2026-06-22' }, '2026-06-22')).toBe(true);
    expect(isDue({ dueAt: '2026-06-21' }, '2026-06-22')).toBe(true);
    expect(isDue({ dueAt: '2026-06-23' }, '2026-06-22')).toBe(false);
  });
});

describe('selectWeakFactTargets', () => {
  const today = '2026-06-22';
  const facts = [
    { sig: '7x8', operation: 'multiplication', box: 0, dueAt: '2026-06-20', lastSeen: '2026-06-18' },
    { sig: '6x9', operation: 'multiplication', box: 2, dueAt: '2026-06-22', lastSeen: '2026-06-10' },
    { sig: '4x4', operation: 'multiplication', box: 4, dueAt: '2026-06-20', lastSeen: '2026-06-19' }, // not weak
    { sig: '3+9', operation: 'addition', box: 1, dueAt: '2026-06-21', lastSeen: '2026-06-15' }, // diff op
    { sig: '5x5', operation: 'multiplication', box: 1, dueAt: '2026-06-30', lastSeen: '2026-06-01' }, // weak but not due
  ];

  it('returns due-and-weak first, ascending box, oldest lastSeen tiebreak', () => {
    const targets = selectWeakFactTargets(facts, { operation: 'multiplication', max: 10 });
    // 7x8 (box 0, due) first; 6x9 (box 2, due) next; 5x5 (weak but not due) after due ones.
    expect(targets[0]).toBe('7x8');
    expect(targets[1]).toBe('6x9');
    // 4x4 (box 4) excluded entirely (not weak)
    expect(targets).not.toContain('4x4');
    // addition fact excluded by operation filter
    expect(targets).not.toContain('3+9');
  });

  it('respects max', () => {
    const targets = selectWeakFactTargets(facts, { operation: 'multiplication', max: 1 });
    expect(targets).toHaveLength(1);
    expect(targets[0]).toBe('7x8');
  });

  it('filters by operation', () => {
    const targets = selectWeakFactTargets(facts, { operation: 'addition', max: 10 });
    expect(targets).toEqual(['3+9']);
  });
});
