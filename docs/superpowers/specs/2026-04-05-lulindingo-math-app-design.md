# LuLinDingo - Gamified Math App for Kids

**Date:** 2026-04-05
**Status:** Design
**Stack:** React 18 + Vite, Dexie.js, Zustand, Framer Motion, CSS Modules

## Overview

LuLinDingo is a Duolingo-inspired gamified mathematics app targeting kids ages 6-12. It covers elementary math (four operations + basic geometry) through bite-sized lessons with 5 interactive exercise types, a linear progression path, and full gamification (XP, streaks, hearts, combos, leaderboards). The app is entirely client-side with no backend — all data persists in IndexedDB via Dexie.js.

## Target Audience

- Kids ages 6-12 (elementary school)
- Playful, encouraging UI with large touch targets
- Mascot character for personality and engagement

## App Structure & Navigation

### Screens

1. **Home (Learning Path)** — Main screen. Vertical scrollable path of lesson nodes organized by unit. Completed nodes are filled green, current node pulses/glows, locked nodes are grayed out. Units grouped with headers (e.g., "Addition", "Subtraction").

2. **Lesson Screen** — Full-screen exercise flow (no tab bar). Progress bar at top. Exercises shown one at a time. Immediate feedback on each answer. After 10-12 exercises, a summary screen shows XP earned, accuracy, and streak status.

3. **Profile/Stats** — XP total, current streak with calendar view, hearts remaining, completed units count, local leaderboard (pre-seeded fake entries).

4. **Settings** — Sound on/off, reset progress, daily goal selector (10/20/30/50 XP).

### Navigation

- Bottom tab bar with 3 tabs: Learn, Profile, Settings
- Lesson screen is a full-screen overlay (tab bar hidden during exercises)
- React Router v6 handles routing: `/`, `/lesson/:id`, `/profile`, `/settings`

## Exercise Types

Five distinct exercise components, each a React component:

### 1. TypeTheAnswer

- Equation displayed with one blank box (e.g., `[] = 1 + 0`)
- Custom on-screen number pad (0-9 + backspace)
- Text input field shows typed answer
- CHECK button submits the answer
- Supports: addition, subtraction, multiplication, division results

### 2. SelectTheAnswer

- Equation with a blank (e.g., `1 + 1 = []`)
- 3-4 multiple choice options as large tappable cards
- Tap to select (highlighted in blue), then CHECK to confirm
- One correct answer, others are plausible distractors

### 3. AnswerOnTheLine

- Equation with blank + horizontal number line below
- Draggable marker/character snaps to integer positions
- Number line range adapts to the problem (e.g., 0-10, 0-20)
- CHECK button submits the marker's position

### 4. FollowThePattern

- Table showing a mathematical pattern (e.g., 3+2=5, 4+2=6, 5+2=???)
- Two large answer cards below the table
- Tap the correct answer card
- Pattern can involve any of the four operations

### 5. HelpCharacter

- Mascot character appears with a speech bubble containing a word problem
- Visual aids below (rulers, shapes, coins) rendered as SVG/CSS illustrations
- Two answer option cards with illustrated answers
- Topics: measurement comparisons, shape identification, money problems

## Lesson Flow

Each lesson consists of 10-12 exercises (mixed types from the above 5). A `LessonEngine` component manages:

1. Exercise queue and current exercise index
2. Progress bar (fills incrementally per correct answer)
3. Heart deductions on wrong answers
4. Combo counter tracking consecutive correct answers
5. XP accumulation during the lesson
6. Transition animations between exercises
7. Feedback banners (green/correct with encouragement text, red/wrong with correct answer shown)
8. Summary screen at completion

### Feedback Flow

- **Correct answer:** Green banner slides up from bottom with checkmark icon and random encouragement ("Amazing!", "Great job!", "Perfect!", "You're on fire!"). Green CONTINUE button appears. Combo counter increments. XP flies up as animated number.
- **Wrong answer:** Red banner slides up showing the correct answer. Heart breaks with animation. Combo counter resets. Red CONTINUE button appears.
- **Lesson complete:** Confetti animation, XP total with breakdown, accuracy percentage, streak status, star rating (1-3 based on accuracy).

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
  dailyGoal: number (10 | 20 | 30 | 50)
  dailyXpEarned: number
  dailyXpDate: string (YYYY-MM-DD)
  soundEnabled: boolean
  createdAt: Date
}

units {
  id: string (e.g., "addition-1")
  title: string
  topic: string (addition | subtraction | multiplication | division | geometry)
  order: number
  iconEmoji: string
  description: string
}

lessons {
  id: string (e.g., "addition-1-lesson-1")
  unitId: string (indexed, references units.id)
  order: number
  exercises: Exercise[] (JSON array, see Exercise schema below)
}

