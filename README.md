# LuLin Dingo

A kid-friendly math learning app with short, engaging lessons for children ages 6 to 12. Built with React, Vite, Zustand, and Dexie (IndexedDB).

## Features

- **3 Units** — Addition 1, Addition 2, Subtraction 1 (15 lessons total)
- **3 Exercise Types** — Type the answer, select the answer, follow the pattern
- **Gamification** — Hearts (10 max, refill over time), XP, streaks, star ratings
- **Age-adaptive difficulty** — Exercise count scales by age band (6-7, 8-10, 11-12)
- **Linear progression** — Lessons unlock sequentially within units
- **Practice mode** — Replay completed lessons to earn hearts without XP cost
- **Onboarding** — Name and age band selection
- **Offline-first** — All progress stored locally via IndexedDB
- **Settings** — Age band adjustment, data reset

## Getting started

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

89 tests covering progression logic, store actions, database seeding, heart management, streak tracking, and XP calculation.

## Tech stack

- **React** + **Vite** — UI and build
- **Zustand** — State management
- **Dexie** — IndexedDB wrapper for offline persistence
- **Framer Motion** — Animations
- **Vitest** + **fake-indexeddb** — Testing
