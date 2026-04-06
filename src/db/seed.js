import { db } from './database';

export async function seedDatabase() {
  const unitCount = await db.units.count();
  if (unitCount > 0) return;

  const { default: units } = await import('../data/math/units.js');
  await db.units.bulkAdd(units);

  const lessons = [];
  for (const unit of units) {
    for (let tier = 1; tier <= 5; tier++) {
      lessons.push({
        id: `${unit.id}-lesson-${tier}`,
        unitId: unit.id,
        order: tier,
        tier,
        operation: unit.operation,
      });
    }
  }
  await db.lessons.bulkAdd(lessons);
}
