# Read-Aloud Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline tap-to-replay speaker button to every exercise that speaks the equation (and, for choice exercises, the options) aloud using the browser's built-in `SpeechSynthesis` API. A settings toggle stores read-aloud on/off + rate on the user row. Removes the reading barrier for the youngest band and for dyslexic kids; enables eyes-light practice.

**Architecture:** A pure `speakable.js` util converts an exercise object into the spoken string ("seven plus four equals what"). A `useSpeech` hook wraps `SpeechSynthesis`, exposing `{ speak, cancel, supported }` and reading rate/voice from the user. A shared `SpeakerButton` component is dropped into all three exercise components and calls `speak(exerciseToSpeech(exercise))`. The user row gains `readAloud` and `speechRate` fields (Dexie `version(2)` bump with a migration default). SettingsPanel gets a toggle + rate control. Autoplay-on-new-exercise is wired in `LessonEngine` behind the `readAloud` flag.

**Tech Stack:** React 19, Zustand, Dexie, Vitest + jsdom

---

## Key Design Decisions

Each call is concrete and opinionated. One-line rationale follows each.

1. **Equation → speech mapping lives in a pure util (`src/utils/speakable.js`), token by token.** The equation is a space-delimited string like `"7 + 4 = []"`. Split on whitespace, map each token through a dictionary, join with spaces:
   - Operators: `+` → `"plus"`, `-` → `"minus"`, `×` → `"times"`, `÷` → `"divided by"`, `=` → `"equals"`.
   - The blank `[]` → `"what"`. So `"7 + 4 = []"` → `"7 plus 4 equals what"`.
   - Numbers are left as digit strings (e.g. `"7"`); the TTS engine already reads "7" as "seven" and "12.5" as "twelve point five", so we do **not** hand-roll a number-to-words converter.
   - *Why:* keeping numbers as digits avoids re-implementing locale-aware number spelling and keeps the util tiny and fully testable; the engine is the right place for that.

