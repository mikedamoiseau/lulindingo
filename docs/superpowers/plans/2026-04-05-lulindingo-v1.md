# LuLinDingo v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a small, testable Duolingo-style math learning app for kids — 3 units, 3 exercise types, core gamification (XP, hearts, streaks).

**Architecture:** React 18 SPA with Vite. IndexedDB via Dexie.js for persistence. Zustand for runtime state. Framer Motion for animations. No backend.

**Tech Stack:** React 18, Vite, React Router v6, Dexie.js, Zustand, Framer Motion, CSS Modules, Nunito font

**Spec:** `docs/superpowers/specs/2026-04-05-lulindingo-math-app-design.md`

---

## Milestones

1. **Foundation** (Tasks 1-3): Scaffold, global styles, database + store + utilities
2. **Core Loop** (Tasks 4-7): Onboarding, exercise types, feedback, lesson engine
3. **Screens & Nav** (Tasks 8-11): Tab bar, learning path, progress screen, settings
4. **Content + Polish** (Tasks 12-14): Lesson data, confetti, mascot, final integration

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
npm create vite@latest . -- --template react
```

Accept overwrite prompts for existing files.

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom dexie dexie-react-hooks zustand framer-motion
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server at `http://localhost:5173`

- [ ] **Step 4: Clean up scaffold and add router**

Delete `src/App.css`, `src/assets/`. Replace `src/App.jsx`:

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

- [ ] **Step 5: Verify routing**

Visit `/` — "LuLinDingo - Home". Visit `/progress` — "Progress".

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React project with router and dependencies"
```

---

## Task 2: Global Styles + CSS Variables + Font

**Files:**
- Modify: `index.html`, `src/index.css`

- [ ] **Step 1: Update index.html**

Add to `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#1a2332">
<title>LuLinDingo</title>
```

- [ ] **Step 2: Write global CSS**

```css
/* src/index.css */
:root {
  --bg: #1a2332;
  --surface: #1f2f40;
  --border: #2a3a4a;
  --text-primary: #ffffff;
  --text-secondary: #8899aa;
  --green: #58cc02;
  --green-hover: #4caf00;
  --red: #ff4b4b;
  --blue: #1cb0f6;
  --yellow: #ffc800;
  --pink: #ff86d0;
  --orange: #ff9600;
  --font: 'Nunito', sans-serif;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-3xl: 48px;
  --text-4xl: 64px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --max-width: 480px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root { height: 100%; width: 100%; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
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

button { font-family: var(--font); cursor: pointer; border: none; outline: none; }
input { font-family: var(--font); }
```

- [ ] **Step 3: Commit**

```bash
git add src/index.css index.html
git commit -m "feat: add global styles, CSS variables, and Nunito font"
```

---

## Task 3: Database + Store + Utilities

**Files:**
- Create: `src/db/database.js`, `src/db/seed.js`, `src/stores/useGameStore.js`, `src/utils/xpCalculator.js`, `src/utils/heartManager.js`, `src/utils/streakTracker.js`, `src/data/math/units.js`, `src/data/math/lessons/addition-1.js`

- [ ] **Step 1: Create Dexie database schema**

```js
// src/db/database.js
import Dexie from 'dexie';

export const db = new Dexie('LuLinDingo');

db.version(1).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
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
  const unitCount = await db.units.count();
  if (unitCount > 0) return;

  const { default: units } = await import('../data/math/units.js');
  await db.units.bulkAdd(units);

  const lessonModules = import.meta.glob('../data/math/lessons/*.js');
  for (const path in lessonModules) {
    const mod = await lessonModules[path]();
    await db.lessons.bulkAdd(mod.default);
  }
}
```

- [ ] **Step 3: Create stub data files**

```js
// src/data/math/units.js
const units = [
  { id: 'math-addition-1', moduleId: 'math', title: 'Addition 1', topic: 'addition', order: 1, iconEmoji: '➕', description: 'Adding numbers 0-10' },
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
      { type: 'select-answer', equation: '1 + 1 = []', correctAnswer: 2, options: [0, 2, 5], instruction: 'Select the answer' },
      { type: 'type-answer', equation: '[] = 1 + 0', correctAnswer: 1, instruction: 'Type the answer' },
    ],
  },
];

export default lessons;
```

- [ ] **Step 4: Create XP calculator**

```js
// src/utils/xpCalculator.js
const BASE_XP = 10;
const LESSON_BONUS = 50;

export function calculateXp() {
  return BASE_XP;
}

export function getLessonBonus() {
  return LESSON_BONUS;
}
```

- [ ] **Step 5: Create heart manager**

```js
// src/utils/heartManager.js
const MAX_HEARTS = 5;
const REFILL_INTERVAL_MS = 20 * 60 * 1000;

export function calculateCurrentHearts(hearts, heartsLastRefill) {
  if (hearts >= MAX_HEARTS) return MAX_HEARTS;
  const elapsed = Date.now() - new Date(heartsLastRefill).getTime();
  const refills = Math.floor(elapsed / REFILL_INTERVAL_MS);
  return Math.min(MAX_HEARTS, hearts + refills);
}

export function getNextRefillMs(heartsLastRefill) {
  const elapsed = Date.now() - new Date(heartsLastRefill).getTime();
  return REFILL_INTERVAL_MS - (elapsed % REFILL_INTERVAL_MS);
}

