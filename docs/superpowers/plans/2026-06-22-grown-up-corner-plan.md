# Grown-Up Corner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked parent/teacher dashboard ("Grown-Up Corner") reachable behind a simple multiply-two-numbers gate. It reads existing local Dexie data only — XP trend, current streak, stars per lesson, completed operations/tiers, and time-of-day activity — turns those numbers into plain-language nudges and one "practice this together" suggestion. Pure local read; nothing leaves the device, no account.

**Architecture:** A pure `computeInsights({ user, progress, units, lessons, streakHistory })` function in `src/utils/insights.js` reduces the raw tables into a `metrics` object, and a pure `buildRecommendations(metrics)` rule engine turns metrics into ranked plain-language nudges + one practice suggestion. A new `GrownUpCorner` screen renders the gate, then the dashboard cards (charts drawn with inline SVG/CSS — no chart library, the app is offline/self-contained). A gear button in the existing `TabBar` (or a long-press affordance on the Progress screen) opens the gate. A tiny schema extension adds a `timeOfDay` bucket to `streakHistory` writes so the activity card has real data; everything else comes from tables that already exist.

**Tech Stack:** React 19, Zustand, Dexie/IndexedDB, Vitest. No new dependencies.

---

## Overview & user goal

A parent or teacher wants a quick, honest read on how the child is doing without creating an account or sending data anywhere. They tap a gear, solve a one-line multiplication ("What is 7 × 8?") that a pre-reader can't, and land on a calm, text-forward dashboard:

- **At a glance:** current streak, total XP, lessons completed, average stars.
- **XP trend:** last 7–14 days as a small bar/sparkline (from `streakHistory.xpEarned`).
- **Mastery:** stars per lesson and which operations/tiers are completed (from `progress` + `lessons` + `units`).
- **When they practice:** a time-of-day breakdown (morning / afternoon / evening) so a parent can spot routine.
- **Nudges:** 1–3 plain-language sentences ("Mia is breezing through Explorer division at 3 stars — consider bumping her tier in Settings").
- **One practice-together suggestion:** a single concrete activity tied to the child's weakest visible area.

The Fact Vault (per-fact mastery) does not exist yet. The dashboard is designed so weak-fact insights slot in later without reshaping anything — see "Fact Vault forward-compat" below.

---

## KEY DESIGN DECISIONS

### 1. The math gate: kid-resistant, adult-trivial, not annoying

**Decision:** A single `a × b` problem where both factors are in 6–9 (e.g. `7 × 8`), free-text numeric entry, answered with the existing `NumberPad`. No timer, no lockout, unlimited attempts, wrong answer just shakes and clears. **One-line why:** A 6-year-old in the target band hasn't memorized two-digit-product times tables (Starter skips multiplication entirely), so the gate stops a curious kid without a password UX; an adult solves it in <2 seconds and unlimited retries means no frustration if they fat-finger the pad.

- Factors drawn from `{6,7,8,9}` so the product is always ≥ 36 and ≤ 81 — above what Starter/Explorer-tier-1 kids can do instantly, below "needs paper" for an adult.
- Generate the problem with a pure helper `makeGateChallenge(rng = Math.random)` returning `{ a, b, answer }` — deterministic under a mocked rng for tests (same pattern the codebase already uses for `exerciseGenerator`).
- **Not** a PIN: a PIN is one more thing for parents to forget and a kid can shoulder-surf. The math gate needs zero setup and zero memory.
- Gate state lives in component state only (`unlocked` boolean). It re-locks on unmount / navigating away — **one-line why:** cheap, and a parent re-solving `7 × 8` is far less annoying than a kid finding a still-unlocked screen.

### 2. Insights computed from EXISTING tables vs gated behind Fact Vault

**Available now (existing tables):**

| Insight | Source |
|---|---|
| Current streak, longest streak, total XP | `users` row (already in store) |
| XP trend (per-day) | `streakHistory[].xpEarned` |
| Lessons completed per day | `streakHistory[].lessonsCompleted` |
| Stars per lesson, best accuracy, attempts | `progress` rows |
| Completed operations / tiers | `progress` joined to `lessons` (`operation`, `tier`) + `units` |
| Average stars, "breezing through" / "struggling" signals | derived from `progress.stars` + `progress.attempts` + `bestAccuracy` |
| Time-of-day activity | `streakHistory[].timeOfDay` **(needs the schema extension in decision 4)** |