2. **Speakable text is composed per exercise type by a single `exerciseToSpeech(exercise)` entry point.**
   - `type-answer` and `select-answer`: speak the equation only (`equationToSpeech(equation)`). For `select-answer` we **also** append the options: `"... equals what. Options: 11, 9, or 12."`
   - `follow-pattern`: speak each pattern row in sequence — `"7 times 1 is 7. 7 times 2 is 14. 7 times 3 is what? Options: 21 or 18."` Pattern rows use `expression` + `result` (null on the last row → "what").
   - *Why:* choice exercises are unreadable without the options spoken; composing per-type keeps `useSpeech` and the button dumb (they just speak a string they're handed).

3. **`useSpeech` hook wraps `window.speechSynthesis`; never touches the DOM speech objects from anywhere else.** It exposes `{ speak(text), cancel(), supported }`. `speak` calls `cancel()` first (so a second tap interrupts rather than queues), builds a `SpeechSynthesisUtterance`, sets `rate` from the user's `speechRate`, sets `lang = 'en-US'`, and calls `speechSynthesis.speak(u)`. `supported` is `typeof window !== 'undefined' && 'speechSynthesis' in window`.
   - *Why:* one wrapper means one place to mock in tests, one place to handle the "not supported" branch, and one place to enforce interrupt-on-retap.

4. **Graceful no-op when the API is unavailable.** If `supported` is false, `speak`/`cancel` do nothing and `SpeakerButton` renders `null`. No errors, no broken layout.
   - *Why:* the app is offline-first across many browsers/webviews; an absent API must degrade silently, never throw.

5. **Voice selection: we ship rate control only, not voice picking, in v1.** We store `speechRate` (0.7 slow / 1.0 normal) and a reserved `speechVoiceURI` field (default `null` = engine default voice). The settings UI exposes a Normal/Slow rate toggle; voice picking is out of scope (see Out of Scope) but the field exists so a later version needs no schema bump.
   - *Why:* available voices vary wildly per device and load asynchronously (`voiceschanged`); a kid-facing voice picker is low value and high complexity for v1, but reserving the field is free.

6. **Autoplay-on-new-exercise is ON by default, gated behind `readAloud`.** When `readAloud` is true, `LessonEngine` speaks the current exercise once when `exerciseIndex` changes (and on first mount). The speaker button remains for manual replay. Autoplay does **not** fire in the result/summary screens.
   - *Why:* the youngest/dyslexic target users benefit most from not having to find and tap a button each question; the toggle is the global off-switch for anyone who finds it noisy.

7. **Persistence: two new user fields via a Dexie `version(2)` bump with an `upgrade` that backfills defaults (`readAloud: false`, `speechRate: 1.0`).** Defaults to **off** so existing users aren't surprised by sudden audio; new users created after this ship also default off (set in `createUser`).
   - *Why:* Dexie stores arbitrary fields without index changes, but existing rows would read `undefined`; an explicit `upgrade` backfill keeps reads predictable and lets `speechRate` be used directly as a number.

8. **`SpeakerButton` is a shared component (`src/components/shared/SpeakerButton.jsx`) that takes a `text` prop and renders the button + wires the hook internally.** It returns `null` when unsupported. It shows a speaking state (animated) while `speechSynthesis.speaking` is true.
   - *Why:* one component dropped into three exercise types keeps markup and a11y attributes (aria-label "Read aloud") identical everywhere.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/speakable.js` | Create | `equationToSpeech`, `exerciseToSpeech`, `OPERATOR_WORDS` |
| `src/utils/__tests__/speakable.test.js` | Create | Pure-logic tests for speech text |
| `src/hooks/useSpeech.js` | Create | Wraps `speechSynthesis`; `{ speak, cancel, supported }` |
| `src/hooks/__tests__/useSpeech.test.jsx` | Create | Hook tests with mocked `speechSynthesis` |
| `src/components/shared/SpeakerButton.jsx` | Create | Tap-to-replay button; reads user rate; no-op when unsupported |
| `src/components/shared/SpeakerButton.module.css` | Create | Button styling |
| `src/components/shared/__tests__/SpeakerButton.test.jsx` | Create | Render + no-op tests |
| `src/db/database.js` | Modify | Add `db.version(2)` with `upgrade` backfill |
| `src/stores/useGameStore.js` | Modify | `createUser` defaults `readAloud`/`speechRate`; settings already pass through |
| `src/stores/__tests__/useGameStore.test.js` | Modify | Defaults + `updateSettings` for new fields |
| `src/components/settings/SettingsPanel.jsx` | Modify | Read-aloud toggle + rate control |
| `src/components/lesson/exercises/TypeTheAnswer.jsx` | Modify | Mount `SpeakerButton` |
| `src/components/lesson/exercises/SelectTheAnswer.jsx` | Modify | Mount `SpeakerButton` |
| `src/components/lesson/exercises/FollowThePattern.jsx` | Modify | Mount `SpeakerButton` |
| `src/components/lesson/LessonEngine.jsx` | Modify | Autoplay current exercise when `readAloud` is on |

---

### Task 1: Pure Speakable Logic

**Files:**
- Create: `src/utils/speakable.js`
- Create: `src/utils/__tests__/speakable.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/speakable.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { equationToSpeech, exerciseToSpeech, OPERATOR_WORDS } from '../speakable';

describe('OPERATOR_WORDS', () => {
  it('maps every operator symbol used by the generator', () => {
    expect(OPERATOR_WORDS['+']).toBe('plus');
    expect(OPERATOR_WORDS['-']).toBe('minus');
    expect(OPERATOR_WORDS['×']).toBe('times');
    expect(OPERATOR_WORDS['÷']).toBe('divided by');
    expect(OPERATOR_WORDS['=']).toBe('equals');
  });
});

describe('equationToSpeech', () => {
  it('speaks addition with the blank as "what"', () => {
    expect(equationToSpeech('7 + 4 = []')).toBe('7 plus 4 equals what');
  });

  it('speaks subtraction', () => {
    expect(equationToSpeech('9 - 3 = []')).toBe('9 minus 3 equals what');
  });

  it('speaks multiplication (× symbol)', () => {
    expect(equationToSpeech('6 × 7 = []')).toBe('6 times 7 equals what');
  });

  it('speaks division (÷ symbol)', () => {
    expect(equationToSpeech('12 ÷ 4 = []')).toBe('12 divided by 4 equals what');
  });

  it('leaves decimal numbers as digit strings', () => {
    expect(equationToSpeech('5 ÷ 2 = []')).toBe('5 divided by 2 equals what');
    expect(equationToSpeech('12.5 + 1 = []')).toBe('12.5 plus 1 equals what');
  });
});

describe('exerciseToSpeech', () => {
  it('type-answer: equation only', () => {
    const ex = { type: 'type-answer', equation: '7 + 4 = []', correctAnswer: 11 };
    expect(exerciseToSpeech(ex)).toBe('7 plus 4 equals what');
  });

  it('select-answer: equation then options joined with "or"', () => {
    const ex = {
      type: 'select-answer',
      equation: '7 + 4 = []',
      correctAnswer: 11,
      options: [11, 9, 12],
    };
    expect(exerciseToSpeech(ex)).toBe('7 plus 4 equals what. Options: 11, 9, or 12.');
  });

  it('follow-pattern: reads each row then options', () => {
    const ex = {
      type: 'follow-pattern',
      equation: '7 × 3 = []',
      correctAnswer: 21,
      options: [21, 18],
      pattern: [
        { expression: '7 × 1', result: 7 },
        { expression: '7 × 2', result: 14 },
        { expression: '7 × 3', result: null },
      ],
    };
    expect(exerciseToSpeech(ex)).toBe(
      '7 times 1 is 7. 7 times 2 is 14. 7 times 3 is what? Options: 21 or 18.'
    );
  });

  it('select-answer with two options uses "or" without comma', () => {
    const ex = {
      type: 'select-answer',
      equation: '2 + 2 = []',
      correctAnswer: 4,
      options: [4, 5],
    };
    expect(exerciseToSpeech(ex)).toBe('2 plus 2 equals what. Options: 4 or 5.');
  });

  it('returns empty string for null/unknown exercise', () => {
    expect(exerciseToSpeech(null)).toBe('');
    expect(exerciseToSpeech({ type: 'mystery', equation: '1 + 1 = []' })).toBe('1 plus 1 equals what');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/speakable.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `src/utils/speakable.js`:

```js
/**
 * speakable.js
 *
 * Pure functions that convert exercise objects into text suitable for
 * text-to-speech. No DOM, no SpeechSynthesis here — just strings.
 */

export const OPERATOR_WORDS = {
  '+': 'plus',
  '-': 'minus',
  '×': 'times',
  '÷': 'divided by',
  '=': 'equals',
};

const BLANK_TOKEN = '[]';

/**
 * Convert an equation string like "7 + 4 = []" into spoken text
 * "7 plus 4 equals what". Numbers are left as digit strings — the TTS
 * engine reads "7" as "seven" and "12.5" as "twelve point five".
 *
 * @param {string} equation
 * @returns {string}
 */
export function equationToSpeech(equation) {
  if (!equation) return '';
  return equation
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token === BLANK_TOKEN) return 'what';
      return OPERATOR_WORDS[token] ?? token;
    })
    .join(' ');
}

/**
 * Join option values into a spoken list: [11,9,12] -> "11, 9, or 12".
 */
function optionsToSpeech(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  if (options.length === 1) return String(options[0]);
  const head = options.slice(0, -1).join(', ');
  const last = options[options.length - 1];
  return `${head} or ${last}`;
}

/**
 * Convert a follow-pattern's rows into spoken text.
 * Each row: "<expr> is <result>." The last row (result null) is "<expr> is what?".
 */
function patternToSpeech(pattern) {
  return pattern
    .map((row) => {
      const expr = equationToSpeech(row.expression);
      return row.result === null ? `${expr} is what?` : `${expr} is ${row.result}.`;
    })
    .join(' ');
}

/**
 * Top-level entry point: exercise -> spoken text.
 *
 * @param {object|null} exercise
 * @returns {string}
 */
export function exerciseToSpeech(exercise) {
  if (!exercise) return '';

  if (exercise.type === 'follow-pattern' && Array.isArray(exercise.pattern)) {
    const rows = patternToSpeech(exercise.pattern);
    const opts = optionsToSpeech(exercise.options);
    return opts ? `${rows} Options: ${opts}.` : rows;
  }

  const eq = equationToSpeech(exercise.equation);

  if (exercise.type === 'select-answer' && Array.isArray(exercise.options)) {
    const opts = optionsToSpeech(exercise.options);
    return opts ? `${eq}. Options: ${opts}.` : eq;
  }

  // type-answer and any unknown type: equation only
  return eq;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/speakable.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/speakable.js src/utils/__tests__/speakable.test.js
git commit -m "feat: add speakable util — exercise to text-to-speech text"
```

---

### Task 2: useSpeech Hook

**Files:**
- Create: `src/hooks/useSpeech.js`
- Create: `src/hooks/__tests__/useSpeech.test.jsx`

> Note: `src/hooks/` does not exist yet — create it. jsdom does **not** implement `speechSynthesis`, so tests must install a mock on `window` before importing/using the hook.

- [ ] **Step 1: Write failing tests**

Create `src/hooks/__tests__/useSpeech.test.jsx`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeech } from '../useSpeech';

function installSpeechMock() {
  const speak = vi.fn();
  const cancel = vi.fn();
  // jsdom lacks SpeechSynthesisUtterance — provide a minimal stand-in.
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.rate = 1;
      this.lang = '';
      this.voice = null;
    }
  };
  window.speechSynthesis = { speak, cancel, speaking: false, getVoices: () => [] };
  return { speak, cancel };
}

describe('useSpeech', () => {
  afterEach(() => {
    delete window.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;
    vi.restoreAllMocks();
  });

  it('reports supported=false when API absent', () => {
    delete window.speechSynthesis;
    const { result } = renderHook(() => useSpeech());
    expect(result.current.supported).toBe(false);
  });

  it('speak is a no-op when unsupported (does not throw)', () => {
    delete window.speechSynthesis;
    const { result } = renderHook(() => useSpeech());
    expect(() => act(() => result.current.speak('hello'))).not.toThrow();
  });

  it('reports supported=true and speaks an utterance', () => {
    const { speak } = installSpeechMock();
    const { result } = renderHook(() => useSpeech());
    expect(result.current.supported).toBe(true);
    act(() => result.current.speak('7 plus 4 equals what'));
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0];
    expect(utterance.text).toBe('7 plus 4 equals what');
  });

  it('cancels any in-flight speech before speaking (interrupt on retap)', () => {
    const { speak, cancel } = installSpeechMock();
    const { result } = renderHook(() => useSpeech());
    act(() => result.current.speak('first'));
    act(() => result.current.speak('second'));
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('applies the provided rate to the utterance', () => {
    const { speak } = installSpeechMock();
    const { result } = renderHook(() => useSpeech({ rate: 0.7 }));
    act(() => result.current.speak('slow please'));
    expect(speak.mock.calls[0][0].rate).toBe(0.7);
  });

  it('does not speak empty text', () => {
    const { speak } = installSpeechMock();
    const { result } = renderHook(() => useSpeech());
    act(() => result.current.speak(''));
    expect(speak).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useSpeech.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `src/hooks/useSpeech.js`:

```js
import { useCallback, useMemo } from 'react';

const isSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Wrap the browser SpeechSynthesis API. Fully offline. No-ops gracefully
 * when the API is unavailable.
 *
 * @param {{ rate?: number, lang?: string, voiceURI?: string|null }} [opts]
 * @returns {{ speak: (text: string) => void, cancel: () => void, supported: boolean }}
 */
export function useSpeech({ rate = 1.0, lang = 'en-US', voiceURI = null } = {}) {
  const supported = useMemo(() => isSupported(), []);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
  }, [supported]);

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return;
      // Interrupt anything already speaking so a retap restarts cleanly.
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = lang;
      if (voiceURI) {
        const match = window.speechSynthesis
          .getVoices()
          .find((v) => v.voiceURI === voiceURI);
        if (match) utterance.voice = match;
      }
      window.speechSynthesis.speak(utterance);
    },
    [supported, rate, lang, voiceURI]
  );

  return { speak, cancel, supported };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useSpeech.test.jsx`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSpeech.js src/hooks/__tests__/useSpeech.test.jsx
git commit -m "feat: add useSpeech hook wrapping SpeechSynthesis with graceful no-op"
```

---

### Task 3: Database Schema Bump

**Files:**
- Modify: `src/db/database.js`

- [ ] **Step 1: Add version(2) with backfill**

Replace `src/db/database.js`:

```js
import Dexie from 'dexie';

export const db = new Dexie('LuLinDingo');

db.version(1).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
});

// v2: read-aloud (text-to-speech) preferences on the user row.
// No index changes — Dexie stores extra fields freely — but we backfill
// defaults so existing rows read predictable values instead of undefined.
db.version(2).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
}).upgrade(async (tx) => {
  await tx.table('users').toCollection().modify((user) => {
    if (user.readAloud === undefined) user.readAloud = false;
    if (user.speechRate === undefined) user.speechRate = 1.0;
    if (user.speechVoiceURI === undefined) user.speechVoiceURI = null;
  });
});
```

> The `stores()` schema is repeated verbatim because Dexie requires each version to declare its full table set; only the `upgrade` differs.

- [ ] **Step 2: Verify existing DB tests still pass**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: All PASS (fake-indexeddb honors the upgrade)

- [ ] **Step 3: Commit**

```bash
git add src/db/database.js
git commit -m "feat: bump Dexie to v2 — backfill read-aloud user fields"
```

---

### Task 4: Store Defaults for New Users

**Files:**
- Modify: `src/stores/useGameStore.js`
- Modify: `src/stores/__tests__/useGameStore.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/stores/__tests__/useGameStore.test.js`:

```js
describe('createUser read-aloud defaults', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
  });

  it('defaults readAloud off and speechRate 1.0', async () => {
    await getStore().createUser('Ava', '6-7');
    const { user } = getStore();
    expect(user.readAloud).toBe(false);
    expect(user.speechRate).toBe(1.0);
  });
});