export { MAX_HEARTS, REFILL_INTERVAL_MS };
```

- [ ] **Step 6: Create streak tracker**

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
  if (lastActiveDate === getYesterdayString()) return currentStreak;
  return 0;
}

export function isStreakMilestone(streak) {
  return [7, 30, 100].includes(streak);
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
  user: null,
  isLoaded: false,
  lessonXp: 0,
  lessonCorrect: 0,
  lessonTotal: 0,

  loadUser: async () => {
    const users = await db.users.toArray();
    if (users.length > 0) {
      const user = users[0];
      const hearts = calculateCurrentHearts(user.hearts, user.heartsLastRefill);
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

  createUser: async (name, ageBand) => {
    const id = await db.users.add({
      name,
      totalXp: 0,
      hearts: 5,
      heartsLastRefill: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      ageBand,

      createdAt: new Date(),
    });
    const user = await db.users.get(id);
    set({ user });
  },

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

  addXp: async (amount) => {
    const { user } = get();
    if (!user) return;
    const totalXp = user.totalXp + amount;
    await db.users.update(user.id, { totalXp });
    set({ user: { ...user, totalXp } });
  },

  recordAnswer: (correct) => set((s) => ({
    lessonCorrect: s.lessonCorrect + (correct ? 1 : 0),
    lessonTotal: s.lessonTotal + 1,
  })),

  addLessonXp: (amount) => set((s) => ({ lessonXp: s.lessonXp + amount })),

  resetLesson: () => set({ lessonXp: 0, lessonCorrect: 0, lessonTotal: 0 }),

  updateStreak: async () => {
    const { user } = get();
    if (!user) return;
    const today = getTodayString();
    if (user.lastActiveDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = user.lastActiveDate === yesterday ? user.currentStreak + 1 : 1;
    const longestStreak = Math.max(newStreak, user.longestStreak);
    await db.users.update(user.id, { currentStreak: newStreak, longestStreak, lastActiveDate: today });
    await db.streakHistory.put({ date: today, lessonsCompleted: 0, xpEarned: 0 });
    set({ user: { ...user, currentStreak: newStreak, longestStreak, lastActiveDate: today } });
  },

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
    const today = getTodayString();
    const hist = await db.streakHistory.get(today);
    if (hist) {
      await db.streakHistory.update(today, {
        lessonsCompleted: hist.lessonsCompleted + 1,
        xpEarned: hist.xpEarned + get().lessonXp,
      });
    }
  },

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

Browser console should be clean.

- [ ] **Step 9: Commit**

```bash
git add src/db/ src/stores/ src/utils/ src/data/
git commit -m "feat: add database, store, utilities, and stub data"
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
          <motion.form key="name" className={styles.step}
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            onSubmit={handleNameSubmit}>
            <h1 className={styles.title}>What's your name?</h1>
            <input className={styles.input} type="text" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Enter your name" autoFocus maxLength={20} />
            <button className={styles.button} type="submit" disabled={!name.trim()}>CONTINUE</button>
          </motion.form>
        )}
        {step === 1 && (
          <motion.div key="age" className={styles.step}
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <h1 className={styles.title}>Pick a starting level</h1>
            <p className={styles.subtitle}>You can always change this later</p>
            <div className={styles.bands}>
              {AGE_BANDS.map((band) => (
                <button key={band.value} className={styles.bandCard} onClick={() => handleAgeBand(band.value)}>
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

- [ ] **Step 2: Style onboarding**

```css
/* src/components/onboarding/Onboarding.module.css */
.container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: var(--space-lg); }
.step { width: 100%; display: flex; flex-direction: column; align-items: center; gap: var(--space-lg); }
.title { font-size: var(--text-2xl); font-weight: 800; text-align: center; }
.subtitle { font-size: var(--text-base); color: var(--text-secondary); margin-top: calc(-1 * var(--space-md)); }
.input { width: 100%; padding: var(--space-md) var(--space-lg); border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: var(--text-lg); font-weight: 700; text-align: center; }
.input:focus { border-color: var(--blue); outline: none; }
.input::placeholder { color: var(--text-secondary); font-weight: 400; }
.button { width: 100%; padding: var(--space-md); border-radius: var(--radius-md); background: var(--green); color: var(--text-primary); font-size: var(--text-lg); font-weight: 800; letter-spacing: 1px; transition: background 0.2s; }
.button:hover:not(:disabled) { background: var(--green-hover); }
.button:disabled { opacity: 0.4; cursor: not-allowed; }
.bands { width: 100%; display: flex; flex-direction: column; gap: var(--space-md); }
.bandCard { width: 100%; padding: var(--space-lg); border-radius: var(--radius-lg); border: 2px solid var(--border); background: var(--surface); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-md); transition: border-color 0.2s, transform 0.1s; }
.bandCard:hover { border-color: var(--blue); transform: scale(1.02); }
.bandCard:active { transform: scale(0.98); }
.bandEmoji { font-size: var(--text-2xl); }
.bandLabel { font-size: var(--text-lg); font-weight: 800; flex: 1; text-align: left; }
.bandHint { font-size: var(--text-sm); color: var(--text-secondary); }
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

  if (!isLoaded) return (
    <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>Loading...</div>
    </div>
  );

  if (!user) return <div className="app-shell"><Onboarding /></div>;

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

- [ ] **Step 4: Test onboarding**

Enter name, pick level, refresh — should persist.

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/ src/App.jsx
git commit -m "feat: add onboarding flow with name and starting level"
```

---

## Task 5: Exercise Components (3 types) + NumberPad

**Files:**
- Create: `src/components/lesson/exercises/NumberPad.jsx`, `src/components/lesson/exercises/NumberPad.module.css`, `src/components/lesson/exercises/TypeTheAnswer.jsx`, `src/components/lesson/exercises/TypeTheAnswer.module.css`, `src/components/lesson/exercises/SelectTheAnswer.jsx`, `src/components/lesson/exercises/SelectTheAnswer.module.css`, `src/components/lesson/exercises/FollowThePattern.jsx`, `src/components/lesson/exercises/FollowThePattern.module.css`

- [ ] **Step 1: Create NumberPad**

```jsx
// src/components/lesson/exercises/NumberPad.jsx
import styles from './NumberPad.module.css';

export default function NumberPad({ onDigit, onDelete }) {
  return (
    <div className={styles.pad}>
      {[1,2,3,4,5,6,7,8,9].map((d) => (
        <button key={d} className={styles.key} onClick={() => onDigit(String(d))}>{d}</button>
      ))}
      <div className={styles.bottomRow}>
        <button className={styles.key} onClick={() => onDigit('0')}>0</button>
        <button className={`${styles.key} ${styles.deleteKey}`} onClick={onDelete}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
```

```css
/* src/components/lesson/exercises/NumberPad.module.css */
.pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-sm); padding: var(--space-md); background: var(--bg); border-top: 1px solid var(--border); }
.bottomRow { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
.key { padding: var(--space-md) var(--space-sm); border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: var(--text-xl); font-weight: 800; display: flex; align-items: center; justify-content: center; min-height: 56px; transition: background 0.1s, transform 0.1s; }
.key:active { transform: scale(0.95); background: var(--border); }
.deleteKey { background: var(--surface); }
```

- [ ] **Step 2: Create TypeTheAnswer**

```jsx
// src/components/lesson/exercises/TypeTheAnswer.jsx
import { useState } from 'react';
import NumberPad from './NumberPad';
import styles from './TypeTheAnswer.module.css';

export default function TypeTheAnswer({ exercise, onAnswer }) {
  const [value, setValue] = useState('');
  const handleDigit = (d) => { if (value.length < 4) setValue(value + d); };
  const handleDelete = () => setValue(value.slice(0, -1));
  const handleCheck = () => { if (value !== '') onAnswer(parseInt(value, 10)); };
  const parts = exercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Type the answer'}</p>
      <div className={styles.equation}>
        <span>{parts[0]}</span><span className={styles.blank}>{value || ''}</span><span>{parts[1]}</span>
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputField}>{value || <span className={styles.placeholder}>Example: 2</span>}</div>
        <button className={styles.checkButton} onClick={handleCheck} disabled={value === ''}>CHECK</button>
      </div>
      <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
    </div>
  );
}
```

```css
/* src/components/lesson/exercises/TypeTheAnswer.module.css */
.container { display: flex; flex-direction: column; flex: 1; }
.instruction { font-size: var(--text-lg); font-weight: 700; padding: var(--space-md) var(--space-lg); }
.equation { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-md); font-size: var(--text-3xl); font-weight: 800; color: var(--blue); }
.blank { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: var(--radius-md); border: 3px solid var(--blue); background: var(--surface); color: var(--text-primary); font-size: var(--text-3xl); }
.inputArea { padding: 0 var(--space-lg) var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.inputField { width: 100%; padding: var(--space-md) var(--space-lg); border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: var(--text-lg); font-weight: 700; min-height: 56px; display: flex; align-items: center; }
.placeholder { color: var(--text-secondary); font-weight: 400; }
.checkButton { width: 100%; padding: var(--space-md); border-radius: var(--radius-md); background: var(--border); color: var(--text-secondary); font-size: var(--text-base); font-weight: 800; letter-spacing: 1px; }
.checkButton:not(:disabled) { background: var(--green); color: var(--text-primary); }
```

- [ ] **Step 3: Create SelectTheAnswer**

```jsx
// src/components/lesson/exercises/SelectTheAnswer.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './SelectTheAnswer.module.css';

export default function SelectTheAnswer({ exercise, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const handleCheck = () => { if (selected !== null) onAnswer(selected); };
  const parts = exercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Select the answer'}</p>
      <div className={styles.equation}>
        <span>{parts[0]}</span><span className={styles.blank} /><span>{parts[1]}</span>
      </div>
      <div className={styles.options}>
        {exercise.options.map((opt) => (
          <motion.button key={opt} className={`${styles.option} ${selected === opt ? styles.selected : ''}`}
            onClick={() => setSelected(opt)} whileTap={{ scale: 0.97 }}>{opt}</motion.button>
        ))}
      </div>
      <div className={styles.checkArea}>
        <button className={styles.checkButton} onClick={handleCheck} disabled={selected === null}>CHECK</button>
      </div>
    </div>
  );
}
```

```css
/* src/components/lesson/exercises/SelectTheAnswer.module.css */
.container { display: flex; flex-direction: column; flex: 1; }
.instruction { font-size: var(--text-lg); font-weight: 700; padding: var(--space-md) var(--space-lg); }
.equation { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-md); font-size: var(--text-3xl); font-weight: 800; color: var(--blue); }
.blank { display: inline-block; width: 72px; height: 72px; border-radius: var(--radius-md); border: 3px solid var(--blue); background: var(--surface); }
.options { padding: 0 var(--space-lg); display: flex; flex-direction: column; gap: var(--space-sm); }
.option { width: 100%; padding: var(--space-md) var(--space-lg); border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: var(--text-xl); font-weight: 800; text-align: center; transition: border-color 0.2s; }
.option:hover { border-color: var(--text-secondary); }
.selected { border-color: var(--blue); background: rgba(28, 176, 246, 0.1); }
.checkArea { padding: var(--space-md) var(--space-lg); }
.checkButton { width: 100%; padding: var(--space-md); border-radius: var(--radius-md); background: var(--border); color: var(--text-secondary); font-size: var(--text-base); font-weight: 800; letter-spacing: 1px; }
.checkButton:not(:disabled) { background: var(--green); color: var(--text-primary); }
```

- [ ] **Step 4: Create FollowThePattern**

```jsx
// src/components/lesson/exercises/FollowThePattern.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './FollowThePattern.module.css';

export default function FollowThePattern({ exercise, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const handleCheck = () => { if (selected !== null) onAnswer(selected); };

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
          <motion.button key={opt} className={`${styles.option} ${selected === opt ? styles.selected : ''}`}
            onClick={() => setSelected(opt)} whileTap={{ scale: 0.95 }}>{opt}</motion.button>
        ))}
      </div>
      <div className={styles.checkArea}>
        <button className={styles.checkButton} onClick={handleCheck} disabled={selected === null}>CHECK</button>
      </div>
    </div>
  );
}
```

```css
/* src/components/lesson/exercises/FollowThePattern.module.css */
.container { display: flex; flex-direction: column; flex: 1; }
.instruction { font-size: var(--text-lg); font-weight: 700; padding: var(--space-md) var(--space-lg); }
.table { margin: var(--space-lg); border: 2px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
.row { display: grid; grid-template-columns: 1fr 1fr; }
.row:not(:last-child) { border-bottom: 1px solid var(--border); }
.cell { padding: var(--space-md) var(--space-lg); font-size: var(--text-xl); font-weight: 800; text-align: center; color: var(--blue); }
.cell:first-child { border-right: 1px solid var(--border); }
.blankCell { background: rgba(28, 176, 246, 0.1); }
.options { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); padding: 0 var(--space-lg); flex: 1; align-content: start; }
.option { padding: var(--space-xl) var(--space-lg); border-radius: var(--radius-lg); border: 2px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: var(--text-2xl); font-weight: 800; text-align: center; transition: border-color 0.2s; }
.option:hover { border-color: var(--text-secondary); }
.selected { border-color: var(--green); background: rgba(88, 204, 2, 0.1); }
.checkArea { padding: var(--space-md) var(--space-lg); margin-top: auto; }
.checkButton { width: 100%; padding: var(--space-md); border-radius: var(--radius-md); background: var(--border); color: var(--text-secondary); font-size: var(--text-base); font-weight: 800; letter-spacing: 1px; }
.checkButton:not(:disabled) { background: var(--green); color: var(--text-primary); }
```

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/exercises/
git commit -m "feat: add 3 exercise types - TypeTheAnswer, SelectTheAnswer, FollowThePattern"
```

---

## Task 6: Feedback Banner + Progress Bar + XpFlyUp

**Files:**
- Create: `src/components/lesson/FeedbackBanner.jsx`, `src/components/lesson/FeedbackBanner.module.css`, `src/components/lesson/ProgressBar.jsx`, `src/components/lesson/ProgressBar.module.css`, `src/components/shared/XpFlyUp.jsx`, `src/components/shared/XpFlyUp.module.css`, `src/components/shared/HeartDisplay.jsx`, `src/components/shared/HeartDisplay.module.css`

- [ ] **Step 1: Create FeedbackBanner**

```jsx
// src/components/lesson/FeedbackBanner.jsx
import { motion } from 'framer-motion';
import styles from './FeedbackBanner.module.css';

const ENCOURAGEMENTS = ['Amazing!', 'Great job!', 'Perfect!', 'Brilliant!', 'Keep it up!'];
const randomEncouragement = () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

export default function FeedbackBanner({ isCorrect, correctAnswer, equation, onContinue, isRetry }) {
  if (isRetry) {
    return (
      <motion.div className={`${styles.banner} ${styles.retry}`}
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 20 }}>
        <div className={styles.content}><span className={styles.icon}>🤔</span><span className={styles.message}>Try again!</span></div>
        <button className={`${styles.continueBtn} ${styles.retryBtn}`} onClick={onContinue}>RETRY</button>
      </motion.div>
    );
  }

  return (
    <motion.div className={`${styles.banner} ${isCorrect ? styles.correct : styles.wrong}`}
      initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 20 }}>
      <div className={styles.content}>
        {isCorrect ? (
          <><span className={styles.icon}>✅</span><span className={styles.message}>{randomEncouragement()}</span></>
        ) : (
          <><span className={styles.icon}>💭</span>
            <div className={styles.wrongContent}>
              <span className={styles.message}>The answer is {correctAnswer}</span>
              {equation && <span className={styles.explanation}>{equation.replace('[]', String(correctAnswer))}</span>}
            </div></>
        )}
      </div>
      <button className={`${styles.continueBtn} ${isCorrect ? styles.correctBtn : styles.wrongBtn}`} onClick={onContinue}>CONTINUE</button>
    </motion.div>
  );
}
```

```css
/* src/components/lesson/FeedbackBanner.module.css */
.banner { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); padding: var(--space-lg); border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); z-index: 100; }
.correct { background: #1b3a1b; }
.wrong { background: #3a1b1b; }
.retry { background: #3a2e1b; }
.content { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); }
.icon { font-size: var(--text-xl); }
.message { font-size: var(--text-lg); font-weight: 800; }
.wrongContent { display: flex; flex-direction: column; gap: var(--space-xs); }
.explanation { font-size: var(--text-sm); color: var(--text-secondary); }
.continueBtn { width: 100%; padding: var(--space-md); border-radius: var(--radius-md); font-size: var(--text-base); font-weight: 800; letter-spacing: 1px; color: var(--text-primary); }
.correctBtn { background: var(--green); }
.wrongBtn { background: var(--red); }
.retryBtn { background: var(--orange); }
```

- [ ] **Step 2: Create ProgressBar**

```jsx
// src/components/lesson/ProgressBar.jsx
import { motion } from 'framer-motion';
import styles from './ProgressBar.module.css';

export default function ProgressBar({ current, total, onClose }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className={styles.container}>
      <button className={styles.closeBtn} onClick={onClose}>✕</button>
      <div className={styles.barTrack}>
        <motion.div className={styles.barFill} initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }} />
      </div>
    </div>
  );
}
```

```css
/* src/components/lesson/ProgressBar.module.css */
.container { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-md) var(--space-lg); }
.closeBtn { background: none; color: var(--text-secondary); font-size: var(--text-lg); padding: var(--space-xs); }
.barTrack { flex: 1; height: 16px; background: var(--border); border-radius: var(--radius-full); overflow: hidden; }
.barFill { height: 100%; background: var(--green); border-radius: var(--radius-full); }
```

- [ ] **Step 3: Create XpFlyUp + HeartDisplay**

```jsx
// src/components/shared/XpFlyUp.jsx
import { motion, AnimatePresence } from 'framer-motion';
import styles from './XpFlyUp.module.css';

