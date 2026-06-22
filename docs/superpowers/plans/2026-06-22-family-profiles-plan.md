# Family Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Milestones are sequenced to **de-risk the migration first** — do not reorder.

**Goal:** Turn LuLinDingo from a single-child app into a family app: one device, multiple children, each with their own name, ageBand, startingTier, hearts, XP, streak, placement result, and an **isolated progress namespace**. Add a "Who's playing?" picker on launch and a tappable avatar switcher on the home screen. A parent sets up the family once; a long-press reveals add/remove. This is architecturally invasive: `progress` and `streakHistory` are re-keyed by `userId` and every read/write is rewired.

**Architecture:** The `users` table already supports multiple rows (`++id`). The work is (1) re-keying `progress` to `[userId+lessonId]` and `streakHistory` to `[userId+date]` via a Dexie version bump with a **data-preserving migration** that stamps existing rows with the legacy user's id; (2) tracking an **active profile** via a dedicated singleton `meta` row (id `'app'`, field `activeUserId`) so the picker survives reloads; (3) rewiring every store action and `useLiveQuery` to scope by `activeUserId`; (4) two new UI components — `ProfilePicker` (launch gate) and `AvatarSwitcher` (home header) — plus a parent-gated add/remove flow that reuses `Onboarding`.

**Tech Stack:** React 19, Zustand, Dexie/IndexedDB, Vitest + fake-indexeddb, framer-motion.

---

## Key Design Decisions

