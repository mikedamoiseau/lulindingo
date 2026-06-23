import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/database';
import { setActiveUserId, getActiveUserId } from '../../db/profileMeta';
import useGameStore, { getDueFactCount } from '../useGameStore';
import { getLocalDateString } from '../../utils/streakTracker';
import { createDefaultLayout, acornBalance } from '../../utils/denEconomy';

function getStore() {
  return useGameStore.getState();
}

// Seed a user row AND mark it active, mirroring how a real install resolves the
// active profile. Returns the new user id.
async function seedActiveUser(row) {
  const id = await db.users.add(row);
  await setActiveUserId(id);
  return id;
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
  await db.dailyQuests.clear();
  await db.facts.clear();
  await db.meta.clear();
  useGameStore.setState({
    user: null,
    profiles: [],
    isLoaded: false,
    lessonXp: 0,
    lessonCorrect: 0,
    lessonTotal: 0,
    _currentRunCorrect: 0,
  });
});

describe('createUser', () => {
  it('creates a user with correct initial state', async () => {
    await getStore().createUser('TestKid', '8-10');
    const { user } = getStore();
    expect(user).not.toBeNull();
    expect(user.name).toBe('TestKid');
    expect(user.ageBand).toBe('8-10');
    expect(user.hearts).toBe(10);
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
    await seedActiveUser({
      name: 'Existing',
      totalXp: 100,
      hearts: 10,
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
    await seedActiveUser({
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
    await seedActiveUser({
      name: 'BrokenStreak',
      totalXp: 0,
      hearts: 10,
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
    await seedActiveUser({
      name: 'ValidStreak',
      totalXp: 0,
      hearts: 10,
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
    const id = await seedActiveUser({
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
    expect(getStore().user.hearts).toBe(9);
  });

  it('does nothing at 0 hearts', async () => {
    // Lose all 10 hearts
    for (let i = 0; i < 10; i++) await getStore().loseHeart();
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
    expect(users[0].hearts).toBe(9);
  });
});

describe('gainHeart', () => {
  beforeEach(async () => {
    await getStore().createUser('HeartGain', '8-10');
  });

  it('increments hearts by 1 when below max', async () => {
    await getStore().loseHeart(); // 9
    await getStore().gainHeart(); // 10
    expect(getStore().user.hearts).toBe(10);
  });

  it('does nothing at max hearts', async () => {
    await getStore().gainHeart();
    expect(getStore().user.hearts).toBe(10);
  });

  it('persists to DB', async () => {
    await getStore().loseHeart();
    await getStore().gainHeart();
    const users = await db.users.toArray();
    expect(users[0].hearts).toBe(10);
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
    const record = await db.streakHistory.get([getStore().user.id, today]);
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
    const progress = await db.progress.get([getStore().user.id, 'lesson-1']);
    expect(progress.completed).toBe(true);
    expect(progress.stars).toBe(3);
    expect(progress.bestAccuracy).toBe(95);
  });

  it('creates progress with 2 stars for 70-89% accuracy', async () => {
    await getStore().completeLesson('lesson-2', 75);
    const progress = await db.progress.get([getStore().user.id, 'lesson-2']);
    expect(progress.stars).toBe(2);
  });

  it('creates progress with 1 star for <70% accuracy', async () => {
    await getStore().completeLesson('lesson-3', 50);
    const progress = await db.progress.get([getStore().user.id, 'lesson-3']);
    expect(progress.stars).toBe(1);
  });

  it('does not downgrade stars on replay', async () => {
    await getStore().completeLesson('lesson-replay', 95); // 3 stars
    await getStore().completeLesson('lesson-replay', 50); // Would be 1 star
    const progress = await db.progress.get([getStore().user.id, 'lesson-replay']);
    expect(progress.stars).toBe(3); // Kept max
    expect(progress.bestAccuracy).toBe(95); // Kept max
  });

  it('increments attempts on replay', async () => {
    await getStore().completeLesson('lesson-attempts', 80);
    await getStore().completeLesson('lesson-attempts', 90);
    const progress = await db.progress.get([getStore().user.id, 'lesson-attempts']);
    expect(progress.attempts).toBe(2);
  });

  it('sets completedAt timestamp', async () => {
    const before = Date.now();
    await getStore().completeLesson('lesson-ts', 80);
    const progress = await db.progress.get([getStore().user.id, 'lesson-ts']);
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
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
  });

  it('Starter (6-7) skips no units', async () => {
    await getStore().createUser('Starter', '6-7');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });

  it('Explorer (8-10) skips no units', async () => {
    await getStore().createUser('Explorer', '8-10');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });

  it('Challenger (11-12) skips Addition and Subtraction', async () => {
    await getStore().createUser('Challenger', '11-12');
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(10);
    const add = progress.filter((p) => p.lessonId.includes('addition'));
    const sub = progress.filter((p) => p.lessonId.includes('subtraction'));
    expect(add).toHaveLength(5);
    expect(sub).toHaveLength(5);
  });
});

describe('createUser with placement', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
  });

  it('stores startingTier and placementMethod', async () => {
    await getStore().createUser('Placed', '8-10', { startingTier: 3, placementMethod: 'test' });
    const { user } = getStore();
    expect(user.startingTier).toBe(3);
    expect(user.placementMethod).toBe('test');
  });

  it('defaults to startingTier 1 and manual when not provided', async () => {
    await getStore().createUser('Default', '6-7');
    const { user } = getStore();
    expect(user.startingTier).toBe(1);
    expect(user.placementMethod).toBe('manual');
  });

  it('Explorer with startingTier 3 skips first 2 addition lessons', async () => {
    await getStore().createUser('Explorer3', '8-10', { startingTier: 3, placementMethod: 'test' });
    const progress = await db.progress.toArray();
    const addSkipped = progress.filter((p) => p.lessonId.startsWith('math-addition'));
    expect(addSkipped).toHaveLength(2);
    expect(addSkipped.map((p) => p.lessonId).sort()).toEqual([
      'math-addition-lesson-1',
      'math-addition-lesson-2',
    ]);
  });

  it('Challenger with startingTier 2 skips add+sub units + first multiplication lesson', async () => {
    await getStore().createUser('Chall2', '11-12', { startingTier: 2, placementMethod: 'test' });
    const progress = await db.progress.toArray();
    // 10 from unit skip (add + sub) + 1 from placement skip (mul lesson 1)
    expect(progress).toHaveLength(11);
    expect(progress.find((p) => p.lessonId === 'math-multiplication-lesson-1')).toBeDefined();
  });
});

describe('updateSettings re-applies skip logic', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
    await getStore().createUser('Settings', '6-7');
  });

  it('changing from Starter to Challenger marks 10 lessons complete', async () => {
    await getStore().updateSettings({ ageBand: '11-12' });
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(10);
  });

  it('changing from Challenger to Starter clears skip progress', async () => {
    await getStore().updateSettings({ ageBand: '11-12' });
    await getStore().updateSettings({ ageBand: '6-7' });
    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(0);
  });
});

describe('createUser read-aloud defaults', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
  });

  it('defaults readAloud off and speechRate 1.0', async () => {
    await getStore().createUser('Ava', '6-7');
    const { user } = getStore();
    expect(user.readAloud).toBe(false);
    expect(user.speechRate).toBe(1.0);
  });
});

describe('updateSettings read-aloud', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
    await getStore().createUser('Ben', '8-10');
  });

  it('persists readAloud and speechRate without clearing progress', async () => {
    await getStore().updateSettings({ readAloud: true, speechRate: 0.7 });
    const { user } = getStore();
    expect(user.readAloud).toBe(true);
    expect(user.speechRate).toBe(0.7);
    const fresh = await db.users.get(user.id);
    expect(fresh.readAloud).toBe(true);
    expect(fresh.speechRate).toBe(0.7);
  });
});