export default function XpFlyUp({ amount, trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div key={trigger} className={styles.flyup}
          initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -60 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

```css
/* src/components/shared/XpFlyUp.module.css */
.flyup { position: fixed; top: 50%; left: 50%; transform: translateX(-50%); font-size: var(--text-xl); font-weight: 900; color: var(--yellow); pointer-events: none; z-index: 200; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
```

```jsx
// src/components/shared/HeartDisplay.jsx
import { motion } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import styles from './HeartDisplay.module.css';

export default function HeartDisplay() {
  const hearts = useGameStore((s) => s.user?.hearts ?? 5);
  return (
    <div className={styles.container}>
      <motion.span className={styles.icon} key={hearts} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>❤️</motion.span>
      <span className={styles.count}>{hearts}</span>
    </div>
  );
}
```

```css
/* src/components/shared/HeartDisplay.module.css */
.container { display: flex; align-items: center; gap: var(--space-xs); }
.icon { font-size: var(--text-lg); display: inline-block; }
.count { font-size: var(--text-base); font-weight: 800; color: var(--pink); }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/lesson/FeedbackBanner.* src/components/lesson/ProgressBar.* src/components/shared/
git commit -m "feat: add FeedbackBanner, ProgressBar, XpFlyUp, HeartDisplay"
```

---

## Task 7: Lesson Engine + Summary

**Files:**
- Create: `src/components/lesson/LessonEngine.jsx`, `src/components/lesson/LessonEngine.module.css`, `src/components/lesson/LessonSummary.jsx`, `src/components/lesson/LessonSummary.module.css`, `src/components/shared/Confetti.jsx`, `src/components/shared/Confetti.module.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create Confetti**

```jsx
// src/components/shared/Confetti.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Confetti.module.css';

const COLORS = ['#58cc02', '#1cb0f6', '#ffc800', '#ff86d0', '#ff9600'];

export default function Confetti({ active }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) { setParticles([]); return; }
    setParticles(Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 10 + Math.random() * 80, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.3, duration: 1.5 + Math.random(), size: 6 + Math.random() * 6, rotation: Math.random() * 360,
    })));
  }, [active]);

  return (
    <AnimatePresence>
      {active && <div className={styles.container}>
        {particles.map((p) => (
          <motion.div key={p.id} className={styles.particle}
            style={{ left: `${p.x}%`, width: p.size, height: p.size, background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px' }}
            initial={{ y: -20, opacity: 1, rotate: 0 }} animate={{ y: '100vh', opacity: 0, rotate: p.rotation }}
            transition={{ delay: p.delay, duration: p.duration, ease: 'easeIn' }} />
        ))}
      </div>}
    </AnimatePresence>
  );
}
```

```css
/* src/components/shared/Confetti.module.css */
.container { position: fixed; inset: 0; pointer-events: none; z-index: 500; overflow: hidden; }
.particle { position: absolute; top: 0; }
```

- [ ] **Step 2: Create LessonSummary**

```jsx
// src/components/lesson/LessonSummary.jsx
import { motion } from 'framer-motion';
import Confetti from '../shared/Confetti';
import styles from './LessonSummary.module.css';

export default function LessonSummary({ xp, accuracy, streak, onFinish }) {
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  return (
    <motion.div className={styles.container} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 20 }}>
      <Confetti active={true} />
      <div className={styles.stars}>{'⭐'.repeat(stars) + '☆'.repeat(3 - stars)}</div>
      <h1 className={styles.title}>Lesson Complete!</h1>
      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statValue}>{xp}</span><span className={styles.statLabel}>XP earned</span></div>
        <div className={styles.stat}><span className={styles.statValue}>{accuracy}%</span><span className={styles.statLabel}>Accuracy</span></div>
        {streak > 0 && <div className={styles.stat}><span className={styles.statValue}>🔥 {streak}</span><span className={styles.statLabel}>Day streak</span></div>}
      </div>
      <button className={styles.finishBtn} onClick={onFinish}>CONTINUE</button>
    </motion.div>
  );
}
```

```css
/* src/components/lesson/LessonSummary.module.css */
.container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: var(--space-xl); gap: var(--space-lg); }
.stars { font-size: var(--text-4xl); letter-spacing: 8px; }
.title { font-size: var(--text-2xl); font-weight: 900; }
.stats { display: flex; gap: var(--space-xl); margin: var(--space-lg) 0; }
.stat { display: flex; flex-direction: column; align-items: center; gap: var(--space-xs); }
.statValue { font-size: var(--text-2xl); font-weight: 900; color: var(--yellow); }
.statLabel { font-size: var(--text-sm); color: var(--text-secondary); }
.finishBtn { width: 100%; padding: var(--space-md); border-radius: var(--radius-md); background: var(--green); color: var(--text-primary); font-size: var(--text-lg); font-weight: 800; letter-spacing: 1px; }
.finishBtn:hover { background: var(--green-hover); }
```

- [ ] **Step 3: Create LessonEngine**

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
import FollowThePattern from './exercises/FollowThePattern';
import styles from './LessonEngine.module.css';

export default function LessonEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lesson = useLiveQuery(() => db.lessons.get(id), [id]);
  const user = useGameStore((s) => s.user);
  const ageBand = user?.ageBand || '8-10';
  const { lessonXp, lessonCorrect, addXp, addLessonXp, loseHeart, recordAnswer, resetLesson, completeLesson, updateStreak } = useGameStore();

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [xpFlyUp, setXpFlyUp] = useState(null);
  const [retryUsed, setRetryUsed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const exercises = lesson?.exercises || [];
  const maxExercises = ageBand === '6-7' ? 6 : ageBand === '8-10' ? 8 : 10;
  const activeExercises = exercises.slice(0, Math.min(exercises.length, maxExercises));
  const currentExercise = activeExercises[exerciseIndex];

  const handleAnswer = useCallback((answer) => {
    if (!currentExercise) return;
    const isCorrect = answer === currentExercise.correctAnswer;

    if (isCorrect) {
      const xp = calculateXp();
      addLessonXp(xp);
      addXp(xp);
      recordAnswer(true);
      setXpFlyUp(Date.now());
      setFeedback({ isCorrect: true });
      setRetryUsed(false);
    } else {
      const canRetry = currentExercise.type === 'type-answer' && !retryUsed;
      if (canRetry) {
        setFeedback({ isRetry: true });
        setRetryUsed(true);
      } else {
        loseHeart();
        recordAnswer(false);
        setRetryUsed(false);
        setFeedback({ isCorrect: false, correctAnswer: currentExercise.correctAnswer, equation: currentExercise.equation });
      }
    }
  }, [currentExercise, retryUsed, addLessonXp, addXp, recordAnswer, loseHeart]);

  const handleContinue = useCallback(async () => {
    if (feedback?.isRetry) { setFeedback(null); return; }
    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= activeExercises.length) {
      const bonus = getLessonBonus();
      addLessonXp(bonus);
      addXp(bonus);
      await updateStreak();
      const accuracy = activeExercises.length > 0 ? Math.round((lessonCorrect / activeExercises.length) * 100) : 0;
      await completeLesson(id, accuracy);
      setFeedback(null);
      setShowSummary(true);
    } else {
      setFeedback(null);
      setExerciseIndex(nextIndex);
    }
  }, [feedback, exerciseIndex, activeExercises.length, lessonCorrect, id, addLessonXp, addXp, updateStreak, completeLesson]);

  const handleClose = () => { resetLesson(); navigate('/'); };
  const handleFinish = () => { resetLesson(); navigate('/'); };

  if (!lesson) return <div className={styles.loading}>Loading lesson...</div>;

  if (showSummary) {
    const accuracy = activeExercises.length > 0 ? Math.round((lessonCorrect / activeExercises.length) * 100) : 0;
    return <div className={styles.container}><LessonSummary xp={lessonXp} accuracy={accuracy} streak={user?.currentStreak || 0} onFinish={handleFinish} /></div>;
  }

  const exerciseComponent = (() => {
    if (!currentExercise) return null;
    const props = { exercise: currentExercise, onAnswer: handleAnswer };
    switch (currentExercise.type) {
      case 'type-answer': return <TypeTheAnswer {...props} />;
      case 'select-answer': return <SelectTheAnswer {...props} />;
      case 'follow-pattern': return <FollowThePattern {...props} />;
      default: return <div>Unknown exercise type: {currentExercise.type}</div>;
    }
  })();

  return (
    <div className={styles.container}>
      <ProgressBar current={exerciseIndex + (feedback?.isCorrect ? 1 : 0)} total={activeExercises.length} onClose={handleClose} />
      <AnimatePresence mode="wait">
        <motion.div key={exerciseIndex} className={styles.exerciseArea}
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          {exerciseComponent}
        </motion.div>
      </AnimatePresence>
      <XpFlyUp amount={10} trigger={xpFlyUp} />
      <AnimatePresence>
        {feedback && <FeedbackBanner isCorrect={feedback.isCorrect} isRetry={feedback.isRetry}
          correctAnswer={feedback.correctAnswer} equation={feedback.equation} onContinue={handleContinue} />}
      </AnimatePresence>
    </div>
  );
}
```

