# Team Review Report
**Date:** 2026-04-05
**Mode:** code
**Branch:** feat/milestone-3-screens-nav
**Base:** main
**Files reviewed:** 10 (package.json, package-lock.json, LearningPath.jsx, LessonEngine.jsx, progression.js, progression.test.js, useGameStore.test.js, seed.test.js, test-setup.js, vite.config.js)

---

## Quick Reference
| Reviewer | Verdict | Critical | Warnings | Suggestions |
|----------|---------|----------|----------|-------------|
| Frontend/UX | concerns | 1 | 3 | 3 |
| Architecture | concerns | 1 | 2 | 4 |
| Devil's Advocate | issues | 2 | 3 | 3 |
| End User | issues | 2 | 4 | 4 |
| Product Manager | issues | 1 | 2 | 1 |

---

## Critical Findings
| ID | Details | Flagged By | Handling | Status |
|----|---------|-----------|----------|--------|
| R4-1 | **Hearts-zero blocking not implemented.** Spec requires "at 0 hearts: cannot start new lessons" but no guard exists. `LessonNode.jsx` allows tapping current lessons regardless of hearts. Practice mode correctly works at 0 hearts. This breaks the core pacing mechanic — kids can play indefinitely with no consequence for wrong answers. | R4-End User, R5-PM | FIX | OPEN |
| R1-3 | **getLessonStatus crashes on out-of-bounds index.** `src/utils/progression.js:30` does `const lesson = unitLessons[lessonIndex]` then accesses `lesson.id` — if `lessonIndex` is out of bounds, this throws. No guard clause, no test coverage for this edge case. | R1-Frontend, R2-Architecture, R3-Advocate | FIX | OPEN |
| R3-2 | **Streak and lesson completion are non-atomic.** `src/components/lesson/LessonEngine.jsx:101-106` calls `await updateStreak()` then `await completeLesson()` sequentially. If app closes between calls, streak increments but lesson isn't marked complete — causing data inconsistency on reload. | R3-Advocate | DEFER | OPEN |
| R4-2 | **No feedback when locked lessons are tapped.** Button is `disabled` via CSS but children ages 6-7 won't understand silent disabled buttons. No lock icon, no tooltip, no message explaining "finish previous lesson first." Creates frustration and confusion for the target audience. | R4-End User | FIX | OPEN |

---

