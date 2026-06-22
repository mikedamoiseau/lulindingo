import Dexie from 'dexie';
import { createDefaultLayout } from '../utils/denEconomy';

export const db = new Dexie('LuLinDingo');

db.version(1).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
});

// v2: read-aloud (text-to-speech) preferences on the user row.
// No index changes — Dexie stores extra fields freely — but we backfill
// defaults so existing rows read predictable values instead of undefined.
db.version(2).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
}).upgrade(async (tx) => {
  await tx.table('users').toCollection().modify((user) => {
    if (user.readAloud === undefined) user.readAloud = false;
    if (user.speechRate === undefined) user.speechRate = 1.0;
    if (user.speechVoiceURI === undefined) user.speechVoiceURI = null;
  });
});

// v3: daily quests. New table keyed by local date string ("YYYY-MM-DD").
// Cumulative declaration — restates all v2 tables plus the new dailyQuests
// table. Rows are created lazily, so no data migration is required.
db.version(3).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
  dailyQuests: 'date',
});

// v4: per-fact mastery vault (Fact Vault feature). New `facts` table keyed by
// a normalized fact signature ("7x8"). Cumulative declaration — restates all
// v3 tables plus the new facts table. Rows are created lazily on first
// encounter of a fact, so no data migration is required.
db.version(4).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
  dailyQuests: 'date',
  facts: 'sig, operation, box, dueAt',
});

// v5: Dingo's Den. Two index-free fields on the user row — `spentAcorns` (a
// monotonic counter; the spendable acorn balance is recomputed as
// totalXp - spentAcorns, never stored) and `denLayout` (owned items + equipped
// slot/cosmetic map). Cumulative declaration — restates all v4 tables. We backfill
// defaults so existing single-user rows read predictable values instead of undefined.
db.version(5).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
  dailyQuests: 'date',
  facts: 'sig, operation, box, dueAt',
}).upgrade(async (tx) => {
  await tx.table('users').toCollection().modify((user) => {
    if (user.spentAcorns == null) user.spentAcorns = 0;
    if (user.denLayout == null) user.denLayout = createDefaultLayout();
  });
});

// v6: Family Profiles. Multiple children share one device, each with an
// ISOLATED progress namespace. The four per-child tables are re-keyed by a
// compound primary key `[userId+...]` (plus a `userId` index for scoped
// queries), and a singleton `meta` table tracks the active profile so the
// launch picker survives reloads.
//
// The upgrade is DATA-PRESERVING: any existing single-child install becomes
// "child #1" with nothing lost. We resolve the legacy user (users[0] if any),
// stamp `userId = legacyId` onto EVERY existing row of progress, streakHistory,
// dailyQuests, and facts, and set meta.activeUserId so the legacy child lands
// straight in the app (no picker).
//
// Dexie cannot change a table's primary key in place ("Not yet support for
// changing primary key"). The supported path is to DELETE the old tables and
// RECREATE them with the new key across two version steps, carrying the data
// through a transient `legacyBackup` table:
//   v6 — read the four old tables, stash every row (stamped with userId) into
//        `legacyBackup`, then delete the old tables (`null`).
//   v7 — recreate the four tables with their compound keys, restore the rows
//        from `legacyBackup`, set meta.activeUserId, then drop `legacyBackup`.
db.version(6).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: null,
  streakHistory: null,
  dailyQuests: null,
  facts: null,
  meta: '&id',
  legacyBackup: '++id',
}).upgrade(async (tx) => {
  const users = await tx.table('users').toArray();
  const legacyId = users.length > 0 ? users[0].id : null;
  await tx.table('meta').put({ id: 'app', activeUserId: legacyId });

  if (legacyId == null) return; // fresh install — nothing to carry forward

  // The old tables still exist (and hold their old-keyed rows) until this
  // version's schema is applied; read them here, then they are dropped.
  const stash = async (table, source) => {
    const rows = await tx.table(source).toArray();
    if (rows.length === 0) return;
    await tx.table('legacyBackup').bulkAdd(
      rows.map((r) => ({ table, row: { ...r, userId: legacyId } }))
    );
  };
  await stash('progress', 'progress');
  await stash('streakHistory', 'streakHistory');
  await stash('dailyQuests', 'dailyQuests');
  await stash('facts', 'facts');
});

// v7: recreate the per-child tables with compound keys and restore the stashed
// rows, then discard the transient backup table.
db.version(7).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: '[userId+lessonId], userId, completed',
  streakHistory: '[userId+date], userId',
  dailyQuests: '[userId+date], userId',
  facts: '[userId+sig], userId, operation, box, dueAt',
  meta: '&id',
  legacyBackup: null,
}).upgrade(async (tx) => {
  const backup = await tx.table('legacyBackup').toArray();
  const byTable = { progress: [], streakHistory: [], dailyQuests: [], facts: [] };
  for (const entry of backup) {
    if (byTable[entry.table]) byTable[entry.table].push(entry.row);
  }
  for (const [table, rows] of Object.entries(byTable)) {
    if (rows.length > 0) await tx.table(table).bulkPut(rows);
  }
});
