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