describe('daily quests', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
    await getStore().createUser('Quester', '8-10');
  });

  it('ensureTodayQuests creates one row keyed by today', async () => {
    await getStore().ensureTodayQuests();
    const today = getLocalDateString();
    const row = await db.dailyQuests.get([getStore().user.id, today]);
    expect(row).toBeDefined();
    expect(row.questIds).toHaveLength(3);
    expect(row.claimed).toBe(false);
    expect(row.answerCount).toBe(0);
  });

  it('ensureTodayQuests is idempotent (does not overwrite progress)', async () => {
    await getStore().ensureTodayQuests();
    await getStore().bumpQuestStats((row) => ({ answerCount: row.answerCount + 5 }));
    await getStore().ensureTodayQuests();
    const row = await db.dailyQuests.get([getStore().user.id, getLocalDateString()]);
    expect(row.answerCount).toBe(5);
  });

  it('recordAnswer accumulates total + per-operation + run streak', async () => {
    await getStore().ensureTodayQuests();
    getStore().recordAnswer(true, 'multiplication');
    getStore().recordAnswer(true, 'multiplication');
    getStore().recordAnswer(false, 'multiplication');
    getStore().recordAnswer(true, 'multiplication');
    // allow async DB writes to settle
    await new Promise((r) => setTimeout(r, 20));
    const row = await db.dailyQuests.get([getStore().user.id, getLocalDateString()]);
    expect(row.answerCount).toBe(4);
    expect(row.answerByOperation.multiplication).toBe(4);
    expect(row.bestStreakInSession).toBe(2); // best run was 2 before the wrong answer
  });

  it('completeLesson bumps lessonCount and bestLessonStars (non-practice)', async () => {
    await getStore().ensureTodayQuests();
    await getStore().completeLesson('math-addition-lesson-1', 95); // 95% → 3 stars
    const row = await db.dailyQuests.get([getStore().user.id, getLocalDateString()]);
    expect(row.lessonCount).toBe(1);
    expect(row.bestLessonStars).toBe(3);
  });

  it('completeLesson skips quest accounting in practice mode', async () => {
    await getStore().ensureTodayQuests();
    await getStore().completeLesson('math-addition-lesson-1', 95, true);
    const row = await db.dailyQuests.get([getStore().user.id, getLocalDateString()]);
    expect(row.lessonCount).toBe(0);
    expect(row.bestLessonStars).toBe(0);
  });

  it('claimQuestReward refuses until all done, then awards once', async () => {
    await getStore().ensureTodayQuests();
    const before = await getStore().claimQuestReward();
    expect(before.claimed).toBe(false); // not all done

    // Force all quests complete by cranking every metric.
    await db.dailyQuests.update([getStore().user.id, getLocalDateString()], {
      answerCount: 999,
      answerByOperation: { addition: 999, subtraction: 999, multiplication: 999, division: 999 },
      bestStreakInSession: 999,
      lessonCount: 999,
      bestLessonStars: 3,
    });

    const heartsBefore = getStore().user.hearts;
    const first = await getStore().claimQuestReward();
    expect(first.claimed).toBe(true);

    const second = await getStore().claimQuestReward();
    expect(second.alreadyClaimed).toBe(true); // idempotent

    const row = await db.dailyQuests.get([getStore().user.id, getLocalDateString()]);
    expect(row.claimed).toBe(true);
    // reward applied at most once (heart up by 1 unless already at MAX)
    const heartsAfter = getStore().user.hearts;
    expect(heartsAfter).toBeLessThanOrEqual(heartsBefore + 1);
  });

  it('claimQuestReward grants exactly once under a concurrent double-tap', async () => {
    await getStore().ensureTodayQuests();
    await db.dailyQuests.update([getStore().user.id, getLocalDateString()], {
      answerCount: 999,
      answerByOperation: { addition: 999, subtraction: 999, multiplication: 999, division: 999 },
      bestStreakInSession: 999,
      lessonCount: 999,
      bestLessonStars: 3,
    });
    // ensure the reward path is "heart" (room to gain) so we can count grants
    await db.users.update(getStore().user.id, { hearts: 1 });
    await getStore().loadUser();
    const heartsBefore = getStore().user.hearts;

    // Fire two claims simultaneously (rapid double-tap).
    const [a, b] = await Promise.all([
      getStore().claimQuestReward(),
      getStore().claimQuestReward(),
    ]);
    const grants = [a, b].filter((r) => r.reward).length;
    expect(grants).toBe(1); // only one call actually grants
    const heartsAfter = getStore().user.hearts;
    expect(heartsAfter).toBe(heartsBefore + 1); // reward applied exactly once
  });

  it('practice answers do not accrue quest progress', async () => {
    await getStore().ensureTodayQuests();
    getStore().recordAnswer(true, 'multiplication', true); // isPractice = true
    getStore().recordAnswer(true, 'multiplication', true);
    await getStore()._questWriteQueue;
    const row = await db.dailyQuests.get([getStore().user.id, getLocalDateString()]);
    expect(row.answerCount).toBe(0);
  });
});