## Warnings
| ID | Details | Flagged By | Handling | Status |
|----|---------|-----------|----------|--------|
| R1-1 | **LearningPath returns null during loading.** `src/components/home/LearningPath.jsx:20` returns `null` when data is loading — blank screen with no spinner or skeleton. Poor first-load experience. (Pre-existing, not introduced by this PR.) | R1-Frontend | DEFER | OPEN |
| R3-9 | **No error handling on store DB operations.** All async Dexie operations in `src/stores/useGameStore.js` (addXp, loseHeart, completeLesson, etc.) lack try-catch. If DB write fails, Zustand state still updates — on refresh, data is lost. State-DB mismatch risk. (Pre-existing.) | R3-Advocate, R1-Frontend | DEFER | OPEN |
| R4-3 | **Quit button doesn't warn about unsaved progress.** Close button in ProgressBar immediately calls `resetLesson()` and navigates home with no confirmation dialog. Accidental taps by children lose all lesson progress (XP, accuracy, stars). (Pre-existing.) | R4-End User | DEFER | OPEN |
| R3-4 | **Age band mapping is fragile.** Age bands are string-matched in `src/utils/progression.js` (`getMaxExercises`) and `src/components/settings/SettingsPanel.jsx` independently. Adding a new band requires changes in multiple files with no validation that they stay in sync. No centralized age-band configuration. | R3-Advocate | SKIP | OPEN |
| R2-5 | **Missing edge-case test coverage.** Tests don't cover: `getLessonStatus` with out-of-bounds index, `getMaxExercises` with null/undefined, `getUnitStates` with null inputs, sparse progressMap scenarios. These are boundary conditions that could cause runtime crashes. | R2-Architecture, R3-Advocate | FIX | OPEN |
| R4-4 | **Retry mechanic limited to type-answer only.** Select-answer and follow-pattern exercises immediately cost a heart on wrong answer with no retry opportunity. Inconsistent learning recovery across exercise types. (Pre-existing, by design per spec — retry only for type-answer.) | R4-End User | SKIP | OPEN |
| R4-5 | **XP and percentages are abstract for ages 6-7.** Lesson summary shows raw XP numbers and accuracy %. Young children (target age 6-7) don't understand these metrics. Stars are clear motivators but XP is noise for this age group. (Pre-existing.) | R4-End User | DEFER | OPEN |
| R4-6 | **No explanation of practice mode.** Home says "Tap any completed lesson above to practice" but doesn't explain what practice mode does mechanically (no hearts cost, +1 heart reward, no XP). Parents and kids left guessing. (Pre-existing.) | R4-End User | DEFER | OPEN |
| R5-2 | **README.md is stale.** Still says "Repository created. Implementation planning and scaffolding come next." Does not reflect the fully shipped v1 with 3 units, 15 lessons, 82 tests. | R5-PM | FIX | OPEN |
| R5-3 | **No CHANGELOG.md.** Release history not documented. No record of what shipped in v1. | R5-PM | SKIP | OPEN |
| R1-2 | **Missing ARIA labels on interactive elements.** Settings gear button (`LearningPath.jsx:48`) is emoji-only with no accessible text. `LessonNode.jsx` has no aria-label for lesson status (locked/current/completed). Fails WCAG 2.1 Level AA. (Pre-existing.) | R1-Frontend | DEFER | OPEN |

---

## Suggestions
| ID | Details | Flagged By | Handling | Status |
|----|---------|-----------|----------|--------|
| R2-9 | **Magic numbers in getMaxExercises and heartManager.** Age-band exercise counts (6, 8, 10) and 20-min heart refill interval are hardcoded across files with no central configuration. Consider a `gameBalance.js` config. | R2-Architecture, R3-Advocate | SKIP | OPEN |
| R1-7 | **getLessonStatus called per-lesson per-render with O(n) findIndex.** `findIndex` runs inside each `getLessonStatus` call, creating O(n²) behavior when called in a loop. Not a problem at 15 lessons but could be memoized or pre-computed in `getUnitStates`. | R1-Frontend, R3-Advocate | SKIP | OPEN |
| R3-12 | **Single-user assumption undocumented.** `loadUser()` in `useGameStore.js` always picks `users[0]`. If multi-user support is ever needed (siblings sharing a device), this breaks silently. Worth a code comment. | R3-Advocate | SKIP | OPEN |
| R1-8 | **No React component rendering tests.** `@testing-library/react` is installed but unused. All 82 tests are unit/store-level. No rendering tests for LearningPath, LessonNode, LessonEngine, etc. | R1-Frontend | DEFER | OPEN |
| R4-8 | **No audio instructions for ages 6-7.** Non-readers (youngest target users) need audio cues or visual demos for exercise instructions. Currently text-only. (Phase 2 territory.) | R4-End User | SKIP | OPEN |
| R4-11 | **No heart refill timer displayed.** When hearts < 5, no countdown shows when the next heart refills (every 20 minutes). Kids may think the app is broken when out of hearts with no indication of recovery. | R4-End User | DEFER | OPEN |
| R4-12 | **Star rating thresholds not shown to user.** Kids don't know 90%+ = 3 stars, 70%+ = 2 stars. Thresholds are defined in code but never communicated in the UI. | R4-End User | SKIP | OPEN |
| R5-4 | **Missing mobile meta tags.** No viewport, theme-color, or apple-mobile-web-app-capable meta tags in `index.html`. Spec mentions mobile-friendly experience. | R5-PM | SKIP | OPEN |

---