```css
/* src/components/lesson/LessonEngine.module.css */
.container { display: flex; flex-direction: column; min-height: 100vh; max-width: var(--max-width); margin: 0 auto; width: 100%; }
.exerciseArea { flex: 1; display: flex; flex-direction: column; }
.loading { display: flex; align-items: center; justify-content: center; min-height: 100vh; color: var(--text-secondary); font-size: var(--text-lg); }
```

- [ ] **Step 4: Wire LessonEngine into App.jsx**

```jsx
import LessonEngine from './components/lesson/LessonEngine';
// Replace lesson route:
<Route path="/lesson/:id" element={<LessonEngine />} />
```

- [ ] **Step 5: Test core loop**

Navigate to `http://localhost:5173/lesson/math-addition-1-lesson-1`. Play through exercises, verify feedback, XP, hearts, retry, and summary.

- [ ] **Step 6: Commit**

```bash
git add src/components/lesson/ src/components/shared/Confetti.* src/App.jsx
git commit -m "feat: add LessonEngine with full exercise loop, feedback, confetti, and summary"
```

---

## Task 8: Tab Bar + Layout

**Files:**
- Create: `src/components/layout/TabBar.jsx`, `src/components/layout/TabBar.module.css`, `src/components/layout/AppLayout.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create TabBar**

```jsx
// src/components/layout/TabBar.jsx
import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';

