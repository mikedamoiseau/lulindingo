# LuLinDingo v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Duolingo-style gamified math app for kids 6-12 with 5 exercise types, linear progression, and full gamification — entirely client-side.

**Architecture:** React 18 SPA with Vite. All data persists in IndexedDB via Dexie.js. Zustand manages runtime state (hearts, XP, combo). Framer Motion handles animations. No backend.

**Tech Stack:** React 18, Vite, React Router v6, Dexie.js, Zustand, Framer Motion, CSS Modules, Nunito font

**Spec:** `docs/superpowers/specs/2026-04-05-lulindingo-math-app-design.md`

---

## Milestones

1. **Foundation** (Tasks 1-3): Scaffold, global styles, database + store
2. **Core Loop** (Tasks 4-8): Onboarding, lesson engine, first 2 exercise types, feedback
3. **All Exercises** (Tasks 9-11): Remaining 3 exercise types
4. **Screens & Nav** (Tasks 12-15): Learning path, progress screen, settings, tab bar
5. **Gamification** (Tasks 16-19): Hearts, streaks, combos, daily goal, animations
6. **Content** (Tasks 20-21): All 10 units of exercise data
7. **Polish** (Tasks 22-24): Mascot SVG, confetti, adaptive difficulty, final integration

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
npm create vite@latest . -- --template react
```

Accept overwrite prompts for existing files. This creates the base Vite + React scaffold.

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom dexie dexie-react-hooks zustand framer-motion
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, shows URL like `http://localhost:5173`

- [ ] **Step 4: Clean up scaffold**

