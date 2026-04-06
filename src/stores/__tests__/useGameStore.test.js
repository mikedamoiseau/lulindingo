import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/database';
import useGameStore from '../useGameStore';
import { getLocalDateString } from '../../utils/streakTracker';

function getStore() {
  return useGameStore.getState();
}

function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

function twoDaysAgoString() {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return getLocalDateString(d);
}

beforeEach(async () => {
  // Clear all tables and reset store
  await db.users.clear();
  await db.progress.clear();
  await db.streakHistory.clear();
  await db.units.clear();
  await db.lessons.clear();
  useGameStore.setState({
    user: null,
    isLoaded: false,
    lessonXp: 0,
    lessonCorrect: 0,
    lessonTotal: 0,
  });
});

describe('createUser', () => {
  it('creates a user with correct initial state', async () => {
    await getStore().createUser('TestKid', '8-10');
    const { user } = getStore();
    expect(user).not.toBeNull();
    expect(user.name).toBe('TestKid');
    expect(user.ageBand).toBe('8-10');
    expect(user.hearts).toBe(5);
    expect(user.totalXp).toBe(0);
    expect(user.currentStreak).toBe(0);
    expect(user.longestStreak).toBe(0);
    expect(user.lastActiveDate).toBeNull();
  });

  it('persists user to Dexie', async () => {
    await getStore().createUser('Persisted', '6-7');
    const users = await db.users.toArray();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Persisted');
  });
});

describe('loadUser', () => {
  it('sets isLoaded true with no users', async () => {
    await getStore().loadUser();
    expect(getStore().isLoaded).toBe(true);
    expect(getStore().user).toBeNull();
  });

  it('loads existing user', async () => {
    await db.users.add({
      name: 'Existing',
      totalXp: 100,
      hearts: 5,
      heartsLastRefill: new Date(),
      currentStreak: 3,
      longestStreak: 10,
      lastActiveDate: getLocalDateString(),
      ageBand: '8-10',
      createdAt: new Date(),
    });
    await getStore().loadUser();
    const { user, isLoaded } = getStore();
    expect(isLoaded).toBe(true);
    expect(user.name).toBe('Existing');
    expect(user.totalXp).toBe(100);
  });

  it('recalculates hearts on load if time elapsed', async () => {
    const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000);
    await db.users.add({
      name: 'LowHearts',
      totalXp: 0,
      hearts: 3,
      heartsLastRefill: fortyMinAgo,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      ageBand: '8-10',
      createdAt: new Date(),
    });
    await getStore().loadUser();
    expect(getStore().user.hearts).toBe(5); // 3 + 2 refills
  });

  it('resets streak if broken on load', async () => {
    await db.users.add({
      name: 'BrokenStreak',
      totalXp: 0,
      hearts: 5,
      heartsLastRefill: new Date(),
      currentStreak: 10,
      longestStreak: 10,
      lastActiveDate: twoDaysAgoString(),
      ageBand: '8-10',
      createdAt: new Date(),
    });
    await getStore().loadUser();
    expect(getStore().user.currentStreak).toBe(0);
  });

  it('preserves streak if last active yesterday', async () => {
    await db.users.add({
      name: 'ValidStreak',
      totalXp: 0,
      hearts: 5,
      heartsLastRefill: new Date(),
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDate: yesterdayString(),
      ageBand: '8-10',
      createdAt: new Date(),
    });
    await getStore().loadUser();
    expect(getStore().user.currentStreak).toBe(5);
  });

  it('persists heart refill to DB', async () => {
    const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000);
    const id = await db.users.add({
      name: 'RefillPersist',
      totalXp: 0,
      hearts: 3,
      heartsLastRefill: fortyMinAgo,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      ageBand: '8-10',
      createdAt: new Date(),
    });
    await getStore().loadUser();
    const dbUser = await db.users.get(id);
    expect(dbUser.hearts).toBe(5);
  });
});

describe('loseHeart', () => {
  beforeEach(async () => {
    await getStore().createUser('HeartTest', '8-10');
  });

  it('decrements hearts by 1', async () => {
    await getStore().loseHeart();
    expect(getStore().user.hearts).toBe(4);
  });

  it('does nothing at 0 hearts', async () => {
    // Lose all 5 hearts
    for (let i = 0; i < 5; i++) await getStore().loseHeart();
    expect(getStore().user.hearts).toBe(0);
    // Try to lose another
    await getStore().loseHeart();
    expect(getStore().user.hearts).toBe(0);
  });

  it('resets heartsLastRefill to now', async () => {
    const before = Date.now();
    await getStore().loseHeart();
    const refillTime = new Date(getStore().user.heartsLastRefill).getTime();
    expect(refillTime).toBeGreaterThanOrEqual(before);
  });

  it('persists to DB', async () => {
    await getStore().loseHeart();
    const users = await db.users.toArray();
    expect(users[0].hearts).toBe(4);
  });
});