## Filtered Findings
These were flagged by reviewers but appear to be low-confidence based on codebase evidence:

| ID | Details | Evidence | Original Severity |
|----|---------|----------|-------------------|
| R2-1 | Schema mismatch in Progress table — reviewer claimed compound key issue with `progress: 'lessonId, completed'` | Dexie schema format: first field is primary key, subsequent fields are indexes. `lessonId` is the primary key, `completed` is an indexed field. This is correct Dexie usage. `.put()` with lessonId works as intended. Not a compound key. | CRITICAL |
| R2-3 | Heart refill race condition — `loseHeart()` resets `heartsLastRefill` timer, allegedly preventing natural refill | This is standard game design: refill timer restarts from last heart state change. Ensures consistent 20-min intervals between refills. The behavior appears intentional — you wait 20 min from your last heart change, not from some arbitrary past time. | CRITICAL |
| R2-7 | Unused import in `src/test-setup.js` — `@testing-library/jest-dom/vitest` | This is a side-effect import that registers custom DOM matchers (toBeInTheDocument, toHaveClass, etc.) into Vitest's `expect`. This is the standard and correct setup pattern. | WARNING |

---

## Reviewer Detail: Frontend/UX (R1)

**Focus:** Component structure, accessibility, responsive design, UX patterns, performance.

### Findings

**R1-1 (WARNING): Loading state returns null**
- `src/components/home/LearningPath.jsx:20` — `if (!units || !lessons || !progress) return null;`
- Users see a blank screen during data fetch. No loading spinner, skeleton, or feedback.
- Screen reader users get zero feedback during loading.
- Pre-existing issue, not introduced by this PR.

**R1-2 (WARNING): Missing ARIA labels**
- Settings gear button (`LearningPath.jsx:44-49`) is emoji-only (`⚙️`) with no `aria-label`.
- Lesson nodes have no accessible status indication (locked/current/completed).
- Fails WCAG 2.1 Level AA requirements for accessible names on interactive elements.

**R1-3 (CRITICAL): getLessonStatus null safety**
- `src/utils/progression.js:30` — `const lesson = unitLessons[lessonIndex]` with no bounds check.
- If `lessonIndex >= unitLessons.length` or `lessonIndex < 0`, accessing `lesson.id` throws TypeError.
- Tests do not cover out-of-bounds scenarios.

**R1-4 → merged into R3-9**: No error boundary for data loading failures (same root cause as store error handling).

**R1-5 → merged into R2-5**: Age-band integration test gap (covered under missing edge-case tests).

**R1-6 → merged into R1-2**: Disabled button visibility (same accessibility concern).

**R1-7 (SUGGESTION): Inline status recalculation**
- `getLessonStatus` called per lesson in a `.map()` loop, each call running `findIndex` over the full lesson array.
- O(n²) for the current unit's lessons. Not a problem at 5 lessons per unit but doesn't scale.
- Could memoize or pre-compute `firstIncomplete` in `getUnitStates`.

**R1-8 (SUGGESTION): No component rendering tests**
- `@testing-library/react` is installed as devDependency but never used.
- All 82 tests are unit tests (pure functions) or store integration tests (Zustand + Dexie).
- No tests verify that components render correctly, handle user interactions, or display correct states.

**R1-9 → merged into R1-2**: All-complete state accessibility (same category).

### Positive Findings
- Extraction of pure functions (`getUnitStates`, `getLessonStatus`, `getMaxExercises`) is a clean refactor.
- `LessonEngine.jsx` has proper null checks and loading state (unlike LearningPath).
- Test setup with `fake-indexeddb` enables proper offline-first testing.

---

## Reviewer Detail: Architecture (R2)

**Focus:** Code organization, design patterns, data flow, error handling, security, scalability.

### Findings

**R2-1 (FILTERED — LOW CONFIDENCE): Schema mismatch**
- Claimed `progress: 'lessonId, completed'` was a compound key. In Dexie, this means `lessonId` is the primary key and `completed` is an indexed field. The code is correct.