- **Compound keys, not a userId index.** `progress` becomes `[userId+lessonId]` (primary key) and `streakHistory` becomes `[userId+date]`. Why: a compound primary key makes per-child rows uniquely addressable and lets `db.progress.where('userId').equals(uid)` scope every query without a separate index or row-scan filter.
- **Active profile = singleton `meta` row, not store-only.** Add a `meta` table (`'&id'`, single row `{ id: 'app', activeUserId }`). Why: the app reloads on reset and PWA relaunch; persisting `activeUserId` in IndexedDB means a returning family lands on the last child or the picker deterministically, with no localStorage drift from the Dexie source of truth.
- **`loadUser()` resolves the active profile, never `users[0]`.** It reads `meta.activeUserId`; if set and valid → load that child and skip the picker; if unset but children exist → show picker; if no children → onboarding. Why: `users[0]` is the single bug we are removing — keeping it anywhere reintroduces cross-child leakage.
- **Migration assigns ALL existing data to the legacy child (CRITICAL).** The v2 upgrade reads the existing `users[0]` (if any), then stamps every existing `progress` row with `userId = legacyId` and every `streakHistory` row likewise, and sets `meta.activeUserId = legacyId`. Why: current users must lose nothing; their single child becomes "child #1" seamlessly and lands straight in the app (no picker on first launch post-update).
- **Every store action takes the active user from the store, scopes writes by it.** `loseHeart/gainHeart/refillHearts/addXp/updateStreak/completeLesson` already mutate `db.users.update(user.id, …)` — that part is correct. The change is `completeLesson` and `updateStreak` now write `{ userId: user.id, … }` rows, and `updateSettings`' progress reset scopes its `clear()`/`bulkPut` to the active user only.
- **Launch picker + add-child reuse onboarding.** `ProfilePicker` lists children + an "Add" tile (parent-gated). Adding a child runs the *existing* `Onboarding`/`PlacementTest` flow, then `createUser` (now also persists `userId` into the skip rows and sets the new child active). Why: zero new onboarding code; one tested path for first and Nth child.
- **Parent gate = long-press + simple math challenge.** Add/remove is revealed by a long-press (600ms) on the picker, then guarded by a "what's 7 × 8?" style speed bump (kids can't read multi-digit products reliably). Why: lightweight, offline, no PIN storage; deletion of a child is destructive so it must not be one tap from a 6-year-old.
- **Deleting the active child re-resolves.** Removing a child deletes its `users` row + all its `progress`/`streakHistory`. If it was active, `meta.activeUserId` is cleared and the app falls back to the picker (or onboarding if it was the last child).

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/db/database.js` | Modify | Add `meta` table; `db.version(2)` with compound keys + data-preserving upgrade |
| `src/db/__tests__/migration.test.js` | Create | Prove v1→v2 preserves legacy progress/streak and stamps userId |
| `src/db/profileMeta.js` | Create | `getActiveUserId()`, `setActiveUserId(id)`, `clearActiveUserId()` helpers over `meta` |
| `src/db/__tests__/profileMeta.test.js` | Create | Tests for meta accessors |
| `src/stores/useGameStore.js` | Modify | `loadUser` resolves active profile; add `loadProfiles`, `switchProfile`, `deleteProfile`; scope every progress/streak write by `userId` |
| `src/stores/__tests__/useGameStore.test.js` | Modify | Tests for active-profile resolution, switching, deletion, per-child isolation |
| `src/components/onboarding/ProfilePicker.jsx` | Create | "Who's playing?" launch gate + add/remove (parent-gated) |
| `src/components/onboarding/ProfilePicker.module.css` | Create | Picker styling |
| `src/components/onboarding/ParentGate.jsx` | Create | Long-press-revealed math challenge guarding destructive actions |
| `src/components/onboarding/ParentGate.module.css` | Create | Gate styling |
| `src/components/onboarding/Onboarding.jsx` | Modify | Accept `onComplete`/`mode='add'` so add-child reuses it without auto-navigating |
| `src/components/home/AvatarSwitcher.jsx` | Create | Tappable avatar in home header → opens ProfilePicker as switcher |
| `src/components/home/AvatarSwitcher.module.css` | Create | Avatar styling |
| `src/App.jsx` | Modify | Gate: no children → Onboarding; children but no active → ProfilePicker; active → app |
| `src/components/home/LearningPath.jsx` | Modify | Scope `db.progress` live query by `activeUserId`; mount `AvatarSwitcher` |
| `src/components/progress/UnitBadges.jsx` | Modify | Scope `db.progress` live query by `activeUserId` |
| `src/components/progress/StreakCalendar.jsx` | Modify | Scope `db.streakHistory` live query by `activeUserId` |
| `src/components/settings/SettingsPanel.jsx` | Modify | Scope progress reset by active user; add "Manage profiles" entry |

---

## Schema: before / after

**v1 (current):**
```js
db.version(1).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: 'lessonId, completed',
  streakHistory: 'date',
});
```

**v2 (target):**
```js
db.version(2).stores({
  users: '++id, name',
  units: 'id, moduleId, topic, order',
  lessons: 'id, unitId, order',
  progress: '[userId+lessonId], userId, completed',   // compound PK + userId index
  streakHistory: '[userId+date], userId',             // compound PK + userId index
  meta: '&id',                                         // singleton: { id:'app', activeUserId }
})
.upgrade(async (tx) => { /* see Milestone 1 */ });
```

> **Dexie note:** changing a primary key requires Dexie to recreate the table; the `.upgrade` callback runs against the *new* schema, so the strategy is: in the upgrade, read the old rows (Dexie exposes them through the transaction on the renamed store), assign `userId`, and `put` them back. Because the PK shape changes, the safest, well-supported approach is to **read all legacy rows into memory before the version transaction clears them** — Dexie's `upgrade` hands you a `tx` whose `progress`/`streakHistory` tables already reflect old data keyed by the old PK. We bulk-rewrite each row with the added `userId`. The migration test (Milestone 1) is the proof this works against `fake-indexeddb`.

---

## Milestone 1 — Migration first (CRITICAL, de-risk before anything else)

**Files:** `src/db/database.js`, `src/db/__tests__/migration.test.js`

- [ ] **Step 1: Write the failing migration test.**

Create `src/db/__tests__/migration.test.js`. The test seeds a **v1 database by hand** (open Dexie at version 1 with the old schema, add a user + progress rows keyed by `lessonId` + streakHistory rows keyed by `date`), closes it, then opens the **v2** schema and asserts the upgrade preserved and stamped everything.

```js
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

const DB_NAME = 'LuLinDingo';

