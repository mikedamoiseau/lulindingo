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


## [Codex — Reviewer] Round 2

NEEDS_FIX: The heart-refill fix now over-refills hearts because it never advances the refill timestamp after granting a heart.

1. **File:** `src/stores/useGameStore.js` lines 95-101; `src/utils/heartManager.js` lines 4-11; `src/components/shared/HeartDisplay.jsx` lines 19-24  
**What:** A user who has waited long enough for one refill can be restored all the way to full hearts within a few seconds. Concrete case: at `0` hearts with `heartsLastRefill` exactly 20 minutes ago, the first tick sets hearts to `1`; the next tick computes from the same old timestamp and sets `2`; this repeats until `5`.  
**Why:** `calculateCurrentHearts()` derives `refills` from elapsed time since `heartsLastRefill`, but `refillHearts()` only persists the new `hearts` count and leaves `heartsLastRefill` unchanged. Because `HeartDisplay` calls `refillHearts()` every second, the same elapsed refill interval is counted again and again.  
**Impact:** The life-gating mechanic is broken in the user’s favor: hearts regenerate much faster than intended, and the persisted user state in Dexie becomes incorrect. This is a correctness and data-integrity failure in a core progression rule.  
**Fix:** Make the refill operation update both `hearts` and `heartsLastRefill` atomically. Compute how many refill intervals were consumed, add that many hearts once, and advance `heartsLastRefill` by `refills * REFILL_INTERVAL_MS` (or clamp appropriately when reaching max hearts). A helper that returns both derived values would avoid duplicating this logic.  
**Severity:** BLOCKING  
**Fixable:** YES

---


## [Claude Code — Implementer] Round 2

---

## Summary

### Issue 1 — Heart over-refill due to stale `heartsLastRefill` — **AGREE, FIXED**

Codex was right. `refillHearts()` persisted `hearts` but never advanced `heartsLastRefill`, so every 1-second tick re-derived the same refill count from the same stale timestamp, granting multiple hearts in rapid succession.

**Changes:**

| File | What changed |
|---|---|
| `src/utils/heartManager.js` | `calculateCurrentHearts()` now returns `{ hearts, heartsLastRefill }` instead of a plain number. When refills occur, it advances the timestamp by `refills * REFILL_INTERVAL_MS`. When hearts reach max, it snaps to `now` to avoid accumulating stale elapsed time. |
| `src/stores/useGameStore.js` (line 18) | `loadUser` caller destructures the new return shape and persists both `hearts` and `heartsLastRefill` to Dexie. |
| `src/stores/useGameStore.js` (line 98) | `refillHearts` caller does the same — atomic update of both fields. |
| `src/utils/__tests__/heartManager.test.js` | Updated all assertions to use `.hearts`, added 3 new tests: timestamp advancement by consumed intervals, snap-to-now at max hearts, and no-change when no refills are due. |

All 166 tests pass.

---


## [Codex — Reviewer] Round 3

LGTM: The previously blocking correctness issues are addressed; the current code now refills hearts atomically and defers XP persistence until lesson completion.

No defensible blocking findings remain in the current diff. The heart refill path now advances `heartsLastRefill` alongside `hearts`, which closes the rapid over-refill bug, and the lesson flow no longer persists per-answer XP before the lesson is successfully finished.

Residual risk: I do not see an end-to-end test covering the quit-confirmation flow or timer-driven in-session heart refill; the added coverage is focused on `heartManager`, so regressions in component/store wiring would still rely on manual verification.

---

