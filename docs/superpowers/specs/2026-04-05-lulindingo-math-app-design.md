# LuLinDingo - Modular Learning Platform for Kids

**Date:** 2026-04-05
**Status:** Design
**Stack:** React 18 + Vite, Dexie.js, Zustand, Framer Motion, CSS Modules

## Overview

LuLinDingo is a Duolingo-inspired modular learning platform for kids ages 6-12. The platform is designed to host multiple subjects — **Mathematics ships as the first module in v1**. Future modules (e.g., Chess) can be added by dropping in new data and exercise components without rewriting the core app.

The v1 release is deliberately small: 3 math units, 3 exercise types, and core gamification (XP, hearts, streaks). The goal is a shippable, testable product that validates the learning loop before expanding scope.

Entirely client-side. No backend. All data persists in IndexedDB via Dexie.js.

## Module Strategy

LuLinDingo is **not** a math app. It is a learning platform where Math is the first module.

For v1, this means:
- Data files live under `src/data/math/` — a natural home for a future `src/data/chess/` etc.
- Unit and lesson IDs are prefixed with the module name (e.g., `math-addition-1`) for uniqueness
- The DB schema includes a `courseId` field on units so they can be filtered by module
- The app shell (navigation, gamification, onboarding) contains no math-specific logic

What v1 does **not** build:
- No courses table, course switcher UI, or generic course registry
- No abstract "course plugin" system
- No `activeCourseId` switching logic

The current codebase just loads Math. When a second module ships, we add the minimal plumbing needed at that point.

## Target Audience

- Kids ages 6-12 (elementary school)
- Playful, encouraging UI with large touch targets
- Mascot character for personality and engagement

---

# v1 Scope

Everything below this line is what ships in v1.

## App Structure & Navigation

### Screens

1. **Home (Learning Path)** — Main screen. Shows only the **current unit** and the next few upcoming lessons. Future units collapsed into a preview row ("Up next: Subtraction"). Completed units collapse into a summary badge. Clean and obvious at a glance.

2. **Lesson Screen** — Full-screen focused mode (no tab bar). Progress bar at top. Exercises shown one at a time. Immediate feedback on each answer. Summary screen at completion shows XP earned, accuracy, and streak status.

3. **Progress / Rewards** — Lightweight screen: current streak (fire icon + calendar), total XP, hearts remaining, and completed units with star ratings.

4. **Settings** — Sound on/off, reset progress, age band selector. Accessed via gear icon on home screen header — not a dedicated tab.

### Navigation

- Bottom tab bar with **2 tabs**: Learn, Progress
- Gear icon in home screen header opens Settings as a slide-over panel
- Lesson screen is full-screen focused mode (tab bar hidden)
- React Router v6: `/`, `/lesson/:id`, `/progress`

## Exercise Types (v1: 3 types)

### 1. TypeTheAnswer

- Equation with one blank box (e.g., `[] = 1 + 0`)
- Custom on-screen number pad (0-9 + backspace)
- Text input field shows typed answer
- CHECK button submits

### 2. SelectTheAnswer

- Equation with a blank (e.g., `1 + 1 = []`)
- 3-4 multiple choice options as large tappable cards
- Tap to select (highlighted), then CHECK to confirm

### 3. FollowThePattern

- Table showing a pattern (e.g., 3+2=5, 4+2=6, 5+2=???)
- Two large answer cards to pick from
- Tap the correct card

## Lesson Flow

### Lesson Length by Age Band

- **Ages 6-7 (Starter):** 5-6 exercises per lesson
- **Ages 8-10 (Explorer):** 7-8 exercises per lesson
- **Ages 11-12 (Challenger):** 9-10 exercises per lesson

Age band is set during onboarding and changeable in Settings. In v1 it is a static setting — no automatic adjustment.

### Lesson Engine

A `LessonEngine` component manages:

1. Exercise queue and current exercise index
2. Progress bar (fills per correct answer)
3. Heart deductions on wrong answers
4. XP accumulation
5. Transition animations between exercises
6. Feedback banners
7. Summary screen at completion

### Feedback Flow

