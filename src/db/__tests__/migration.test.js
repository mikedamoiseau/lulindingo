import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

// Bind the fake IndexedDB onto the globals the database.js singleton reads at
// construction time. We set this explicitly (rather than relying on
// 'fake-indexeddb/auto') because vi.resetModules() re-evaluates database.js
// between tests and we must guarantee the global is present each time the
// `new Dexie(...)` singleton is reconstructed.
globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const DB_NAME = 'LuLinDingo';

// Hand-seed a pre-v6 database using the LATEST pre-v6 schema (v5), which is the
// real on-disk shape an existing single-child install would have. All four
// per-user tables carry rows so we can prove every one is preserved + stamped.
async function seedPreV6() {
  const old = new Dexie(DB_NAME, { indexedDB, IDBKeyRange });
  old.version(1).stores({
    users: '++id, name',
    units: 'id, moduleId, topic, order',
    lessons: 'id, unitId, order',
    progress: 'lessonId, completed',
    streakHistory: 'date',
  });
  old.version(5).stores({
    users: '++id, name',
    units: 'id, moduleId, topic, order',
    lessons: 'id, unitId, order',
    progress: 'lessonId, completed',
    streakHistory: 'date',
    dailyQuests: 'date',
    facts: 'sig, operation, box, dueAt',
  });
  await old.open();
  const uid = await old.users.add({ name: 'Legacy Kid', ageBand: '8-10', totalXp: 120, hearts: 7 });
  await old.progress.bulkAdd([
    { lessonId: 'math-addition-lesson-1', completed: true, stars: 3, bestAccuracy: 100, attempts: 1 },
    { lessonId: 'math-addition-lesson-2', completed: true, stars: 2, bestAccuracy: 80, attempts: 2 },
  ]);
  await old.streakHistory.bulkAdd([
    { date: '2026-06-20', lessonsCompleted: 2, xpEarned: 40 },
    { date: '2026-06-21', lessonsCompleted: 1, xpEarned: 20 },
  ]);
  await old.dailyQuests.bulkAdd([
    { date: '2026-06-21', questIds: ['q1'], claimed: false, answerCount: 5 },
  ]);
  await old.facts.bulkAdd([
    { sig: '7x8', operation: 'multiplication', box: 2, dueAt: '2026-06-25', attempts: 3 },
    { sig: '6x9', operation: 'multiplication', box: 1, dueAt: '2026-06-23', attempts: 1 },
  ]);
  old.close();
  return uid;
}

describe('pre-v6 → v6 migration', () => {
  beforeEach(async () => {
    vi.resetModules();
    await new Dexie(DB_NAME, { indexedDB, IDBKeyRange }).delete();
  });

  it('stamps existing progress rows with the legacy userId and loses nothing', async () => {
    const legacyId = await seedPreV6();
    const { db } = await import('../database.js'); // current (v7) schema
    await db.open();

    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(2);
    for (const p of progress) {
      expect(p.userId).toBe(legacyId);
    }
    expect(progress.map((p) => p.lessonId).sort()).toEqual([
      'math-addition-lesson-1',
      'math-addition-lesson-2',
    ]);
    expect(progress.find((p) => p.lessonId === 'math-addition-lesson-1').stars).toBe(3);
    db.close();
  });

  it('stamps streakHistory rows with the legacy userId', async () => {
    const legacyId = await seedPreV6();
    const { db } = await import('../database.js');
    await db.open();
    const hist = await db.streakHistory.toArray();
    expect(hist).toHaveLength(2);
    for (const h of hist) expect(h.userId).toBe(legacyId);
    expect(hist.map((h) => h.date).sort()).toEqual(['2026-06-20', '2026-06-21']);
    db.close();
  });

  it('stamps dailyQuests rows with the legacy userId', async () => {
    const legacyId = await seedPreV6();
    const { db } = await import('../database.js');
    await db.open();
    const quests = await db.dailyQuests.toArray();
    expect(quests).toHaveLength(1);
    expect(quests[0].userId).toBe(legacyId);
    expect(quests[0].date).toBe('2026-06-21');
    expect(quests[0].answerCount).toBe(5);
    db.close();
  });

  it('stamps facts rows with the legacy userId', async () => {
    const legacyId = await seedPreV6();
    const { db } = await import('../database.js');
    await db.open();
    const facts = await db.facts.toArray();
    expect(facts).toHaveLength(2);
    for (const f of facts) expect(f.userId).toBe(legacyId);
    expect(facts.map((f) => f.sig).sort()).toEqual(['6x9', '7x8']);
    expect(facts.find((f) => f.sig === '7x8').box).toBe(2);
    db.close();
  });

  it('sets meta.activeUserId to the legacy user so they skip the picker', async () => {
    const legacyId = await seedPreV6();
    const { db } = await import('../database.js');
    await db.open();
    const meta = await db.meta.get('app');
    expect(meta.activeUserId).toBe(legacyId);
    db.close();
  });

  it('fresh install (no legacy user) creates no orphan rows and no active user', async () => {
    const { db } = await import('../database.js');
    await db.open();
    expect(await db.progress.count()).toBe(0);
    expect(await db.facts.count()).toBe(0);
    expect(await db.dailyQuests.count()).toBe(0);
    const meta = await db.meta.get('app');
    expect(meta?.activeUserId == null).toBe(true);
    db.close();
  });
});