describe('updateSettings read-aloud', () => {
  beforeEach(async () => {
    const { seedDatabase } = await import('../../db/seed.js');
    await seedDatabase();
    await getStore().createUser('Ben', '8-10');
  });

  it('persists readAloud and speechRate without clearing progress', async () => {
    await getStore().updateSettings({ readAloud: true, speechRate: 0.7 });
    const { user } = getStore();
    expect(user.readAloud).toBe(true);
    expect(user.speechRate).toBe(0.7);
    const fresh = await db.users.get(user.id);
    expect(fresh.readAloud).toBe(true);
    expect(fresh.speechRate).toBe(0.7);
  });
});
```

> `updateSettings` already merges arbitrary fields and only clears progress when `settings.ageBand` is set, so these tests should pass once `createUser` writes the defaults. If `updateSettings` tests fail because of the existing `ageBand`-only clear branch, no code change is needed there — verify the branch is untouched.

- [ ] **Step 2: Run tests to verify the createUser default test fails**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: `createUser` default test FAILS (fields not written)

- [ ] **Step 3: Add defaults to createUser**

In `src/stores/useGameStore.js`, in `createUser`, add to the `db.users.add({ ... })` object (alongside `ageBand`, `startingTier`, etc.):

```js
      readAloud: false,
      speechRate: 1.0,
      speechVoiceURI: null,