export default function TabBar() {
  return (
    <nav className={styles.tabBar}>
      <NavLink to="/" className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`} end>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/></svg>
        <span>Learn</span>
      </NavLink>
      <NavLink to="/progress" className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        <span>Progress</span>
      </NavLink>
    </nav>
  );
}
```

```css
/* src/components/layout/TabBar.module.css */
.tabBar { display: flex; border-top: 1px solid var(--border); background: var(--bg); padding: var(--space-sm) 0 calc(var(--space-sm) + env(safe-area-inset-bottom, 0px)); }
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-sm); color: var(--text-secondary); text-decoration: none; font-size: var(--text-xs); font-weight: 700; transition: color 0.2s; }
.tab:hover { color: var(--text-primary); }
.active { color: var(--blue); }
```

- [ ] **Step 2: Create AppLayout**

```jsx
// src/components/layout/AppLayout.jsx
import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

export default function AppLayout() {
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '72px' }}><Outlet /></div>
      <TabBar />
    </>
  );
}
```

- [ ] **Step 3: Update App.jsx with layout**

```jsx
import AppLayout from './components/layout/AppLayout';
import LearningPath from './components/home/LearningPath'; // placeholder for now

// Routes become:
<Route element={<AppLayout />}>
  <Route path="/" element={<div style={{ padding: '24px' }}>Welcome back, {user.name}!</div>} />
  <Route path="/progress" element={<div style={{ padding: '24px' }}>Progress coming next</div>} />
</Route>
<Route path="/lesson/:id" element={<LessonEngine />} />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/ src/App.jsx
git commit -m "feat: add TabBar and AppLayout with 2 tabs"
```

---

## Task 9: Learning Path (Home Screen)

**Files:**
- Create: `src/components/home/LearningPath.jsx`, `src/components/home/LearningPath.module.css`, `src/components/home/LessonNode.jsx`, `src/components/home/LessonNode.module.css`, `src/components/home/UnitHeader.jsx`

- [ ] **Step 1: Create UnitHeader**

```jsx
// src/components/home/UnitHeader.jsx
export default function UnitHeader({ unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-lg) var(--space-lg) var(--space-sm)' }}>
      <span style={{ fontSize: 'var(--text-2xl)' }}>{unit.iconEmoji}</span>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{unit.title}</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{unit.description}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LessonNode**

```jsx
// src/components/home/LessonNode.jsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './LessonNode.module.css';

export default function LessonNode({ lesson, status, stars }) {
  const navigate = useNavigate();
  const handleClick = () => { if (status !== 'locked') navigate(`/lesson/${lesson.id}`); };

  return (
    <motion.button className={`${styles.node} ${styles[status]}`} onClick={handleClick}
      whileTap={status !== 'locked' ? { scale: 0.9 } : {}} disabled={status === 'locked'}>
      <span className={styles.number}>{lesson.order}</span>
      {status === 'completed' && <div className={styles.stars}>{'⭐'.repeat(stars || 1)}</div>}
      {status === 'current' && <motion.div className={styles.pulse}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} />}
    </motion.button>
  );
}
```

```css
/* src/components/home/LessonNode.module.css */
.node { width: 64px; height: 64px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; font-weight: 900; }
.completed { background: var(--green); color: white; border: 3px solid var(--green-hover); }
.current { background: var(--blue); color: white; border: 3px solid #0e8fd4; box-shadow: 0 0 20px rgba(28,176,246,0.4); }
.locked { background: var(--border); color: var(--text-secondary); border: 3px solid var(--border); cursor: not-allowed; opacity: 0.5; }
.number { font-size: var(--text-lg); }
.stars { position: absolute; bottom: -8px; font-size: 10px; letter-spacing: -2px; }
.pulse { position: absolute; inset: -6px; border-radius: 50%; border: 2px solid var(--blue); }
```

- [ ] **Step 3: Create LearningPath**

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
  const units = useLiveQuery(() => db.units.where('moduleId').equals('math').sortBy('order'), []);
  const lessons = useLiveQuery(() => db.lessons.orderBy('order').toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  if (!units || !lessons || !progress) return null;

  const progressMap = {};
  progress.forEach((p) => { progressMap[p.lessonId] = p; });

  let foundIncomplete = false;
  const unitData = units.map((unit) => {
    const unitLessons = lessons.filter((l) => l.unitId === unit.id).sort((a, b) => a.order - b.order);
    const allComplete = unitLessons.every((l) => progressMap[l.id]?.completed);
    const isCurrentUnit = !allComplete && !foundIncomplete;
    if (isCurrentUnit) foundIncomplete = true;
    return { unit, lessons: unitLessons, allComplete, isCurrentUnit };
  });

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
          <button className={styles.gearBtn} onClick={() => window.dispatchEvent(new Event('open-settings'))}>⚙️</button>
        </div>
      </header>

      {unitData.slice(0, Math.max(0, currentIndex)).map(({ unit }) => (
        <div key={unit.id} className={styles.completedBadge}>
          <span>{unit.iconEmoji}</span><span className={styles.completedText}>{unit.title}</span><span>✅</span>
        </div>
      ))}

      {currentIndex >= 0 && (
        <div>
          <UnitHeader unit={unitData[currentIndex].unit} />
          <div className={styles.nodeTrail}>
            {unitData[currentIndex].lessons.map((lesson, i) => {
              const prog = progressMap[lesson.id];
              let status = 'locked';
              if (prog?.completed) status = 'completed';
              else if (i === 0 || progressMap[unitData[currentIndex].lessons[i - 1]?.id]?.completed) status = 'current';
              return <LessonNode key={lesson.id} lesson={lesson} status={status} stars={prog?.stars} />;
            })}
          </div>
        </div>
      )}

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

```css
/* src/components/home/LearningPath.module.css */
.container { padding: var(--space-md); }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-lg); }
.greeting { font-size: var(--text-xl); font-weight: 900; }
.streakBadge { font-size: var(--text-sm); color: var(--orange); font-weight: 700; margin-top: var(--space-xs); }
.headerRight { display: flex; align-items: center; gap: var(--space-md); }
.gearBtn { background: none; font-size: var(--text-lg); padding: var(--space-xs); }
.completedBadge { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: var(--surface); border-radius: var(--radius-md); margin-bottom: var(--space-sm); }
.completedText { flex: 1; font-size: var(--text-sm); font-weight: 700; color: var(--text-secondary); }
.nodeTrail { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-md); padding: var(--space-lg) 0; }
.nextPreview { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-md) var(--space-lg); background: var(--surface); border-radius: var(--radius-md); border: 1px dashed var(--border); color: var(--text-secondary); font-size: var(--text-sm); font-weight: 700; }
.nextLabel { color: var(--text-secondary); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 1px; }
```

- [ ] **Step 4: Wire into App.jsx**

```jsx
import LearningPath from './components/home/LearningPath';
// Replace home route:
<Route path="/" element={<LearningPath />} />
```

- [ ] **Step 5: Commit**

```bash
git add src/components/home/ src/App.jsx
git commit -m "feat: add Learning Path home screen with unit nodes"
```

---

## Task 10: Progress Screen

**Files:**
- Create: `src/components/progress/ProgressScreen.jsx`, `src/components/progress/ProgressScreen.module.css`, `src/components/progress/StreakCalendar.jsx`, `src/components/progress/UnitBadges.jsx`

- [ ] **Step 1: Create StreakCalendar + UnitBadges + ProgressScreen**

```jsx
// src/components/progress/StreakCalendar.jsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