async function seedV1() {
  const v1 = new Dexie(DB_NAME, { indexedDB, IDBKeyRange });
  v1.version(1).stores({
    users: '++id, name',
    units: 'id, moduleId, topic, order',
    lessons: 'id, unitId, order',
    progress: 'lessonId, completed',
    streakHistory: 'date',
  });
  await v1.open();
  const uid = await v1.users.add({ name: 'Legacy Kid', ageBand: '8-10', totalXp: 120, hearts: 7 });
  await v1.progress.bulkAdd([
    { lessonId: 'math-addition-lesson-1', completed: true, stars: 3, bestAccuracy: 100, attempts: 1 },
    { lessonId: 'math-addition-lesson-2', completed: true, stars: 2, bestAccuracy: 80, attempts: 2 },
  ]);
  await v1.streakHistory.bulkAdd([
    { date: '2026-06-20', lessonsCompleted: 2, xpEarned: 40 },
    { date: '2026-06-21', lessonsCompleted: 1, xpEarned: 20 },
  ]);
  v1.close();
  return uid;
}

describe('v1 → v2 migration', () => {
  beforeEach(async () => {
    await Dexie.delete(DB_NAME);
  });

  it('stamps existing progress rows with the legacy userId and loses nothing', async () => {
    const legacyId = await seedV1();
    const { db } = await import('../database.js'); // v2 schema
    await db.open();

    const progress = await db.progress.toArray();
    expect(progress).toHaveLength(2);
    for (const p of progress) {
      expect(p.userId).toBe(legacyId);
    }
    expect(progress.map((p) => p.lessonId).sort()).toEqual([
      'math-addition-lesson-1',
      'math-addition-lesson-2',
    ]);
    // first-class fields survive
    expect(progress.find((p) => p.lessonId === 'math-addition-lesson-1').stars).toBe(3);
  });

  it('stamps streakHistory rows with the legacy userId', async () => {
    const legacyId = await seedV1();
    const { db } = await import('../database.js');
    await db.open();
    const hist = await db.streakHistory.toArray();
    expect(hist).toHaveLength(2);
    for (const h of hist) expect(h.userId).toBe(legacyId);
  });

  it('sets meta.activeUserId to the legacy user so they skip the picker', async () => {
    const legacyId = await seedV1();
    const { db } = await import('../database.js');
    await db.open();
    const meta = await db.meta.get('app');
    expect(meta.activeUserId).toBe(legacyId);
  });

  it('fresh install (no legacy user) creates no orphan rows and no active user', async () => {
    const { db } = await import('../database.js');
    await db.open();
    expect(await db.progress.count()).toBe(0);
    const meta = await db.meta.get('app');
    expect(meta?.activeUserId == null).toBe(true);
  });
});
```

> Because `src/database.js` is a module singleton, use `await import('../database.js')` and `Dexie.delete` + `vi.resetModules()` between tests so each test re-opens cleanly. Add `vi.resetModules()` in `beforeEach` if the singleton caches across tests.

- [ ] **Step 2: Run it; confirm it fails** (`npx vitest run src/db/__tests__/migration.test.js`). Expected: FAIL — v2 schema/upgrade not written.

- [ ] **Step 3: Implement the v2 schema + upgrade** in `src/db/database.js`:

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

db.version(2)
  .stores({
    users: '++id, name',
    units: 'id, moduleId, topic, order',
    lessons: 'id, unitId, order',
    progress: '[userId+lessonId], userId, completed',
    streakHistory: '[userId+date], userId',
    meta: '&id',
  })
  .upgrade(async (tx) => {
    // Resolve the single legacy child (if the DB had one).
    const users = await tx.table('users').toArray();
    const legacyId = users.length > 0 ? users[0].id : null;

    if (legacyId != null) {
      const oldProgress = await tx.table('progress').toArray();
      await tx.table('progress').clear();
      await tx.table('progress').bulkPut(
        oldProgress.map((p) => ({ ...p, userId: legacyId }))
      );

      const oldStreak = await tx.table('streakHistory').toArray();
      await tx.table('streakHistory').clear();
      await tx.table('streakHistory').bulkPut(
        oldStreak.map((h) => ({ ...h, userId: legacyId }))
      );
    }

    await tx.table('meta').put({ id: 'app', activeUserId: legacyId });
  });
```

