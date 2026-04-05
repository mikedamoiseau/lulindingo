import { describe, it, expect } from 'vitest';
import { getUnitStates, getLessonStatus, getMaxExercises } from '../progression';

const units = [
  { id: 'unit-1', order: 1 },
  { id: 'unit-2', order: 2 },
  { id: 'unit-3', order: 3 },
];

const lessons = [
  { id: 'u1-l1', unitId: 'unit-1', order: 1 },
  { id: 'u1-l2', unitId: 'unit-1', order: 2 },
  { id: 'u1-l3', unitId: 'unit-1', order: 3 },
  { id: 'u2-l1', unitId: 'unit-2', order: 1 },
  { id: 'u2-l2', unitId: 'unit-2', order: 2 },
  { id: 'u3-l1', unitId: 'unit-3', order: 1 },
];

describe('getUnitStates', () => {
  it('first unit is current when no progress', () => {
    const states = getUnitStates(units, lessons, {});
    expect(states[0].isCurrentUnit).toBe(true);
    expect(states[0].allComplete).toBe(false);
    expect(states[1].isCurrentUnit).toBe(false);
    expect(states[2].isCurrentUnit).toBe(false);
  });

  it('second unit is current when first is fully complete', () => {
    const progress = {
      'u1-l1': { completed: true },
      'u1-l2': { completed: true },
      'u1-l3': { completed: true },
    };
    const states = getUnitStates(units, lessons, progress);
    expect(states[0].allComplete).toBe(true);
    expect(states[0].isCurrentUnit).toBe(false);
    expect(states[1].isCurrentUnit).toBe(true);
    expect(states[2].isCurrentUnit).toBe(false);
  });

  it('all units complete when all lessons done', () => {
    const progress = {
      'u1-l1': { completed: true },
      'u1-l2': { completed: true },
      'u1-l3': { completed: true },
      'u2-l1': { completed: true },
      'u2-l2': { completed: true },
      'u3-l1': { completed: true },
    };
    const states = getUnitStates(units, lessons, progress);
    expect(states.every((s) => s.allComplete)).toBe(true);
    expect(states.every((s) => !s.isCurrentUnit)).toBe(true);
  });

  it('partially completed first unit stays current', () => {
    const progress = {
      'u1-l1': { completed: true },
      'u1-l2': { completed: true },
    };
    const states = getUnitStates(units, lessons, progress);
    expect(states[0].isCurrentUnit).toBe(true);
    expect(states[0].allComplete).toBe(false);
  });

  it('handles empty units list', () => {
    const states = getUnitStates([], [], {});
    expect(states).toEqual([]);
  });

  it('handles unit with no lessons', () => {
    const states = getUnitStates([{ id: 'empty', order: 1 }], [], {});
    expect(states[0].allComplete).toBe(false);
    expect(states[0].lessons).toEqual([]);
  });
});

describe('getLessonStatus', () => {
  const unitLessons = [
    { id: 'l1', order: 1 },
    { id: 'l2', order: 2 },
    { id: 'l3', order: 3 },
  ];

  it('first lesson is current with no progress', () => {
    expect(getLessonStatus(unitLessons, 0, {})).toBe('current');
  });

  it('second lesson is locked when first is incomplete', () => {
    expect(getLessonStatus(unitLessons, 1, {})).toBe('locked');
  });

  it('third lesson is locked when first two are incomplete', () => {
    expect(getLessonStatus(unitLessons, 2, {})).toBe('locked');
  });

  it('completed lesson shows as completed', () => {
    const progress = { l1: { completed: true } };
    expect(getLessonStatus(unitLessons, 0, progress)).toBe('completed');
  });

  it('second lesson unlocks when first is completed', () => {
    const progress = { l1: { completed: true } };
    expect(getLessonStatus(unitLessons, 1, progress)).toBe('current');
  });

  it('third lesson stays locked when only first is completed', () => {
    const progress = { l1: { completed: true } };
    expect(getLessonStatus(unitLessons, 2, progress)).toBe('locked');
  });

  it('third lesson unlocks when first two are completed', () => {
    const progress = {
      l1: { completed: true },
      l2: { completed: true },
    };
    expect(getLessonStatus(unitLessons, 2, progress)).toBe('current');
  });

  it('all lessons completed', () => {
    const progress = {
      l1: { completed: true },
      l2: { completed: true },
      l3: { completed: true },
    };
    expect(getLessonStatus(unitLessons, 0, progress)).toBe('completed');
    expect(getLessonStatus(unitLessons, 1, progress)).toBe('completed');
    expect(getLessonStatus(unitLessons, 2, progress)).toBe('completed');
  });
});

describe('getMaxExercises', () => {
  it('returns 6 for ages 6-7', () => {
    expect(getMaxExercises('6-7')).toBe(6);
  });

  it('returns 8 for ages 8-10', () => {
    expect(getMaxExercises('8-10')).toBe(8);
  });

  it('returns 10 for ages 11-12', () => {
    expect(getMaxExercises('11-12')).toBe(10);
  });

  it('defaults to 10 for unknown band', () => {
    expect(getMaxExercises('unknown')).toBe(10);
  });
});