**R2-3 (FILTERED — LOW CONFIDENCE): Heart refill race condition**
- `loseHeart()` resets `heartsLastRefill` to `new Date()`. This means the 20-min refill timer restarts on each heart loss.
- This appears to be intentional game design — consistent refill intervals from last state change.

**R2-5 (WARNING): Missing edge-case test coverage**
- `getLessonStatus` not tested with out-of-bounds `lessonIndex`.
- `getMaxExercises` not tested with `null` or `undefined` ageBand.
- `getUnitStates` not tested with `null` units or lessons arrays.
- No test for sparse progressMap (lesson exists but has no progress entry).

**R2-7 (FILTERED — LOW CONFIDENCE): Test setup import**
- `@testing-library/jest-dom/vitest` is a correct side-effect import.

**R2-9 (SUGGESTION): Magic numbers**
- Exercise counts per age band (6, 8, 10) hardcoded in if-else chain.
- Heart refill interval (20 min) hardcoded in `heartManager.js`.
- Star thresholds (90%, 70%) hardcoded in `useGameStore.js`.
- Could consolidate into a `gameBalance.js` config for easier tuning.

**R2-10 (SUGGESTION → merged into R2-5)**: Input shape validation — covered under edge-case tests.

**R2-11 (SUGGESTION): Dexie.clear() doesn't reset auto-increment IDs**
- Tests use `db.users.clear()` but auto-increment counters persist.
- If any test relies on predictable IDs, it could fail intermittently.
- Consider `db.delete(); db.open()` for full reset, or avoid ID assumptions.

**R2-12 (SUGGESTION → merged into R2-5)**: Missing sparse progressMap test.

### Architecture Assessment
- **Positive:** Clean separation — Dexie (persistence) → Zustand (session state) → Utils (pure logic) → Components (UI).
- **Positive:** Progression logic extraction from components is the right move for testability.
- **Concern:** `LearningPath.jsx` fetches all progress records and builds progressMap in memory on every render. Acceptable at 15 lessons but scales poorly.

---

## Reviewer Detail: Devil's Advocate (R3)

**Focus:** Assumptions, failure modes, edge cases, race conditions, unexpected data, coupling.

### Findings

**R3-1 → merged into R1-3**: Missing null safety on lesson access (same issue as getLessonStatus crash).

**R3-2 (CRITICAL): Non-atomic streak + lesson completion**
- `LessonEngine.jsx:101-106`:
  ```javascript
  await updateStreak();
  // ... accuracy calculation ...
  await completeLesson(id, accuracy);
  ```
- If app closes after `updateStreak()` but before `completeLesson()`: streak increments, lesson not marked done.
- On reload: user has a streak day with no completed lesson. UI inconsistency.
- Fix options: combine into single transaction, or make `completeLesson` handle streak internally.

**R3-4 (WARNING): Fragile age band mapping**
- `getMaxExercises()` uses if-else chain matching string literals.
- `SettingsPanel.jsx` defines valid options as separate array.
- No shared source of truth. Adding '3-5' age band to settings without updating `getMaxExercises` silently defaults to 10 exercises.

**R3-6 → merged into R2-5**: No user input validation (covered under edge-case gaps).

**R3-7 (WARNING → merged into R3-2)**: Streak history not created in `completeLesson` — related to the non-atomic concern.

**R3-9 (WARNING): No error handling on store operations**
- Every async action in `useGameStore.js` follows the pattern:
  ```javascript
  await db.users.update(user.id, { totalXp }); // Could fail
  set({ user: { ...user, totalXp } });          // Still updates state
  ```
- If IndexedDB write fails (quota exceeded, corruption), Zustand state diverges from DB.
- On refresh, user loses the changes that only existed in memory.

**R3-12 (SUGGESTION): Single-user assumption**
- `loadUser()` does `const users = await db.users.toArray(); users[0]` — always picks first user.
- No comment explaining this is by design. If siblings share a device, silent bug.

