import Dexie from 'dexie';

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