```

No other change — `updateSettings` already spreads new fields through to Dexie and store state.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/__tests__/useGameStore.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/useGameStore.js src/stores/__tests__/useGameStore.test.js
git commit -m "feat: createUser writes read-aloud defaults"
```

---

### Task 5: SpeakerButton Shared Component

**Files:**
- Create: `src/components/shared/SpeakerButton.jsx`
- Create: `src/components/shared/SpeakerButton.module.css`
- Create: `src/components/shared/__tests__/SpeakerButton.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/shared/__tests__/SpeakerButton.test.jsx`:

```js
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpeakerButton from '../SpeakerButton';

function installSpeechMock() {
  const speak = vi.fn();
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.rate = 1; this.lang = ''; this.voice = null; }
  };
  window.speechSynthesis = { speak, cancel: vi.fn(), speaking: false, getVoices: () => [] };
  return { speak };
}

describe('SpeakerButton', () => {
  afterEach(() => {
    delete window.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;
    vi.restoreAllMocks();
  });

  it('renders null when SpeechSynthesis is unsupported', () => {
    delete window.speechSynthesis;
    const { container } = render(<SpeakerButton text="7 plus 4 equals what" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an accessible button when supported', () => {
    installSpeechMock();
    render(<SpeakerButton text="7 plus 4 equals what" />);
    expect(screen.getByRole('button', { name: /read aloud/i })).toBeInTheDocument();
  });

  it('speaks the text on click', async () => {
    const { speak } = installSpeechMock();
    render(<SpeakerButton text="7 plus 4 equals what" />);
    await userEvent.click(screen.getByRole('button', { name: /read aloud/i }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('7 plus 4 equals what');
  });

  it('passes rate through to the utterance', async () => {
    const { speak } = installSpeechMock();
    render(<SpeakerButton text="slow" rate={0.7} />);
    await userEvent.click(screen.getByRole('button', { name: /read aloud/i }));
    expect(speak.mock.calls[0][0].rate).toBe(0.7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/shared/__tests__/SpeakerButton.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement component**

Create `src/components/shared/SpeakerButton.jsx`:

```jsx
import { motion } from 'framer-motion';
import { useSpeech } from '../../hooks/useSpeech';
import styles from './SpeakerButton.module.css';