- **Correct answer:** Green banner slides up with checkmark and random encouragement ("Amazing!", "Great job!", "Perfect!"). Green CONTINUE button. XP flies up as animated number.
- **Wrong answer:** Gentle correction — not punitive:
  1. Soft orange banner shows the correct answer with brief explanation (e.g., "The answer is 8. 6 + 2 = 8")
  2. Mascot shows "thinking" expression (encouraging, not shaming)
  3. Heart depletes with a quiet fade animation
  4. For select-answer and follow-pattern: wrong option dims, correct highlights
  5. CONTINUE button appears
- **Retry mechanic:** For TypeTheAnswer, first wrong attempt gets one retry ("Try again!") before heart is deducted and correct answer shown.
- **Lesson complete:** Confetti animation, XP total, accuracy percentage, streak status, star rating (1-3 based on accuracy).

## Data Model (Dexie.js / IndexedDB)

### Tables

```
users {
  id: number (auto-increment, primary key)
  name: string
  totalXp: number
  hearts: number (0-5)
  heartsLastRefill: Date
  currentStreak: number
  longestStreak: number
  lastActiveDate: string (YYYY-MM-DD)
  ageBand: "6-7" | "8-10" | "11-12"
  soundEnabled: boolean
  createdAt: Date
}

units {
  id: string (e.g., "math-addition-1")
  courseId: string (indexed — "math" for now, enables future filtering)
  title: string
  topic: string (addition | subtraction)
  order: number
  iconEmoji: string
  description: string
}

lessons {
  id: string (e.g., "math-addition-1-lesson-1")
  unitId: string (indexed, references units.id)
  order: number
  exercises: Exercise[] (JSON array)
}

progress {
  lessonId: string (primary key)
  completed: boolean
  stars: number (1-3)
  bestAccuracy: number (0-100)
  attempts: number
  completedAt: Date | null
}

streakHistory {
  date: string (YYYY-MM-DD, primary key)
  lessonsCompleted: number
  xpEarned: number
}
```

### Exercise Schema

```typescript
type Exercise = {
  type: "type-answer" | "select-answer" | "follow-pattern"
  equation: string              // e.g., "[] = 1 + 0" or "6 + 2 = []"
  correctAnswer: number
  options?: number[]            // For select-answer, follow-pattern (2-4 choices)
  pattern?: { expression: string, result: number | null }[]  // For follow-pattern
  instruction?: string          // Override default instruction text
}
```

### Seed Data

```
src/data/
  math/
    units.js              → 3 unit definitions
    lessons/
      addition-1.js       → 5 lessons
      addition-2.js       → 5 lessons
      subtraction-1.js    → 5 lessons
```

On first app load (after onboarding), Dexie populates IndexedDB from these files.

## Gamification (v1: XP + Hearts + Streaks)

### XP

- +10 XP per correct answer
- +50 XP lesson completion bonus
- XP fly-up animation on correct answer

### Hearts

- Maximum 5 hearts
- Lose 1 per wrong answer (after retry chance on TypeTheAnswer)
- Refill 1 every 20 minutes (faster than Duolingo — less frustrating for kids)
- At 0 hearts: cannot start new lessons, can practice completed lessons to earn hearts back (1 heart per practice completion)
- Quiet fade animation on depletion
- Visible on home screen header

### Streaks

- Tracked by calendar day
- Complete 1+ lessons = streak maintained
- Missing a day resets to 0
- Fire icon on home screen
- Streak milestones noted: 7, 30, 100 days

## Mascot

### Dingo Character

- Friendly cartoon dingo rendered as SVG
- 3 expressions: **happy** (default/home), **thinking** (during exercises, wrong answer encouragement), **celebrating** (correct answer, lesson completion)
- No "sad" expression — wrong answers use "thinking" to stay encouraging
- Appears in: lesson completion screen, home screen welcome
- Simple flat illustration, warm orange/brown palette

## Visual Design

### Color Palette (Dark Theme)

```
Background:     #1a2332
Surface:        #1f2f40
Border:         #2a3a4a
Text Primary:   #ffffff
Text Secondary: #8899aa
Green (correct/CTA):  #58cc02
Green Hover:    #4caf00
Red (wrong):    #ff4b4b
Blue (highlight):     #1cb0f6
Yellow (XP/stars):    #ffc800
Pink (hearts):  #ff86d0
Orange (streak):      #ff9600
```