**Deferred to Fact Vault (NOT in this plan, but designed for):**

- Specific weak facts ("7 × 8 keeps tripping her up").
- Per-fact retry counts.

**Decision:** `computeInsights` returns a `metrics` object with a `factVault: null` slot and `buildRecommendations` checks `if (metrics.factVault)` before emitting fact-level nudges. **One-line why:** the rule engine ships complete today and gains a branch (not a rewrite) when Fact Vault lands; tests for the `factVault: null` path lock the contract now.

### 3. The nudge / recommendation rule engine as a pure function

**Decision:** `buildRecommendations(metrics)` is a pure, side-effect-free function returning `{ nudges: string[], practiceTogether: { title, body, lessonId? } | null }`, ordered by priority. **One-line why:** keeping it pure means the entire "what should a parent read" surface is unit-testable with hand-built metrics, no DB, no React — matching the repo's "pure logic in `src/utils/`, components stay thin" convention.

Rules (evaluated top-down; each rule may push at most one nudge; cap the list at 3):

1. **Cold start** — `metrics.lessonsCompletedTotal === 0` → single nudge: "No lessons finished yet — sit together for the first one to get them started." `practiceTogether = null`. (Suppresses all other rules.)
2. **Ready to level up** — any completed operation where `avgStars >= 2.5` AND `tiersCompleted >= 3` AND the child is not already at tier 5 → "Mia is breezing through {op} at {avgStars}★ — consider bumping her tier in Settings."
3. **Struggling area** — the operation with the lowest `avgStars` among *attempted* lessons where `avgStars < 1.5` OR `avgAttempts > 2` → becomes the `practiceTogether` suggestion (see below).
4. **Streak encouragement** — `currentStreak === 0` AND `lessonsCompletedTotal > 0` → "She's taken a break — a short session today restarts the streak." OR `currentStreak >= 7` → "🔥 {n}-day streak — whatever you're doing is working."
5. **Routine** — if `timeOfDay` has a dominant bucket (>60% of sessions) → "Most practice happens in the {bucket} — a good slot to protect."
6. **Fact Vault (deferred)** — `if (metrics.factVault)` emit weak-fact nudge. No-op while `factVault` is null.

**Practice-together suggestion:** picks the weakest attempted operation (rule 3); if none is weak, picks the *next uncompleted* lesson in the first active unit; falls back to a generic "Count steps on a walk together" if nothing is attempted. Always returns exactly one suggestion object (or null only in cold start).

### 4. `streakHistory` schema — verify writes, note the gap, decide

**Verified from source:**
- `updateStreak` (in `useGameStore`) does `db.streakHistory.put({ date, lessonsCompleted: 0, xpEarned: 0 })` — but **returns early if `lastActiveDate === today`**, so it only creates the row on the *first* activity of a day.
- `completeLesson` then does `db.streakHistory.get(today)` and increments `lessonsCompleted` and `xpEarned`. In `LessonEngine.handleContinue`, `updateStreak()` is awaited *before* `completeLesson(id, accuracy)`, so the row always exists when the increment runs. **Conclusion: `lessonsCompleted` and `xpEarned` are reliably accumulated per day — no gap.**
- **Gap found:** `streakHistory` is keyed by `date` only. There is **no time-of-day information anywhere** in the DB. "Time-of-day activity" cannot be computed from current data.

**Decision:** Extend the `streakHistory` write (not the Dexie index) to record a per-day time-of-day tally. Dexie stores arbitrary extra fields without a migration as long as we don't index them, so **no `db.version()` bump is required** for unindexed fields — but to be safe and explicit we add a `db.version(2)` that re-declares the same indexes (keeps the schema readable and future-proof). Each `streakHistory` row gains:

```
timeOfDay: { morning: 0, afternoon: 0, evening: 0 }
```

incremented in `completeLesson` by bucketing `new Date().getHours()` via a pure helper `bucketHour(hour)` (morning 5–11, afternoon 12–17, evening 18–4). **One-line why:** a per-day bucket tally is the smallest change that makes the activity card real, survives the existing "one row per day" model, and a missing/old row (pre-upgrade) simply reads as zero — no crash, graceful cold start.

