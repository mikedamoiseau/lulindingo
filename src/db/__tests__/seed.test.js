import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../database';
import { seedDatabase } from '../seed';

beforeEach(async () => {
  await db.users.clear();
  await db.units.clear();
  await db.lessons.clear();
  await db.progress.clear();
  await db.streakHistory.clear();
});

describe('seedDatabase', () => {
  it('seeds units from data files', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    expect(units.length).toBeGreaterThan(0);
    expect(units[0].moduleId).toBe('math');
  });

  it('seeds lessons from data files', async () => {
    await seedDatabase();
    const lessons = await db.lessons.toArray();
    expect(lessons.length).toBeGreaterThan(0);
    expect(lessons[0].exercises).toBeDefined();
    expect(Array.isArray(lessons[0].exercises)).toBe(true);
  });

  it('is idempotent — calling twice does not duplicate', async () => {
    await seedDatabase();
    const firstCount = await db.units.count();
    await seedDatabase();
    const secondCount = await db.units.count();
    expect(firstCount).toBe(secondCount);
  });

  it('seeds all 5 units', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    expect(units).toHaveLength(5);
    const titles = units.map((u) => u.title);
    expect(titles).toContain('Addition 1');
    expect(titles).toContain('Addition 2');
    expect(titles).toContain('Addition 3');
    expect(titles).toContain('Subtraction 1');
    expect(titles).toContain('Subtraction 2');
  });

  it('seeds 25 lessons total', async () => {
    await seedDatabase();
    const lessons = await db.lessons.toArray();
    expect(lessons).toHaveLength(25);
  });

  it('every lesson has at least 10 exercises', async () => {
    await seedDatabase();
    const lessons = await db.lessons.toArray();
    for (const lesson of lessons) {
      expect(lesson.exercises.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('every lesson references a valid unit', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    const unitIds = new Set(units.map((u) => u.id));
    const lessons = await db.lessons.toArray();
    for (const lesson of lessons) {
      expect(unitIds.has(lesson.unitId)).toBe(true);
    }
  });
});