> **Why clear-then-bulkPut:** the PK shape changed from `lessonId` → `[userId+lessonId]`. Reading old rows, clearing, and re-putting with `userId` present lets Dexie compute the new compound key. Keep the upgrade idempotent-safe: it only runs once on the v1→v2 transition.

- [ ] **Step 4: Run; confirm all 4 migration tests PASS.**

- [ ] **Step 5: Commit** — `feat(db): re-key progress & streakHistory by userId with data-preserving v2 migration`.

---

## Milestone 2 — Active-profile meta accessors

**Files:** `src/db/profileMeta.js`, `src/db/__tests__/profileMeta.test.js`

- [ ] **Step 1: Failing tests** for `getActiveUserId`, `setActiveUserId`, `clearActiveUserId`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';

beforeEach(async () => {
  vi.resetModules();
  await Dexie.delete('LuLinDingo');
});

it('returns null when no meta row exists', async () => {
  const { db } = await import('../database.js'); await db.open();
  const { getActiveUserId } = await import('../profileMeta.js');
  expect(await getActiveUserId()).toBeNull();
});

it('round-trips an active user id', async () => {
  const { db } = await import('../database.js'); await db.open();
  const { setActiveUserId, getActiveUserId } = await import('../profileMeta.js');
  await setActiveUserId(5);
  expect(await getActiveUserId()).toBe(5);
});

it('clear resets to null', async () => {
  const { db } = await import('../database.js'); await db.open();
  const { setActiveUserId, clearActiveUserId, getActiveUserId } = await import('../profileMeta.js');
  await setActiveUserId(5);
  await clearActiveUserId();
  expect(await getActiveUserId()).toBeNull();
});
```

- [ ] **Step 2: Run; confirm fail.**

- [ ] **Step 3: Implement** `src/db/profileMeta.js`:

```js
import { db } from './database';

const META_ID = 'app';

export async function getActiveUserId() {
  const row = await db.meta.get(META_ID);
  return row?.activeUserId ?? null;
}

export async function setActiveUserId(userId) {
  await db.meta.put({ id: META_ID, activeUserId: userId });
}

export async function clearActiveUserId() {
  await db.meta.put({ id: META_ID, activeUserId: null });
}
```

- [ ] **Step 4: Run; confirm PASS.**

- [ ] **Step 5: Commit** — `feat(db): add active-profile meta accessors`.

---

## Milestone 3 — Rewire the store (the heart of the change)

**Files:** `src/stores/useGameStore.js`, `src/stores/__tests__/useGameStore.test.js`

Changes to `useGameStore.js`:

1. **Import** the meta helpers: `import { getActiveUserId, setActiveUserId, clearActiveUserId } from '../db/profileMeta';`
2. **`loadUser` resolves the active profile** instead of `users[0]`:

```js
loadUser: async () => {
  const activeId = await getActiveUserId();
  const users = await db.users.toArray();
  // No children → onboarding.
  if (users.length === 0) {
    set({ user: null, profiles: [], isLoaded: true });
    return;
  }
  // Children exist but none active (or active id stale) → picker.
  const active = activeId != null ? users.find((u) => u.id === activeId) : null;
  if (!active) {
    set({ user: null, profiles: users, isLoaded: true });
    return;
  }
  const refillResult = calculateCurrentHearts(active.hearts, active.heartsLastRefill);
  const currentStreak = calculateStreak(active.lastActiveDate, active.currentStreak);
  const updates = {};
  if (refillResult.hearts !== active.hearts) {
    updates.hearts = refillResult.hearts;
    updates.heartsLastRefill = refillResult.heartsLastRefill;
  }
  if (currentStreak !== active.currentStreak) updates.currentStreak = currentStreak;
  if (Object.keys(updates).length > 0) await db.users.update(active.id, updates);
  set({ user: { ...active, ...updates }, profiles: users, isLoaded: true });
},
```

3. **New store fields & actions:**

```js
profiles: [],   // all children, for picker/switcher

loadProfiles: async () => {
  const profiles = await db.users.toArray();
  set({ profiles });
},

switchProfile: async (userId) => {
  await setActiveUserId(userId);
  await get().loadUser();   // re-resolves active user + refills
},