describe('fact vault (recordAnswer threading)', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
    await getStore().createUser('FactKid', '8-10');
  });

  it('recordAnswer(true) with no exercise creates no fact row (backward compat)', async () => {
    getStore().recordAnswer(true);
    await getStore()._factWriteQueue;
    const facts = await db.facts.toArray();
    expect(facts).toHaveLength(0);
    expect(getStore().lessonTotal).toBe(1);
  });

  it('records a fact for a type-answer exercise', async () => {
    getStore().recordAnswer(true, 'multiplication', false, {
      type: 'type-answer',
      equation: '7 × 8 = []',
      correctAnswer: 56,
    });
    await getStore()._factWriteQueue;
    const fact = await db.facts.get([getStore().user.id, '7x8']);
    expect(fact).toBeDefined();
    expect(fact.box).toBe(1);
    expect(fact.seen).toBe(1);
    expect(fact.operation).toBe('multiplication');
  });

  it('demotes box and sets dueAt tomorrow on a subsequent wrong answer', async () => {
    const ex = { type: 'type-answer', equation: '7 × 8 = []', correctAnswer: 56 };
    getStore().recordAnswer(true, 'multiplication', false, ex);
    await getStore()._factWriteQueue;
    getStore().recordAnswer(false, 'multiplication', false, ex);
    await getStore()._factWriteQueue;
    const fact = await db.facts.get([getStore().user.id, '7x8']);
    expect(fact.seen).toBe(2);
    expect(fact.box).toBe(0); // 1 → max(1-2,0) = 0
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(fact.dueAt).toBe(getLocalDateString(tomorrow));
  });

  it('skips follow-pattern exercises (no fact recorded)', async () => {
    getStore().recordAnswer(true, 'multiplication', false, {
      type: 'follow-pattern',
      equation: '7 × 8 = []',
      correctAnswer: 56,
    });
    await getStore()._factWriteQueue;
    expect(await db.facts.toArray()).toHaveLength(0);
  });

  it('records facts in practice mode (review must update facts)', async () => {
    getStore().recordAnswer(true, 'multiplication', true, {
      type: 'type-answer',
      equation: '6 × 9 = []',
      correctAnswer: 54,
    });
    await getStore()._factWriteQueue;
    expect(await db.facts.get([getStore().user.id, '6x9'])).toBeDefined();
  });

  it('honours trackFacts:false (placement diagnostic stays vault-free)', async () => {
    getStore().recordAnswer(
      true,
      'multiplication',
      false,
      { type: 'type-answer', equation: '7 × 8 = []', correctAnswer: 56 },
      { trackFacts: false }
    );
    await getStore()._factWriteQueue;
    expect(await db.facts.toArray()).toHaveLength(0);
  });

  it('getDueFactCount counts rows due on or before today', async () => {
    const today = getLocalDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await db.facts.bulkPut([
      { userId: 1, sig: 'a', operation: 'addition', box: 0, dueAt: getLocalDateString(yesterday) },
      { userId: 1, sig: 'b', operation: 'addition', box: 1, dueAt: today },
      { userId: 1, sig: 'c', operation: 'addition', box: 2, dueAt: getLocalDateString(tomorrow) },
    ]);
    const facts = await db.facts.toArray();
    expect(getDueFactCount(facts)).toBe(2);
  });
});

