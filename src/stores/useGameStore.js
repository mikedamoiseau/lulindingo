import { create } from 'zustand';
import { db } from '../db/database';
import { calculateCurrentHearts } from '../utils/heartManager';
import { getLocalDateString, calculateStreak } from '../utils/streakTracker';
import { getSkippedLessonIds, getPlacementSkippedLessonIds, getFirstActiveUnitId } from '../utils/skipUnits';

const useGameStore = create((set, get) => ({
  user: null,
  isLoaded: false,
  lessonXp: 0,
  lessonCorrect: 0,
  lessonTotal: 0,

  loadUser: async () => {
    const users = await db.users.toArray();
    if (users.length > 0) {
      const user = users[0];
      const hearts = calculateCurrentHearts(user.hearts, user.heartsLastRefill);
      const currentStreak = calculateStreak(user.lastActiveDate, user.currentStreak);
      const updates = {};
      if (hearts !== user.hearts) updates.hearts = hearts;
      if (currentStreak !== user.currentStreak) updates.currentStreak = currentStreak;
      if (Object.keys(updates).length > 0) {
        await db.users.update(user.id, updates);
      }
      set({ user: { ...user, ...updates }, isLoaded: true });
    } else {
      set({ isLoaded: true });
    }
  },

  createUser: async (name, ageBand, options = {}) => {
    const { startingTier = 1, placementMethod = 'manual' } = options;
    const id = await db.users.add({
      name,
      totalXp: 0,
      hearts: 5,
      heartsLastRefill: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      ageBand,
      startingTier,
      placementMethod,
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
    if (!user || user.hearts >= 5) return;
    const hearts = user.hearts + 1;
    await db.users.update(user.id, { hearts });
    set({ user: { ...user, hearts } });
  },

  addXp: async (amount) => {
    const { user } = get();
    if (!user) return;
    const totalXp = user.totalXp + amount;
    await db.users.update(user.id, { totalXp });
    set({ user: { ...user, totalXp } });
  },

  recordAnswer: (correct) =>
    set((s) => ({
      lessonCorrect: s.lessonCorrect + (correct ? 1 : 0),
      lessonTotal: s.lessonTotal + 1,
    })),

  addLessonXp: (amount) => set((s) => ({ lessonXp: s.lessonXp + amount })),

  resetLesson: () => set({ lessonXp: 0, lessonCorrect: 0, lessonTotal: 0 }),

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

  completeLesson: async (lessonId, accuracy) => {
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