/**
 * Tap-to-replay speaker button. Renders nothing when the SpeechSynthesis
 * API is unavailable. Speaks the `text` prop (already composed by
 * speakable.js) at the given rate.
 */
export default function SpeakerButton({ text, rate = 1.0, voiceURI = null }) {
  const { speak, supported } = useSpeech({ rate, voiceURI });

  if (!supported) return null;

  return (
    <motion.button
      type="button"
      className={styles.button}
      aria-label="Read aloud"
      title="Read aloud"
      onClick={() => speak(text)}
      whileTap={{ scale: 0.9 }}
    >
      <span aria-hidden="true">🔊</span>
    </motion.button>
  );
}
```

Create `src/components/shared/SpeakerButton.module.css`:

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  font-size: var(--text-xl);
  cursor: pointer;
}

.button:active {
  background: var(--border);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/shared/__tests__/SpeakerButton.test.jsx`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/SpeakerButton.jsx src/components/shared/SpeakerButton.module.css src/components/shared/__tests__/SpeakerButton.test.jsx
git commit -m "feat: add shared SpeakerButton component"
```

---

### Task 6: Wire SpeakerButton into Exercise Components

**Files:**
- Modify: `src/components/lesson/exercises/TypeTheAnswer.jsx`
- Modify: `src/components/lesson/exercises/SelectTheAnswer.jsx`
- Modify: `src/components/lesson/exercises/FollowThePattern.jsx`

Each component already receives `exercise`. They need the user's `speechRate` and the composed speech text. Pass `speechRate` down from `LessonEngine` (added in Task 7) via a new prop, defaulting to 1.0 so the components are testable in isolation.

- [ ] **Step 1: TypeTheAnswer**

Add imports at top:

```js
import SpeakerButton from '../../shared/SpeakerButton';
import { exerciseToSpeech } from '../../../utils/speakable';
```

Change the signature to accept `speechRate`:

```js
export default function TypeTheAnswer({ exercise, onAnswer, speechRate = 1.0 }) {
```

Render the button next to the instruction (replace the `<p className={styles.instruction}>` line):

```jsx
      <div className={styles.instructionRow}>
        <p className={styles.instruction}>{exercise.instruction || 'Type the answer'}</p>
        <SpeakerButton text={exerciseToSpeech(exercise)} rate={speechRate} />
      </div>
```

Add to `TypeTheAnswer.module.css`:

```css
.instructionRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}
```

- [ ] **Step 2: SelectTheAnswer** — same pattern: import `SpeakerButton` + `exerciseToSpeech`, add `speechRate = 1.0` prop, wrap the instruction in an `.instructionRow` with the button, add the CSS rule to `SelectTheAnswer.module.css`.

- [ ] **Step 3: FollowThePattern** — same pattern, add the CSS rule to `FollowThePattern.module.css`.

- [ ] **Step 4: Run exercise-component tests (if any) + full suite**

Run: `npx vitest run`
Expected: All PASS. (These components have no dedicated tests today; the SpeakerButton renders `null` in jsdom unless a test installs the mock, so existing render tests are unaffected.)

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/exercises/
git commit -m "feat: add read-aloud speaker button to all exercise types"
```