export default function StreakCalendar({ styles }) {
  const history = useLiveQuery(() => db.streakHistory.toArray(), []);
  const dates = new Set((history || []).map((h) => h.date));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, day: d.toLocaleDateString('en', { weekday: 'short' }), active: dates.has(dateStr) });
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

```jsx
// src/components/progress/UnitBadges.jsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

export default function UnitBadges({ styles }) {
  const units = useLiveQuery(() => db.units.where('moduleId').equals('math').sortBy('order'), []);
  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  if (!units || !lessons || !progress) return null;
  const progressMap = {}; progress.forEach((p) => { progressMap[p.lessonId] = p; });

  return (
    <div className={styles.badges}>
      {units.map((unit) => {
        const unitLessons = lessons.filter((l) => l.unitId === unit.id);
        const completed = unitLessons.filter((l) => progressMap[l.id]?.completed).length;
        const total = unitLessons.length;
        const allDone = completed === total && total > 0;
        const avgStars = allDone ? Math.round(unitLessons.reduce((sum, l) => sum + (progressMap[l.id]?.stars || 0), 0) / total) : 0;
        return (
          <div key={unit.id} className={`${styles.badge} ${allDone ? styles.badgeDone : ''}`}>
            <span className={styles.badgeEmoji}>{unit.iconEmoji}</span>
            <span className={styles.badgeTitle}>{unit.title}</span>
            <span className={styles.badgeProgress}>{allDone ? '⭐'.repeat(avgStars) : `${completed}/${total}`}</span>
          </div>
        );
      })}
    </div>
  );
}
```

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
        <div className={styles.statCard}><span className={styles.statValue}>⚡ {user?.totalXp || 0}</span><span className={styles.statLabel}>Total XP</span></div>
        <div className={styles.statCard}><span className={styles.statValue}>🔥 {user?.currentStreak || 0}</span><span className={styles.statLabel}>Streak</span></div>
        <div className={styles.statCard}><HeartDisplay /><span className={styles.statLabel}>Hearts</span></div>
      </div>
      <h2 className={styles.sectionTitle}>This Week</h2>
      <StreakCalendar styles={styles} />
      <h2 className={styles.sectionTitle}>Units</h2>
      <UnitBadges styles={styles} />
    </div>
  );
}
```

```css
/* src/components/progress/ProgressScreen.module.css */
.container { padding: var(--space-lg); }
.title { font-size: var(--text-xl); font-weight: 900; margin-bottom: var(--space-lg); }
.statsRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-sm); margin-bottom: var(--space-xl); }
.statCard { display: flex; flex-direction: column; align-items: center; gap: var(--space-xs); padding: var(--space-md); background: var(--surface); border-radius: var(--radius-md); }
.statValue { font-size: var(--text-lg); font-weight: 900; }
.statLabel { font-size: var(--text-xs); color: var(--text-secondary); font-weight: 700; }
.sectionTitle { font-size: var(--text-sm); font-weight: 800; margin-bottom: var(--space-md); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-xs); margin-bottom: var(--space-xl); }
.calDay { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.calDayName { font-size: 10px; color: var(--text-secondary); font-weight: 700; }
.calDot { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: var(--text-sm); color: var(--text-secondary); }
.calActive .calDot { background: rgba(255,150,0,0.2); }
.badges { display: flex; flex-direction: column; gap: var(--space-sm); }
.badge { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md) var(--space-lg); background: var(--surface); border-radius: var(--radius-md); border: 2px solid var(--border); }
.badgeDone { border-color: var(--green); }
.badgeEmoji { font-size: var(--text-xl); }
.badgeTitle { flex: 1; font-weight: 800; }
.badgeProgress { font-size: var(--text-sm); color: var(--text-secondary); font-weight: 700; }
```

- [ ] **Step 2: Wire into App.jsx**

```jsx
import ProgressScreen from './components/progress/ProgressScreen';
<Route path="/progress" element={<ProgressScreen />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/progress/ src/App.jsx
git commit -m "feat: add Progress screen with streak calendar and unit badges"
```

---

## Task 11: Settings Panel

**Files:**
- Create: `src/components/settings/SettingsPanel.jsx`, `src/components/settings/SettingsPanel.module.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create SettingsPanel**

```jsx
// src/components/settings/SettingsPanel.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import styles from './SettingsPanel.module.css';

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
          <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div className={styles.panel} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
            <div className={styles.header}>
              <h2 className={styles.title}>Settings</h2>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Starting Level</h3>
              <div className={styles.options}>
                {AGE_BANDS.map((b) => (
                  <button key={b.value} className={`${styles.option} ${user.ageBand === b.value ? styles.selected : ''}`}
                    onClick={() => updateSettings({ ageBand: b.value })}>
                    <span className={styles.optLabel}>{b.label}</span><span className={styles.optDesc}>{b.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

```css
/* src/components/settings/SettingsPanel.module.css */
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 300; }
.panel { position: fixed; top: 0; right: 0; bottom: 0; width: 320px; max-width: 90vw; background: var(--bg); border-left: 1px solid var(--border); z-index: 301; overflow-y: auto; padding: var(--space-lg); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); }
.title { font-size: var(--text-xl); font-weight: 900; }
.closeBtn { background: none; color: var(--text-secondary); font-size: var(--text-xl); padding: var(--space-xs); }
.section { margin-bottom: var(--space-xl); }
.sectionTitle { font-size: var(--text-sm); font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-md); }
.options { display: flex; flex-direction: column; gap: var(--space-sm); }
.option { display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--surface); color: var(--text-primary); }
.option:hover { border-color: var(--text-secondary); }
.selected { border-color: var(--blue); background: rgba(28,176,246,0.1); }
.optLabel { font-weight: 800; }
.optDesc { font-size: var(--text-sm); color: var(--text-secondary); }
```

- [ ] **Step 2: Add to App.jsx**

```jsx
import SettingsPanel from './components/settings/SettingsPanel';
// Inside BrowserRouter, alongside Routes:
<SettingsPanel />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/ src/App.jsx
git commit -m "feat: add Settings slide-over panel"
```

---

## Task 12: Lesson Content Data (3 units, 15 lessons)

**Files:**
- Modify: `src/data/math/units.js`, `src/data/math/lessons/addition-1.js`
- Create: `src/data/math/lessons/addition-2.js`, `src/data/math/lessons/subtraction-1.js`

- [ ] **Step 1: Update units.js**

```js
// src/data/math/units.js
const units = [
  { id: 'math-addition-1', moduleId: 'math', title: 'Addition 1', topic: 'addition', order: 1, iconEmoji: '➕', description: 'Adding numbers 0-10' },
  { id: 'math-addition-2', moduleId: 'math', title: 'Addition 2', topic: 'addition', order: 2, iconEmoji: '➕', description: 'Adding numbers 10-50' },
  { id: 'math-subtraction-1', moduleId: 'math', title: 'Subtraction 1', topic: 'subtraction', order: 3, iconEmoji: '➖', description: 'Subtracting numbers 0-10' },
];

