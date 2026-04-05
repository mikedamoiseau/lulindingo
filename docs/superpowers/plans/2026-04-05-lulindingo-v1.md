# LuLinDingo v1 Implementation Plan

**Goal:** Ship a small, testable Duolingo-style math learning app for kids — 3 units, 3 exercise types, core gamification (XP, hearts, streaks).

**Architecture:** React 18 SPA with Vite. IndexedDB via Dexie.js for persistence. Zustand for session state. Framer Motion for animations. No backend.

**Tech Stack:** React 18, Vite, React Router v6, Dexie.js, Zustand, Framer Motion, CSS Modules, Nunito font

**Spec:** `docs/superpowers/specs/2026-04-05-lulindingo-math-app-design.md`

---

## State Boundaries

Three layers with clear responsibilities:

### Dexie.js (IndexedDB) — Persistence
Everything that survives a page refresh. Source of truth for user profile, progress, and content.
- `users` — name, totalXp, hearts, heartsLastRefill, currentStreak, longestStreak, lastActiveDate, ageBand, createdAt
- `units` — module content definitions (id, moduleId, title, topic, order, iconEmoji, description)
- `lessons` — exercise arrays keyed by unit (id, unitId, order, exercises[])
- `progress` — per-lesson completion state (lessonId, completed, stars, bestAccuracy, attempts, completedAt)
- `streakHistory` — daily log (date, lessonsCompleted, xpEarned)

### Zustand Store — Session State
Runtime state that resets per page load or per lesson. Hydrated from Dexie on app boot.
- `user` — cached copy of the DB user record (refreshed on load, written back on mutations)
- `isLoaded` — whether initial hydration is complete
- `lessonXp` / `lessonCorrect` / `lessonTotal` — current lesson session counters (reset between lessons)

The store exposes **action methods** (addXp, loseHeart, completeLesson, etc.) that write to both Zustand and Dexie in a single call. No component should write to Dexie directly.

### Utility Functions — Pure Logic
Stateless functions that take inputs and return outputs. No DB or store access.
- `xpCalculator.js` — calculateXp(), getLessonBonus()
- `heartManager.js` — calculateCurrentHearts(hearts, heartsLastRefill), getNextRefillMs()
- `streakTracker.js` — calculateStreak(lastActiveDate, currentStreak), isStreakMilestone()

## Date Handling

All "calendar day" logic uses **local time**, not UTC. This prevents streak bugs where a user completes a lesson at 11pm local time but `toISOString()` reports the next UTC day.

