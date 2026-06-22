import { create } from 'zustand';
import { db } from '../db/database';
import { calculateCurrentHearts, MAX_HEARTS } from '../utils/heartManager';
import { getLocalDateString, calculateStreak } from '../utils/streakTracker';
import { getSkippedLessonIds, getPlacementSkippedLessonIds, getFirstActiveUnitId } from '../utils/skipUnits';
import { selectDailyQuests, allQuestsDone, QUEST_CATALOG } from '../utils/dailyQuests';

const useGameStore = create((set, get) => ({
  user: null,
  isLoaded: false,
  lessonXp: 0,
  lessonCorrect: 0,
  lessonTotal: 0,
  // transient, never persisted — resets on resetLesson and on any wrong answer
  _currentRunCorrect: 0,
  // serializes fire-and-forget quest-stat writes to avoid lost updates
  _questWriteQueue: Promise.resolve(),

  loadUser: async () => {
    const users = await db.users.toArray();
    if (users.length > 0) {
      const user = users[0];
      const refillResult = calculateCurrentHearts(user.hearts, user.heartsLastRefill);
      const currentStreak = calculateStreak(user.lastActiveDate, user.currentStreak);
      const updates = {};
      if (refillResult.hearts !== user.hearts) {
        updates.hearts = refillResult.hearts;
        updates.heartsLastRefill = refillResult.heartsLastRefill;
      }
      if (currentStreak !== user.currentStreak) updates.currentStreak = currentStreak;
      if (Object.keys(updates).length > 0) {
        await db.users.update(user.id, updates);
      }
      set({ user: { ...user, ...updates }, isLoaded: true });
      await get().ensureTodayQuests();
    } else {
      set({ isLoaded: true });
    }
  },

  createUser: async (name, ageBand, options = {}) => {
    const { startingTier = 1, placementMethod = 'manual' } = options;
    const id = await db.users.add({
      name,
      totalXp: 0,
      hearts: MAX_HEARTS,
      heartsLastRefill: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      ageBand,
      startingTier,
      placementMethod,
      readAloud: false,
      speechRate: 1.0,
      speechVoiceURI: null,
      createdAt: new Date(),
    });
    const user = await db.users.get(id);

    const allLessons = await db.lessons.toArray();
    const unitSkippedIds = getSkippedLessonIds(ageBand, allLessons);
    const allSkippedIds = [...unitSkippedIds];

    if (startingTier > 1) {
      const units = await db.units.where('moduleId').equals('math').sortBy('order');
      const firstActiveId = getFirstActiveUnitId(units, unitSkippedIds);
      if (firstActiveId) {
        const placementSkipped = getPlacementSkippedLessonIds(startingTier, firstActiveId, allLessons);
        allSkippedIds.push(...placementSkipped);
      }
    }

    if (allSkippedIds.length > 0) {
      await db.progress.bulkPut(
        allSkippedIds.map((lessonId) => ({
          lessonId,
          completed: true,
          stars: 3,
          bestAccuracy: 100,
          attempts: 0,
          completedAt: new Date(),
        }))
      );
    }

    set({ user });
    await get().ensureTodayQuests();
  },

  loseHeart: async () => {
    const { user } = get();
    if (!user || user.hearts <= 0) return;
    const hearts = user.hearts - 1;
    const heartsLastRefill = new Date();
    await db.users.update(user.id, { hearts, heartsLastRefill });
    set({ user: { ...user, hearts, heartsLastRefill } });
  },

  gainHeart: async () => {
    const { user } = get();
    if (!user || user.hearts >= MAX_HEARTS) return;
    const hearts = user.hearts + 1;
    await db.users.update(user.id, { hearts });
    set({ user: { ...user, hearts } });
  },

  refillHearts: async () => {
    const { user } = get();
    if (!user || user.hearts >= MAX_HEARTS) return;
    const { hearts, heartsLastRefill } = calculateCurrentHearts(user.hearts, user.heartsLastRefill);
    if (hearts !== user.hearts) {
      await db.users.update(user.id, { hearts, heartsLastRefill });
      set({ user: { ...user, hearts, heartsLastRefill } });
    }
  },

  addXp: async (amount) => {
    const { user } = get();
    if (!user) return;
    const totalXp = user.totalXp + amount;
    await db.users.update(user.id, { totalXp });
    set({ user: { ...user, totalXp } });
  },

  ensureTodayQuests: async () => {
    const { user } = get();
    if (!user) return;
    const today = getLocalDateString();
    const existing = await db.dailyQuests.get(today);
    if (existing) return;
    const quests = selectDailyQuests(today, user.ageBand);
    await db.dailyQuests.put({
      date: today,
      questIds: quests.map((q) => q.id),
      claimed: false,
      answerCount: 0,
      answerByOperation: { addition: 0, subtraction: 0, multiplication: 0, division: 0 },
      bestStreakInSession: 0,
      lessonCount: 0,
      bestLessonStars: 0,
    });
  },

  // Merge a patch into today's row, re-reading the date each time so a
  // midnight rollover lands writes on the new day's row (created on demand).
  // `patch` is a function (row) => partialUpdate.
  //
  // recordAnswer fires these without awaiting, so several can be in flight at
  // once. Each is a read-modify-write on the same row, so we serialize them
  // through a promise chain (_questWriteQueue) to avoid lost updates.
  bumpQuestStats: (patch) => {
    const { user } = get();
    if (!user) return Promise.resolve();
    const run = async () => {
      const today = getLocalDateString();
      let row = await db.dailyQuests.get(today);
      if (!row) {
        await get().ensureTodayQuests();
        row = await db.dailyQuests.get(today);
      }
      if (!row) return;
      await db.dailyQuests.update(today, patch(row));
    };
    const next = get()._questWriteQueue.then(run, run);
    set({ _questWriteQueue: next });
    return next;
  },

  recordAnswer: (correct, operation) => {
    set((s) => ({
      lessonCorrect: s.lessonCorrect + (correct ? 1 : 0),
      lessonTotal: s.lessonTotal + 1,
      _currentRunCorrect: correct ? s._currentRunCorrect + 1 : 0,
    }));
    const run = get()._currentRunCorrect;
    // fire-and-forget DB write; UI reads via useLiveQuery
    get().bumpQuestStats((row) => {
      const op =
        operation && row.answerByOperation[operation] !== undefined ? operation : null;
      return {
        answerCount: row.answerCount + 1,
        answerByOperation: op
          ? { ...row.answerByOperation, [op]: row.answerByOperation[op] + 1 }
          : row.answerByOperation,
        bestStreakInSession: Math.max(row.bestStreakInSession, run),
      };
    });
  },

  addLessonXp: (amount) => set((s) => ({ lessonXp: s.lessonXp + amount })),

  resetLesson: () =>
    set({ lessonXp: 0, lessonCorrect: 0, lessonTotal: 0, _currentRunCorrect: 0 }),

  updateStreak: async () => {
    const { user } = get();
    if (!user) return;
    const today = getLocalDateString();
    if (user.lastActiveDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const newStreak =
      user.lastActiveDate === yesterdayStr ? user.currentStreak + 1 : 1;
    const longestStreak = Math.max(newStreak, user.longestStreak);
    await db.users.update(user.id, {
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: today,
    });
    await db.streakHistory.put({
      date: today,
      lessonsCompleted: 0,
      xpEarned: 0,
    });
    set({
      user: {
        ...user,
        currentStreak: newStreak,
        longestStreak,
        lastActiveDate: today,
      },
    });
  },

  completeLesson: async (lessonId, accuracy, isPractice = false) => {
    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
    const existing = await db.progress.get(lessonId);
    await db.progress.put({
      lessonId,
      completed: true,
      stars: existing ? Math.max(existing.stars, stars) : stars,
      bestAccuracy: existing
        ? Math.max(existing.bestAccuracy, accuracy)
        : accuracy,
      attempts: (existing?.attempts || 0) + 1,
      completedAt: new Date(),
    });
    const today = getLocalDateString();
    const hist = await db.streakHistory.get(today);
    if (hist) {
      await db.streakHistory.update(today, {
        lessonsCompleted: hist.lessonsCompleted + 1,
        xpEarned: hist.xpEarned + get().lessonXp,
      });
    }

    // daily quests (skip practice — caller passes isPractice)
    if (!isPractice) {
      await get().bumpQuestStats((row) => ({
        lessonCount: row.lessonCount + 1,
        bestLessonStars: Math.max(row.bestLessonStars, stars),
      }));
    }
  },

  claimQuestReward: async () => {
    const { user } = get();
    if (!user) return { claimed: false };
    const today = getLocalDateString();
    const row = await db.dailyQuests.get(today);
    if (!row) return { claimed: false };
    if (row.claimed) return { claimed: true, alreadyClaimed: true };

    const quests = row.questIds
      .map((id) => QUEST_CATALOG.find((q) => q.id === id))
      .filter(Boolean);
    if (!allQuestsDone(quests, row)) return { claimed: false };

    // flip the flag first (idempotency guard), then grant reward
    await db.dailyQuests.update(today, { claimed: true });
    if (user.hearts < MAX_HEARTS) {
      await get().gainHeart();
      return { claimed: true, reward: 'heart' };
    }
    await get().addXp(25);
    return { claimed: true, reward: 'xp', xp: 25 };
  },

  updateSettings: async (settings) => {
    const { user } = get();
    if (!user) return;
    await db.users.update(user.id, settings);

    if (settings.ageBand) {
      await db.progress.clear();
      const allLessons = await db.lessons.toArray();
      const skippedIds = getSkippedLessonIds(settings.ageBand, allLessons);
      if (skippedIds.length > 0) {
        await db.progress.bulkPut(
          skippedIds.map((lessonId) => ({
            lessonId,
            completed: true,
            stars: 3,
            bestAccuracy: 100,
            attempts: 0,
            completedAt: new Date(),
          }))
        );
      }
    }

    set({ user: { ...user, ...settings } });
  },
}));

export default useGameStore;