progress {
  lessonId: string (primary key, references lessons.id)
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

leaderboard {
  id: number (auto-increment)
  name: string
  xp: number
  isPlayer: boolean
  avatarColor: string
}
```

### Exercise Schema (stored in lessons.exercises JSON)

```typescript
type Exercise = {
  type: "type-answer" | "select-answer" | "number-line" | "follow-pattern" | "help-character"
  equation: string            // Display equation, e.g. "[] = 1 + 0" or "6 + 2 = []"
  correctAnswer: number       // The numeric correct answer
  options?: number[]          // For select-answer, follow-pattern, help-character (2-4 choices)
  numberLineRange?: [number, number]  // For number-line type, e.g. [0, 10]
  pattern?: { expression: string, result: number | null }[]  // For follow-pattern, null = the blank
  wordProblem?: string        // For help-character, e.g. "What's 3 in longer than 10 in?"
  visualAid?: "ruler" | "shapes" | "coins" | "blocks"  // For help-character
  instruction?: string        // Override default instruction text, e.g. "Follow the pattern"
}
```

### Seed Data

All lesson content is defined in static JS files organized by unit:

```
src/data/
  units.js          → Unit definitions and ordering
  lessons/
    addition-1.js   → Lesson exercises for Addition unit 1
    addition-2.js   → Lesson exercises for Addition unit 2
    subtraction-1.js
    ...
  leaderboard.js    → 20 pre-seeded fake leaderboard entries
```

On first app load, Dexie populates IndexedDB from these seed files. User progress is stored separately and persists across sessions.

## Gamification System

### XP (Experience Points)

- +10 XP base per correct answer
- Combo multiplier applied: x2 at 3-streak, x3 at 6-streak, x4 at 10-streak
- +50 XP lesson completion bonus
- XP contributes to daily goal progress
- XP fly-up animation on each correct answer

### Hearts / Lives

- Maximum 5 hearts
- Lose 1 heart per wrong answer during a lesson
- Hearts refill 1 every 30 minutes (calculated from `heartsLastRefill` timestamp)
- At 0 hearts: cannot start new lessons, must wait for refill or practice completed lessons
- Practice mode (replaying completed lessons) does not cost hearts
- Heart break animation on wrong answer

### Streaks

- Tracked by calendar day (`lastActiveDate`)
- Complete 1+ lessons in a day = streak maintained
- Missing a day resets streak to 0
- Streak displayed on home screen with fire icon
- Streak milestones celebrated: 7, 14, 30, 50, 100, 365 days

### Daily Goal

- User configurable: Casual (10 XP), Regular (20 XP), Serious (30 XP), Intense (50 XP)
- Circular progress ring on home screen
- Resets each calendar day
- Celebration animation when goal is met

### Combo Counter

- Tracks consecutive correct answers within a lesson
- Displayed as "COMBO x{N}" badge above progress bar (gold text)
- Resets to 0 on wrong answer
- Visual escalation: x3 = small badge, x6 = medium + glow, x10+ = large + particle effect

### Local Leaderboard

- 20 pre-seeded fake entries with names and XP values
- Player's entry mixed in, sorted by XP
- Fake entries have slowly increasing XP (calculated from days since install) to simulate competition
- Shows rank, name, XP, and avatar color circle

## Mascot & Visual Design

### Mascot: Dingo Character

- Friendly cartoon dingo rendered as SVG
- 4 expressions: happy (default), thinking (during exercise), celebrating (correct answer / completion), sad (wrong answer)
- Appears in: HelpCharacter exercises (with speech bubble), lesson completion screen, streak celebration, home screen welcome message
- Simple flat illustration style, warm orange/brown color palette

### Color Palette (Dark Theme)

```
Background:     #1a2332 (dark navy)
Surface:        #1f2f40 (slightly lighter, for cards)
Border:         #2a3a4a (subtle borders on cards)
Text Primary:   #ffffff
Text Secondary: #8899aa
Green (correct/CTA):  #58cc02
Green Hover:    #4caf00
Red (wrong):    #ff4b4b
Blue (highlight):     #1cb0f6
Yellow (XP/stars):    #ffc800
Pink (hearts):  #ff86d0
Orange (streak):      #ff9600
Combo Gold:     #ffd900
```

### Typography

- Primary font: Nunito (Google Fonts) — bold, rounded, kid-friendly
- Exercise numbers: 48-64px bold
- Instructions: 20-24px semibold
- UI text: 14-16px regular
- All text high-contrast white on dark

### Animation Approach

Using Framer Motion for:
- Card selection (scale + border color transition)
- Progress bar fill (spring animation)
- XP number fly-up (+10 floats up and fades)
- Heart break (shake + scale down + opacity)
- Confetti on lesson/unit completion
- Combo badge entrance (scale spring)
- Screen transitions (slide left/right between exercises)
- Node pulse animation on learning path (CSS keyframes)

### Layout

- Mobile-first design, max-width 480px centered
- Min-height 100vh, no scrolling during exercises
- Bottom-anchored buttons (CHECK / CONTINUE)
- Number pad fixed at bottom of viewport
- Responsive: works on tablet (centered with larger padding) and desktop (phone-frame centered)

## Tech Stack

| Technology | Purpose | Why |
|---|---|---|
| React 18 | UI framework | Component model, huge ecosystem, most help online |
| Vite | Build tool + dev server | Fast HMR, zero-config React setup |
| React Router v6 | Client-side routing | Standard SPA routing |
| Dexie.js | IndexedDB wrapper | Structured queries, reactive, simple API |
| Zustand | State management | Lightweight global store (~1KB), no boilerplate |
| Framer Motion | Animations | Declarative animations, gesture support |
| CSS Modules | Component styles | Scoped styles, no class conflicts |
| Nunito (Google Fonts) | Typography | Rounded, bold, kid-friendly |

No backend. No authentication. No external API calls. Single-player, local-first.

## Content Scope (Initial Version)

### Units and Topics

1. **Addition 1** — Adding numbers 0-10 (5 lessons)
2. **Addition 2** — Adding numbers 10-50 (5 lessons)
3. **Subtraction 1** — Subtracting numbers 0-10 (5 lessons)
4. **Subtraction 2** — Subtracting numbers 10-50 (5 lessons)
5. **Multiplication 1** — Times tables 1-5 (5 lessons)
6. **Multiplication 2** — Times tables 6-10 (5 lessons)
7. **Division 1** — Basic division, divisible results (5 lessons)
8. **Division 2** — Division with remainders intro (5 lessons)
9. **Geometry 1** — Shapes identification and properties (5 lessons)
10. **Geometry 2** — Area, perimeter, measurement (5 lessons)

**Total: 10 units, 50 lessons, ~550 exercises**

Each lesson contains 10-12 exercises drawn from the 5 exercise types, weighted toward the unit's topic but mixing in review from earlier units.

## File Structure

```
LuLinDingo/
  index.html
  package.json
  vite.config.js
  public/
    favicon.svg
  src/
    main.jsx                    → App entry point
    App.jsx                     → Router + layout
    index.css                   → Global styles, CSS variables, font import
    components/
      layout/
        TabBar.jsx              → Bottom navigation tabs
        TabBar.module.css
      home/
        LearningPath.jsx        → Scrollable unit/lesson node path
        LearningPath.module.css
        UnitHeader.jsx          → Unit title + icon
        LessonNode.jsx          → Individual lesson circle node
        LessonNode.module.css
      lesson/
        LessonEngine.jsx        → Manages exercise flow, progress, scoring
        LessonEngine.module.css
        ProgressBar.jsx         → Top progress bar + combo badge
        FeedbackBanner.jsx      → Correct/wrong slide-up banner
        LessonSummary.jsx       → End-of-lesson results screen
        exercises/
          TypeTheAnswer.jsx     → Number pad input exercise
          SelectTheAnswer.jsx   → Multiple choice exercise
          AnswerOnTheLine.jsx   → Number line slider exercise
          FollowThePattern.jsx  → Pattern table exercise
          HelpCharacter.jsx     → Word problem with mascot
          NumberPad.jsx         → Shared number pad component
          NumberLine.jsx        → Shared number line component
      profile/
        ProfileScreen.jsx       → Stats overview
        StreakCalendar.jsx      → Calendar streak visualization
        Leaderboard.jsx         → Fake leaderboard
      settings/
        SettingsScreen.jsx      → Settings controls
      shared/
        Mascot.jsx              → Dingo SVG with expressions
        Confetti.jsx            → Celebration particle effect
        HeartDisplay.jsx        → Hearts remaining indicator
        XpFlyUp.jsx             → Animated XP number
    stores/
      useGameStore.js           → Zustand store (user state, hearts, XP, streak)
    db/
      database.js               → Dexie.js schema + initialization
      seed.js                   → First-load data seeding logic
    data/
      units.js                  → Unit definitions
      lessons/
        addition-1.js
        addition-2.js
        subtraction-1.js
        subtraction-2.js
        multiplication-1.js
        multiplication-2.js
        division-1.js
        division-2.js
        geometry-1.js
        geometry-2.js
      leaderboard.js            → Pre-seeded fake entries
    utils/
      xpCalculator.js           → XP + combo multiplier logic
      heartManager.js           → Heart refill timer logic
      streakTracker.js          → Streak calculation logic
      exerciseGenerator.js      → Random distractor generation
```

## Out of Scope (Future Iterations)

- Mini-games (Cash Dash, Magic Squares, Secret Equation, Math Paths)
- Sound effects and audio
- Backend / user authentication / cloud sync
- Multiple user profiles
- Placement test
- Intermediate math content (fractions, algebra, statistics)
- Practice mode / review system
- Achievement badges
- Streak freeze items
- Gem/coin economy