```js
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

This function replaces any use of `toISOString().split('T')[0]` throughout the codebase. Used in: streak tracking, daily XP resets, streak history keys.

## Product Rules

### Lesson Progression
- Lessons within a unit unlock **linearly**: lesson N+1 unlocks when lesson N is completed
- The **first incomplete lesson** in the first incomplete unit is the "current" lesson — it pulses blue on the learning path
- All lessons before it show as "completed" (green). All after show as "locked" (grey, not tappable)
- Units unlock linearly: unit N+1's first lesson unlocks when all of unit N's lessons are completed

### Hearts
- Start with 5. Maximum 5.
- Lose 1 per wrong answer (after retry chance on TypeTheAnswer only)
- **Refill:** 1 heart per 20 minutes, calculated lazily on app load and when entering a lesson. When `calculateCurrentHearts()` returns a higher value than stored, **persist the new value to Dexie immediately** and update Zustand. This means the user always sees correct hearts without background timers.
- **At 0 hearts:** cannot start new lessons. Can enter **practice mode** on any completed lesson. Practice restores 1 heart on completion but grants **no XP**. Practice does not affect the lesson's star rating or best accuracy.

### Streaks
- A "day" is a local calendar day (see Date Handling above)
- Completing 1+ new lessons (not practice) in a day maintains the streak
- If `lastActiveDate` is yesterday: streak continues (incremented on first lesson completion of the day)
- If `lastActiveDate` is today: streak already counted, no change
- If `lastActiveDate` is anything else (or null): streak resets to 1 on next completion
- Streak is checked/recalculated on app load. If broken, the stored value is updated to 0 immediately.

### Practice Mode
- Available on any completed lesson
- Uses the same LessonEngine — a `isPractice` flag controls behavior:
  - No heart cost on wrong answers
  - No XP awarded
  - No progress/star updates
  - Heart +1 awarded on completion
- Practice lessons show the same exercises as the original lesson

---

## Milestone 1: Foundation

**Objective:** App boots, database seeds, onboarding persists across refresh.

**Files/Components:**
- Project scaffold (Vite + React + dependencies)
- `src/index.css` — global styles, CSS variables, Nunito font
- `index.html` — font links, meta tags, favicon
- `src/db/database.js` — Dexie schema
- `src/db/seed.js` — content seeder
- `src/stores/useGameStore.js` — Zustand store with Dexie persistence
- `src/utils/xpCalculator.js`, `heartManager.js`, `streakTracker.js`
- `src/data/math/units.js` — stub (1 unit)
- `src/data/math/lessons/addition-1.js` — stub (1 lesson, 2 exercises)
- `src/components/onboarding/Onboarding.jsx` — name + age band
- `src/App.jsx` — conditional render: loading → onboarding → main app

**Key implementation notes:**
- Use `getLocalDateString()` everywhere instead of ISO UTC splitting
- Store action methods handle both Zustand state + Dexie writes atomically
- `seedDatabase()` is idempotent — checks if data exists before inserting
- Heart recalculation runs on `loadUser()` — compare stored hearts + elapsed time, persist if changed
- Onboarding creates user record in Dexie, store auto-hydrates

**Acceptance criteria:**
- [ ] `npm run dev` starts without errors
- [ ] First visit shows onboarding (name → level picker)
- [ ] After onboarding, refresh shows "Welcome back, [name]"
- [ ] IndexedDB contains user record with correct fields
- [ ] Unit and lesson stub data is seeded
- [ ] `calculateCurrentHearts(3, thirtyMinutesAgo)` returns 4
- [ ] `calculateStreak(yesterday, 5)` returns 5; `calculateStreak(twoDaysAgo, 5)` returns 0

**Commit after:** scaffold, styles, DB, store, utilities, onboarding

---

## Milestone 2: Core Loop

**Objective:** One lesson is fully playable end-to-end with all 3 exercise types, feedback, XP, hearts, and summary.

**Files/Components:**
- `src/components/lesson/exercises/NumberPad.jsx` — 0-9 grid + backspace
- `src/components/lesson/exercises/TypeTheAnswer.jsx` — blank box + numpad input
- `src/components/lesson/exercises/SelectTheAnswer.jsx` — multiple choice cards
- `src/components/lesson/exercises/FollowThePattern.jsx` — pattern table + 2 answer cards
- `src/components/lesson/ProgressBar.jsx` — top bar showing lesson progress
- `src/components/lesson/FeedbackBanner.jsx` — correct/wrong/retry slide-up banners
- `src/components/lesson/LessonSummary.jsx` — stars, XP, accuracy, streak, confetti
- `src/components/lesson/LessonEngine.jsx` — orchestrates exercise queue, scoring, transitions
- `src/components/shared/XpFlyUp.jsx` — animated +10 XP text
- `src/components/shared/HeartDisplay.jsx` — heart icon + count
- `src/components/shared/Confetti.jsx` — particle celebration
- Update stub data to include all 3 exercise types

**Key implementation notes:**
- LessonEngine receives exercises from Dexie via `useLiveQuery`, slices by age band (Starter: 6, Explorer: 8, Challenger: 10)
- Exercise components are stateless renderers: receive `exercise` + `onAnswer(value)` callback
- LessonEngine owns all scoring logic — components just report the user's answer
- Retry mechanic: only for `type-answer`. On first wrong attempt, show "Try again!" banner. On second wrong or for other types, deduct heart and show correct answer.
- FeedbackBanner uses mascot "thinking" expression on wrong answers (not sad)
- `isPractice` flag on LessonEngine: when true, skip heart deduction and XP
- Lesson route: `/lesson/:id` — LessonEngine is rendered outside AppLayout (no tab bar)
- After lesson completion: write progress to Dexie, update streak, navigate home

**Acceptance criteria:**
- [ ] Navigate to `/lesson/math-addition-1-lesson-1` — exercises render
- [ ] TypeTheAnswer: numpad input works, CHECK submits, correct/wrong feedback shown
- [ ] SelectTheAnswer: tap to select, CHECK to confirm, feedback shown
- [ ] FollowThePattern: tap answer card, feedback shown
- [ ] Correct answer: green banner, encouragement text, XP fly-up animation
- [ ] Wrong answer (non-retry): orange banner, correct answer shown, heart decrements
- [ ] TypeTheAnswer wrong first try: "Try again!" banner, no heart lost. Wrong second try: heart lost.
- [ ] Progress bar fills as exercises are completed
- [ ] Lesson complete: confetti, summary with stars/XP/accuracy/streak, CONTINUE returns home
- [ ] Hearts persist — refresh and re-enter lesson, heart count is correct
- [ ] XP persists — check user.totalXp in IndexedDB after lesson

**Commit after:** exercise components, feedback, lesson engine, summary

---

## Milestone 3: Screens & Navigation

**Objective:** Home screen shows learning path with progression, progress screen shows stats, settings panel works. Full navigation loop.

**Files/Components:**
- `src/components/layout/TabBar.jsx` — 2 tabs: Learn, Progress
- `src/components/layout/AppLayout.jsx` — Outlet + TabBar wrapper
- `src/components/home/LearningPath.jsx` — current unit nodes, collapsed completed units, next-unit preview
- `src/components/home/LessonNode.jsx` — circle node (completed/current/locked)
- `src/components/home/UnitHeader.jsx` — unit emoji + title + description
- `src/components/progress/ProgressScreen.jsx` — XP, streak, hearts stats
- `src/components/progress/StreakCalendar.jsx` — last 7 days
- `src/components/progress/UnitBadges.jsx` — completed units with stars
- `src/components/settings/SettingsPanel.jsx` — slide-over: age band selector, reset progress
- `src/components/shared/Mascot.jsx` — dingo SVG with 3 expressions (happy, thinking, celebrating)

**Key implementation notes:**
- LearningPath queries units where `moduleId === 'math'`, sorted by order
- Progression logic follows the Product Rules above — first incomplete lesson is "current"
- Completed units render as collapsed badges (emoji + title + checkmark)
- Current unit renders expanded with LessonNode circles
- Next unit renders as a dashed preview row ("Up next: Subtraction")
- Settings dispatches via `window.dispatchEvent(new Event('open-settings'))` — SettingsPanel listens globally
- Mascot: 3 SVG expression states (happy, thinking, celebrating). No "sad". Appears on lesson summary and home greeting.
- Practice mode entry: completed (green) lesson nodes are tappable — re-entering launches LessonEngine with `isPractice=true`

**Acceptance criteria:**
- [ ] Home screen shows greeting, streak, hearts, gear icon
- [ ] Current unit is expanded with lesson nodes — first incomplete pulses blue
- [ ] Completed lessons show green with stars. Locked lessons are grey and not tappable.
- [ ] Tapping current lesson navigates to lesson (tab bar disappears)
- [ ] After completing a lesson, returning home shows updated node state
- [ ] Completing all lessons in a unit: unit collapses, next unit expands
- [ ] Progress tab shows XP total, streak count, hearts, 7-day calendar, unit badges
- [ ] Gear icon opens settings panel. Age band change persists on refresh.
- [ ] Tapping a completed lesson enters practice mode — no XP, no heart cost, +1 heart on completion
- [ ] Mascot renders correctly with all 3 expressions

**Commit after:** layout, home screen, progress screen, settings, mascot

---

## Milestone 4: Content + Validation + Polish

**Objective:** Full v1 content (3 units, 15 lessons, ~120 exercises) is loaded, validated, and the app is production-ready.

### Task 4a: Content Creation

**Files:**
- `src/data/math/units.js` — 3 unit definitions
- `src/data/math/lessons/addition-1.js` — 5 lessons, ~8-10 exercises each
- `src/data/math/lessons/addition-2.js` — 5 lessons, ~8-10 exercises each
- `src/data/math/lessons/subtraction-1.js` — 5 lessons, ~8-10 exercises each

**Content design rules:**
- Each lesson uses all 3 exercise types (type-answer, select-answer, follow-pattern), roughly evenly distributed
- Each lesson has 10 exercises (age band slicing takes care of showing fewer to younger kids)
- **Addition 1:** numbers 0-10. Sums never exceed 10.
- **Addition 2:** numbers 10-50. For Starter band friendliness, early lessons use simpler pairs (10+5, 12+3). Later lessons can go up to 25+25.
- **Subtraction 1:** numbers 0-10. Results are always non-negative.
- `correctAnswer` must be mathematically correct for every exercise
- `options` arrays must always include the `correctAnswer` exactly once
- Distractor options should be plausible (off by 1 or 2, common mistakes) — not random
- `pattern` arrays must have exactly one entry with `result: null` (the blank)
- No duplicate exercises within a lesson
- `instruction` field can be omitted (defaults are fine)

**Validation checklist (run after content is written):**
- [ ] Every exercise has a valid `type` (one of: type-answer, select-answer, follow-pattern)
- [ ] Every `correctAnswer` is mathematically correct given the `equation`
- [ ] Every select-answer/follow-pattern exercise has an `options` array containing `correctAnswer`
- [ ] Every follow-pattern exercise has a `pattern` array with exactly one `null` result
- [ ] No lesson has fewer than 10 exercises
- [ ] No duplicate lesson IDs across all files
- [ ] Every lesson's `unitId` matches a real unit ID
- [ ] Addition 1 exercises: all operands 0-10, sums 0-10
- [ ] Addition 2 exercises: operands 10-50 range, sums reasonable
- [ ] Subtraction 1 exercises: all operands 0-10, results non-negative

### Task 4b: Data Validation Script

**File:** `scripts/validate-lessons.js`

A Node script (run with `node scripts/validate-lessons.js`) that imports all lesson data files and checks every rule from the validation checklist above. Exits 0 on success, non-zero with specific errors on failure. This catches content bugs before they reach the app.

### Task 4c: Utility Tests

**File:** `src/utils/__tests__/` (using Vitest)

Focused unit tests for the three utility modules:

**xpCalculator:** calculateXp returns 10, getLessonBonus returns 50.

**heartManager:**
- Full hearts (5) + any timestamp → returns 5
- 3 hearts + 40 minutes ago → returns 5 (2 refills)
- 3 hearts + 15 minutes ago → returns 3 (0 refills, not yet 20 min)
- 0 hearts + 2 hours ago → returns 5 (capped at max)

**streakTracker:**
- lastActiveDate = today → returns current streak unchanged
- lastActiveDate = yesterday → returns current streak (will increment on lesson complete)
- lastActiveDate = 2 days ago → returns 0
- lastActiveDate = null → returns 0
- All tests use `getLocalDateString()` with injected dates, not system clock

Install Vitest as a dev dependency. Add `"test": "vitest run"` to package.json.

### Task 4d: Final Polish

- Add `public/favicon.svg`
- Add mobile meta tags to `index.html` (apple-mobile-web-app-capable, theme-color)
- End-to-end manual test pass (see acceptance criteria below)
- `npm run build && npm run preview` — verify production build works

**Acceptance criteria for Milestone 4:**
- [ ] `node scripts/validate-lessons.js` exits 0 — all content is valid
- [ ] `npm test` passes — all utility tests green
- [ ] 3 units visible on home screen, 15 lessons total
- [ ] Full playthrough: complete all 5 lessons in Addition 1 → unit collapses, Addition 2 expands
- [ ] Age band affects lesson length: Starter sees ~6 exercises, Challenger sees ~10
- [ ] Practice mode on a completed lesson: no XP, +1 heart on completion
- [ ] Hearts at 0: new lessons blocked, practice still available
- [ ] Streak increments correctly across day boundary (test by manipulating lastActiveDate in DevTools)
- [ ] Production build (`npm run build`) succeeds and preview works
- [ ] No console errors throughout the entire flow

**Commit after:** content data, validation script, tests, polish. Then push to origin/main.

---

## Summary

| Milestone | Objective | Gate |
|---|---|---|
| 1. Foundation | App boots, DB seeds, onboarding works | Onboarding persists across refresh |
| 2. Core Loop | One lesson fully playable | All 3 exercise types + feedback + summary |
| 3. Screens & Nav | Full navigation + progression | Home/Progress/Settings wired, practice mode works |
| 4. Content + Polish | 15 lessons loaded, validated, tested | Validation script + utility tests pass, full playthrough clean |