**R3-13 (SUGGESTION → merged into existing)**: Timezone edge case — `getLocalDateString()` uses device local time. Crossing timezones mid-streak could cause unexpected reset. Acknowledged in spec as acceptable for v1.

### What's Missing That Nobody Asked About
- No data export/backup mechanism. If browser data is cleared, all progress is lost.
- No rate limiting on lesson completion. A child could theoretically complete all 15 lessons in one sitting.
- No telemetry or analytics to understand usage patterns.

---

## Reviewer Detail: End User (R4)

**Focus:** User experience from perspective of a child (6-12) or their parent.

### Findings

**R4-1 (CRITICAL): No hearts-zero game-over state**
- A child can lose all 5 hearts and continue playing without interruption.
- No "out of hearts" screen, no lockout, no redirect to practice mode.
- The hearts mechanic becomes meaningless — there's no cost to failure.
- Parents expecting the app to pace their child's learning won't see that happen.
- **Expected behavior:** Show modal when hearts reach 0: "Out of hearts! Wait for hearts to refill or practice completed lessons."

**R4-2 (CRITICAL): Locked lessons give no feedback**
- Disabled buttons are invisible to young children (6-7).
- No lock icon (🔒), no tap response, no message like "Finish [Previous Lesson] first!"
- Kids will tap repeatedly thinking the app is broken.

**R4-3 (WARNING): Quit without confirmation**
- Close button (✕) in progress bar immediately exits to home.
- `resetLesson()` clears all session progress with no "Are you sure?" dialog.
- Children click buttons accidentally. All lesson progress (XP, accuracy) is lost.

**R4-4 (WARNING): Limited retry mechanic**
- Only type-answer exercises get a retry on wrong answer.
- Select-answer and follow-pattern: wrong = immediate heart loss.
- Inconsistent experience. By spec design — retry is for type-answer only.

**R4-5 (WARNING): Abstract metrics for young kids**
- "85% accuracy" and "10 XP" are meaningless to a 6-year-old.
- Stars are clear and motivating. XP and percentages add noise for the youngest users.
- Consider age-adaptive summary: stars-only for 6-7, full stats for 11-12.

**R4-6 (WARNING): Practice mode unexplained**
- "Tap any completed lesson above to practice" — but what IS practice mode?
- No explanation that it costs no hearts, awards +1 heart, and gives no XP.
- Parents don't know if it's drilling or replaying.

**R4-8 (SUGGESTION): No audio for non-readers**
- Exercise instructions are text-only ("Type the answer", "Select the answer").
- Children ages 6-7 who can't read well need audio cues or animated demos.
- Phase 2 feature territory.

**R4-11 (SUGGESTION): No heart refill timer**
- When hearts < 5, no indication of when the next heart arrives.
- "Next heart in: 18 min" would reduce frustration and abandonment.

**R4-12 (SUGGESTION): Star thresholds hidden**
- 90%+ = 3 stars, 70%+ = 2 stars — but kids don't know these targets.
- Showing thresholds on the summary screen would set clear goals.

### What Works Well (Positive UX)
- Clear linear progression — lessons unlock one-by-one, intuitive for kids.
- Pulsing "current" lesson provides obvious entry point.
- Completion badges (✅) on finished units show progress visually.
- Three exercise types provide variety without overwhelming.
- Immediate correct/wrong feedback is fast and encouraging.
- Confetti and celebrating mascot on lesson complete feels rewarding.
- Green/orange color coding for correct/wrong is learner-friendly.

---

## Reviewer Detail: Product Manager (R5)

**Focus:** Feature completeness, spec alignment, scope creep, documentation.

### Requirements Coverage Matrix

