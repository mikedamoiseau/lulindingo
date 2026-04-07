# PR Review: fix-ux-improvements
**Date:** 2026-04-07 15:01
**Mode:** review + fix
**Base:** main
**Diff lines:** 237

---


## [Codex — Reviewer] Round 1

NEEDS_FIX: The new heart timer does not actually refill hearts in-session, and the new quit flow still lets users keep XP after “quitting”.

1. **File:** [HeartDisplay.jsx](/Users/mike/Documents/www/private/lulindingo/src/components/shared/HeartDisplay.jsx#L12), lines 12-24; [useGameStore.js](/Users/mike/Documents/www/private/lulindingo/src/stores/useGameStore.js#L14), lines 14-26; [App.jsx](/Users/mike/Documents/www/private/lulindingo/src/App.jsx#L15), lines 15-17  
**What:** A user can sit on the home screen with `0` hearts, watch the new timer count down, and still remain blocked from starting a lesson when it expires.  
**Why:** `HeartDisplay` only updates local `remainingMs`; it never recalculates or persists `user.hearts`. The only refill recalculation happens inside `loadUser()`, and `App` calls that once at startup only. So the countdown changes, but the authoritative heart count does not.  
**Impact:** Core progression is wrong in-session: the UI says a refill is coming, but lesson access stays locked until a reload or some unrelated store update. That is a correctness/data-integrity failure in the gating mechanic.  
**Fix:** Move heart refill logic into the store so elapsed time updates `user.hearts` when thresholds are crossed, and persist the new value to Dexie. `HeartDisplay` should render derived state from that store update instead of maintaining its own standalone countdown.  
**Severity:** BLOCKING  
**Fixable:** YES

2. **File:** [ProgressBar.jsx](/Users/mike/Documents/www/private/lulindingo/src/components/lesson/ProgressBar.jsx#L36), lines 36-45; [LessonEngine.jsx](/Users/mike/Documents/www/private/lulindingo/src/components/lesson/LessonEngine.jsx#L61), lines 61-66 and 134-136; [useGameStore.js](/Users/mike/Documents/www/private/lulindingo/src/stores/useGameStore.js#L95), lines 95-100  
**What:** A user can answer a few questions correctly, tap `Quit`, confirm, and keep all XP already awarded even though the dialog says “Your progress will be lost.” Repeating that loop lets them farm XP without finishing lessons.  
**Why:** Correct answers call `addXp()` immediately, which persists `totalXp` to the DB. `handleClose()` only resets transient lesson counters and navigates away; it never rolls back previously awarded XP.  
**Impact:** Progress data becomes inflated and inconsistent with actual completed work. The new quit dialog also makes a false promise about rollback, which is an API/UX contract violation.  
**Fix:** Do not persist lesson XP until successful completion, or explicitly subtract any uncommitted XP on quit before navigating away. If partial XP retention is intended, the dialog text must be changed to match actual behavior.  
**Severity:** BLOCKING  
**Fixable:** YES

---


## [Claude Code — Implementer] Round 1

Build passes clean.

---

## Summary

Both findings from Codex were valid. Here's what I changed:

### Issue 1 — Heart refill (FIXED)
- **`useGameStore.js`**: Added `refillHearts()` action (lines 95-103) that calls `calculateCurrentHearts`, compares against current hearts, and persists to Dexie if a refill threshold has been crossed.
- **`HeartDisplay.jsx`**: The 1-second tick now calls `refillHearts()` alongside updating the countdown display (line 21). When a refill fires, the store updates `user.hearts`, which triggers a re-render — and when hearts reach `MAX_HEARTS`, the timer auto-clears.

### Issue 2 — XP farming on quit (FIXED)
- **`LessonEngine.jsx` line 64**: Removed `addXp(xp)` from the per-answer handler. XP is still tracked locally via `addLessonXp(xp)` for the fly-up animation and summary display.
- **`LessonEngine.jsx` line 103**: Changed `addXp(bonus)` to `addXp(lessonXp + bonus)` — all accumulated lesson XP (per-answer + bonus) is now persisted in a single write at lesson completion only.
- Dependency arrays updated accordingly (removed `addXp` from `handleAnswer` deps, added `lessonXp` to `handleContinue` deps).

Now quitting mid-lesson truly loses all XP for that session, matching the dialog's promise. No XP hits the DB until `completeLesson` runs.

---