### Typography

- Nunito (Google Fonts) — bold, rounded, kid-friendly
- Exercise numbers: 48-64px bold
- Instructions: 20-24px semibold
- UI text: 14-16px regular
- High-contrast white on dark

### Animations

Framer Motion for:
- Card selection (scale + border transition)
- Progress bar fill (spring)
- XP fly-up (+10 floats up, fades)
- Heart fade on depletion
- Confetti on lesson completion
- Screen transitions between exercises
- Node pulse on learning path (CSS keyframes)

### Layout

- Mobile-first, max-width 480px centered
- Min-height 100vh, no scroll during exercises
- Bottom-anchored CHECK/CONTINUE buttons
- Number pad fixed at bottom
- Works on tablet/desktop (centered with padding)

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build + dev server |
| React Router v6 | Client-side routing |
| Dexie.js | IndexedDB wrapper |
| Zustand | State management |
| Framer Motion | Animations |
| CSS Modules | Scoped styles |
| Nunito | Typography |

No backend. No auth. No external APIs. Single-player, local-first.

## Content Scope (v1)

### Units

1. **Addition 1** — Adding numbers 0-10 (5 lessons)
2. **Addition 2** — Adding numbers 10-50 (5 lessons)
3. **Subtraction 1** — Subtracting numbers 0-10 (5 lessons)

**Total: 3 units, 15 lessons, ~120 exercises**

Each lesson uses the 3 exercise types, weighted toward the unit's topic.

## Onboarding

1. **Name entry** — "What's your name?" text input
2. **Starting level** — "Pick a starting level" with 3 cards: Starter (ages 6-7), Explorer (ages 8-10), Challenger (ages 11-12). Age hints in smaller text.

After onboarding, user record is created and learning path loads.

## File Structure

```
LuLinDingo/
  index.html
  package.json
  vite.config.js
  public/
    favicon.svg
  src/
    main.jsx
    App.jsx
    index.css
    components/
      layout/
        TabBar.jsx
        TabBar.module.css
      home/
        LearningPath.jsx
        LearningPath.module.css
        UnitHeader.jsx
        LessonNode.jsx
        LessonNode.module.css
      lesson/
        LessonEngine.jsx
        LessonEngine.module.css
        ProgressBar.jsx
        FeedbackBanner.jsx
        LessonSummary.jsx
        exercises/
          TypeTheAnswer.jsx
          SelectTheAnswer.jsx
          FollowThePattern.jsx
          NumberPad.jsx
      progress/
        ProgressScreen.jsx
        StreakCalendar.jsx
        UnitBadges.jsx
      settings/
        SettingsPanel.jsx
      shared/
        Mascot.jsx
        Confetti.jsx
        HeartDisplay.jsx
        XpFlyUp.jsx
    stores/
      useGameStore.js
    db/
      database.js
      seed.js
    data/
      math/
        units.js
        lessons/
          addition-1.js
          addition-2.js
          subtraction-1.js
    utils/
      xpCalculator.js
      heartManager.js
      streakTracker.js
```

---

# Deferred (Phase 2+)

Explicitly out of v1 scope. Ordered roughly by priority.

### Phase 2: More Content + Exercises
- Exercise types: AnswerOnTheLine (number line slider), HelpCharacter (word problem with mascot)
- Units: Subtraction 2, Multiplication 1-2, Division 1-2
- Adaptive difficulty (auto-nudge age band based on accuracy)
- Combo counter and multiplier
- Daily goal ring

### Phase 3: Full Arithmetic
- Units: Division with remainders
- Geometry 1-2 (shapes, area, perimeter)
- Retry mechanic for AnswerOnTheLine
- Streak freeze items
- Celebration escalation (milestone animations)

### Phase 4: Platform Expansion
- Course switcher UI
- Courses table + activeCourseId switching
- Chess module (or other second subject)
- Sound effects and audio
- Achievement badges

### Never in v1
- Backend / authentication / cloud sync
- Multiple user profiles
- Placement test
- Intermediate math (fractions, algebra, statistics)
- Gem/coin economy
- Leaderboard
- Mini-games (Cash Dash, Magic Squares, Secret Equation, Math Paths)