| Requirement (from spec) | Status | Notes |
|---|---|---|
| 3 Units (Addition 1, Addition 2, Subtraction 1) | ✅ Complete | All seeded with moduleId='math' |
| 15 Lessons (5 per unit) | ✅ Complete | Verified in seed tests |
| 3 Exercise Types | ✅ Complete | type-answer, select-answer, follow-pattern |
| Hearts (5 max, -1 per wrong, +1 per 20min) | ✅ Complete | Full refill logic implemented |
| **Hearts at 0: block new lessons** | ❌ **Missing** | No guard prevents starting lessons at 0 hearts |
| Hearts at 0: practice available | ✅ Complete | Practice mode works correctly |
| XP (+10 per answer, +50 bonus) | ✅ Complete | xpCalculator.js correct |
| Streaks (local date, daily) | ✅ Complete | getLocalDateString used throughout |
| Retry (type-answer only, one retry) | ✅ Complete | Implemented in LessonEngine |
| 2-tab navigation (Learn, Progress) | ✅ Complete | TabBar with NavLink |
| Settings (age band, reset) | ✅ Complete | Slide-over panel |
| Feedback banners | ✅ Complete | Correct/wrong/retry states |
| Mascot (3 expressions) | ✅ Complete | happy, thinking, celebrating |
| Confetti on complete | ✅ Complete | In LessonSummary |
| Age-adaptive exercise count | ✅ Complete | 6/8/10 by band |
| Linear lesson progression | ✅ Complete | Tested in progression.js |
| Onboarding (name + age) | ✅ Complete | Creates and persists user |

**Completion: 16/17 requirements met (94%)**

### Scope Creep Assessment
**None detected.** All features are on-spec. No Phase 2+ features implemented:
- No adaptive difficulty
- No combo counter
- No module switcher UI
- No achievements/badges
- No sound effects

### R5-1 → merged into R4-1: Hearts-zero blocking (same finding).

**R5-2 (WARNING): README.md stale**
- Current content: "Repository created. Implementation planning and scaffolding come next."
- Should reflect: v1 shipped with 3 units, 15 lessons, 82 tests, full gamification.

**R5-3 (WARNING → SKIP): No CHANGELOG.md**
- No formal release history. Git history documents milestones but no user-facing changelog.

**R5-4 (SUGGESTION): Missing mobile meta tags**
- No viewport, theme-color, or apple-mobile-web-app-capable in `index.html`.
- Spec mentions mobile-friendly experience.

### Test Coverage Summary
- 82 tests passing (100% pass rate)
- Progression logic: 18 tests (getUnitStates, getLessonStatus, getMaxExercises)
- Store actions: 31 tests (all Zustand actions tested)
- Database seeding: 7 tests (idempotency, counts, integrity)
- Heart manager: 9 tests (refill calculation, edge cases)
- Streak tracker: 11 tests (local date, streak logic, milestones)
- XP calculator: 2 tests (base XP, lesson bonus)
- Validation script: passes (all 15 lessons validated)

---

## Recommendation

**Needs changes** — 4 critical findings, 2 requiring immediate fixes before merge.

### Priority Actions
1. **R4-1 (FIX)** — Add `hearts > 0` guard before allowing lesson start. This is a spec requirement and the single missing feature in v1.
2. **R1-3 (FIX)** — Add bounds check in `getLessonStatus` + corresponding test cases (R2-5). Prevents potential runtime crash.
3. **R4-2 (FIX)** — Add lock icon and tap feedback on locked lessons. Critical for target age group (6-7 year olds).
4. **R5-2 (FIX)** — Update README.md to reflect shipped v1 status.

### Deferred Items (address in follow-up PRs)
- R3-2: Atomic streak + lesson completion (data consistency improvement)
- R1-1: Loading state UI (spinner/skeleton instead of blank screen)
- R3-9: Error handling on store DB operations
- R4-3: Quit confirmation dialog
- R1-2: ARIA labels and accessibility improvements
- R4-5, R4-6: Age-adaptive summaries and practice mode explanation
- R4-11: Heart refill timer display
- R1-8: React component rendering tests
