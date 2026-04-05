import Dexie from 'dexie';

export const db = new Dexie('LuLinDingo');

db.version(1).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
});