export default units;
```

- [ ] **Step 2: Create full addition-1.js (5 lessons, ~10 exercises each)**

The implementing agent should create 5 lessons for this unit, each with 10 exercises covering all 3 exercise types (type-answer, select-answer, follow-pattern), using addition problems with numbers 0-10. Ensure all `correctAnswer` values are correct and `options` always include the correct answer.

- [ ] **Step 3: Create addition-2.js (5 lessons)**

Same structure, addition problems with numbers 10-50.

- [ ] **Step 4: Create subtraction-1.js (5 lessons)**

Same structure, subtraction problems with numbers 0-10.

- [ ] **Step 5: Verify data loads and lessons play**

```bash
npm run dev
```

Home screen should show 3 units. Play through a lesson from each to verify.

- [ ] **Step 6: Commit**

```bash
git add src/data/math/
git commit -m "feat: add content for 3 units - 15 lessons, ~120 exercises"
```

---

## Task 13: Mascot SVG Component

**Files:**
- Create: `src/components/shared/Mascot.jsx`, `src/components/shared/Mascot.module.css`
- Modify: `src/components/lesson/LessonSummary.jsx`

- [ ] **Step 1: Create Mascot with 3 expressions**

```jsx
// src/components/shared/Mascot.jsx
import styles from './Mascot.module.css';

