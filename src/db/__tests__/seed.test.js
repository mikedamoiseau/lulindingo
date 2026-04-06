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
  it('seeds 4 units', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    expect(units).toHaveLength(4);
    const titles = units.map((u) => u.title);
    expect(titles).toContain('Addition');
    expect(titles).toContain('Subtraction');
    expect(titles).toContain('Multiplication');
    expect(titles).toContain('Division');
  });

  it('seeds 20 lessons (5 per unit)', async () => {
    await seedDatabase();
    const lessons = await db.lessons.toArray();
    expect(lessons).toHaveLength(20);
  });

  it('each lesson has tier, operation, and no exercises', async () => {
    await seedDatabase();
    const lessons = await db.lessons.toArray();
    for (const lesson of lessons) {
      expect(lesson.tier).toBeGreaterThanOrEqual(1);
      expect(lesson.tier).toBeLessThanOrEqual(5);
      expect(lesson.operation).toBeDefined();
      expect(lesson.exercises).toBeUndefined();
    }
  });

  it('each unit has exactly 5 lessons with tiers 1-5', async () => {
    await seedDatabase();
    const units = await db.units.toArray();
    const lessons = await db.lessons.toArray();
    for (const unit of units) {
      const unitLessons = lessons.filter((l) => l.unitId === unit.id);
      expect(unitLessons).toHaveLength(5);
      const tiers = unitLessons.map((l) => l.tier).sort();
      expect(tiers).toEqual([1, 2, 3, 4, 5]);
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

  it('is idempotent', async () => {
    await seedDatabase();
    const firstCount = await db.units.count();
    await seedDatabase();
    const secondCount = await db.units.count();
    expect(firstCount).toBe(secondCount);
  });
});