`updateStreak`'s initial `put` also seeds `timeOfDay: { morning: 0, afternoon: 0, evening: 0 }` so the shape is always present.

### 5. Routing / entry point

**Decision:** Add a `/grown-ups` route inside the existing `BrowserRouter` (a top-level route, **not** under `AppLayout`, so it has no kid-facing TabBar). Entry is a small, low-contrast gear button rendered in `TabBar` aligned to the far edge, navigating to `/grown-ups`. **One-line why:** reusing the router and the gear affordance keeps it discoverable to adults but visually de-emphasized for kids, and living outside `AppLayout` means the dashboard is full-screen and clearly "a different place." The existing `SettingsPanel` `open-settings` event stays as-is; the Grown-Up Corner *links to* Settings (e.g. its "bump her tier" nudge) by dispatching that same event after navigating home.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/insights.js` | Create | `computeInsights(data)` → `metrics`; `buildRecommendations(metrics)` → `{ nudges, practiceTogether }`; `bucketHour(h)`; `makeGateChallenge(rng)` |
| `src/utils/__tests__/insights.test.js` | Create | Tests for all four exports |
| `src/db/database.js` | Modify | Add `db.version(2)` re-declaring indexes (forward-compat for `timeOfDay`) |
| `src/stores/useGameStore.js` | Modify | `updateStreak` + `completeLesson` write/increment `timeOfDay` bucket |
| `src/stores/__tests__/useGameStore.test.js` | Modify | Tests that `timeOfDay` is recorded per session |
| `src/components/grownups/GateScreen.jsx` | Create | Multiply-gate UI (reuses `NumberPad`) |
| `src/components/grownups/GateScreen.module.css` | Create | Gate styling |
| `src/components/grownups/GrownUpCorner.jsx` | Create | Dashboard screen: gate → cards |
| `src/components/grownups/GrownUpCorner.module.css` | Create | Dashboard styling |
| `src/components/grownups/cards/StatGrid.jsx` | Create | At-a-glance stat tiles |
| `src/components/grownups/cards/XpTrendChart.jsx` | Create | Inline-SVG bar chart of daily XP |
| `src/components/grownups/cards/MasteryList.jsx` | Create | Stars per operation/tier |
| `src/components/grownups/cards/TimeOfDayCard.jsx` | Create | Morning/afternoon/evening CSS bars |
| `src/components/grownups/cards/NudgeList.jsx` | Create | Plain-language nudges + practice suggestion |
| `src/components/grownups/cards/cards.module.css` | Create | Shared card styling |
| `src/components/layout/TabBar.jsx` | Modify | Add de-emphasized gear → `/grown-ups` |
| `src/App.jsx` | Modify | Add `<Route path="/grown-ups" element={<GrownUpCorner />} />` |

---

## Task 1: Pure insights + rule engine + gate helper

**Files:**
- Create: `src/utils/insights.js`
- Create: `src/utils/__tests__/insights.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/insights.test.js`. Build the fixture inline (no DB):

```js
import { describe, it, expect, vi } from 'vitest';
import {
  bucketHour,
  makeGateChallenge,
  computeInsights,
  buildRecommendations,
} from '../insights';

const units = [
  { id: 'math-addition', moduleId: 'math', title: 'Addition', operation: 'addition', order: 1 },
  { id: 'math-subtraction', moduleId: 'math', title: 'Subtraction', operation: 'subtraction', order: 2 },
  { id: 'math-multiplication', moduleId: 'math', title: 'Multiplication', operation: 'multiplication', order: 3 },
  { id: 'math-division', moduleId: 'math', title: 'Division', operation: 'division', order: 4 },
];
const lessons = units.flatMap((u) =>
  [1, 2, 3, 4, 5].map((tier) => ({
    id: `${u.id}-lesson-${tier}`, unitId: u.id, order: tier, tier, operation: u.operation,
  }))
);
function prog(lessonId, stars, bestAccuracy = 90, attempts = 1) {
  return { lessonId, completed: true, stars, bestAccuracy, attempts, completedAt: new Date() };
}