---

### Task 7: Autoplay in LessonEngine

**Files:**
- Modify: `src/components/lesson/LessonEngine.jsx`

- [ ] **Step 1: Wire rate + autoplay**

Add imports:

```js
import { useEffect } from 'react'; // extend existing react import
import { useSpeech } from '../../hooks/useSpeech';
import { exerciseToSpeech } from '../../utils/speakable';
```

Read prefs from the user (near `const ageBand = ...`):

```js
  const readAloud = user?.readAloud ?? false;
  const speechRate = user?.speechRate ?? 1.0;
  const { speak } = useSpeech({ rate: speechRate });
```

Autoplay on exercise change (after `currentExercise` is defined; not while summary is shown):

```js
  useEffect(() => {
    if (readAloud && currentExercise && !showSummary) {
      speak(exerciseToSpeech(currentExercise));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseIndex, currentExercise?.equation, readAloud, showSummary]);
```

Pass `speechRate` to the rendered exercise component (in the `props` object inside `exerciseComponent`):

```js
    const props = { exercise: currentExercise, onAnswer: handleAnswer, speechRate };
```

- [ ] **Step 2: Run full suite**

Run: `npx vitest run`
Expected: All PASS (LessonEngine tests, if present, run in jsdom where `useSpeech` reports unsupported → `speak` is a no-op; no mock needed).

