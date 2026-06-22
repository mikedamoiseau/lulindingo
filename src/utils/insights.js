// Pure insights + recommendation engine for the Grown-Up Corner dashboard.
// No DB, no React — everything is computed from plain table arrays so it can be
// unit-tested with hand-built fixtures (matching the repo's "pure logic in
// src/utils/, components stay thin" convention).

const TIER_COUNT = 5;
const BAND_TIER_LABELS = { '6-7': 'Starter', '8-10': 'Explorer', '11-12': 'Challenger' };

const avg = (arr) => arr.reduce((s, n) => s + n, 0) / arr.length;
const round1 = (n) => Math.round(n * 10) / 10;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Bucket an hour-of-day (0..23) into morning / afternoon / evening. */
export function bucketHour(hour) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  return 'evening'; // 18..23 and 0..4 (late night counts as evening)
}

/**
 * Generate the multiply-to-enter gate challenge. Both factors are drawn from
 * {6,7,8,9} so the product (36..81) is above what the target age can do
 * instantly but trivial for an adult. rng is injectable for deterministic tests.
 */
export function makeGateChallenge(rng = Math.random) {
  const factor = () => 6 + Math.floor(rng() * 4); // 6..9
  const a = factor();
  const b = factor();
  return { a, b, answer: a * b };
}

/**
 * Reduce the raw Dexie tables into a metrics object for the dashboard.
 * Tolerates partial/empty input (cold start) and pre-upgrade rows missing
 * timeOfDay.
 */
export function computeInsights({ user, progress = [], units = [], lessons = [], streakHistory = [] }) {
  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));
  const sortedUnits = [...units]
    .filter((u) => u.moduleId === 'math')
    .sort((a, b) => a.order - b.order);

  const operations = sortedUnits.map((unit) => {
    const unitLessons = lessons.filter((l) => l.unitId === unit.id);
    const done = unitLessons.map((l) => progressMap.get(l.id)).filter((p) => p && p.completed);
    const tiersCompleted = done.length;
    const avgStars = done.length ? round1(avg(done.map((p) => p.stars))) : 0;
    const avgAttempts = done.length ? round1(avg(done.map((p) => p.attempts || 0))) : 0;
    const avgAccuracy = done.length ? Math.round(avg(done.map((p) => p.bestAccuracy || 0))) : 0;
    return {
      operation: unit.operation,
      unitId: unit.id,
      title: unit.title,
      tiersCompleted,
      totalTiers: TIER_COUNT,
      avgStars,
      avgAttempts,
      avgAccuracy,
    };
  });

  const allDone = progress.filter((p) => p.completed);
  const lessonsCompletedTotal = allDone.length;
  const averageStars = allDone.length ? round1(avg(allDone.map((p) => p.stars))) : 0;

  const xpTrend = [...streakHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((h) => ({ date: h.date, xp: h.xpEarned || 0, lessons: h.lessonsCompleted || 0 }));

  const timeOfDay = streakHistory.reduce(
    (acc, h) => {
      const t = h.timeOfDay || {};
      acc.morning += t.morning || 0;
      acc.afternoon += t.afternoon || 0;
      acc.evening += t.evening || 0;
      return acc;
    },
    { morning: 0, afternoon: 0, evening: 0 }
  );
  const totalSessions = timeOfDay.morning + timeOfDay.afternoon + timeOfDay.evening;
  let dominantTimeOfDay = null;
  if (totalSessions > 0) {
    const [bucket, count] = Object.entries(timeOfDay).sort((a, b) => b[1] - a[1])[0];
    if (count / totalSessions > 0.6) dominantTimeOfDay = bucket;
  }

  return {
    totalXp: user?.totalXp || 0,
    currentStreak: user?.currentStreak || 0,
    longestStreak: user?.longestStreak || 0,
    ageBand: user?.ageBand || null,
    bandLabel: BAND_TIER_LABELS[user?.ageBand] || null,
    startingTier: user?.startingTier || 1,
    lessonsCompletedTotal,
    averageStars,
    operations,
    xpTrend,
    timeOfDay,
    dominantTimeOfDay,
    factVault: null, // forward-compat slot; populated when Fact Vault insights ship
  };
}

/**
 * Turn metrics into ranked plain-language nudges + one practice suggestion.
 * Pure and side-effect-free. Rules evaluated top-down; nudges capped at 3.
 */
export function buildRecommendations(metrics) {
  if (metrics.lessonsCompletedTotal === 0) {
    return {
      nudges: ['No lessons finished yet — sit together for the first one to get them started.'],
      practiceTogether: null,
    };
  }

  const nudges = [];
  let practiceTogether = null;
  const attempted = metrics.operations.filter((o) => o.tiersCompleted > 0);

  // Rule 2: ready to level up
  const breezing = attempted.find(
    (o) => o.avgStars >= 2.5 && o.tiersCompleted >= 3 && metrics.startingTier < 5
  );
  if (breezing) {
    nudges.push(
      `Your child is breezing through ${cap(breezing.title)} at ${breezing.avgStars}★ — consider bumping the tier in Settings.`
    );
  }

  // Rule 3: struggling area → practice-together suggestion
  const struggling = attempted
    .filter((o) => o.avgStars < 1.5 || o.avgAttempts > 2)
    .sort((a, b) => a.avgStars - b.avgStars)[0];
  if (struggling) {
    practiceTogether = {
      title: `Practice ${cap(struggling.title)} together`,
      body: `${cap(struggling.title)} is the trickiest area right now (${struggling.avgStars}★). Try a few ${struggling.operation} problems on paper, no timer.`,
      unitId: struggling.unitId,
    };
  }

  // Rule 4: streak
  if (metrics.currentStreak === 0) {
    nudges.push('A short session today restarts the streak.');
  } else if (metrics.currentStreak >= 7) {
    nudges.push(`🔥 ${metrics.currentStreak}-day streak — whatever you're doing is working.`);
  }

  // Rule 5: routine
  if (metrics.dominantTimeOfDay) {
    nudges.push(`Most practice happens in the ${metrics.dominantTimeOfDay} — a good slot to protect.`);
  }

  // Rule 6 (deferred): Fact Vault weak-fact nudge. No-op while factVault is null.
  if (metrics.factVault) {
    // populated when Fact Vault insights ship
  }

  // Fallback practice suggestion if nothing weak.
  if (!practiceTogether) {
    practiceTogether = {
      title: 'Keep the momentum',
      body: 'Nothing is stuck right now. Count steps, prices, or scores out loud together to keep numbers playful.',
      unitId: null,
    };
  }

  return { nudges: nudges.slice(0, 3), practiceTogether };
}