describe('streakHistory time-of-day', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
    await getStore().createUser('TimeKid', '8-10');
  });

  it('updateStreak seeds a timeOfDay bucket object', async () => {
    await getStore().updateStreak();
    const today = (await db.streakHistory.toArray())[0];
    expect(today.timeOfDay).toBeDefined();
    expect(today.timeOfDay).toHaveProperty('morning');
    expect(today.timeOfDay).toHaveProperty('afternoon');
    expect(today.timeOfDay).toHaveProperty('evening');
  });

  it('completeLesson increments the bucket for the current hour', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); // mock the clock only — leave timers real so fake-indexeddb works
    vi.setSystemTime(new Date('2026-06-22T09:00:00')); // morning
    await getStore().updateStreak();
    getStore().addLessonXp(60);
    await getStore().completeLesson('math-addition-lesson-1', 100);
    const today = (await db.streakHistory.toArray())[0];
    expect(today.timeOfDay.morning).toBe(1);
    expect(today.timeOfDay.afternoon).toBe(0);
    vi.useRealTimers();
  });
});

describe("Dingo's Den economy", () => {
  it('createUser seeds spentAcorns 0 and the default den layout', async () => {
    await getStore().createUser('Denner', '8-10');
    const { user } = getStore();
    expect(user.spentAcorns).toBe(0);
    expect(user.denLayout).toEqual(createDefaultLayout());
    // persisted, not just in store
    const persisted = (await db.users.toArray())[0];
    expect(persisted.spentAcorns).toBe(0);
    expect(persisted.denLayout.slots.sky).toBe('sky-day');
  });

  it('buyAndEquip charges an affordable item, equips it, and persists', async () => {
    await getStore().createUser('Buyer', '8-10');
    await getStore().addXp(300);
    const res = await getStore().buyAndEquip('hat-party'); // cost 100
    expect(res.ok).toBe(true);
    const { user } = getStore();
    expect(user.spentAcorns).toBe(100);
    expect(user.totalXp).toBe(300); // XP never decremented
    expect(user.denLayout.owned).toContain('hat-party');
    expect(user.denLayout.cosmetics.hat).toBe('hat-party');
    expect(acornBalance(user.totalXp, user.spentAcorns)).toBe(200);
    const persisted = (await db.users.toArray())[0];
    expect(persisted.spentAcorns).toBe(100);
    expect(persisted.denLayout.cosmetics.hat).toBe('hat-party');
  });

  it('two rapid buys of different items both land (no lost purchase / undercount)', async () => {
    await getStore().createUser('FastTapper', '8-10');
    await getStore().addXp(300);
    // Fire two purchases for different slots near-simultaneously.
    const [a, b] = await Promise.all([
      getStore().buyAndEquip('plants-grass'), // cost 30, plants slot
      getStore().buyAndEquip('weather-cloud'), // cost 40, weather slot
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    const { user } = getStore();
    // Both charged: 30 + 40 = 70, not just one.
    expect(user.spentAcorns).toBe(70);
    expect(user.denLayout.owned).toEqual(expect.arrayContaining(['plants-grass', 'weather-cloud']));
    expect(user.denLayout.slots.plants).toBe('plants-grass');
    expect(user.denLayout.slots.weather).toBe('weather-cloud');
    const persisted = (await db.users.toArray())[0];
    expect(persisted.spentAcorns).toBe(70);
  });

  it('buyAndEquip on an unaffordable item is a no-op (no negative balance)', async () => {
    await getStore().createUser('Broke', '8-10');
    await getStore().addXp(50);
    const res = await getStore().buyAndEquip('hat-crown'); // cost 200
    expect(res.ok).toBe(false);
    const { user } = getStore();
    expect(user.spentAcorns).toBe(0);
    expect(user.denLayout.cosmetics.hat).toBeNull();
    expect(acornBalance(user.totalXp, user.spentAcorns)).toBe(50);
  });

  it('re-buying an owned item never double-charges', async () => {
    await getStore().createUser('Repeat', '8-10');
    await getStore().addXp(300);
    await getStore().buyAndEquip('hat-party'); // 100
    await getStore().clearSlot('hat');
    await getStore().buyAndEquip('hat-party'); // owned → free re-equip
    const { user } = getStore();
    expect(user.spentAcorns).toBe(100);
    expect(user.denLayout.cosmetics.hat).toBe('hat-party');
  });

  it('equip swaps owned items without touching spentAcorns', async () => {
    await getStore().createUser('Equipper', '8-10');
    await getStore().addXp(300);
    await getStore().buyAndEquip('pond-small'); // 70
    await getStore().clearSlot('pond');
    expect(getStore().user.denLayout.slots.pond).toBeNull();
    const res = await getStore().equip('pond-small');
    expect(res.ok).toBe(true);
    const { user } = getStore();
    expect(user.denLayout.slots.pond).toBe('pond-small');
    expect(user.spentAcorns).toBe(70); // unchanged
  });

  it('clearSlot persists and never touches spentAcorns', async () => {
    await getStore().createUser('Clearer', '8-10');
    await getStore().clearSlot('sky');
    const { user } = getStore();
    expect(user.denLayout.slots.sky).toBeNull();
    expect(user.spentAcorns).toBe(0);
    const persisted = (await db.users.toArray())[0];
    expect(persisted.denLayout.slots.sky).toBeNull();
  });

  it('loadUser backfills missing den fields on a pre-den (v1-style) user row', async () => {
    await seedActiveUser({
      name: 'Legacy',
      totalXp: 100,
      hearts: 10,
      heartsLastRefill: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      ageBand: '8-10',
      createdAt: new Date(),
      // no spentAcorns, no denLayout
    });
    await getStore().loadUser();
    const { user } = getStore();
    expect(user.spentAcorns).toBe(0);
    expect(user.denLayout).toBeTruthy();
    expect(user.denLayout.slots.sky).toBe('sky-day');
  });
});

describe('family profiles', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
  });

  it('createUser stamps progress.userId on skip rows and sets the new user active', async () => {
    // 11-12 skips addition + subtraction entirely, guaranteeing skip rows.
    await getStore().createUser('Active', '11-12');
    const { user } = getStore();
    expect(await getActiveUserId()).toBe(user.id);
    const rows = await db.progress.where('userId').equals(user.id).toArray();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.userId).toBe(user.id);
    // profiles list is refreshed
    expect(getStore().profiles.map((p) => p.id)).toContain(user.id);
  });

  it('keeps two children isolated — A completing a lesson does not appear for B', async () => {
    await getStore().createUser('ChildA', '8-10');
    const a = getStore().user.id;
    await getStore().completeLesson('math-addition-lesson-3', 100);

    await getStore().createUser('ChildB', '8-10');
    const b = getStore().user.id;
    expect(b).not.toBe(a);

    // B is now active; B has no record of A's completed lesson.
    const bRow = await db.progress.get([b, 'math-addition-lesson-3']);
    expect(bRow).toBeUndefined();

    // A's row is intact and scoped to A.
    const aRow = await db.progress.get([a, 'math-addition-lesson-3']);
    expect(aRow).toBeDefined();
    expect(aRow.userId).toBe(a);
    expect(aRow.completed).toBe(true);

    // B's scoped progress does not contain that lesson.
    const bProgress = await db.progress.where('userId').equals(b).toArray();
    expect(bProgress.some((p) => p.lessonId === 'math-addition-lesson-3')).toBe(false);
  });

  it('loadUser shows the picker when children exist but none active', async () => {
    await getStore().createUser('Picky', '8-10');
    await clearActiveUserIdViaMeta();
    await getStore().loadUser();
    expect(getStore().user).toBeNull();
    expect(getStore().profiles).toHaveLength(1);
    expect(getStore().isLoaded).toBe(true);
  });

  it('loadUser shows onboarding when no children exist', async () => {
    await getStore().loadUser();
    expect(getStore().user).toBeNull();
    expect(getStore().profiles).toHaveLength(0);
  });

  it('loadUser falls back to picker on a stale active id', async () => {
    await getStore().createUser('Stale', '8-10');
    await setActiveUserId(99999); // points at no real child
    await getStore().loadUser();
    expect(getStore().user).toBeNull();
    expect(getStore().profiles).toHaveLength(1);
  });

  it('switchProfile swaps the active user and recomputes hearts', async () => {
    await getStore().createUser('First', '8-10');
    const first = getStore().user.id;
    await getStore().createUser('Second', '8-10');
    const second = getStore().user.id;
    expect(getStore().user.id).toBe(second);

    await getStore().switchProfile(first);
    expect(getStore().user.id).toBe(first);
    expect(getStore().user.name).toBe('First');
    expect(await getActiveUserId()).toBe(first);
    expect(getStore().user.hearts).toBeGreaterThan(0);
  });

  it('deleteProfile removes a child plus all its scoped rows, leaving siblings untouched', async () => {
    await getStore().createUser('Keeper', '8-10');
    const keeper = getStore().user.id;
    await getStore().completeLesson('math-addition-lesson-3', 100);
    await getStore().updateStreak();

    await getStore().createUser('Doomed', '8-10');
    const doomed = getStore().user.id;
    await getStore().completeLesson('math-addition-lesson-3', 100);
    await getStore().updateStreak();

    await getStore().deleteProfile(doomed);

    // Doomed's rows are gone across every per-child table.
    expect(await db.users.get(doomed)).toBeUndefined();
    expect(await db.progress.where('userId').equals(doomed).count()).toBe(0);
    expect(await db.streakHistory.where('userId').equals(doomed).count()).toBe(0);
    expect(await db.dailyQuests.where('userId').equals(doomed).count()).toBe(0);
    expect(await db.facts.where('userId').equals(doomed).count()).toBe(0);

    // Keeper's data survives.
    expect(await db.users.get(keeper)).toBeDefined();
    expect(await db.progress.where('userId').equals(keeper).count()).toBeGreaterThan(0);
  });

  it('deleting the ACTIVE child clears the active pointer (next load → picker/onboarding)', async () => {
    await getStore().createUser('Solo', '8-10');
    const solo = getStore().user.id;
    expect(await getActiveUserId()).toBe(solo);

    await getStore().deleteProfile(solo);
    expect(await getActiveUserId()).toBeNull();
    // Was the last child → onboarding.
    expect(getStore().user).toBeNull();
    expect(getStore().profiles).toHaveLength(0);
  });

  it('updateSettings({ageBand}) resets only the active child progress; siblings survive', async () => {
    await getStore().createUser('Sibling', '8-10');
    const sibling = getStore().user.id;
    await getStore().completeLesson('math-addition-lesson-3', 100);
    const siblingBefore = await db.progress.where('userId').equals(sibling).count();
    expect(siblingBefore).toBeGreaterThan(0);

    await getStore().createUser('Resetter', '8-10');
    const resetter = getStore().user.id;
    await getStore().completeLesson('math-addition-lesson-3', 100);

    // Reset only the active (Resetter) child's progress via age-band change.
    await getStore().updateSettings({ ageBand: '11-12' });

    // Resetter's old completed lesson is wiped (replaced by 11-12 skip rows).
    const resetterRow = await db.progress.get([resetter, 'math-addition-lesson-3']);
    // 11-12 skips addition entirely, so this lesson is auto-completed as a skip
    // row OR absent; either way it is NOT the manually completed row we expect
    // to persist. The key assertion: the sibling is untouched.
    expect(resetterRow === undefined || resetterRow.attempts === 0).toBe(true);

    // Sibling's progress is completely untouched.
    const siblingRow = await db.progress.get([sibling, 'math-addition-lesson-3']);
    expect(siblingRow).toBeDefined();
    expect(siblingRow.completed).toBe(true);
    expect(await db.progress.where('userId').equals(sibling).count()).toBe(siblingBefore);
  });
});

// Helper that bypasses the public API to simulate "children exist but no active
// profile" (e.g. after a delete that cleared meta out-of-band).
async function clearActiveUserIdViaMeta() {
  const { clearActiveUserId } = await import('../../db/profileMeta.js');
  await clearActiveUserId();
}