describe('bucketHour', () => {
  it('buckets morning/afternoon/evening', () => {
    expect(bucketHour(7)).toBe('morning');
    expect(bucketHour(11)).toBe('morning');
    expect(bucketHour(12)).toBe('afternoon');
    expect(bucketHour(17)).toBe('afternoon');
    expect(bucketHour(18)).toBe('evening');
    expect(bucketHour(23)).toBe('evening');
    expect(bucketHour(2)).toBe('evening'); // late night counts as evening
  });
});

describe('makeGateChallenge', () => {
  it('produces factors in 6..9 and a correct product', () => {
    const c = makeGateChallenge(() => 0); // rng=0 → lowest factor
    expect(c.a).toBeGreaterThanOrEqual(6);
    expect(c.b).toBeLessThanOrEqual(9);
    expect(c.answer).toBe(c.a * c.b);
  });
  it('is deterministic under a mocked rng', () => {
    const rng = vi.fn().mockReturnValue(0.99);
    const c = makeGateChallenge(rng);
    expect(c.a).toBe(9);
    expect(c.b).toBe(9);
    expect(c.answer).toBe(81);
  });
});

describe('computeInsights', () => {
  it('cold start: no progress, no history', () => {
    const m = computeInsights({
      user: { totalXp: 0, currentStreak: 0, longestStreak: 0, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory: [],
    });
    expect(m.lessonsCompletedTotal).toBe(0);
    expect(m.averageStars).toBe(0);
    expect(m.xpTrend).toEqual([]);
    expect(m.operations).toHaveLength(4);
    expect(m.operations.every((o) => o.tiersCompleted === 0)).toBe(true);
    expect(m.factVault).toBeNull();
  });

  it('computes per-operation mastery and average stars', () => {
    const progress = [
      prog('math-addition-lesson-1', 3), prog('math-addition-lesson-2', 3),
      prog('math-addition-lesson-3', 3),
      prog('math-multiplication-lesson-1', 1, 60, 4),
    ];
    const m = computeInsights({
      user: { totalXp: 250, currentStreak: 3, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory: [],
    });
    const add = m.operations.find((o) => o.operation === 'addition');
    expect(add.tiersCompleted).toBe(3);
    expect(add.avgStars).toBe(3);
    const mul = m.operations.find((o) => o.operation === 'multiplication');
    expect(mul.avgStars).toBe(1);
    expect(mul.avgAttempts).toBe(4);
    expect(m.lessonsCompletedTotal).toBe(4);
  });

  it('aggregates xp trend and time-of-day from streakHistory', () => {
    const streakHistory = [
      { date: '2026-06-20', lessonsCompleted: 2, xpEarned: 120, timeOfDay: { morning: 2, afternoon: 0, evening: 0 } },
      { date: '2026-06-21', lessonsCompleted: 1, xpEarned: 60, timeOfDay: { morning: 0, afternoon: 1, evening: 0 } },
    ];
    const m = computeInsights({
      user: { totalXp: 180, currentStreak: 2, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory,
    });
    expect(m.xpTrend.map((d) => d.xp)).toEqual([120, 60]);
    expect(m.timeOfDay).toEqual({ morning: 2, afternoon: 1, evening: 0 });
    expect(m.dominantTimeOfDay).toBe('morning');
  });

  it('tolerates streakHistory rows missing timeOfDay (pre-upgrade)', () => {
    const streakHistory = [{ date: '2026-06-20', lessonsCompleted: 1, xpEarned: 60 }];
    const m = computeInsights({
      user: { totalXp: 60, currentStreak: 1, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory,
    });
    expect(m.timeOfDay).toEqual({ morning: 0, afternoon: 0, evening: 0 });
    expect(m.dominantTimeOfDay).toBeNull();
  });
});

describe('buildRecommendations', () => {
  it('cold start → one nudge, no practice suggestion', () => {
    const m = computeInsights({
      user: { totalXp: 0, currentStreak: 0, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory: [],
    });
    const rec = buildRecommendations(m);
    expect(rec.nudges).toHaveLength(1);
    expect(rec.practiceTogether).toBeNull();
  });

  it('breezing through → level-up nudge mentioning the operation', () => {
    const progress = [
      prog('math-division-lesson-1', 3), prog('math-division-lesson-2', 3),
      prog('math-division-lesson-3', 3),
    ];
    const m = computeInsights({
      user: { totalXp: 300, currentStreak: 4, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory: [],
    });
    const rec = buildRecommendations(m);
    expect(rec.nudges.join(' ').toLowerCase()).toContain('division');
    expect(rec.nudges.join(' ').toLowerCase()).toContain('tier');
  });

  it('struggling area becomes the practice-together suggestion', () => {
    const progress = [
      prog('math-multiplication-lesson-1', 1, 55, 4),
      prog('math-multiplication-lesson-2', 1, 60, 3),
    ];
    const m = computeInsights({
      user: { totalXp: 80, currentStreak: 1, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory: [],
    });
    const rec = buildRecommendations(m);
    expect(rec.practiceTogether).not.toBeNull();
    expect(rec.practiceTogether.body.toLowerCase()).toContain('multiplication');
  });

  it('caps nudges at 3', () => {
    const progress = [
      prog('math-addition-lesson-1', 3), prog('math-addition-lesson-2', 3), prog('math-addition-lesson-3', 3),
      prog('math-division-lesson-1', 3), prog('math-division-lesson-2', 3), prog('math-division-lesson-3', 3),
    ];
    const streakHistory = [
      { date: '2026-06-20', lessonsCompleted: 5, xpEarned: 300, timeOfDay: { morning: 5, afternoon: 0, evening: 0 } },
    ];
    const m = computeInsights({
      user: { totalXp: 600, currentStreak: 9, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory,
    });
    const rec = buildRecommendations(m);
    expect(rec.nudges.length).toBeLessThanOrEqual(3);
  });

  it('does not emit fact-level nudges while factVault is null', () => {
    const m = computeInsights({
      user: { totalXp: 100, currentStreak: 1, ageBand: '8-10', startingTier: 1 },
      progress: [prog('math-addition-lesson-1', 2)], units, lessons, streakHistory: [],
    });
    expect(m.factVault).toBeNull();
    const rec = buildRecommendations(m);
    expect(rec.nudges.join(' ').toLowerCase()).not.toContain('fact');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/insights.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/insights.js`**

Implement the four exports. Sketch:

```js
const TIER_COUNT = 5;
const BAND_TIER_LABELS = { '6-7': 'Starter', '8-10': 'Explorer', '11-12': 'Challenger' };

export function bucketHour(hour) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  return 'evening';
}

export function makeGateChallenge(rng = Math.random) {
  const factor = () => 6 + Math.floor(rng() * 4); // 6..9
  const a = factor();
  const b = factor();
  return { a, b, answer: a * b };
}

export function computeInsights({ user, progress, units, lessons, streakHistory }) {
  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));
  const sortedUnits = [...units].filter((u) => u.moduleId === 'math').sort((a, b) => a.order - b.order);

  const operations = sortedUnits.map((unit) => {
    const unitLessons = lessons.filter((l) => l.unitId === unit.id);
    const done = unitLessons.map((l) => progressMap.get(l.id)).filter((p) => p && p.completed);
    const tiersCompleted = done.length;
    const avgStars = done.length ? round1(avg(done.map((p) => p.stars))) : 0;
    const avgAttempts = done.length ? round1(avg(done.map((p) => p.attempts || 0))) : 0;
    const avgAccuracy = done.length ? Math.round(avg(done.map((p) => p.bestAccuracy || 0))) : 0;
    return { operation: unit.operation, unitId: unit.id, title: unit.title,
      tiersCompleted, totalTiers: TIER_COUNT, avgStars, avgAttempts, avgAccuracy };
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
    factVault: null, // forward-compat slot; populated when Fact Vault ships
  };
}

export function buildRecommendations(metrics) {
  const nudges = [];
  let practiceTogether = null;

  if (metrics.lessonsCompletedTotal === 0) {
    return {
      nudges: ['No lessons finished yet — sit together for the first one to get them started.'],
      practiceTogether: null,
    };
  }

  const attempted = metrics.operations.filter((o) => o.tiersCompleted > 0);

  // Rule 2: ready to level up
  const breezing = attempted.find(
    (o) => o.avgStars >= 2.5 && o.tiersCompleted >= 3 && metrics.startingTier < 5
  );
  if (breezing) {
    nudges.push(
      `${childWord(metrics)} is breezing through ${cap(breezing.title)} at ${breezing.avgStars}★ — consider bumping the tier in Settings.`
    );
  }

  // Rule 3: struggling area → practice suggestion
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

  // Rule 6 (deferred): fact vault
  if (metrics.factVault) {
    // populated when Fact Vault ships
  }

  // Fallback practice suggestion if nothing weak
  if (!practiceTogether) {
    practiceTogether = {
      title: 'Keep the momentum',
      body: 'Nothing is stuck right now. Count steps, prices, or scores out loud together to keep numbers playful.',
      unitId: null,
    };
  }

  return { nudges: nudges.slice(0, 3), practiceTogether };
}

const avg = (arr) => arr.reduce((s, n) => s + n, 0) / arr.length;
const round1 = (n) => Math.round(n * 10) / 10;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const childWord = (m) => 'Your child';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/insights.test.js`
Expected: All PASS. Adjust wording in implementation to satisfy the `toContain` assertions if needed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/insights.js src/utils/__tests__/insights.test.js
git commit -m "feat: add grown-up corner insights + recommendation engine"
```

---

## Task 2: Record time-of-day in streakHistory

**Files:**
- Modify: `src/db/database.js`
- Modify: `src/stores/useGameStore.js`
- Modify: `src/stores/__tests__/useGameStore.test.js`

- [ ] **Step 1: Add `db.version(2)` to `database.js`**

Append after the existing `version(1)` block (keep version(1) — Dexie needs the history):

```js
db.version(2).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
});
```

(Indexes are unchanged; `timeOfDay` is an unindexed field stored on the row. The version bump is explicit/forward-proof, not strictly required for unindexed fields.)

- [ ] **Step 2: Write failing tests** in `src/stores/__tests__/useGameStore.test.js`

```js
import { bucketHour } from '../../utils/insights';

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
    vi.useFakeTimers();
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: new tests FAIL.

- [ ] **Step 4: Implement in `useGameStore.js`**

Import `bucketHour`:

```js
import { bucketHour } from '../utils/insights';
```

In `updateStreak`, change the `streakHistory.put` to seed the shape:

```js
await db.streakHistory.put({
  date: today,
  lessonsCompleted: 0,
  xpEarned: 0,
  timeOfDay: { morning: 0, afternoon: 0, evening: 0 },
});
```

In `completeLesson`, update the increment block:

```js
const today = getLocalDateString();
const hist = await db.streakHistory.get(today);
if (hist) {
  const bucket = bucketHour(new Date().getHours());
  const timeOfDay = { morning: 0, afternoon: 0, evening: 0, ...(hist.timeOfDay || {}) };
  timeOfDay[bucket] += 1;
  await db.streakHistory.update(today, {
    lessonsCompleted: hist.lessonsCompleted + 1,
    xpEarned: hist.xpEarned + get().lessonXp,
    timeOfDay,
  });
}
```

(The `...(hist.timeOfDay || {})` spread makes pre-upgrade rows safe.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: All PASS (old + new).

- [ ] **Step 6: Commit**

```bash
git add src/db/database.js src/stores/useGameStore.js src/stores/__tests__/useGameStore.test.js
git commit -m "feat: record per-session time-of-day in streakHistory"
```

---

## Task 3: Gate screen

**Files:**
- Create: `src/components/grownups/GateScreen.jsx`
- Create: `src/components/grownups/GateScreen.module.css`

- [ ] **Step 1: Build `GateScreen.jsx`** — props `{ onUnlock }`.

- Generate a challenge once with `useState(() => makeGateChallenge())`.
- Reuse `NumberPad` from `../lesson/exercises/NumberPad` for input.
- On CHECK: if `parseInt(value, 10) === challenge.answer` call `onUnlock()`; else clear `value`, trigger a brief shake (CSS class toggled via state + `setTimeout`), and regenerate a fresh challenge so a kid can't brute-force one memorized answer.
- Copy: small heading "Grown-ups only" + "Solve to continue:" + the equation `${a} × ${b} = ?`. A subtle "← Back" returns to `/`.
- No timer, no attempt counter, no lockout.

- [ ] **Step 2: `GateScreen.module.css`** — center the card, use `var(--surface)`, `var(--radius-md)`, the global tokens. Add a `.shake` keyframe (translateX wobble ~300ms).

- [ ] **Step 3: Commit**

```bash
git add src/components/grownups/GateScreen.jsx src/components/grownups/GateScreen.module.css
git commit -m "feat: add multiply-to-enter gate for grown-up corner"
```

---

## Task 4: Dashboard cards (inline SVG/CSS charts)

**Files:** all under `src/components/grownups/cards/` + `cards.module.css`.

- [ ] **Step 1: `StatGrid.jsx`** — props `{ metrics }`. Four tiles: 🔥 streak, ⚡ total XP, ✅ lessons completed, ⭐ average stars. Plain divs, no chart.

- [ ] **Step 2: `XpTrendChart.jsx`** — props `{ trend }` (`metrics.xpTrend`). Inline `<svg>` bar chart: one rect per day, height scaled to `max(xp)`, x-axis day labels (short date). No library. Empty state ("No activity yet") when `trend.length === 0`. Make it horizontally scrollable inside an `overflow-x:auto` wrapper if many days.

- [ ] **Step 3: `MasteryList.jsx`** — props `{ operations }`. One row per operation: emoji/title, `tiersCompleted/5` as a CSS-width progress bar, and `★`-repeat of `Math.round(avgStars)`. Dim operations with `tiersCompleted === 0`.

- [ ] **Step 4: `TimeOfDayCard.jsx`** — props `{ timeOfDay }`. Three horizontal CSS bars (morning/afternoon/evening) widths proportional to counts. Empty state when all zero.

- [ ] **Step 5: `NudgeList.jsx`** — props `{ recommendations, onOpenSettings }`. Renders `nudges[]` as cards; renders `practiceTogether` as a highlighted "Try this together" card. If a nudge mentions Settings, show a "Open Settings" button calling `onOpenSettings`.

- [ ] **Step 6: `cards.module.css`** — shared card chrome (padding, radius, surface bg, section titles), bar styles, SVG sizing. Use global tokens only; ensure no horizontal page overflow (wide charts scroll inside their own container per the artifact/responsive rules).

- [ ] **Step 7: Commit**

```bash
git add src/components/grownups/cards
git commit -m "feat: add grown-up corner dashboard cards (CSS/SVG charts)"
```

---

## Task 5: Dashboard screen + routing + entry point

**Files:**
- Create: `src/components/grownups/GrownUpCorner.jsx`, `GrownUpCorner.module.css`
- Modify: `src/components/layout/TabBar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: `GrownUpCorner.jsx`**

- Local `const [unlocked, setUnlocked] = useState(false)`.
- If `!unlocked` render `<GateScreen onUnlock={() => setUnlocked(true)} />`.
- When unlocked, read DB live:
  ```js
  const user = useGameStore((s) => s.user);
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const units = useLiveQuery(() => db.units.where('moduleId').equals('math').sortBy('order'), []);
  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const streakHistory = useLiveQuery(() => db.streakHistory.toArray(), []);
  ```
  Guard: if any is `undefined`, render a "Loading…" state.
- `const metrics = useMemo(() => computeInsights({ user, progress, units, lessons, streakHistory }), [...])`.
- `const recommendations = useMemo(() => buildRecommendations(metrics), [metrics])`.
- Render header "Grown-Up Corner", a "← Back to learning" link to `/`, a one-line privacy note ("Everything here stays on this device."), then `StatGrid`, `NudgeList`, `XpTrendChart`, `MasteryList`, `TimeOfDayCard`.
- `onOpenSettings`: `navigate('/'); requestAnimationFrame(() => window.dispatchEvent(new Event('open-settings')));` (reuses the existing SettingsPanel listener).

- [ ] **Step 2: `GrownUpCorner.module.css`** — full-screen scroll container, calm/neutral palette (distinct from the playful kid UI), max-width content column, no horizontal overflow.

- [ ] **Step 3: `TabBar.jsx`** — add a third, visually de-emphasized item (lower opacity, smaller, gear SVG) navigating to `/grown-ups`, labeled "Grown-ups". Keep it last.

- [ ] **Step 4: `App.jsx`** — import `GrownUpCorner`; add inside `<Routes>` as a sibling of the lesson route (outside `AppLayout`):

```jsx
<Route path="/grown-ups" element={<GrownUpCorner />} />
```

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/grownups/GrownUpCorner.jsx src/components/grownups/GrownUpCorner.module.css src/components/layout/TabBar.jsx src/App.jsx
git commit -m "feat: wire grown-up corner dashboard, route, and gear entry point"
```

---

## Task 6: Full verification

- [ ] **Step 1:** `npx vitest run` — all green.
- [ ] **Step 2:** `npm run lint` — clean.
- [ ] **Step 3:** `npx vite build` — succeeds (confirms no missing imports / self-contained).
- [ ] **Step 4: Manual / Playwright smoke** (dev server):
  1. From Learn tab, tap the gear → gate appears → enter wrong answer → shakes, stays locked → enter correct product → dashboard appears.
  2. Fresh user (no lessons): dashboard shows cold-start nudge, empty charts, no crash.
  3. Complete a lesson, return to dashboard: XP trend bar appears, time-of-day bar reflects current part of day, lessons-completed increments.
  4. "Open Settings" button on a level-up nudge navigates home and opens the SettingsPanel.

---

## Test plan

| Layer | What | How |
|---|---|---|
| Pure logic | `bucketHour`, `makeGateChallenge`, `computeInsights`, `buildRecommendations` | `insights.test.js` — fixtures only, mocked rng, no DB |
| Store | `timeOfDay` seeded + incremented for the right bucket | `useGameStore.test.js` + `fake-indexeddb` + `vi.setSystemTime` |
| Cold start | zero progress / empty history paths | covered in both util and store tests |
| Build/integration | imports resolve, no chart-lib dependency, no page overflow | `vite build` + manual smoke |

Determinism: `makeGateChallenge` takes an injectable rng (mock with `vi.fn`), matching how `exerciseGenerator` is tested. `completeLesson` time-bucket tests use `vi.useFakeTimers()` + `vi.setSystemTime`.

---

## Risks / edge cases / out-of-scope

**Edge cases handled:**
- **Cold start** (brand-new user): empty `progress`/`streakHistory` → `computeInsights` returns zeros/empty arrays; `buildRecommendations` emits the single cold-start nudge and `practiceTogether: null`. Cards show empty states, not crashes.
- **Single day of data**: `xpTrend` has one bar; `dominantTimeOfDay` only set when one bucket exceeds 60% of sessions, so one session won't over-claim a "routine" unless it genuinely dominates.
- **Pre-upgrade `streakHistory` rows** (no `timeOfDay`): `computeInsights` defaults missing buckets to 0; `completeLesson` spreads `...(hist.timeOfDay || {})` before incrementing — no crash, no NaN.
- **All units skipped** (e.g. Challenger band auto-completes add/sub): those operations show `tiersCompleted` from the skip-seeded `progress` rows (stars 3). Level-up rule still works; struggling rule ignores them since they're 3★. Acceptable — out of scope to distinguish "skipped" from "earned" stars in v1 (note for future: skip-seeded rows have `attempts: 0`, which could be used later to flag "not actually practiced").
- **Gate brute-force**: regenerating the challenge on each wrong answer prevents a kid from guessing then memorizing.

**Risks:**
- A determined older sibling can solve `7 × 8`. Accepted — the gate is a speed bump for the target age, not security. Documented in the gate copy.
- `db.version(2)` must keep `version(1)` present and indexes identical, or existing local data fails to open. Mitigation: indexes copied verbatim; only an unindexed field is added.
- Skip-seeded 3★ rows inflate "mastery" — see edge case above; flagged for a follow-up using `attempts === 0`.

**Out of scope:**
- Fact Vault / per-fact weak-spot nudges (designed-for via the `factVault: null` slot, not implemented).
- Multiple child profiles (the app is single-user today).
- Any export/share/print of the dashboard, any network call, any account.
- Configurable gate difficulty or a real PIN.
- Editing/clearing history from the dashboard (Settings already owns reset).

---

## Fact Vault forward-compat (note, not a task)

When Fact Vault ships, `computeInsights` will accept a `factMastery` table and populate `metrics.factVault` with `{ weakest: [{ fact, missCount }], ... }`. `buildRecommendations` rule 6 then emits a fact-level nudge and the practice-together suggestion can target a specific fact. No other code changes — the slot and the guarded branch already exist.