deleteProfile: async (userId) => {
  await db.transaction('rw', db.users, db.progress, db.streakHistory, db.meta, async () => {
    await db.progress.where('userId').equals(userId).delete();
    await db.streakHistory.where('userId').equals(userId).delete();
    await db.users.delete(userId);
    const active = await getActiveUserId();
    if (active === userId) await clearActiveUserId();
  });
  await get().loadUser();   // falls back to picker or onboarding
},
```

4. **`createUser` writes `userId` into skip rows, persists profile, sets it active:**

```js
createUser: async (name, ageBand, options = {}) => {
  const { startingTier = 1, placementMethod = 'manual' } = options;
  const id = await db.users.add({ name, totalXp: 0, hearts: MAX_HEARTS, /* …unchanged… */ ageBand, startingTier, placementMethod, createdAt: new Date() });
  const allLessons = await db.lessons.toArray();
  const unitSkippedIds = getSkippedLessonIds(ageBand, allLessons);
  const allSkippedIds = [...unitSkippedIds];
  if (startingTier > 1) {
    const units = await db.units.where('moduleId').equals('math').sortBy('order');
    const firstActiveId = getFirstActiveUnitId(units, unitSkippedIds);
    if (firstActiveId) allSkippedIds.push(...getPlacementSkippedLessonIds(startingTier, firstActiveId, allLessons));
  }
  if (allSkippedIds.length > 0) {
    await db.progress.bulkPut(allSkippedIds.map((lessonId) => ({
      userId: id, lessonId, completed: true, stars: 3, bestAccuracy: 100, attempts: 0, completedAt: new Date(),
    })));
  }
  await setActiveUserId(id);          // new child becomes active immediately
  const user = await db.users.get(id);
  set({ user });
  await get().loadProfiles();
},
```

5. **`completeLesson` scopes by active user:**

```js
completeLesson: async (lessonId, accuracy) => {
  const { user } = get();
  if (!user) return;
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  const existing = await db.progress.get([user.id, lessonId]);   // compound key
  await db.progress.put({
    userId: user.id, lessonId, completed: true,
    stars: existing ? Math.max(existing.stars, stars) : stars,
    bestAccuracy: existing ? Math.max(existing.bestAccuracy, accuracy) : accuracy,
    attempts: (existing?.attempts || 0) + 1, completedAt: new Date(),
  });
  const today = getLocalDateString();
  const hist = await db.streakHistory.get([user.id, today]);     // compound key
  if (hist) {
    await db.streakHistory.update([user.id, today], {
      lessonsCompleted: hist.lessonsCompleted + 1,
      xpEarned: hist.xpEarned + get().lessonXp,
    });
  }
},
```

6. **`updateStreak` writes a userId-stamped streak row:**

```js
await db.streakHistory.put({ userId: user.id, date: today, lessonsCompleted: 0, xpEarned: 0 });
```

7. **`updateSettings` scopes its progress reset to the active child only** (must not wipe siblings):

```js
if (settings.ageBand) {
  await db.progress.where('userId').equals(user.id).delete();   // not db.progress.clear()
  const allLessons = await db.lessons.toArray();
  const skippedIds = getSkippedLessonIds(settings.ageBand, allLessons);
  if (skippedIds.length > 0) {
    await db.progress.bulkPut(skippedIds.map((lessonId) => ({
      userId: user.id, lessonId, completed: true, stars: 3, bestAccuracy: 100, attempts: 0, completedAt: new Date(),
    })));
  }
}
```

(`loseHeart/gainHeart/refillHearts/addXp` already key on `user.id` for `db.users.update` — unchanged.)

- [ ] **Step 1: Write failing tests** in `useGameStore.test.js`. Cover:
  - `createUser` stamps `progress.userId` on skip rows and sets the new user active (`getActiveUserId()` === new id).
  - **Per-child isolation:** create child A and child B; complete a lesson as A; `switchProfile(B)`; B's `db.progress.where('userId').equals(B)` has zero completed lessons not seeded for B; A's are intact.
  - `loadUser` with a set `activeUserId` loads that child; with children but no active → `user` is null, `profiles` populated (picker state); with no children → `user` null, `profiles` empty.
  - `switchProfile` swaps the active user and recomputes hearts.
  - `deleteProfile` removes the child's users/progress/streak rows; deleting the **active** child clears `activeUserId` (next `loadUser` → picker/onboarding); sibling data untouched.
  - `completeLesson` writes to `[userId+lessonId]` for the active child only.
  - `updateSettings({ageBand})` resets only the active child's progress (sibling rows survive).
- [ ] **Step 2: Run; confirm fail.**
- [ ] **Step 3: Implement** the store changes above.
- [ ] **Step 4: Run the store suite + full suite; confirm PASS.**
- [ ] **Step 5: Commit** — `feat(store): scope all progress/streak reads & writes by active profile`.

---

## Milestone 4 — Scope the component live queries

**Files:** `LearningPath.jsx`, `UnitBadges.jsx`, `StreakCalendar.jsx`

Each component reads the active user id from the store and scopes its `useLiveQuery`. Pattern:

```js
const activeUserId = useGameStore((s) => s.user?.id);
const progress = useLiveQuery(
  () => (activeUserId == null ? [] : db.progress.where('userId').equals(activeUserId).toArray()),
  [activeUserId]
);
```

- [ ] **LearningPath.jsx** — `db.progress.toArray()` → scoped by `activeUserId` (dependency array must include `activeUserId` so the query re-runs on switch).
- [ ] **UnitBadges.jsx** — same scoping for `db.progress`.
- [ ] **StreakCalendar.jsx** — `db.streakHistory.toArray()` → `db.streakHistory.where('userId').equals(activeUserId).toArray()`, dep `[activeUserId]`.
- [ ] **Manual check:** switching profile updates the learning path lock states and the streak calendar live (Dexie `useLiveQuery` re-runs when the dep changes).
- [ ] **Commit** — `feat(ui): scope progress & streak live queries to the active profile`.

> No new tests here (thin presentational components); covered by the store isolation tests + the Playwright smoke in Milestone 7.

---

## Milestone 5 — ProfilePicker, ParentGate, App gate

**Files:** `ProfilePicker.jsx` + `.module.css`, `ParentGate.jsx` + `.module.css`, `Onboarding.jsx`, `App.jsx`

- [ ] **ParentGate.jsx** — renders nothing until triggered; when opened, shows a randomly generated single-digit-by-single-digit multiplication ("What is 7 × 8?") with a number input and `onPass`/`onCancel`. Wrong answer reshuffles. This is the speed bump for destructive/parent actions. Keep the question generation in the component (no new util needed; it's UI-local).

- [ ] **ProfilePicker.jsx** — props `{ mode }` where `mode` is `'launch'` or `'switch'`.
  - Reads `profiles` from the store (`loadProfiles` on mount).
  - Renders one avatar tile per child (`AvatarTile`: colored circle with first initial + name + small XP/streak line) → tap calls `switchProfile(child.id)` then closes (switch mode) / lets App re-render (launch mode).
  - An **"Add child"** tile, guarded by `ParentGate`: on pass → render `Onboarding` in `mode='add'` (see below); on complete, `createUser` already sets the new child active.
  - **Long-press (600ms) on a child tile** reveals a remove affordance; tapping remove opens `ParentGate`; on pass → confirm dialog → `deleteProfile(child.id)`.
  - Title: "Who's playing?" (launch) / "Switch player" (switch).

- [ ] **Onboarding.jsx** — add optional props `{ mode = 'first', onComplete }`. When `mode === 'add'`, after `createUser` resolves, call `onComplete?.()` instead of relying on the App-level gate to swap (it will swap anyway because the new child is active, but `onComplete` lets the picker close its overlay). The existing first-run path keeps working unchanged (App swaps to the app once `user` is set).

- [ ] **App.jsx** — replace the single `!user` branch with a three-way gate:

```js
const { user, profiles, isLoaded, loadUser } = useGameStore();
// …loading…
if (!user) {
  // No children at all → first-run onboarding. Children but none active → picker.
  return (
    <div className="app-shell">
      {profiles.length === 0 ? <Onboarding /> : <ProfilePicker mode="launch" />}
    </div>
  );
}
// …router as before…
```

- [ ] **Tests:** light component tests are optional; the critical logic (which screen shows when) is driven by store state already tested in Milestone 3. Add a render test for `ProfilePicker` that, given two profiles in the store, renders two tiles + an Add tile, and that tapping a tile calls `switchProfile`.

- [ ] **Commit** — `feat(ui): add ProfilePicker launch gate, parent gate, and add/remove child flow`.

---

## Milestone 6 — AvatarSwitcher on the home screen + Settings entry

**Files:** `AvatarSwitcher.jsx` + `.module.css`, `LearningPath.jsx`, `SettingsPanel.jsx`

- [ ] **AvatarSwitcher.jsx** — a small circular avatar (initial + child color) rendered in the home header; tap opens `ProfilePicker mode="switch"` as an overlay (reuse the picker; control open state locally or via a `window` event like SettingsPanel's `open-settings`). Shows current child's name.
- [ ] **LearningPath.jsx** — mount `AvatarSwitcher` in the header row.
- [ ] **SettingsPanel.jsx** — (a) the `handleReset` "Reset all progress" currently `clear()`s the whole DB — leave the full reset as the nuclear option but **add a "Manage profiles" button** that opens the switcher/picker so parents can add/remove from settings too; (b) confirm the per-child progress reset (`updateSettings`) from Milestone 3 is wired (it is — Settings calls `updateSettings({ageBand})`, now scoped).
- [ ] **Commit** — `feat(ui): tappable avatar switcher on home + manage-profiles entry in settings`.

---

## Milestone 7 — Full verification

- [ ] **Full suite** — `npx vitest run`. All green.
- [ ] **`npm run validate`** — unchanged (no generator changes), should still pass.
- [ ] **`npx vite build`** — succeeds.
- [ ] **Playwright smoke (manual or scripted):**
  1. Fresh install → Onboarding → create child A → lands in app.
  2. Home → tap avatar → "Add child" → ParentGate (answer math) → Onboarding → create child B → lands as B.
  3. Switch back to A → A's progress/streak/XP intact and distinct from B's.
  4. Complete a lesson as B → switch to A → A's learning path unchanged.
  5. ParentGate → remove child B → if B was active, picker shown; A unaffected.
  6. **Migration in a real browser:** with a v1 IndexedDB present (an existing single-user install), load the updated app → lands straight in the app as the legacy child with all progress, no picker.
- [ ] **Commit any fixes.**

---

## Risks & edge cases

- **Data loss on migration (highest risk).** Mitigated by Milestone-1-first sequencing and the `fake-indexeddb` migration test proving every legacy `progress`/`streakHistory` row survives with `userId` stamped. Do not merge any later milestone until Milestone 1 is green.
- **Single legacy user with no `progress` rows.** Upgrade still sets `meta.activeUserId = legacyId`; they skip the picker. Covered by the "stamps streakHistory" / "sets meta" tests (a user with empty progress is the trivial case).
- **Fresh install (no legacy user).** Upgrade sets `activeUserId = null`; App shows Onboarding (profiles empty). Covered by the "fresh install" test.
- **Deleting the active child.** `deleteProfile` clears `activeUserId` when it matches; `loadUser` then falls back to picker (siblings remain) or Onboarding (was the last child). Covered in Milestone 3 tests.
- **Stale `activeUserId`** (points at a deleted child after some out-of-band delete). `loadUser` validates the id against `users` and falls back to the picker if not found.
- **`useLiveQuery` not re-running on switch.** Every scoped query MUST include `activeUserId` in its dependency array, or switching won't refresh. Called out explicitly in Milestone 4.
- **Compound-key `.get()` calls.** Anywhere code did `db.progress.get(lessonId)` it must become `db.progress.get([userId, lessonId])`. The only such site is `completeLesson` (audited: `grep db.progress.get` returns one hit).
- **Parent gate is a speed bump, not security.** A determined older child can solve `7 × 8`. Acceptable: the goal is preventing accidental deletion by little kids, not auth. No PIN persistence in scope.

## Out of scope

- Per-child avatars/photos (use initial + assigned color only).
- Cloud sync / cross-device family sharing (app remains offline-first, no backend).
- Parental dashboards, time limits, or per-child reporting.
- Renaming/editing a child's name after creation (only add/remove in this iteration).
- Migrating to a real PIN-based parent lock (future enhancement).