- [ ] **Step 3: Commit**

```bash
git add src/components/lesson/LessonEngine.jsx
git commit -m "feat: autoplay exercise audio when read-aloud is enabled"
```

---

### Task 8: Settings UI Toggle + Rate

**Files:**
- Modify: `src/components/settings/SettingsPanel.jsx`

- [ ] **Step 1: Add a Read-Aloud section**

After the existing "Starting Level" section, add:

```jsx
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Read Aloud</h3>
              <label className={styles.toggleRow}>
                <span className={styles.optLabel}>Speak questions aloud</span>
                <input
                  type="checkbox"
                  checked={user.readAloud ?? false}
                  onChange={(e) => updateSettings({ readAloud: e.target.checked })}
                />
              </label>
              {(user.readAloud ?? false) && (
                <div className={styles.options}>
                  <button
                    className={`${styles.option} ${(user.speechRate ?? 1.0) === 1.0 ? styles.selected : ''}`}
                    onClick={() => updateSettings({ speechRate: 1.0 })}
                  >
                    <span className={styles.optLabel}>Normal speed</span>
                  </button>
                  <button
                    className={`${styles.option} ${(user.speechRate ?? 1.0) === 0.7 ? styles.selected : ''}`}
                    onClick={() => updateSettings({ speechRate: 0.7 })}
                  >
                    <span className={styles.optLabel}>Slow speed</span>
                  </button>
                </div>
              )}
            </div>
```

Add to `SettingsPanel.module.css`:

```css
.toggleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}
```

> `updateSettings` writes `{ readAloud }` / `{ speechRate }` straight through to Dexie and store state without touching progress (the progress-clear branch only fires when `settings.ageBand` is present), so the toggle is reactive immediately.

