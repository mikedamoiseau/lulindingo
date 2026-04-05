import { db } from './database';

export async function seedDatabase() {
  const unitCount = await db.units.count();
  if (unitCount > 0) return;

  const { default: units } = await import('../data/math/units.js');
  await db.units.bulkAdd(units);

  const lessonModules = import.meta.glob('../data/math/lessons/*.js');
  for (const path in lessonModules) {
    const mod = await lessonModules[path]();
    await db.lessons.bulkAdd(mod.default);
  }
}