Delete `src/App.css`, `src/assets/`, and clear the default content from `src/App.jsx`. Replace with:

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<div>LuLinDingo - Home</div>} />
          <Route path="/lesson/:id" element={<div>Lesson</div>} />
          <Route path="/progress" element={<div>Progress</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Verify routing works**

```bash
npm run dev
```

Visit `http://localhost:5173/` — should show "LuLinDingo - Home". Visit `/progress` — should show "Progress".

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React project with router and dependencies"
```

---

## Task 2: Global Styles + CSS Variables + Font

**Files:**
- Create: `src/index.css`
- Modify: `index.html` (add font link)

- [ ] **Step 1: Add Nunito font to index.html**

Add to the `<head>` of `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
```

Also set the page title:
```html
<title>LuLinDingo</title>
```

- [ ] **Step 2: Write global CSS with design tokens**

Replace `src/index.css` with:

```css
/* src/index.css */
:root {
  /* Colors - Dark Theme */
  --bg: #1a2332;
  --surface: #1f2f40;
  --border: #2a3a4a;
  --text-primary: #ffffff;
  --text-secondary: #8899aa;

  /* Accent Colors */
  --green: #58cc02;
  --green-hover: #4caf00;
  --red: #ff4b4b;
  --blue: #1cb0f6;
  --yellow: #ffc800;
  --pink: #ff86d0;
  --orange: #ff9600;
  --combo-gold: #ffd900;

  /* Typography */
  --font: 'Nunito', sans-serif;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-3xl: 48px;
  --text-4xl: 64px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Layout */
  --max-width: 480px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

.app-shell {
  max-width: var(--max-width);
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
}

button {
  font-family: var(--font);
  cursor: pointer;
  border: none;
  outline: none;
}

input {
  font-family: var(--font);
}
```

- [ ] **Step 3: Verify styles applied**

```bash
npm run dev
```

Page should have dark navy background (#1a2332), white Nunito text, centered max-width layout.

- [ ] **Step 4: Commit**

```bash
git add src/index.css index.html
git commit -m "feat: add global styles, CSS variables, and Nunito font"
```

---

## Task 3: Database + Zustand Store + Utilities

**Files:**
- Create: `src/db/database.js`, `src/db/seed.js`, `src/stores/useGameStore.js`, `src/utils/xpCalculator.js`, `src/utils/heartManager.js`, `src/utils/streakTracker.js`

- [ ] **Step 1: Create Dexie database schema**

```js
// src/db/database.js
import Dexie from 'dexie';

export const db = new Dexie('LuLinDingo');

db.version(1).stores({
  users: '++id, name',
  courses: 'id, order',
  units: 'id, courseId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
});
```

- [ ] **Step 2: Create seed data loader**

```js
// src/db/seed.js
import { db } from './database';

export async function seedDatabase() {
  const courseCount = await db.courses.count();
  if (courseCount > 0) return; // Already seeded

  // Seed courses
  const { default: courses } = await import('../data/courses.js');
  await db.courses.bulkAdd(courses);

  // Seed math course units
  const { default: mathUnits } = await import('../data/math/units.js');
  await db.units.bulkAdd(mathUnits);

  // Dynamically import all math lesson files
  const lessonModules = import.meta.glob('../data/math/lessons/*.js');
  for (const path in lessonModules) {
    const mod = await lessonModules[path]();
    await db.lessons.bulkAdd(mod.default);
  }
}
```

- [ ] **Step 3: Create stub data files so imports don't fail**

```js
// src/data/courses.js
const courses = [
  {
    id: 'math',
    title: 'Mathematics',
    iconEmoji: '🔢',
    description: 'Addition, subtraction, multiplication, division & geometry',
    order: 1,
  },
];

export default courses;
```

```js
// src/data/math/units.js
const units = [
  {
    id: 'math-addition-1',
    courseId: 'math',
    title: 'Addition 1',
    topic: 'addition',
    order: 1,
    iconEmoji: '➕',
    description: 'Adding numbers 0-10',
  },
];

export default units;
```

```js
// src/data/math/lessons/addition-1.js
const lessons = [
  {
    id: 'math-addition-1-lesson-1',
    unitId: 'math-addition-1',
    order: 1,
    exercises: [
      {
        type: 'select-answer',
        equation: '1 + 1 = []',
        correctAnswer: 2,
        options: [0, 2, 5],
        instruction: 'Select the answer',
      },
      {
        type: 'type-answer',
        equation: '[] = 1 + 0',
        correctAnswer: 1,
        instruction: 'Type the answer',
      },
    ],
  },
];

export default lessons;
```

- [ ] **Step 4: Create XP calculator utility**

```js
// src/utils/xpCalculator.js
const BASE_XP = 10;
const LESSON_BONUS = 50;

export function getComboMultiplier(combo) {
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function calculateXp(combo) {
  return BASE_XP * getComboMultiplier(combo);
}

export function getLessonBonus() {
  return LESSON_BONUS;
}
```

- [ ] **Step 5: Create heart manager utility**

```js
// src/utils/heartManager.js
const MAX_HEARTS = 5;
const REFILL_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

export function calculateCurrentHearts(hearts, heartsLastRefill) {
  if (hearts >= MAX_HEARTS) return MAX_HEARTS;

  const now = Date.now();
  const elapsed = now - new Date(heartsLastRefill).getTime();
  const refills = Math.floor(elapsed / REFILL_INTERVAL_MS);

  return Math.min(MAX_HEARTS, hearts + refills);
}

export function getNextRefillMs(heartsLastRefill) {
  const elapsed = Date.now() - new Date(heartsLastRefill).getTime();
  const remainder = elapsed % REFILL_INTERVAL_MS;
  return REFILL_INTERVAL_MS - remainder;
}

export { MAX_HEARTS, REFILL_INTERVAL_MS };
```

- [ ] **Step 6: Create streak tracker utility**

```js
// src/utils/streakTracker.js
export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function calculateStreak(lastActiveDate, currentStreak) {
  const today = getTodayString();
  if (lastActiveDate === today) return currentStreak;
  if (lastActiveDate === getYesterdayString()) return currentStreak; // Still valid, will increment on lesson complete
  return 0; // Streak broken
}

export function isStreakMilestone(streak) {
  return [7, 14, 30, 50, 100, 365].includes(streak);
}
```

- [ ] **Step 7: Create Zustand store**

```js
// src/stores/useGameStore.js
import { create } from 'zustand';
import { db } from '../db/database';
import { calculateCurrentHearts } from '../utils/heartManager';
import { getTodayString, calculateStreak } from '../utils/streakTracker';

const useGameStore = create((set, get) => ({
  // User state
  user: null,
  isLoaded: false,

  // Lesson state
  currentCombo: 0,
  lessonXp: 0,
  lessonCorrect: 0,
  lessonTotal: 0,

  // Load user from DB
  loadUser: async () => {
    const users = await db.users.toArray();
    if (users.length > 0) {
      const user = users[0];
      // Recalculate hearts based on time elapsed
      const hearts = calculateCurrentHearts(user.hearts, user.heartsLastRefill);
      // Check streak
      const currentStreak = calculateStreak(user.lastActiveDate, user.currentStreak);
      const updated = { ...user, hearts, currentStreak };
      if (hearts !== user.hearts || currentStreak !== user.currentStreak) {
        await db.users.update(user.id, { hearts, currentStreak });
      }
      set({ user: updated, isLoaded: true });
    } else {
      set({ isLoaded: true });
    }
  },

  // Create user during onboarding
  createUser: async (name, ageBand) => {
    const id = await db.users.add({
      name,
      totalXp: 0,
      hearts: 5,
      heartsLastRefill: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      dailyGoal: 20,
      dailyXpEarned: 0,
      dailyXpDate: getTodayString(),
      ageBand,
      activeCourseId: 'math',
      soundEnabled: true,
      createdAt: new Date(),
    });
    const user = await db.users.get(id);
    set({ user });
  },

  // Heart management
  loseHeart: async () => {
    const { user } = get();
    if (!user || user.hearts <= 0) return;
    const hearts = user.hearts - 1;
    await db.users.update(user.id, { hearts, heartsLastRefill: new Date() });
    set({ user: { ...user, hearts, heartsLastRefill: new Date() } });
  },

  gainHeart: async () => {
    const { user } = get();
    if (!user || user.hearts >= 5) return;
    const hearts = user.hearts + 1;
    await db.users.update(user.id, { hearts });
    set({ user: { ...user, hearts } });
  },

  // XP management
  addXp: async (amount) => {
    const { user } = get();
    if (!user) return;
    const today = getTodayString();
    const dailyXpEarned = user.dailyXpDate === today ? user.dailyXpEarned + amount : amount;
    const totalXp = user.totalXp + amount;
    await db.users.update(user.id, { totalXp, dailyXpEarned, dailyXpDate: today });
    set({ user: { ...user, totalXp, dailyXpEarned, dailyXpDate: today } });
  },

  // Combo management
  incrementCombo: () => set((s) => ({ currentCombo: s.currentCombo + 1 })),
  resetCombo: () => set({ currentCombo: 0 }),

  // Lesson tracking
  recordAnswer: (correct) => set((s) => ({
    lessonCorrect: s.lessonCorrect + (correct ? 1 : 0),
    lessonTotal: s.lessonTotal + 1,
  })),
  resetLesson: () => set({ currentCombo: 0, lessonXp: 0, lessonCorrect: 0, lessonTotal: 0 }),
  addLessonXp: (amount) => set((s) => ({ lessonXp: s.lessonXp + amount })),

  // Streak management
  updateStreak: async () => {
    const { user } = get();
    if (!user) return;
    const today = getTodayString();
    if (user.lastActiveDate === today) return; // Already active today
    const newStreak = user.lastActiveDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
      ? user.currentStreak + 1
      : 1;
    const longestStreak = Math.max(newStreak, user.longestStreak);
    await db.users.update(user.id, { currentStreak: newStreak, longestStreak, lastActiveDate: today });
    await db.streakHistory.put({ date: today, lessonsCompleted: 0, xpEarned: 0 });
    set({ user: { ...user, currentStreak: newStreak, longestStreak, lastActiveDate: today } });
  },

  // Complete a lesson
  completeLesson: async (lessonId, accuracy) => {
    const { user } = get();
    if (!user) return;
    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
    const existing = await db.progress.get(lessonId);
    await db.progress.put({
      lessonId,
      completed: true,
      stars: existing ? Math.max(existing.stars, stars) : stars,
      bestAccuracy: existing ? Math.max(existing.bestAccuracy, accuracy) : accuracy,
      attempts: (existing?.attempts || 0) + 1,
      completedAt: new Date(),
    });
    // Update streak history
    const today = getTodayString();
    const hist = await db.streakHistory.get(today);
    if (hist) {
      await db.streakHistory.update(today, {
        lessonsCompleted: hist.lessonsCompleted + 1,
        xpEarned: hist.xpEarned + get().lessonXp,
      });
    }
  },

  // Settings
  updateSettings: async (settings) => {
    const { user } = get();
    if (!user) return;
    await db.users.update(user.id, settings);
    set({ user: { ...user, ...settings } });
  },
}));

export default useGameStore;
```

- [ ] **Step 8: Verify no import errors**

```bash
npm run dev
```

Open browser console — should be no errors. The app won't use the store yet but the imports should resolve.

- [ ] **Step 9: Commit**

```bash
git add src/db/ src/stores/ src/utils/ src/data/
git commit -m "feat: add database schema, Zustand store, XP/heart/streak utilities, and stub data"
```

---

## Task 4: Onboarding Flow

**Files:**
- Create: `src/components/onboarding/Onboarding.jsx`, `src/components/onboarding/Onboarding.module.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create Onboarding component**

```jsx
// src/components/onboarding/Onboarding.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import styles from './Onboarding.module.css';

const AGE_BANDS = [
  { value: '6-7', label: 'Starter', hint: 'Ages 6-7', emoji: '🌱' },
  { value: '8-10', label: 'Explorer', hint: 'Ages 8-10', emoji: '🚀' },
  { value: '11-12', label: 'Challenger', hint: 'Ages 11-12', emoji: '⚡' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const createUser = useGameStore((s) => s.createUser);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) setStep(1);
  };

  const handleAgeBand = async (band) => {
    await createUser(name.trim(), band);
  };

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.form
            key="name"
            className={styles.step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            onSubmit={handleNameSubmit}
          >
            <h1 className={styles.title}>What's your name?</h1>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              maxLength={20}
            />
            <button
              className={styles.button}
              type="submit"
              disabled={!name.trim()}
            >
              CONTINUE
            </button>
          </motion.form>
        )}
        {step === 1 && (
          <motion.div
            key="age"
            className={styles.step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <h1 className={styles.title}>Pick a starting level</h1>
            <p className={styles.subtitle}>You can always change this later</p>
            <div className={styles.bands}>
              {AGE_BANDS.map((band) => (
                <button
                  key={band.value}
                  className={styles.bandCard}
                  onClick={() => handleAgeBand(band.value)}
                >
                  <span className={styles.bandEmoji}>{band.emoji}</span>
                  <span className={styles.bandLabel}>{band.label}</span>
                  <span className={styles.bandHint}>{band.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Style the onboarding**

```css
/* src/components/onboarding/Onboarding.module.css */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-lg);
}

.step {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.title {
  font-size: var(--text-2xl);
  font-weight: 800;
  text-align: center;
}

.subtitle {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin-top: calc(-1 * var(--space-md));
}

.input {
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 700;
  text-align: center;
}

.input:focus {
  border-color: var(--blue);
  outline: none;
}

.input::placeholder {
  color: var(--text-secondary);
  font-weight: 400;
}

.button {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--green);
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 800;
  letter-spacing: 1px;
  transition: background 0.2s;
}

.button:hover:not(:disabled) {
  background: var(--green-hover);
}

.button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bands {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.bandCard {
  width: 100%;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  transition: border-color 0.2s, transform 0.1s;
}

.bandCard:hover {
  border-color: var(--blue);
  transform: scale(1.02);
}

.bandCard:active {
  transform: scale(0.98);
}

.bandEmoji {
  font-size: var(--text-2xl);
}

.bandLabel {
  font-size: var(--text-lg);
  font-weight: 800;
  flex: 1;
  text-align: left;
}

.bandHint {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
```

- [ ] **Step 3: Wire onboarding into App.jsx**

```jsx
// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useGameStore from './stores/useGameStore';
import { seedDatabase } from './db/seed';
import Onboarding from './components/onboarding/Onboarding';

export default function App() {
  const { user, isLoaded, loadUser } = useGameStore();

  useEffect(() => {
    seedDatabase().then(() => loadUser());
  }, [loadUser]);

  if (!isLoaded) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<div style={{ padding: '24px' }}>Welcome back, {user.name}!</div>} />
          <Route path="/lesson/:id" element={<div>Lesson</div>} />
          <Route path="/progress" element={<div>Progress</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Test onboarding flow**

```bash
npm run dev
```

1. Open app — should show "What's your name?"
2. Type a name, click CONTINUE — should slide to age band selection
3. Pick a band — should transition to "Welcome back, [name]!"
4. Refresh — should still show "Welcome back" (persisted in IndexedDB)

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/ src/App.jsx
git commit -m "feat: add onboarding flow with name entry and age band selection"
```

---

## Task 5: Shared Components — NumberPad, HeartDisplay

**Files:**
- Create: `src/components/lesson/exercises/NumberPad.jsx`, `src/components/lesson/exercises/NumberPad.module.css`, `src/components/shared/HeartDisplay.jsx`, `src/components/shared/HeartDisplay.module.css`

- [ ] **Step 1: Create NumberPad component**

```jsx
// src/components/lesson/exercises/NumberPad.jsx
import styles from './NumberPad.module.css';

export default function NumberPad({ onDigit, onDelete }) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className={styles.pad}>
      {digits.map((d) => (
        <button key={d} className={styles.key} onClick={() => onDigit(String(d))}>
          {d}
        </button>
      ))}
      <div className={styles.bottomRow}>
        <button className={styles.key} onClick={() => onDigit('0')}>0</button>
        <button className={styles.key + ' ' + styles.deleteKey} onClick={onDelete}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Style NumberPad**

```css
/* src/components/lesson/exercises/NumberPad.module.css */
.pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.bottomRow {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  justify-items: center;
}

.bottomRow .key:first-child {
  grid-column: 1;
  width: 100%;
}

.bottomRow .key:last-child {
  grid-column: 2;
  width: 100%;
}

.key {
  padding: var(--space-md) var(--space-sm);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, transform 0.1s;
  min-height: 56px;
}

.key:active {
  transform: scale(0.95);
  background: var(--border);
}

.deleteKey {
  background: var(--surface);
}
```

- [ ] **Step 3: Create HeartDisplay component**

```jsx
// src/components/shared/HeartDisplay.jsx
import { motion } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import styles from './HeartDisplay.module.css';

export default function HeartDisplay() {
  const hearts = useGameStore((s) => s.user?.hearts ?? 5);

  return (
    <div className={styles.container}>
      <motion.span
        className={styles.icon}
        key={hearts}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        ❤️
      </motion.span>
      <span className={styles.count}>{hearts}</span>
    </div>
  );
}
```

```css
/* src/components/shared/HeartDisplay.module.css */
.container {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.icon {
  font-size: var(--text-lg);
  display: inline-block;
}

.count {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--pink);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/lesson/exercises/NumberPad.jsx src/components/lesson/exercises/NumberPad.module.css src/components/shared/
git commit -m "feat: add NumberPad and HeartDisplay shared components"
```

---

## Task 6: Exercise Components — TypeTheAnswer + SelectTheAnswer

**Files:**
- Create: `src/components/lesson/exercises/TypeTheAnswer.jsx`, `src/components/lesson/exercises/TypeTheAnswer.module.css`, `src/components/lesson/exercises/SelectTheAnswer.jsx`, `src/components/lesson/exercises/SelectTheAnswer.module.css`

- [ ] **Step 1: Create TypeTheAnswer component**

```jsx
// src/components/lesson/exercises/TypeTheAnswer.jsx
import { useState } from 'react';
import NumberPad from './NumberPad';
import styles from './TypeTheAnswer.module.css';

export default function TypeTheAnswer({ exercise, onAnswer }) {
  const [value, setValue] = useState('');

  const handleDigit = (d) => {
    if (value.length < 4) setValue(value + d);
  };

  const handleDelete = () => {
    setValue(value.slice(0, -1));
  };

  const handleCheck = () => {
    if (value === '') return;
    onAnswer(parseInt(value, 10));
  };

  // Parse equation: replace [] with the blank box
  const parts = exercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Type the answer'}</p>
      <div className={styles.equation}>
        <span>{parts[0]}</span>
        <span className={styles.blank}>{value || ''}</span>
        <span>{parts[1]}</span>
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputField}>
          {value || <span className={styles.placeholder}>Example: 2</span>}
        </div>
        <button
          className={styles.checkButton}
          onClick={handleCheck}
          disabled={value === ''}
        >
          CHECK
        </button>
      </div>
      <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
    </div>
  );
}
```

- [ ] **Step 2: Style TypeTheAnswer**

```css
/* src/components/lesson/exercises/TypeTheAnswer.module.css */
.container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.instruction {
  font-size: var(--text-lg);
  font-weight: 700;
  padding: var(--space-md) var(--space-lg);
}

.equation {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--blue);
}

.blank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-md);
  border: 3px solid var(--blue);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-3xl);
}

.inputArea {
  padding: 0 var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.inputField {
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 700;
  min-height: 56px;
  display: flex;
  align-items: center;
}

.placeholder {
  color: var(--text-secondary);
  font-weight: 400;
}

.checkButton {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--border);
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: 800;
  letter-spacing: 1px;
  transition: background 0.2s, color 0.2s;
}

.checkButton:not(:disabled) {
  background: var(--green);
  color: var(--text-primary);
}
```

- [ ] **Step 3: Create SelectTheAnswer component**

```jsx
// src/components/lesson/exercises/SelectTheAnswer.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './SelectTheAnswer.module.css';

export default function SelectTheAnswer({ exercise, onAnswer }) {
  const [selected, setSelected] = useState(null);

  const handleCheck = () => {
    if (selected === null) return;
    onAnswer(selected);
  };

  const parts = exercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Select the answer'}</p>
      <div className={styles.equation}>
        <span>{parts[0]}</span>
        <span className={styles.blank} />
        <span>{parts[1]}</span>
      </div>
      <div className={styles.options}>
        {exercise.options.map((opt) => (
          <motion.button
            key={opt}
            className={`${styles.option} ${selected === opt ? styles.selected : ''}`}
            onClick={() => setSelected(opt)}
            whileTap={{ scale: 0.97 }}
          >
            {opt}
          </motion.button>
        ))}
      </div>
      <div className={styles.checkArea}>
        <button
          className={styles.checkButton}
          onClick={handleCheck}
          disabled={selected === null}
        >
          CHECK
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Style SelectTheAnswer**

```css
/* src/components/lesson/exercises/SelectTheAnswer.module.css */
.container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.instruction {
  font-size: var(--text-lg);
  font-weight: 700;
  padding: var(--space-md) var(--space-lg);
}

.equation {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--blue);
}

.blank {
  display: inline-block;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-md);
  border: 3px solid var(--blue);
  background: var(--surface);
}

.options {
  padding: 0 var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.option {
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: 800;
  text-align: center;
  transition: border-color 0.2s;
}

.option:hover {
  border-color: var(--text-secondary);
}

.selected {
  border-color: var(--blue);
  background: rgba(28, 176, 246, 0.1);
}

.checkArea {
  padding: var(--space-md) var(--space-lg);
}

.checkButton {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--border);
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: 800;
  letter-spacing: 1px;
  transition: background 0.2s, color 0.2s;
}

.checkButton:not(:disabled) {
  background: var(--green);
  color: var(--text-primary);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/exercises/
git commit -m "feat: add TypeTheAnswer and SelectTheAnswer exercise components"
```

---

## Task 7: Feedback Banner + Progress Bar

**Files:**
- Create: `src/components/lesson/FeedbackBanner.jsx`, `src/components/lesson/FeedbackBanner.module.css`, `src/components/lesson/ProgressBar.jsx`, `src/components/lesson/ProgressBar.module.css`

- [ ] **Step 1: Create FeedbackBanner component**

```jsx
// src/components/lesson/FeedbackBanner.jsx
import { motion } from 'framer-motion';
import styles from './FeedbackBanner.module.css';

const ENCOURAGEMENTS = ['Amazing!', 'Great job!', 'Perfect!', "You're on fire!", 'Brilliant!', 'Keep it up!'];

function randomEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

export default function FeedbackBanner({ isCorrect, correctAnswer, equation, onContinue, isRetry }) {
  if (isRetry) {
    return (
      <motion.div
        className={`${styles.banner} ${styles.retry}`}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <div className={styles.content}>
          <span className={styles.icon}>🤔</span>
          <span className={styles.message}>Try again!</span>
        </div>
        <button className={`${styles.continueBtn} ${styles.retryBtn}`} onClick={onContinue}>
          RETRY
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`${styles.banner} ${isCorrect ? styles.correct : styles.wrong}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className={styles.content}>
        {isCorrect ? (
          <>
            <span className={styles.icon}>✅</span>
            <span className={styles.message}>{randomEncouragement()}</span>
          </>
        ) : (
          <>
            <span className={styles.icon}>💭</span>
            <div className={styles.wrongContent}>
              <span className={styles.message}>The answer is {correctAnswer}</span>
              {equation && <span className={styles.explanation}>{equation.replace('[]', String(correctAnswer))}</span>}
            </div>
          </>
        )}
      </div>
      <button
        className={`${styles.continueBtn} ${isCorrect ? styles.correctBtn : styles.wrongBtn}`}
        onClick={onContinue}
      >
        CONTINUE
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 2: Style FeedbackBanner**

```css
/* src/components/lesson/FeedbackBanner.module.css */
.banner {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--max-width);
  padding: var(--space-lg);
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
  z-index: 100;
}

.correct { background: #1b3a1b; }
.wrong { background: #3a1b1b; }
.retry { background: #3a2e1b; }

.content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.icon {
  font-size: var(--text-xl);
}

.message {
  font-size: var(--text-lg);
  font-weight: 800;
}

.wrongContent {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.explanation {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.continueBtn {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--text-primary);
}

.correctBtn { background: var(--green); }
.correctBtn:hover { background: var(--green-hover); }
.wrongBtn { background: var(--red); }
.retryBtn { background: var(--orange); }
```

- [ ] **Step 3: Create ProgressBar component**

```jsx
// src/components/lesson/ProgressBar.jsx
import { motion } from 'framer-motion';
import styles from './ProgressBar.module.css';

export default function ProgressBar({ current, total, combo, onClose }) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={styles.container}>
      <button className={styles.closeBtn} onClick={onClose}>✕</button>
      <div className={styles.barTrack}>
        <motion.div
          className={styles.barFill}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        />
      </div>
      {combo >= 3 && (
        <motion.span
          className={styles.combo}
          key={combo}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          COMBO x{combo}
        </motion.span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Style ProgressBar**

```css
/* src/components/lesson/ProgressBar.module.css */
.container {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  position: relative;
}

.closeBtn {
  background: none;
  color: var(--text-secondary);
  font-size: var(--text-lg);
  padding: var(--space-xs);
  display: flex;
  align-items: center;
  justify-content: center;
}

.barTrack {
  flex: 1;
  height: 16px;
  background: var(--border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.barFill {
  height: 100%;
  background: var(--green);
  border-radius: var(--radius-full);
  min-width: 0;
}

.combo {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--combo-gold);
  color: #1a1a1a;
  font-size: var(--text-xs);
  font-weight: 900;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/FeedbackBanner.jsx src/components/lesson/FeedbackBanner.module.css src/components/lesson/ProgressBar.jsx src/components/lesson/ProgressBar.module.css
git commit -m "feat: add FeedbackBanner and ProgressBar components"
```

---

## Task 8: Lesson Engine

**Files:**
- Create: `src/components/lesson/LessonEngine.jsx`, `src/components/lesson/LessonEngine.module.css`, `src/components/lesson/LessonSummary.jsx`, `src/components/lesson/LessonSummary.module.css`
- Create: `src/components/shared/XpFlyUp.jsx`, `src/components/shared/XpFlyUp.module.css`

- [ ] **Step 1: Create XpFlyUp animation component**

```jsx
// src/components/shared/XpFlyUp.jsx
import { motion, AnimatePresence } from 'framer-motion';
import styles from './XpFlyUp.module.css';

export default function XpFlyUp({ amount, trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          className={styles.flyup}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -60 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

```css
/* src/components/shared/XpFlyUp.module.css */
.flyup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--text-xl);
  font-weight: 900;
  color: var(--yellow);
  pointer-events: none;
  z-index: 200;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 2: Create LessonSummary component**

```jsx
// src/components/lesson/LessonSummary.jsx
import { motion } from 'framer-motion';
import styles from './LessonSummary.module.css';

export default function LessonSummary({ xp, accuracy, streak, onFinish }) {
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className={styles.stars}>{starDisplay}</div>
      <h1 className={styles.title}>Lesson Complete!</h1>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{xp}</span>
          <span className={styles.statLabel}>XP earned</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{accuracy}%</span>
          <span className={styles.statLabel}>Accuracy</span>
        </div>
        {streak > 0 && (
          <div className={styles.stat}>
            <span className={styles.statValue}>🔥 {streak}</span>
            <span className={styles.statLabel}>Day streak</span>
          </div>
        )}
      </div>
      <button className={styles.finishBtn} onClick={onFinish}>
        CONTINUE
      </button>
    </motion.div>
  );
}
```

```css
/* src/components/lesson/LessonSummary.module.css */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-xl);
  gap: var(--space-lg);
}

.stars {
  font-size: var(--text-4xl);
  letter-spacing: 8px;
}

.title {
  font-size: var(--text-2xl);
  font-weight: 900;
}

.stats {
  display: flex;
  gap: var(--space-xl);
  margin: var(--space-lg) 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.statValue {
  font-size: var(--text-2xl);
  font-weight: 900;
  color: var(--yellow);
}

.statLabel {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.finishBtn {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--green);
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 800;
  letter-spacing: 1px;
}

.finishBtn:hover {
  background: var(--green-hover);
}
```

- [ ] **Step 3: Create LessonEngine component**

```jsx
// src/components/lesson/LessonEngine.jsx
import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import { calculateXp, getLessonBonus } from '../../utils/xpCalculator';
import ProgressBar from './ProgressBar';
import FeedbackBanner from './FeedbackBanner';
import LessonSummary from './LessonSummary';
import XpFlyUp from '../shared/XpFlyUp';
import TypeTheAnswer from './exercises/TypeTheAnswer';
import SelectTheAnswer from './exercises/SelectTheAnswer';
import styles from './LessonEngine.module.css';

const RETRY_TYPES = ['type-answer', 'number-line'];

export default function LessonEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lesson = useLiveQuery(() => db.lessons.get(id), [id]);
  const user = useGameStore((s) => s.user);
  const ageBand = user?.ageBand || '8-10';

  const {
    currentCombo, lessonXp, lessonCorrect, lessonTotal,
    incrementCombo, resetCombo, addXp, addLessonXp,
    loseHeart, recordAnswer, resetLesson, completeLesson, updateStreak,
  } = useGameStore();

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null); // { isCorrect, correctAnswer, isRetry }
  const [xpFlyUp, setXpFlyUp] = useState(null);
  const [retryUsed, setRetryUsed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Determine exercises based on age band
  const exercises = lesson?.exercises || [];
  const maxExercises = ageBand === '6-7' ? 6 : ageBand === '8-10' ? 9 : 12;
  const activeExercises = exercises.slice(0, Math.min(exercises.length, maxExercises));
  const currentExercise = activeExercises[exerciseIndex];

  const handleAnswer = useCallback((answer) => {
    if (!currentExercise) return;
    const isCorrect = answer === currentExercise.correctAnswer;

    if (isCorrect) {
      const xp = calculateXp(currentCombo);
      incrementCombo();
      addLessonXp(xp);
      addXp(xp);
      recordAnswer(true);
      setXpFlyUp(Date.now());
      setFeedback({ isCorrect: true });
      setRetryUsed(false);
    } else {
      // Check if retry is available
      const canRetry = RETRY_TYPES.includes(currentExercise.type) && !retryUsed;
      if (canRetry) {
        setFeedback({ isRetry: true });
        setRetryUsed(true);
      } else {
        resetCombo();
        loseHeart();
        recordAnswer(false);
        setRetryUsed(false);
        setFeedback({
          isCorrect: false,
          correctAnswer: currentExercise.correctAnswer,
          equation: currentExercise.equation,
        });
      }
    }
  }, [currentExercise, currentCombo, retryUsed, incrementCombo, addLessonXp, addXp, recordAnswer, resetCombo, loseHeart]);

  const handleContinue = useCallback(async () => {
    if (feedback?.isRetry) {
      // Let them retry — just close the banner
      setFeedback(null);
      return;
    }

    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= activeExercises.length) {
      // Lesson complete
      const bonus = getLessonBonus();
      addLessonXp(bonus);
      addXp(bonus);
      await updateStreak();
      const accuracy = activeExercises.length > 0
        ? Math.round((lessonCorrect / activeExercises.length) * 100)
        : 0;
      await completeLesson(id, accuracy);
      setFeedback(null);
      setShowSummary(true);
    } else {
      setFeedback(null);
      setExerciseIndex(nextIndex);
    }
  }, [feedback, exerciseIndex, activeExercises.length, lessonCorrect, id, addLessonXp, addXp, updateStreak, completeLesson]);

  const handleClose = () => {
    resetLesson();
    navigate('/');
  };

  const handleFinish = () => {
    resetLesson();
    navigate('/');
  };

  if (!lesson) {
    return <div className={styles.loading}>Loading lesson...</div>;
  }

  if (showSummary) {
    const accuracy = activeExercises.length > 0
      ? Math.round((lessonCorrect / activeExercises.length) * 100)
      : 0;
    return (
      <div className={styles.container}>
        <LessonSummary
          xp={lessonXp}
          accuracy={accuracy}
          streak={user?.currentStreak || 0}
          onFinish={handleFinish}
        />
      </div>
    );
  }

  const exerciseComponent = (() => {
    if (!currentExercise) return null;
    const props = { exercise: currentExercise, onAnswer: handleAnswer };
    switch (currentExercise.type) {
      case 'type-answer': return <TypeTheAnswer {...props} />;
      case 'select-answer': return <SelectTheAnswer {...props} />;
      // More exercise types will be added in later tasks
      default: return <div>Unknown exercise type: {currentExercise.type}</div>;
    }
  })();

  return (
    <div className={styles.container}>
      <ProgressBar
        current={exerciseIndex + (feedback?.isCorrect ? 1 : 0)}
        total={activeExercises.length}
        combo={currentCombo}
        onClose={handleClose}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={exerciseIndex}
          className={styles.exerciseArea}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {exerciseComponent}
        </motion.div>
      </AnimatePresence>
      <XpFlyUp amount={calculateXp(currentCombo)} trigger={xpFlyUp} />
      <AnimatePresence>
        {feedback && !feedback.isRetry && (
          <FeedbackBanner
            isCorrect={feedback.isCorrect}
            correctAnswer={feedback.correctAnswer}
            equation={feedback.equation}
            onContinue={handleContinue}
          />
        )}
        {feedback?.isRetry && (
          <FeedbackBanner
            isRetry
            onContinue={handleContinue}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: Style LessonEngine**

```css
/* src/components/lesson/LessonEngine.module.css */
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: var(--max-width);
  margin: 0 auto;
  width: 100%;
}

.exerciseArea {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: var(--text-secondary);
  font-size: var(--text-lg);
}
```

- [ ] **Step 5: Wire LessonEngine into App.jsx**

Update `src/App.jsx` — replace the lesson route placeholder:

```jsx
// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useGameStore from './stores/useGameStore';
import { seedDatabase } from './db/seed';
import Onboarding from './components/onboarding/Onboarding';
import LessonEngine from './components/lesson/LessonEngine';

export default function App() {
  const { user, isLoaded, loadUser } = useGameStore();

  useEffect(() => {
    seedDatabase().then(() => loadUser());
  }, [loadUser]);

  if (!isLoaded) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<div style={{ padding: '24px' }}>Welcome back, {user.name}!</div>} />
          <Route path="/lesson/:id" element={<LessonEngine />} />
          <Route path="/progress" element={<div>Progress</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Test the core loop**

```bash
npm run dev
```

Navigate to `http://localhost:5173/lesson/math-addition-1-lesson-1`. You should see:
1. Progress bar at top with close (X) button
2. First exercise (SelectTheAnswer or TypeTheAnswer)
3. Answer correctly — green feedback banner, XP fly-up, combo counter
4. Answer wrong — retry prompt (for type-answer) or red banner with correct answer
5. Complete all exercises — summary screen with stars, XP, accuracy

- [ ] **Step 7: Commit**

```bash
git add src/components/lesson/ src/components/shared/XpFlyUp.jsx src/components/shared/XpFlyUp.module.css src/App.jsx
git commit -m "feat: add LessonEngine with core exercise loop, feedback, and summary"
```

---

## Task 9: Exercise — AnswerOnTheLine (Number Line Slider)

**Files:**
- Create: `src/components/lesson/exercises/NumberLine.jsx`, `src/components/lesson/exercises/NumberLine.module.css`, `src/components/lesson/exercises/AnswerOnTheLine.jsx`, `src/components/lesson/exercises/AnswerOnTheLine.module.css`

- [ ] **Step 1: Create NumberLine component**

```jsx
// src/components/lesson/exercises/NumberLine.jsx
import { useRef, useState, useCallback } from 'react';
import styles from './NumberLine.module.css';

export default function NumberLine({ min, max, value, onChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const getValueFromX = useCallback((clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + ratio * (max - min));
  }, [min, max]);

  const handleStart = (clientX) => {
    setDragging(true);
    onChange(getValueFromX(clientX));
  };

  const handleMove = (clientX) => {
    if (!dragging) return;
    onChange(getValueFromX(clientX));
  };

  const handleEnd = () => setDragging(false);

  const pct = ((value - min) / (max - min)) * 100;
  const step = max - min <= 10 ? 1 : 2;
  const ticks = [];
  for (let i = min; i <= max; i += step) {
    ticks.push(i);
  }

  return (
    <div className={styles.container}>
      <div className={styles.labels}>
        {ticks.map((t) => (
          <span key={t} className={`${styles.label} ${t === value ? styles.activeLabel : ''}`}>
            {t}
          </span>
        ))}
      </div>
      <div
        ref={trackRef}
        className={styles.track}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {ticks.map((t) => {
          const tickPct = ((t - min) / (max - min)) * 100;
          return <div key={t} className={styles.tick} style={{ left: `${tickPct}%` }} />;
        })}
        <div
          className={styles.thumb}
          style={{ left: `${pct}%` }}
        >
          <div className={styles.thumbIcon}>🏠</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Style NumberLine**

```css
/* src/components/lesson/exercises/NumberLine.module.css */
.container {
  padding: 0 var(--space-lg);
}

.labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
}

.label {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-secondary);
  min-width: 24px;
  text-align: center;
}

.activeLabel {
  color: var(--blue);
}

.track {
  position: relative;
  height: 8px;
  background: var(--border);
  border-radius: var(--radius-full);
  cursor: pointer;
  touch-action: none;
  margin: var(--space-lg) 0;
}

.tick {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 16px;
  background: var(--text-secondary);
  border-radius: 2px;
}

.thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  transition: left 0.05s;
}

.thumbIcon {
  font-size: var(--text-2xl);
  cursor: grab;
  user-select: none;
}

.thumbIcon:active {
  cursor: grabbing;
}
```

- [ ] **Step 3: Create AnswerOnTheLine component**

```jsx
// src/components/lesson/exercises/AnswerOnTheLine.jsx
import { useState } from 'react';
import NumberLine from './NumberLine';
import styles from './AnswerOnTheLine.module.css';

export default function AnswerOnTheLine({ exercise, onAnswer }) {
  const [min, max] = exercise.numberLineRange || [0, 10];
  const [value, setValue] = useState(min);

  const handleCheck = () => {
    onAnswer(value);
  };

  const parts = exercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Answer on the line'}</p>
      <div className={styles.equation}>
        <span>{parts[0]}</span>
        <span className={styles.blank}>{value}</span>
        <span>{parts[1]}</span>
      </div>
      <div className={styles.lineArea}>
        <NumberLine min={min} max={max} value={value} onChange={setValue} />
      </div>
      <div className={styles.checkArea}>
        <button className={styles.checkButton} onClick={handleCheck}>
          CHECK
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Style AnswerOnTheLine**

```css
/* src/components/lesson/exercises/AnswerOnTheLine.module.css */
.container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.instruction {
  font-size: var(--text-lg);
  font-weight: 700;
  padding: var(--space-md) var(--space-lg);
}

.equation {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--blue);
}

.blank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-md);
  border: 3px solid var(--blue);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-3xl);
}

.lineArea {
  padding: var(--space-xl) 0;
}

.checkArea {
  padding: var(--space-md) var(--space-lg);
  margin-top: auto;
}

.checkButton {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--green);
  color: var(--text-primary);
  font-size: var(--text-base);
  font-weight: 800;
  letter-spacing: 1px;
}

.checkButton:hover {
  background: var(--green-hover);
}
```

- [ ] **Step 5: Register in LessonEngine**

Add to the switch statement in `src/components/lesson/LessonEngine.jsx`:

```jsx
import AnswerOnTheLine from './exercises/AnswerOnTheLine';

// Inside the switch:
case 'number-line': return <AnswerOnTheLine {...props} />;
```

- [ ] **Step 6: Commit**

```bash
git add src/components/lesson/exercises/NumberLine.jsx src/components/lesson/exercises/NumberLine.module.css src/components/lesson/exercises/AnswerOnTheLine.jsx src/components/lesson/exercises/AnswerOnTheLine.module.css src/components/lesson/LessonEngine.jsx
git commit -m "feat: add AnswerOnTheLine exercise with draggable number line"
```

---

## Task 10: Exercise — FollowThePattern

**Files:**
- Create: `src/components/lesson/exercises/FollowThePattern.jsx`, `src/components/lesson/exercises/FollowThePattern.module.css`

- [ ] **Step 1: Create FollowThePattern component**

```jsx
// src/components/lesson/exercises/FollowThePattern.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './FollowThePattern.module.css';

export default function FollowThePattern({ exercise, onAnswer }) {
  const [selected, setSelected] = useState(null);

  const handleCheck = () => {
    if (selected === null) return;
    onAnswer(selected);
  };

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Follow the pattern'}</p>
      <div className={styles.table}>
        {exercise.pattern.map((row, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.cell}>{row.expression}</div>
            <div className={`${styles.cell} ${row.result === null ? styles.blankCell : ''}`}>
              {row.result === null ? '???' : row.result}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.options}>
        {exercise.options.map((opt) => (
          <motion.button
            key={opt}
            className={`${styles.option} ${selected === opt ? styles.selected : ''}`}
            onClick={() => setSelected(opt)}
            whileTap={{ scale: 0.95 }}
          >
            {opt}
          </motion.button>
        ))}
      </div>
      <div className={styles.checkArea}>
        <button
          className={styles.checkButton}
          onClick={handleCheck}
          disabled={selected === null}
        >
          CHECK
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Style FollowThePattern**

```css
/* src/components/lesson/exercises/FollowThePattern.module.css */
.container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.instruction {
  font-size: var(--text-lg);
  font-weight: 700;
  padding: var(--space-md) var(--space-lg);
}

.table {
  margin: var(--space-lg);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.row:not(:last-child) {
  border-bottom: 1px solid var(--border);
}

.cell {
  padding: var(--space-md) var(--space-lg);
  font-size: var(--text-xl);
  font-weight: 800;
  text-align: center;
  color: var(--blue);
}

.cell:first-child {
  border-right: 1px solid var(--border);
}

.blankCell {
  background: rgba(28, 176, 246, 0.1);
  color: var(--blue);
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  padding: 0 var(--space-lg);
  flex: 1;
  align-content: start;
}

.option {
  padding: var(--space-xl) var(--space-lg);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-2xl);
  font-weight: 800;
  text-align: center;
  transition: border-color 0.2s;
}

.option:hover {
  border-color: var(--text-secondary);
}

.selected {
  border-color: var(--green);
  background: rgba(88, 204, 2, 0.1);
}

.checkArea {
  padding: var(--space-md) var(--space-lg);
  margin-top: auto;
}

.checkButton {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--border);
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: 800;
  letter-spacing: 1px;
}

.checkButton:not(:disabled) {
  background: var(--green);
  color: var(--text-primary);
}
```

- [ ] **Step 3: Register in LessonEngine**

Add to the switch in `src/components/lesson/LessonEngine.jsx`:

```jsx
import FollowThePattern from './exercises/FollowThePattern';

// Inside the switch:
case 'follow-pattern': return <FollowThePattern {...props} />;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/lesson/exercises/FollowThePattern.jsx src/components/lesson/exercises/FollowThePattern.module.css src/components/lesson/LessonEngine.jsx
git commit -m "feat: add FollowThePattern exercise component"
```

---

## Task 11: Exercise — HelpCharacter (Word Problem with Mascot)

**Files:**
- Create: `src/components/shared/Mascot.jsx`, `src/components/shared/Mascot.module.css`, `src/components/lesson/exercises/HelpCharacter.jsx`, `src/components/lesson/exercises/HelpCharacter.module.css`

- [ ] **Step 1: Create Mascot component (placeholder SVG)**

```jsx
// src/components/shared/Mascot.jsx
import styles from './Mascot.module.css';

const EXPRESSIONS = {
  happy: { mouth: 'M 25 65 Q 40 80 55 65', eyes: 'open', brows: 'neutral' },
  thinking: { mouth: 'M 30 65 L 50 65', eyes: 'look-up', brows: 'raised' },
  celebrating: { mouth: 'M 20 60 Q 40 85 60 60', eyes: 'closed', brows: 'neutral' },
  sad: { mouth: 'M 25 72 Q 40 60 55 72', eyes: 'open', brows: 'sad' },
};

export default function Mascot({ expression = 'happy', size = 120 }) {
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.happy;

  return (
    <svg
      className={styles.mascot}
      width={size}
      height={size}
      viewBox="0 0 80 90"
      fill="none"
    >
      {/* Body */}
      <ellipse cx="40" cy="55" rx="28" ry="30" fill="#E8943A" />
      {/* Belly */}
      <ellipse cx="40" cy="60" rx="18" ry="20" fill="#F5C882" />
      {/* Head */}
      <circle cx="40" cy="35" r="22" fill="#E8943A" />
      {/* Ears */}
      <ellipse cx="22" cy="15" rx="8" ry="14" fill="#E8943A" transform="rotate(-15 22 15)" />
      <ellipse cx="22" cy="15" rx="5" ry="10" fill="#D4762A" transform="rotate(-15 22 15)" />
      <ellipse cx="58" cy="15" rx="8" ry="14" fill="#E8943A" transform="rotate(15 58 15)" />
      <ellipse cx="58" cy="15" rx="5" ry="10" fill="#D4762A" transform="rotate(15 58 15)" />
      {/* Nose */}
      <ellipse cx="40" cy="42" rx="6" ry="4" fill="#2a1a0a" />
      {/* Snout */}
      <ellipse cx="40" cy="46" rx="12" ry="8" fill="#F5C882" />
      {/* Eyes */}
      {expr.eyes === 'open' && (
        <>
          <circle cx="32" cy="32" r="4" fill="#2a1a0a" />
          <circle cx="48" cy="32" r="4" fill="#2a1a0a" />
          <circle cx="33" cy="31" r="1.5" fill="white" />
          <circle cx="49" cy="31" r="1.5" fill="white" />
        </>
      )}
      {expr.eyes === 'closed' && (
        <>
          <path d="M 28 32 Q 32 28 36 32" stroke="#2a1a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 44 32 Q 48 28 52 32" stroke="#2a1a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {expr.eyes === 'look-up' && (
        <>
          <circle cx="32" cy="30" r="4" fill="#2a1a0a" />
          <circle cx="48" cy="30" r="4" fill="#2a1a0a" />
          <circle cx="33" cy="29" r="1.5" fill="white" />
          <circle cx="49" cy="29" r="1.5" fill="white" />
        </>
      )}
      {/* Mouth */}
      <path d={expr.mouth} stroke="#2a1a0a" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
```

```css
/* src/components/shared/Mascot.module.css */
.mascot {
  display: block;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}
```

- [ ] **Step 2: Create HelpCharacter exercise**

```jsx
// src/components/lesson/exercises/HelpCharacter.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import Mascot from '../../shared/Mascot';
import styles from './HelpCharacter.module.css';

const VISUAL_AIDS = {
  ruler: (options) => options.map((opt, i) => (
    <div key={i} className={styles.rulerContainer}>
      <div className={styles.ruler} style={{ width: `${Math.min(opt * 10, 100)}%` }}>
        <span className={styles.rulerLabel}>{opt} in</span>
      </div>
    </div>
  )),
  shapes: (options) => options.map((opt, i) => (
    <div key={i} className={styles.shapeCard}>{opt}</div>
  )),
  coins: (options) => options.map((opt, i) => (
    <div key={i} className={styles.coinCard}>{opt}</div>
  )),
  blocks: (options) => options.map((opt, i) => (
    <div key={i} className={styles.blockCard}>{opt}</div>
  )),
};

export default function HelpCharacter({ exercise, onAnswer }) {
  const [selected, setSelected] = useState(null);

  const handleCheck = () => {
    if (selected === null) return;
    onAnswer(selected);
  };

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Help Dingo!'}</p>
      <div className={styles.mascotArea}>
        <Mascot expression="thinking" size={100} />
        <div className={styles.speechBubble}>
          <p className={styles.problem}>{exercise.wordProblem}</p>
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.options}>
        {exercise.options.map((opt) => (
          <motion.button
            key={opt}
            className={`${styles.option} ${selected === opt ? styles.selected : ''}`}
            onClick={() => setSelected(opt)}
            whileTap={{ scale: 0.95 }}
          >
            {exercise.visualAid === 'ruler' ? (
              <div className={styles.rulerInOption}>
                <div className={styles.rulerBar} style={{ width: `${Math.min(opt * 8, 100)}%` }}>
                  <div className={styles.rulerTicks} />
                </div>
                <span className={styles.rulerValue}>{opt} in</span>
              </div>
            ) : (
              <span className={styles.optionValue}>{opt}</span>
            )}
          </motion.button>
        ))}
      </div>
      <div className={styles.checkArea}>
        <button
          className={styles.checkButton}
          onClick={handleCheck}
          disabled={selected === null}
        >
          CHECK
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Style HelpCharacter**

```css
/* src/components/lesson/exercises/HelpCharacter.module.css */
.container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.instruction {
  font-size: var(--text-lg);
  font-weight: 700;
  padding: var(--space-md) var(--space-lg);
}

.mascotArea {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: 0 var(--space-lg);
}

.speechBubble {
  flex: 1;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  position: relative;
}

.problem {
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.5;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-lg) 0;
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  padding: 0 var(--space-lg);
  flex: 1;
  align-content: start;
}

.option {
  padding: var(--space-xl) var(--space-md);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  transition: border-color 0.2s;
}

.option:hover {
  border-color: var(--text-secondary);
}

.selected {
  border-color: var(--blue);
  background: rgba(28, 176, 246, 0.1);
}

.optionValue {
  font-size: var(--text-2xl);
  font-weight: 800;
}

.rulerInOption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
}

.rulerBar {
  height: 24px;
  background: var(--yellow);
  border-radius: var(--radius-sm);
  min-width: 40px;
}

.rulerValue {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--yellow);
}

.checkArea {
  padding: var(--space-md) var(--space-lg);
  margin-top: auto;
}

.checkButton {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--border);
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: 800;
  letter-spacing: 1px;
}

.checkButton:not(:disabled) {
  background: var(--green);
  color: var(--text-primary);
}
```

- [ ] **Step 4: Register in LessonEngine**

Add to the switch in `src/components/lesson/LessonEngine.jsx`:

```jsx
import HelpCharacter from './exercises/HelpCharacter';

// Inside the switch:
case 'help-character': return <HelpCharacter {...props} />;
```

- [ ] **Step 5: Test all 5 exercise types**

Add test exercises to `src/data/math/lessons/addition-1.js` covering all types:

```js
// src/data/math/lessons/addition-1.js
const lessons = [
  {
    id: 'math-addition-1-lesson-1',
    unitId: 'math-addition-1',
    order: 1,
    exercises: [
      {
        type: 'select-answer',
        equation: '1 + 1 = []',
        correctAnswer: 2,
        options: [0, 2, 5],
        instruction: 'Select the answer',
      },
      {
        type: 'type-answer',
        equation: '[] = 1 + 0',
        correctAnswer: 1,
        instruction: 'Type the answer',
      },
      {
        type: 'number-line',
        equation: '6 + 2 = []',
        correctAnswer: 8,
        numberLineRange: [0, 10],
        instruction: 'Answer on the line',
      },
      {
        type: 'follow-pattern',
        equation: '5 + 2 = []',
        correctAnswer: 7,
        options: [7, 4],
        pattern: [
          { expression: '3 + 2', result: 5 },
          { expression: '4 + 2', result: 6 },
          { expression: '5 + 2', result: null },
        ],
        instruction: 'Follow the pattern',
      },
      {
        type: 'help-character',
        equation: '10 + 3 = []',
        correctAnswer: 13,
        options: [7, 13],
        wordProblem: "What's 3 in longer than 10 in?",
        visualAid: 'ruler',
        instruction: 'Help Dingo!',
      },
      {
        type: 'select-answer',
        equation: '2 + 3 = []',
        correctAnswer: 5,
        options: [4, 5, 6],
      },
    ],
  },
];

export default lessons;
```

Navigate to `http://localhost:5173/lesson/math-addition-1-lesson-1` and play through all exercise types.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/Mascot.jsx src/components/shared/Mascot.module.css src/components/lesson/exercises/HelpCharacter.jsx src/components/lesson/exercises/HelpCharacter.module.css src/components/lesson/LessonEngine.jsx src/data/lessons/addition-1.js
git commit -m "feat: add HelpCharacter exercise with mascot, complete all 5 exercise types"
```

---

## Task 12: Tab Bar + Layout Shell

**Files:**
- Create: `src/components/layout/TabBar.jsx`, `src/components/layout/TabBar.module.css`, `src/components/layout/AppLayout.jsx`

- [ ] **Step 1: Create TabBar component**

```jsx
// src/components/layout/TabBar.jsx
import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';

export default function TabBar() {
  return (
    <nav className={styles.tabBar}>
      <NavLink
        to="/"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        end
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
        </svg>
        <span>Learn</span>
      </NavLink>
      <NavLink
        to="/progress"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Progress</span>
      </NavLink>
    </nav>
  );
}
```

- [ ] **Step 2: Style TabBar**

```css
/* src/components/layout/TabBar.module.css */
.tabBar {
  display: flex;
  border-top: 1px solid var(--border);
  background: var(--bg);
  padding: var(--space-sm) 0 calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--text-xs);
  font-weight: 700;
  transition: color 0.2s;
}

.tab:hover {
  color: var(--text-primary);
}

.active {
  color: var(--blue);
}
```

- [ ] **Step 3: Create AppLayout wrapper**

```jsx
// src/components/layout/AppLayout.jsx
import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

export default function AppLayout() {
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '72px' }}>
        <Outlet />
      </div>
      <TabBar />
    </>
  );
}
```

- [ ] **Step 4: Update App.jsx to use layout**

```jsx
// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useGameStore from './stores/useGameStore';
import { seedDatabase } from './db/seed';
import Onboarding from './components/onboarding/Onboarding';
import AppLayout from './components/layout/AppLayout';
import LessonEngine from './components/lesson/LessonEngine';

export default function App() {
  const { user, isLoaded, loadUser } = useGameStore();

  useEffect(() => {
    seedDatabase().then(() => loadUser());
  }, [loadUser]);

  if (!isLoaded) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div style={{ padding: '24px' }}>Welcome back, {user.name}!</div>} />
            <Route path="/progress" element={<div style={{ padding: '24px' }}>Progress screen coming soon</div>} />
          </Route>
          <Route path="/lesson/:id" element={<LessonEngine />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Test navigation**

```bash
npm run dev
```

Should see bottom tab bar with Learn and Progress tabs. Lesson screen should NOT show the tab bar.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/App.jsx
git commit -m "feat: add TabBar navigation and AppLayout with 2 tabs"
```

---

## Task 13: Learning Path (Home Screen)

**Files:**
- Create: `src/components/home/LearningPath.jsx`, `src/components/home/LearningPath.module.css`, `src/components/home/LessonNode.jsx`, `src/components/home/LessonNode.module.css`, `src/components/home/UnitHeader.jsx`

- [ ] **Step 1: Create UnitHeader component**

```jsx
// src/components/home/UnitHeader.jsx
export default function UnitHeader({ unit, isComplete }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)',
      padding: 'var(--space-lg) var(--space-lg) var(--space-sm)',
    }}>
      <span style={{ fontSize: 'var(--text-2xl)' }}>{unit.iconEmoji}</span>
      <div>
        <h2 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 800,
          color: isComplete ? 'var(--green)' : 'var(--text-primary)',
        }}>
          {unit.title}
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {unit.description}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LessonNode component**

```jsx
// src/components/home/LessonNode.jsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './LessonNode.module.css';

export default function LessonNode({ lesson, status, stars }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (status === 'locked') return;
    navigate(`/lesson/${lesson.id}`);
  };

  return (
    <motion.button
      className={`${styles.node} ${styles[status]}`}
      onClick={handleClick}
      whileTap={status !== 'locked' ? { scale: 0.9 } : {}}
      disabled={status === 'locked'}
    >
      <span className={styles.number}>{lesson.order}</span>
      {status === 'completed' && (
        <div className={styles.stars}>
          {'⭐'.repeat(stars || 1)}
        </div>
      )}
      {status === 'current' && (
        <motion.div
          className={styles.pulse}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
    </motion.button>
  );
}
```

```css
/* src/components/home/LessonNode.module.css */
.node {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-weight: 900;
  transition: transform 0.2s;
}

.completed {
  background: var(--green);
  color: white;
  border: 3px solid var(--green-hover);
}

.current {
  background: var(--blue);
  color: white;
  border: 3px solid #0e8fd4;
  box-shadow: 0 0 20px rgba(28, 176, 246, 0.4);
}

.locked {
  background: var(--border);
  color: var(--text-secondary);
  border: 3px solid var(--border);
  cursor: not-allowed;
  opacity: 0.5;
}

.number {
  font-size: var(--text-lg);
}

.stars {
  position: absolute;
  bottom: -8px;
  font-size: 10px;
  letter-spacing: -2px;
}

.pulse {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid var(--blue);
}
```

- [ ] **Step 3: Create LearningPath component**

```jsx
// src/components/home/LearningPath.jsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import UnitHeader from './UnitHeader';
import LessonNode from './LessonNode';
import HeartDisplay from '../shared/HeartDisplay';
import styles from './LearningPath.module.css';

export default function LearningPath() {
  const user = useGameStore((s) => s.user);
  const courseId = user?.activeCourseId || 'math';
  const units = useLiveQuery(() => db.units.where('courseId').equals(courseId).sortBy('order'), [courseId]);
  const lessons = useLiveQuery(() => db.lessons.orderBy('order').toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  if (!units || !lessons || !progress) return null;

  const progressMap = {};
  progress.forEach((p) => { progressMap[p.lessonId] = p; });

  // Find current unit (first unit with incomplete lessons)
  let foundIncomplete = false;
  const unitData = units.map((unit) => {
    const unitLessons = lessons.filter((l) => l.unitId === unit.id).sort((a, b) => a.order - b.order);
    const allComplete = unitLessons.every((l) => progressMap[l.id]?.completed);
    const isCurrentUnit = !allComplete && !foundIncomplete;
    if (isCurrentUnit) foundIncomplete = true;
    return { unit, lessons: unitLessons, allComplete, isCurrentUnit };
  });

  // Show: completed units as collapsed badges, current unit expanded, next unit as preview
  const currentIndex = unitData.findIndex((u) => u.isCurrentUnit);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Hi {user?.name}!</h1>
          <div className={styles.streakBadge}>🔥 {user?.currentStreak || 0} day streak</div>
        </div>
        <div className={styles.headerRight}>
          <HeartDisplay />
          <button
            className={styles.gearBtn}
            onClick={() => window.dispatchEvent(new Event('open-settings'))}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Daily goal ring */}
      <div className={styles.dailyGoal}>
        <div className={styles.goalRing}>
          <svg viewBox="0 0 36 36" className={styles.goalSvg}>
            <path
              className={styles.goalTrack}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={styles.goalFill}
              strokeDasharray={`${Math.min(100, ((user?.dailyXpDate === new Date().toISOString().split('T')[0] ? user?.dailyXpEarned : 0) / (user?.dailyGoal || 20)) * 100)}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className={styles.goalXp}>⚡ {user?.dailyXpDate === new Date().toISOString().split('T')[0] ? user?.dailyXpEarned : 0}/{user?.dailyGoal || 20}</span>
        </div>
      </div>

      {/* Completed units - collapsed */}
      {unitData.slice(0, Math.max(0, currentIndex)).map(({ unit }) => (
        <div key={unit.id} className={styles.completedBadge}>
          <span>{unit.iconEmoji}</span>
          <span className={styles.completedText}>{unit.title}</span>
          <span className={styles.checkmark}>✅</span>
        </div>
      ))}

      {/* Current unit - expanded */}
      {currentIndex >= 0 && (
        <div>
          <UnitHeader unit={unitData[currentIndex].unit} />
          <div className={styles.nodeTrail}>
            {unitData[currentIndex].lessons.map((lesson, i) => {
              const prog = progressMap[lesson.id];
              let status = 'locked';
              if (prog?.completed) {
                status = 'completed';
              } else if (i === 0 || progressMap[unitData[currentIndex].lessons[i - 1]?.id]?.completed) {
                status = 'current';
              }
              // Only first non-completed is "current", rest are locked
              if (status === 'current') {
                const alreadyHasCurrent = unitData[currentIndex].lessons.slice(0, i).some(
                  (l) => !progressMap[l.id]?.completed && (i === 0 || progressMap[unitData[currentIndex].lessons[i - 1]?.id]?.completed)
                );
                // Simpler: first lesson without progress where previous is done
              }
              return (
                <LessonNode
                  key={lesson.id}
                  lesson={lesson}
                  status={status}
                  stars={prog?.stars}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Next unit preview */}
      {currentIndex >= 0 && currentIndex + 1 < unitData.length && (
        <div className={styles.nextPreview}>
          <span className={styles.nextLabel}>Up next</span>
          <span>{unitData[currentIndex + 1].unit.iconEmoji} {unitData[currentIndex + 1].unit.title}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Style LearningPath**

```css
/* src/components/home/LearningPath.module.css */
.container {
  padding: var(--space-md);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-lg);
}

.greeting {
  font-size: var(--text-xl);
  font-weight: 900;
}

.streakBadge {
  font-size: var(--text-sm);
  color: var(--orange);
  font-weight: 700;
  margin-top: var(--space-xs);
}

.headerRight {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.gearBtn {
  background: none;
  font-size: var(--text-lg);
  padding: var(--space-xs);
}

.dailyGoal {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-lg);
}

.goalRing {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.goalSvg {
  width: 80px;
  height: 80px;
  transform: rotate(-90deg);
}

.goalTrack {
  fill: none;
  stroke: var(--border);
  stroke-width: 3;
}

.goalFill {
  fill: none;
  stroke: var(--yellow);
  stroke-width: 3;
  stroke-linecap: round;
}

.goalXp {
  position: absolute;
  font-size: var(--text-xs);
  font-weight: 800;
  color: var(--yellow);
  white-space: nowrap;
}

.completedBadge {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-sm);
}

.completedText {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-secondary);
}

.checkmark {
  font-size: var(--text-sm);
}

.nodeTrail {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-lg) 0;
}

.nextPreview {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 700;
}

.nextLabel {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
}
```

- [ ] **Step 5: Wire into App.jsx**

Replace the home route placeholder in `src/App.jsx`:

```jsx
import LearningPath from './components/home/LearningPath';

// In the routes:
<Route path="/" element={<LearningPath />} />
```

- [ ] **Step 6: Test home screen**

```bash
npm run dev
```

Should see: greeting, streak, hearts, daily goal ring, current unit with lesson nodes. First node should pulse blue. Tapping it should navigate to the lesson.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/ src/App.jsx
git commit -m "feat: add Learning Path home screen with unit headers and lesson nodes"
```

---

## Task 14: Progress / Rewards Screen

**Files:**
- Create: `src/components/progress/ProgressScreen.jsx`, `src/components/progress/ProgressScreen.module.css`, `src/components/progress/StreakCalendar.jsx`, `src/components/progress/UnitBadges.jsx`

- [ ] **Step 1: Create StreakCalendar component**

```jsx
// src/components/progress/StreakCalendar.jsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import styles from './ProgressScreen.module.css';

export default function StreakCalendar() {
  const history = useLiveQuery(() => db.streakHistory.toArray(), []);
  const dates = new Set((history || []).map((h) => h.date));

  // Show last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en', { weekday: 'short' });
    days.push({ date: dateStr, day: dayName, active: dates.has(dateStr) });
  }

  return (
    <div className={styles.calendar}>
      {days.map((d) => (
        <div key={d.date} className={`${styles.calDay} ${d.active ? styles.calActive : ''}`}>
          <span className={styles.calDayName}>{d.day}</span>
          <div className={styles.calDot}>{d.active ? '🔥' : '○'}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create UnitBadges component**

```jsx
// src/components/progress/UnitBadges.jsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import styles from './ProgressScreen.module.css';

export default function UnitBadges() {
  const units = useLiveQuery(() => db.units.orderBy('order').toArray(), []);
  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  if (!units || !lessons || !progress) return null;

  const progressMap = {};
  progress.forEach((p) => { progressMap[p.lessonId] = p; });

  return (
    <div className={styles.badges}>
      {units.map((unit) => {
        const unitLessons = lessons.filter((l) => l.unitId === unit.id);
        const completed = unitLessons.filter((l) => progressMap[l.id]?.completed).length;
        const total = unitLessons.length;
        const allDone = completed === total && total > 0;
        const avgStars = allDone
          ? Math.round(unitLessons.reduce((sum, l) => sum + (progressMap[l.id]?.stars || 0), 0) / total)
          : 0;

        return (
          <div key={unit.id} className={`${styles.badge} ${allDone ? styles.badgeDone : ''}`}>
            <span className={styles.badgeEmoji}>{unit.iconEmoji}</span>
            <span className={styles.badgeTitle}>{unit.title}</span>
            <span className={styles.badgeProgress}>
              {allDone ? '⭐'.repeat(avgStars) : `${completed}/${total}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create ProgressScreen component**

```jsx
// src/components/progress/ProgressScreen.jsx
import useGameStore from '../../stores/useGameStore';
import StreakCalendar from './StreakCalendar';
import UnitBadges from './UnitBadges';
import HeartDisplay from '../shared/HeartDisplay';
import styles from './ProgressScreen.module.css';

export default function ProgressScreen() {
  const user = useGameStore((s) => s.user);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Progress</h1>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>⚡ {user?.totalXp || 0}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>🔥 {user?.currentStreak || 0}</span>
          <span className={styles.statLabel}>Day streak</span>
        </div>
        <div className={styles.statCard}>
          <HeartDisplay />
          <span className={styles.statLabel}>Hearts</span>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>This Week</h2>
      <StreakCalendar />

      <h2 className={styles.sectionTitle}>Units</h2>
      <UnitBadges />
    </div>
  );
}
```

- [ ] **Step 4: Style ProgressScreen**

```css
/* src/components/progress/ProgressScreen.module.css */
.container {
  padding: var(--space-lg);
}

.title {
  font-size: var(--text-xl);
  font-weight: 900;
  margin-bottom: var(--space-lg);
}

.statsRow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.statCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-md);
}

.statValue {
  font-size: var(--text-lg);
  font-weight: 900;
}

.statLabel {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 700;
}

.sectionTitle {
  font-size: var(--text-base);
  font-weight: 800;
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: var(--text-sm);
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-xs);
  margin-bottom: var(--space-xl);
}

.calDay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.calDayName {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 700;
}

.calDot {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.calActive .calDot {
  background: rgba(255, 150, 0, 0.2);
}

.badges {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.badge {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
}

.badgeDone {
  border-color: var(--green);
}

.badgeEmoji {
  font-size: var(--text-xl);
}

.badgeTitle {
  flex: 1;
  font-weight: 800;
}

.badgeProgress {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 700;
}
```

- [ ] **Step 5: Wire into App.jsx**

```jsx
import ProgressScreen from './components/progress/ProgressScreen';

// In the routes:
<Route path="/progress" element={<ProgressScreen />} />
```

- [ ] **Step 6: Commit**

```bash
git add src/components/progress/ src/App.jsx
git commit -m "feat: add Progress/Rewards screen with streak calendar and unit badges"
```

---

## Task 15: Settings Panel

**Files:**
- Create: `src/components/settings/SettingsPanel.jsx`, `src/components/settings/SettingsPanel.module.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create SettingsPanel component**

```jsx
// src/components/settings/SettingsPanel.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import styles from './SettingsPanel.module.css';

const DAILY_GOALS = [
  { value: 10, label: 'Casual', desc: '10 XP / day' },
  { value: 20, label: 'Regular', desc: '20 XP / day' },
  { value: 30, label: 'Serious', desc: '30 XP / day' },
  { value: 50, label: 'Intense', desc: '50 XP / day' },
];

const AGE_BANDS = [
  { value: '6-7', label: 'Starter' },
  { value: '8-10', label: 'Explorer' },
  { value: '11-12', label: 'Challenger' },
];

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const user = useGameStore((s) => s.user);
  const updateSettings = useGameStore((s) => s.updateSettings);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  if (!user) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Settings</h2>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Daily Goal</h3>
              <div className={styles.options}>
                {DAILY_GOALS.map((g) => (
                  <button
                    key={g.value}
                    className={`${styles.option} ${user.dailyGoal === g.value ? styles.selected : ''}`}
                    onClick={() => updateSettings({ dailyGoal: g.value })}
                  >
                    <span className={styles.optLabel}>{g.label}</span>
                    <span className={styles.optDesc}>{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Starting Level</h3>
              <div className={styles.options}>
                {AGE_BANDS.map((b) => (
                  <button
                    key={b.value}
                    className={`${styles.option} ${user.ageBand === b.value ? styles.selected : ''}`}
                    onClick={() => updateSettings({ ageBand: b.value })}
                  >
                    <span className={styles.optLabel}>{b.label}</span>
                    <span className={styles.optDesc}>{b.value}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Sound</h3>
              <button
                className={`${styles.toggle} ${user.soundEnabled ? styles.toggleOn : ''}`}
                onClick={() => updateSettings({ soundEnabled: !user.soundEnabled })}
              >
                {user.soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Style SettingsPanel**

```css
/* src/components/settings/SettingsPanel.module.css */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 300;
}

.panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  max-width: 90vw;
  background: var(--bg);
  border-left: 1px solid var(--border);
  z-index: 301;
  overflow-y: auto;
  padding: var(--space-lg);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.title {
  font-size: var(--text-xl);
  font-weight: 900;
}

.closeBtn {
  background: none;
  color: var(--text-secondary);
  font-size: var(--text-xl);
  padding: var(--space-xs);
}

.section {
  margin-bottom: var(--space-xl);
}

.sectionTitle {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--space-md);
}

.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.option:hover {
  border-color: var(--text-secondary);
}

.selected {
  border-color: var(--blue);
  background: rgba(28, 176, 246, 0.1);
}

.optLabel {
  font-weight: 800;
}

.optDesc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.toggle {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-full);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-weight: 800;
  font-size: var(--text-sm);
}

.toggleOn {
  border-color: var(--green);
  color: var(--green);
  background: rgba(88, 204, 2, 0.1);
}
```

- [ ] **Step 3: Add SettingsPanel to App.jsx**

Add `<SettingsPanel />` inside the `BrowserRouter` in `App.jsx`, alongside the `Routes`:

```jsx
import SettingsPanel from './components/settings/SettingsPanel';

// Inside the BrowserRouter:
<SettingsPanel />
```

- [ ] **Step 4: Test settings**

Click the gear icon on the home screen. Settings panel should slide in from the right. Change daily goal, age band, sound toggle. Close by clicking backdrop or X.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ src/App.jsx
git commit -m "feat: add Settings slide-over panel with daily goal, age band, and sound toggle"
```

---

## Task 16: Confetti Celebration Component

**Files:**
- Create: `src/components/shared/Confetti.jsx`, `src/components/shared/Confetti.module.css`

- [ ] **Step 1: Create Confetti component**

```jsx
// src/components/shared/Confetti.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Confetti.module.css';

const COLORS = ['#58cc02', '#1cb0f6', '#ffc800', '#ff86d0', '#ff9600', '#ffd900'];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function Confetti({ active }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const ps = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: randomBetween(10, 90),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: randomBetween(0, 0.3),
      duration: randomBetween(1.5, 2.5),
      size: randomBetween(6, 12),
      rotation: randomBetween(0, 360),
    }));
    setParticles(ps);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <div className={styles.container}>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className={styles.particle}
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{ y: '100vh', opacity: 0, rotate: p.rotation }}
              transition={{ delay: p.delay, duration: p.duration, ease: 'easeIn' }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
```

```css
/* src/components/shared/Confetti.module.css */
.container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 500;
  overflow: hidden;
}

.particle {
  position: absolute;
  top: 0;
}
```

- [ ] **Step 2: Add confetti to LessonSummary**

Update `src/components/lesson/LessonSummary.jsx` to include confetti:

```jsx
import Confetti from '../shared/Confetti';

// Inside the component, add at the top of the return:
<Confetti active={true} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Confetti.jsx src/components/shared/Confetti.module.css src/components/lesson/LessonSummary.jsx
git commit -m "feat: add confetti celebration on lesson completion"
```

---

## Task 17-21: Content — All 10 Units of Exercise Data

**Files:**
- Modify: `src/data/math/units.js`
- Create: `src/data/math/lessons/addition-2.js`, `src/data/math/lessons/subtraction-1.js`, `src/data/math/lessons/subtraction-2.js`, `src/data/math/lessons/multiplication-1.js`, `src/data/math/lessons/multiplication-2.js`, `src/data/math/lessons/division-1.js`, `src/data/math/lessons/division-2.js`, `src/data/math/lessons/geometry-1.js`, `src/data/math/lessons/geometry-2.js`

These tasks are repetitive content creation. Each follows the same pattern:

- [ ] **Step 1: Update units.js with all 10 units**

```js
// src/data/math/units.js
const units = [
  { id: 'math-addition-1', courseId: 'math', title: 'Addition 1', topic: 'addition', order: 1, iconEmoji: '➕', description: 'Adding numbers 0-10' },
  { id: 'math-addition-2', courseId: 'math', title: 'Addition 2', topic: 'addition', order: 2, iconEmoji: '➕', description: 'Adding numbers 10-50' },
  { id: 'math-subtraction-1', courseId: 'math', title: 'Subtraction 1', topic: 'subtraction', order: 3, iconEmoji: '➖', description: 'Subtracting numbers 0-10' },
  { id: 'math-subtraction-2', courseId: 'math', title: 'Subtraction 2', topic: 'subtraction', order: 4, iconEmoji: '➖', description: 'Subtracting numbers 10-50' },
  { id: 'math-multiplication-1', courseId: 'math', title: 'Multiplication 1', topic: 'multiplication', order: 5, iconEmoji: '✖️', description: 'Times tables 1-5' },
  { id: 'math-multiplication-2', courseId: 'math', title: 'Multiplication 2', topic: 'multiplication', order: 6, iconEmoji: '✖️', description: 'Times tables 6-10' },
  { id: 'math-division-1', courseId: 'math', title: 'Division 1', topic: 'division', order: 7, iconEmoji: '➗', description: 'Basic division' },
  { id: 'math-division-2', courseId: 'math', title: 'Division 2', topic: 'division', order: 8, iconEmoji: '➗', description: 'Division with remainders' },
  { id: 'math-geometry-1', courseId: 'math', title: 'Geometry 1', topic: 'geometry', order: 9, iconEmoji: '📐', description: 'Shapes and properties' },
  { id: 'math-geometry-2', courseId: 'math', title: 'Geometry 2', topic: 'geometry', order: 10, iconEmoji: '📐', description: 'Area and perimeter' },
];

export default units;
```

- [ ] **Step 2: Create each lesson data file**

Each file follows this pattern (showing `addition-2.js` as example — all others follow the same structure with topic-appropriate exercises). Each unit has 5 lessons, each with 12 exercises covering all 5 types:

```js
// src/data/math/lessons/addition-2.js
const lessons = [
  {
    id: 'math-addition-2-lesson-1',
    unitId: 'math-addition-2',
    order: 1,
    exercises: [
      { type: 'select-answer', equation: '12 + 5 = []', correctAnswer: 17, options: [15, 17, 19] },
      { type: 'type-answer', equation: '[] = 10 + 8', correctAnswer: 18 },
      { type: 'number-line', equation: '15 + 3 = []', correctAnswer: 18, numberLineRange: [10, 20] },
      { type: 'follow-pattern', equation: '14 + 3 = []', correctAnswer: 17, options: [17, 15], pattern: [
        { expression: '12 + 3', result: 15 },
        { expression: '13 + 3', result: 16 },
        { expression: '14 + 3', result: null },
      ]},
      { type: 'select-answer', equation: '20 + 10 = []', correctAnswer: 30, options: [25, 30, 35] },
      { type: 'type-answer', equation: '[] = 11 + 7', correctAnswer: 18 },
      { type: 'help-character', equation: '15 + 5 = []', correctAnswer: 20, options: [15, 20], wordProblem: 'Dingo has 15 apples and finds 5 more. How many total?', visualAid: 'blocks' },
      { type: 'select-answer', equation: '25 + 13 = []', correctAnswer: 38, options: [35, 38, 40] },
      { type: 'number-line', equation: '10 + 6 = []', correctAnswer: 16, numberLineRange: [10, 20] },
      { type: 'type-answer', equation: '[] = 22 + 14', correctAnswer: 36 },
      { type: 'select-answer', equation: '30 + 19 = []', correctAnswer: 49, options: [47, 49, 51] },
      { type: 'follow-pattern', equation: '23 + 5 = []', correctAnswer: 28, options: [28, 26], pattern: [
        { expression: '21 + 5', result: 26 },
        { expression: '22 + 5', result: 27 },
        { expression: '23 + 5', result: null },
      ]},
    ],
  },
  // ... lessons 2-5 follow the same structure with different numbers
  // The implementing agent should generate 4 more lessons for this unit
];

export default lessons;
```

**For each of the 9 remaining unit files**, the implementing agent should:
1. Create 5 lessons with 12 exercises each
2. Mix all 5 exercise types
3. Use topic-appropriate number ranges and word problems
4. Ensure `correctAnswer` is actually correct
5. Ensure `options` always include the correct answer plus plausible distractors

- [ ] **Step 3: Update addition-1.js with full 5 lessons**

Expand the existing `src/data/math/lessons/addition-1.js` from 1 lesson to 5 lessons, each with 12 exercises.

- [ ] **Step 4: Verify all data loads**

```bash
npm run dev
```

Check browser console for errors. The learning path should now show 10 units. Navigate through lessons to verify exercises render correctly.

- [ ] **Step 5: Commit**

```bash
git add src/data/
git commit -m "feat: add all 10 units with 50 lessons and ~550 exercises"
```

---

## Task 22: Adaptive Difficulty

**Files:**
- Create: `src/utils/adaptiveDifficulty.js`
- Modify: `src/components/lesson/LessonEngine.jsx`

- [ ] **Step 1: Create adaptive difficulty utility**

```js
// src/utils/adaptiveDifficulty.js
import { db } from '../db/database';

export async function getEffectiveAgeBand(storedBand) {
  const allProgress = await db.progress.where('completed').equals(1).toArray();
  const recent = allProgress
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 10);

  if (recent.length < 5) return storedBand; // Not enough data

  const avgAccuracy = recent.reduce((sum, p) => sum + p.bestAccuracy, 0) / recent.length;

  const bands = ['6-7', '8-10', '11-12'];
  const currentIdx = bands.indexOf(storedBand);

  if (avgAccuracy > 90 && currentIdx < bands.length - 1) {
    return bands[currentIdx + 1]; // Nudge up
  }
  if (avgAccuracy < 50 && currentIdx > 0) {
    return bands[currentIdx - 1]; // Nudge down
  }

  return storedBand;
}
```

- [ ] **Step 2: Integrate into LessonEngine**

In `src/components/lesson/LessonEngine.jsx`, replace the static `ageBand` with adaptive:

```jsx
import { useState, useEffect } from 'react';
import { getEffectiveAgeBand } from '../../utils/adaptiveDifficulty';

// Inside the component, add:
const [effectiveBand, setEffectiveBand] = useState(user?.ageBand || '8-10');

useEffect(() => {
  if (user?.ageBand) {
    getEffectiveAgeBand(user.ageBand).then(setEffectiveBand);
  }
}, [user?.ageBand]);

// Replace ageBand usage:
const maxExercises = effectiveBand === '6-7' ? 6 : effectiveBand === '8-10' ? 9 : 12;
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/adaptiveDifficulty.js src/components/lesson/LessonEngine.jsx
git commit -m "feat: add adaptive difficulty that nudges age band based on recent accuracy"
```

---

## Task 23: Final Integration + Polish

**Files:**
- Modify: `src/App.jsx`, `index.html`

- [ ] **Step 1: Add favicon**

Create a simple SVG favicon at `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#1a2332"/>
  <text x="16" y="22" text-anchor="middle" font-size="18">🐕</text>
</svg>
```

Update `index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 2: Add meta tags for mobile**

Add to `index.html` `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#1a2332">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

- [ ] **Step 3: Verify full app flow end-to-end**

```bash
npm run dev
```

Test the complete flow:
1. Clear IndexedDB (DevTools > Application > IndexedDB > Delete database "LuLinDingo")
2. Refresh — onboarding should appear
3. Enter name, pick age band
4. Home screen: greeting, streak, hearts, daily goal, learning path
5. Tap first lesson node — lesson starts
6. Complete exercises — check feedback banners, XP fly-ups, combo counter
7. Complete lesson — confetti, summary screen
8. Return home — lesson node should be green with stars
9. Check Progress tab — streak calendar, unit badges, XP total
10. Open Settings — change daily goal, age band

- [ ] **Step 4: Build for production**

```bash
npm run build
npm run preview
```

Verify the production build works correctly at the preview URL.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "feat: add favicon, mobile meta tags, and final polish"
git push origin main
```

---

## Task 24: Use frontend-design Skill for Visual Polish

**Files:**
- Multiple component files may be modified for visual improvements

- [ ] **Step 1: Invoke the frontend-design skill**

Use the `/frontend-design` skill to review and polish the entire app's visual quality. Focus areas:
- Home screen learning path layout and visual hierarchy
- Exercise screens — matching the Duolingo dark theme aesthetic from the screenshots
- Feedback banners — animation timing and colors
- Lesson summary — celebration feel
- Overall spacing, shadows, and micro-interactions
- Ensure the app feels "slick and modern" as requested

The skill should review the existing components and make targeted CSS/animation improvements.

- [ ] **Step 2: Commit polish changes**

```bash
git add -A
git commit -m "style: visual polish pass using frontend-design skill"
git push origin main
```