- [ ] **Step 2: Run full suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/SettingsPanel.jsx
git commit -m "feat: read-aloud toggle and speed control in settings"
```

---

### Task 9: Full Verification

- [ ] **Step 1: Full test suite** — `npx vitest run` → all PASS
- [ ] **Step 2: Lint** — `npm run lint` → clean
- [ ] **Step 3: Build** — `npx vite build` → succeeds
- [ ] **Step 4: Manual smoke (real browser, not jsdom)**
  1. Settings → enable Read Aloud → start a lesson → audio autoplays the equation.
  2. Tap the speaker button mid-question → audio replays from the start (interrupts).
  3. `select-answer` question → options are spoken after the equation.
  4. `follow-pattern` question → rows are spoken in sequence, then options.
  5. Set Slow speed → audio is noticeably slower.
  6. Disable Read Aloud → no autoplay; speaker button still present for manual taps.
  7. Browser/webview without SpeechSynthesis (or stub it out) → no speaker buttons, no errors.

---

## Test Plan

- **Pure logic (`speakable.js`)** — fully unit-tested with no mocks: operator mapping, blank → "what", decimals left as digits, per-type composition (type-answer / select-answer / follow-pattern), option joining ("a, b, or c").
- **`useSpeech` hook** — `speechSynthesis` is **not** implemented in jsdom, so every test installs a mock (`window.speechSynthesis = { speak, cancel, speaking, getVoices }` and a stub `SpeechSynthesisUtterance` class) before exercising the hook. Cover: unsupported → `supported=false` and `speak` no-ops without throwing; supported → builds utterance with correct `text`/`rate`; retap calls `cancel` before `speak`; empty text does not speak.
- **`SpeakerButton`** — renders `null` when unsupported; renders an accessible button (aria-label "Read aloud") when supported; click triggers `speak` with the composed text; `rate` flows through.
- **Store** — `createUser` writes `readAloud=false` / `speechRate=1.0`; `updateSettings` persists both without clearing progress.
- **Mocking note (important):** jsdom has no SpeechSynthesis. Any test that renders a component which mounts `SpeakerButton` while expecting it to be visible **must** install the mock first; otherwise the button correctly renders `null`. Tests that don't care about audio need no mock — the no-op path is the default.
- **Regression:** run the full suite after Tasks 3, 6, 7, 8 since they touch shared files (db, exercise components, LessonEngine, settings).

---

## Risks / Edge Cases / Out of Scope

**Risks & edge cases**
- **Voices load asynchronously.** `getVoices()` is often empty on first call (fires `voiceschanged` later). v1 sidesteps this by not picking a voice (engine default); the reserved `speechVoiceURI` field is read defensively (`find(...)` may return undefined → fall back to default). Do not block speech on voice availability.
- **Autoplay policy / user gesture.** Some browsers require a user gesture before audio. The first autoplay may be silent until the kid interacts; the manual speaker button (a real tap) always works. Acceptable for v1 — do not add workarounds that fight the platform.
- **Interrupt vs queue.** `speak` cancels first so rapid retaps restart cleanly rather than stacking utterances. Without this, kids tapping repeatedly would queue minutes of audio.
- **Symbol drift.** The generator emits `×`/`÷` (U+00D7/U+00F7), not `x`/`/`. `OPERATOR_WORDS` keys must match exactly; unknown tokens fall through as-is (a number) so a drift is graceful but silently wrong-sounding — covered by the explicit symbol tests.
- **Decimals.** Challenger division yields e.g. `12.5`; left as a digit string, the engine reads "twelve point five". Verified by test, but engine pronunciation varies by platform — acceptable.
- **Navigating away mid-speech.** Not handled in v1 (speech may finish after route change). Low impact; a future `cancel()` on unmount in LessonEngine could be added if it proves annoying.

**Out of scope (v1)**
- Voice picker UI (field reserved, not exposed).
- Non-English languages / localized operator words (hardcoded English, `lang='en-US'`).
- Speaking feedback banners, lesson summary, or onboarding/placement screens.
- Highlighting words as they're spoken (karaoke-style).
- Sound effects or pronunciation tuning per operation.
- Cancelling speech on route change / component unmount.
```