const EXPRESSIONS = {
  happy: { mouth: 'M 25 65 Q 40 80 55 65', eyes: 'open' },
  thinking: { mouth: 'M 30 65 L 50 65', eyes: 'look-up' },
  celebrating: { mouth: 'M 20 60 Q 40 85 60 60', eyes: 'closed' },
};

export default function Mascot({ expression = 'happy', size = 120 }) {
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.happy;
  return (
    <svg className={styles.mascot} width={size} height={size} viewBox="0 0 80 90" fill="none">
      <ellipse cx="40" cy="55" rx="28" ry="30" fill="#E8943A" />
      <ellipse cx="40" cy="60" rx="18" ry="20" fill="#F5C882" />
      <circle cx="40" cy="35" r="22" fill="#E8943A" />
      <ellipse cx="22" cy="15" rx="8" ry="14" fill="#E8943A" transform="rotate(-15 22 15)" />
      <ellipse cx="22" cy="15" rx="5" ry="10" fill="#D4762A" transform="rotate(-15 22 15)" />
      <ellipse cx="58" cy="15" rx="8" ry="14" fill="#E8943A" transform="rotate(15 58 15)" />
      <ellipse cx="58" cy="15" rx="5" ry="10" fill="#D4762A" transform="rotate(15 58 15)" />
      <ellipse cx="40" cy="42" rx="6" ry="4" fill="#2a1a0a" />
      <ellipse cx="40" cy="46" rx="12" ry="8" fill="#F5C882" />
      {expr.eyes === 'open' && <>
        <circle cx="32" cy="32" r="4" fill="#2a1a0a" /><circle cx="48" cy="32" r="4" fill="#2a1a0a" />
        <circle cx="33" cy="31" r="1.5" fill="white" /><circle cx="49" cy="31" r="1.5" fill="white" />
      </>}
      {expr.eyes === 'closed' && <>
        <path d="M 28 32 Q 32 28 36 32" stroke="#2a1a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M 44 32 Q 48 28 52 32" stroke="#2a1a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </>}
      {expr.eyes === 'look-up' && <>
        <circle cx="32" cy="30" r="4" fill="#2a1a0a" /><circle cx="48" cy="30" r="4" fill="#2a1a0a" />
        <circle cx="33" cy="29" r="1.5" fill="white" /><circle cx="49" cy="29" r="1.5" fill="white" />
      </>}
      <path d={expr.mouth} stroke="#2a1a0a" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
```

```css
/* src/components/shared/Mascot.module.css */
.mascot { display: block; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
```

- [ ] **Step 2: Add mascot to LessonSummary**

Add `<Mascot expression="celebrating" size={100} />` above the stars in LessonSummary.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Mascot.* src/components/lesson/LessonSummary.jsx
git commit -m "feat: add Dingo mascot SVG with happy, thinking, celebrating expressions"
```

---

## Task 14: Final Integration + Frontend Design Polish

**Files:**
- Modify: `index.html`, `public/favicon.svg`
- Multiple component files for visual polish

- [ ] **Step 1: Add favicon**

```svg
<!-- public/favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#1a2332"/>
  <text x="16" y="22" text-anchor="middle" font-size="18">🐕</text>
</svg>
```

- [ ] **Step 2: Add mobile meta tags to index.html**

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

- [ ] **Step 3: End-to-end test**

1. Clear IndexedDB, refresh — onboarding appears
2. Enter name, pick level — home screen loads
3. Tap first lesson — exercises work, feedback works, XP and hearts work
4. Complete lesson — confetti, summary, mascot
5. Home screen — node is green with stars, next node is current
6. Progress tab — stats, calendar, unit badges
7. Settings — change age band

- [ ] **Step 4: Invoke /frontend-design skill for visual polish**

Use the `/frontend-design` skill to review and polish the visual quality of all screens.

- [ ] **Step 5: Build and verify**

```bash
npm run build && npm run preview
```

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat: complete LuLinDingo v1 - 3 units, 3 exercise types, core gamification"
git push origin main
```