describe('gainHeart', () => {
  beforeEach(async () => {
    await getStore().createUser('HeartGain', '8-10');
  });

  it('increments hearts by 1 when below max', async () => {
    await getStore().loseHeart(); // 4
    await getStore().gainHeart(); // 5
    expect(getStore().user.hearts).toBe(5);
  });

  it('does nothing at max hearts', async () => {
    await getStore().gainHeart();
    expect(getStore().user.hearts).toBe(5);
  });

  it('persists to DB', async () => {
    await getStore().loseHeart();
    await getStore().gainHeart();
    const users = await db.users.toArray();
    expect(users[0].hearts).toBe(5);
  });
});

describe('addXp', () => {
  beforeEach(async () => {
    await getStore().createUser('XpTest', '8-10');
  });

  it('adds XP to total', async () => {
    await getStore().addXp(10);
    expect(getStore().user.totalXp).toBe(10);
  });

  it('accumulates XP', async () => {
    await getStore().addXp(10);
    await getStore().addXp(10);
    await getStore().addXp(50);
    expect(getStore().user.totalXp).toBe(70);
  });

  it('persists to DB', async () => {
    await getStore().addXp(42);
    const users = await db.users.toArray();
    expect(users[0].totalXp).toBe(42);
  });
});

describe('lesson session counters', () => {
  it('recordAnswer increments correctly', () => {
    getStore().recordAnswer(true);
    getStore().recordAnswer(false);
    getStore().recordAnswer(true);
    expect(getStore().lessonCorrect).toBe(2);
    expect(getStore().lessonTotal).toBe(3);
  });

  it('addLessonXp accumulates', () => {
    getStore().addLessonXp(10);
    getStore().addLessonXp(10);
    expect(getStore().lessonXp).toBe(20);
  });

  it('resetLesson clears all counters', () => {
    getStore().recordAnswer(true);
    getStore().addLessonXp(10);
    getStore().resetLesson();
    expect(getStore().lessonXp).toBe(0);
    expect(getStore().lessonCorrect).toBe(0);
    expect(getStore().lessonTotal).toBe(0);
  });
});

describe('updateStreak', () => {
  beforeEach(async () => {
    await getStore().createUser('StreakTest', '8-10');
  });

  it('sets streak to 1 on first lesson (lastActiveDate null)', async () => {
    await getStore().updateStreak();
    expect(getStore().user.currentStreak).toBe(1);
    expect(getStore().user.lastActiveDate).toBe(getLocalDateString());
  });

  it('increments streak if last active yesterday', async () => {
    // Manually set lastActiveDate to yesterday
    const { user } = getStore();
    await db.users.update(user.id, {
      lastActiveDate: yesterdayString(),
      currentStreak: 5,
    });
    useGameStore.setState({
      user: { ...user, lastActiveDate: yesterdayString(), currentStreak: 5 },
    });

    await getStore().updateStreak();
    expect(getStore().user.currentStreak).toBe(6);
  });

  it('resets streak to 1 if last active 2+ days ago', async () => {
    const { user } = getStore();
    await db.users.update(user.id, {
      lastActiveDate: twoDaysAgoString(),
      currentStreak: 10,
    });
    useGameStore.setState({
      user: { ...user, lastActiveDate: twoDaysAgoString(), currentStreak: 10 },
    });

    await getStore().updateStreak();
    expect(getStore().user.currentStreak).toBe(1);
  });

  it('is a no-op if already active today', async () => {
    await getStore().updateStreak(); // First call: sets today
    const streak = getStore().user.currentStreak;
    await getStore().updateStreak(); // Second call: no-op
    expect(getStore().user.currentStreak).toBe(streak);
  });

  it('updates longestStreak when new streak exceeds it', async () => {
    const { user } = getStore();
    await db.users.update(user.id, {
      lastActiveDate: yesterdayString(),
      currentStreak: 99,
      longestStreak: 99,
    });
    useGameStore.setState({
      user: { ...user, lastActiveDate: yesterdayString(), currentStreak: 99, longestStreak: 99 },
    });

    await getStore().updateStreak();
    expect(getStore().user.currentStreak).toBe(100);
    expect(getStore().user.longestStreak).toBe(100);
  });

  it('creates streakHistory record', async () => {
    await getStore().updateStreak();
    const today = getLocalDateString();
    const record = await db.streakHistory.get(today);
    expect(record).not.toBeNull();
    expect(record.date).toBe(today);
  });
});

