import { create } from 'zustand';
import { db } from '../db/database';
import { calculateCurrentHearts, MAX_HEARTS } from '../utils/heartManager';
import { getLocalDateString, calculateStreak } from '../utils/streakTracker';
import { getSkippedLessonIds, getPlacementSkippedLessonIds, getFirstActiveUnitId } from '../utils/skipUnits';
import { selectDailyQuests, allQuestsDone, QUEST_CATALOG } from '../utils/dailyQuests';
import { signatureForExercise, applyOutcome, isDue } from '../utils/factTracking';
import { bucketHour } from '../utils/insights';
import {
  createDefaultLayout,
  migrateLayout,
  purchaseItem,
  equipItem,
  clearSlot as clearSlotLayout,
} from '../utils/denEconomy';

/**
 * Count facts due on or before today. Pure selector used by the home path
 * Review callout. Tolerates undefined / partial input.
 */
export function getDueFactCount(facts, today = getLocalDateString()) {
  return (facts ?? []).filter((f) => isDue(f, today)).length;
}

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
  // serializes fire-and-forget fact-vault writes (read-modify-write on db.facts)
  _factWriteQueue: Promise.resolve(),

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
      // Den fields: backfill for any pre-den row, then reconcile the saved layout
      // against the current catalog (drops removed ids, re-adds free starters).
      if (user.spentAcorns == null) updates.spentAcorns = 0;
      const reconciled = migrateLayout(user.denLayout);
      if (JSON.stringify(reconciled) !== JSON.stringify(user.denLayout)) {
        updates.denLayout = reconciled;
      }
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
      spentAcorns: 0,
      denLayout: createDefaultLayout(),
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

  // --- Dingo's Den -----------------------------------------------------------
  // All economy rules live in the pure denEconomy reducers; these actions just
  // run a reducer, write the result through to Dexie, and mirror it into store
  // state (same write-through pattern as addXp/loseHeart). spentAcorns only ever
  // increases; totalXp is never touched, so progression stays intact.

  // Buy (if needed) then equip an item. Owned items re-equip for free; unowned
  // affordable items are charged once; unaffordable/unknown items no-op.
  buyAndEquip: async (itemId) => {
    const { user } = get();
    if (!user) return { ok: false };
    const layout = user.denLayout || createDefaultLayout();
    const res = purchaseItem(itemId, user.totalXp, user.spentAcorns ?? 0, layout);
    if (!res.ok) return res;
    // Commit to store state SYNCHRONOUSLY before the async DB write. The read
    // (get().user) and this set() have no await between them, so a rapid second
    // tap on a different item reads the updated balance/layout and stacks its
    // purchase instead of overwriting the first (no lost purchase / undercount).
    set({ user: { ...user, spentAcorns: res.spentAcorns, denLayout: res.layout } });
    await db.users.update(user.id, {
      spentAcorns: res.spentAcorns,
      denLayout: res.layout,
    });
    return res;
  },

  // Equip an already-owned item (free swap). Never touches spentAcorns.
  equip: async (itemId) => {
    const { user } = get();
    if (!user) return { ok: false };
    const layout = user.denLayout || createDefaultLayout();
    const res = equipItem(itemId, layout);
    if (!res.ok) return res;
    // Sync set before async write (see buyAndEquip) so rapid equips don't race.
    set({ user: { ...user, denLayout: res.layout } });
    await db.users.update(user.id, { denLayout: res.layout });
    return res;
  },

  // Clear a slot or cosmetic (free). Never touches spentAcorns.
  clearSlot: async (slot) => {
    const { user } = get();
    if (!user) return;
    const layout = user.denLayout || createDefaultLayout();
    const nextLayout = clearSlotLayout(slot, layout);
    // Sync set before async write (see buyAndEquip) so rapid actions don't race.
    set({ user: { ...user, denLayout: nextLayout } });
    await db.users.update(user.id, { denLayout: nextLayout });
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
      try {
        const today = getLocalDateString();
        let row = await db.dailyQuests.get(today);
        if (!row) {
          await get().ensureTodayQuests();
          row = await db.dailyQuests.get(today);
        }
        if (!row) return;
        await db.dailyQuests.update(today, patch(row));
      } catch (e) {
        // Quest progress is best-effort: swallow so one failed write can't
        // break the serialization chain or surface as an unhandled rejection.
        console.error('daily-quest write failed', e);
      }
    };
    const next = get()._questWriteQueue.then(run, run);
    set({ _questWriteQueue: next });
    return next;
  },

  // recordAnswer(correct, operation?, isPractice?, exercise?, opts?)
  //  - operation/isPractice drive daily-quest accrual (practice is exempt).
  //  - exercise (when it yields a fact signature) feeds the Fact Vault.
  //  - opts.trackFacts (default true) lets diagnostic flows (placement test)
  //    answer without touching the vault.
  // The third/fourth/fifth args are optional, so legacy callers/tests that pass
  // only (correct) or (correct, operation[, isPractice]) keep working.
  recordAnswer: (correct, operation, isPractice = false, exercise = null, opts = {}) => {
    set((s) => ({
      lessonCorrect: s.lessonCorrect + (correct ? 1 : 0),
      lessonTotal: s.lessonTotal + 1,
      _currentRunCorrect: correct ? s._currentRunCorrect + 1 : 0,
    }));

    // Fact-vault recording happens in BOTH normal and practice mode — a child
    // reviewing weak facts must update those facts. Only the daily-quest accrual
    // below is practice-exempt. Gated by opts.trackFacts (placement uses false).
    if (opts.trackFacts !== false && exercise) {
      const parsed = signatureForExercise(exercise);
      if (parsed) {
        get().recordFactOutcome(parsed, correct);
      }
    }

    // Practice replays must not accrue daily-quest progress (no heart cost ->
    // would let kids farm answer/streak quests).
    if (isPractice) return;
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

  // Read-modify-write a single fact row from an answer outcome. Fire-and-forget
  // (UI reads via useLiveQuery); serialized through _factWriteQueue so rapid
  // answers to the same fact don't clobber each other (lost updates).
  recordFactOutcome: (parsed, correct) => {
    const run = async () => {
      try {
        const today = getLocalDateString();
        const existing = await db.facts.get(parsed.sig);
        const next = applyOutcome(existing, correct, today, parsed);
        await db.facts.put(next);
      } catch (e) {
        // Fact tracking is best-effort: swallow so one failed write can't break
        // the serialization chain or surface as an unhandled rejection.
        console.error('fact-vault write failed', e);
      }
    };
    const next = get()._factWriteQueue.then(run, run);
    set({ _factWriteQueue: next });
    return next;
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
      timeOfDay: { morning: 0, afternoon: 0, evening: 0 },
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
      // Bucket the current hour into morning/afternoon/evening so the Grown-Up
      // Corner activity card has real data. Spread defends pre-upgrade rows that
      // lack the timeOfDay shape.
      const bucket = bucketHour(new Date().getHours());
      const timeOfDay = { morning: 0, afternoon: 0, evening: 0, ...(hist.timeOfDay || {}) };
      timeOfDay[bucket] += 1;
      await db.streakHistory.update(today, {
        lessonsCompleted: hist.lessonsCompleted + 1,
        xpEarned: hist.xpEarned + get().lessonXp,
        timeOfDay,
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

    // Atomically check-and-set `claimed` inside a transaction so a rapid
    // double-tap (two concurrent calls) can't both read claimed=false and
    // each grant a reward. Only the call that flips false->true proceeds.
    const outcome = await db.transaction('rw', db.dailyQuests, async () => {
      const row = await db.dailyQuests.get(today);
      if (!row) return 'none';
      if (row.claimed) return 'already';
      const quests = row.questIds
        .map((id) => QUEST_CATALOG.find((q) => q.id === id))
        .filter(Boolean);
      if (!allQuestsDone(quests, row)) return 'incomplete';
      await db.dailyQuests.update(today, { claimed: true });
      return 'won';
    });

    if (outcome === 'already') return { claimed: true, alreadyClaimed: true };
    if (outcome !== 'won') return { claimed: false };

    // Reward granted exactly once, only for the winning claim.
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