describe('completeLesson', () => {
  beforeEach(async () => {
    await getStore().createUser('LessonTest', '8-10');
  });

  it('creates progress with 3 stars for 90%+ accuracy', async () => {
    await getStore().completeLesson('lesson-1', 95);
    const progress = await db.progress.get('lesson-1');
    expect(progress.completed).toBe(true);
    expect(progress.stars).toBe(3);
    expect(progress.bestAccuracy).toBe(95);
  });

  it('creates progress with 2 stars for 70-89% accuracy', async () => {
    await getStore().completeLesson('lesson-2', 75);
    const progress = await db.progress.get('lesson-2');
    expect(progress.stars).toBe(2);
  });

  it('creates progress with 1 star for <70% accuracy', async () => {
    await getStore().completeLesson('lesson-3', 50);
    const progress = await db.progress.get('lesson-3');
    expect(progress.stars).toBe(1);
  });

  it('does not downgrade stars on replay', async () => {
    await getStore().completeLesson('lesson-replay', 95); // 3 stars
    await getStore().completeLesson('lesson-replay', 50); // Would be 1 star
    const progress = await db.progress.get('lesson-replay');
    expect(progress.stars).toBe(3); // Kept max
    expect(progress.bestAccuracy).toBe(95); // Kept max
  });

  it('increments attempts on replay', async () => {
    await getStore().completeLesson('lesson-attempts', 80);
    await getStore().completeLesson('lesson-attempts', 90);
    const progress = await db.progress.get('lesson-attempts');
    expect(progress.attempts).toBe(2);
  });

  it('sets completedAt timestamp', async () => {
    const before = Date.now();
    await getStore().completeLesson('lesson-ts', 80);
    const progress = await db.progress.get('lesson-ts');
    expect(new Date(progress.completedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe('updateSettings', () => {
  beforeEach(async () => {
    await getStore().createUser('SettingsTest', '8-10');
  });

  it('updates ageBand', async () => {
    await getStore().updateSettings({ ageBand: '6-7' });
    expect(getStore().user.ageBand).toBe('6-7');
  });

  it('persists to DB', async () => {
    await getStore().updateSettings({ ageBand: '11-12' });
    const users = await db.users.toArray();
    expect(users[0].ageBand).toBe('11-12');
  });
});

describe('createUser skip logic', () => {
  beforeEach(async () => {
    const { default: units } = await import('../../data/math/units.js');
    await db.units.bulkAdd(units);
    const lessonModules = {
      'addition-1': (await import('../../data/math/lessons/addition-1.js')).default,
      'addition-2': (await import('../../data/math/lessons/addition-2.js')).default,
      'subtraction-1': (await import('../../data/math/lessons/subtraction-1.js')).default,
      'addition-3': (await import('../../data/math/lessons/addition-3.js')).default,
      'subtraction-2': (await import('../../data/math/lessons/subtraction-2.js')).default,
    };
    for (const lessons of Object.values(lessonModules)) {
      await db.lessons.bulkAdd(lessons);
    }
  });

  it('Starter (6-7) skips no units', async () => {
    await getStore().createUser('Starter', '6-7');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });

  it('Explorer (8-10) skips Addition 1', async () => {
    await getStore().createUser('Explorer', '8-10');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(5);
    expect(progress.every((p) => p.lessonId.startsWith('math-addition-1'))).toBe(true);
    expect(progress.every((p) => p.completed === true)).toBe(true);
  });

  it('Challenger (11-12) skips Addition 1, Addition 2, and Subtraction 1', async () => {
    await getStore().createUser('Challenger', '11-12');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(15);
    const add1 = progress.filter((p) => p.lessonId.startsWith('math-addition-1'));
    const add2 = progress.filter((p) => p.lessonId.startsWith('math-addition-2'));
    const sub1 = progress.filter((p) => p.lessonId.startsWith('math-subtraction-1'));
    expect(add1).toHaveLength(5);
    expect(add2).toHaveLength(5);
    expect(sub1).toHaveLength(5);
  });
});

describe('updateSettings re-applies skip logic', () => {
  beforeEach(async () => {
    const { default: units } = await import('../../data/math/units.js');
    await db.units.bulkAdd(units);
    const lessonModules = {
      'addition-1': (await import('../../data/math/lessons/addition-1.js')).default,
      'addition-2': (await import('../../data/math/lessons/addition-2.js')).default,
      'subtraction-1': (await import('../../data/math/lessons/subtraction-1.js')).default,
      'addition-3': (await import('../../data/math/lessons/addition-3.js')).default,
      'subtraction-2': (await import('../../data/math/lessons/subtraction-2.js')).default,
    };
    for (const lessons of Object.values(lessonModules)) {
      await db.lessons.bulkAdd(lessons);
    }
    await getStore().createUser('Settings', '6-7');
  });

  it('changing from Starter to Challenger marks 15 lessons complete', async () => {
    await getStore().updateSettings({ ageBand: '11-12' });
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(15);
  });

  it('changing from Challenger to Starter clears skip progress', async () => {
    await getStore().updateSettings({ ageBand: '11-12' });
    await getStore().updateSettings({ ageBand: '6-7' });
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });
});
