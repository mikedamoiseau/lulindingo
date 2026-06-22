# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LuLinDingo is an offline-first, kid-friendly math learning app (React 19 + Vite). Progress lives entirely in the browser via IndexedDB — there is **no backend**. The data model is built as a multi-module learning *platform* (every unit carries a `moduleId`, currently always `'math'`), so future modules (e.g. chess) can be added without reshaping the schema.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # production build to dist/
npm test             # vitest run (one-shot)
npm run test:watch   # vitest watch mode
npm run lint         # eslint
npm run validate     # sweep the exercise generator across all combos, assert invariants
npx vitest run src/utils/__tests__/heartManager.test.js   # single test file
```

Deploy: Cloudflare Pages via `npx wrangler pages deploy dist --project-name lulindingo`. Live at `lulindingo.damoiseau.xyz`. Full guide in `docs/cloudflare-deployment.md`.

`npm run validate` (`scripts/validate-exercises.js`) runs `generateExercises` over every operation × age band × tier with a large random sample (~18k exercises) and checks the content invariants — arithmetic correctness, non-negative answers, per-operation answer caps, option shape, follow-pattern structure. Use it after touching `exerciseGenerator.js`; its answer-cap constants mirror those in the generator and must be kept in sync.

## Core architecture

**Exercises are generated, not stored.** This is the most important thing to understand. `db.seed.js` only seeds *metadata*: 4 units × 5 tiers = 20 lesson records, each holding `{id, unitId, order, tier, operation}` — no questions. At lesson runtime, `LessonEngine` calls `generateExercises(operation, ageBand, tier, count)` (`src/utils/exerciseGenerator.js`) to build the actual problems on the fly. Difficulty scales by `tierWindow()` (tier 1 = bottom 20% of the age band's number range, tier 5 = top 20%). The README's mention of static "15 lessons" content is outdated.

**State & persistence split:**
- `src/stores/useGameStore.js` (Zustand) — the single global store. Holds the loaded `user`, transient per-lesson counters (`lessonXp`, `lessonCorrect`, `lessonTotal`), and all DB-writing actions. Persistent mutations write to Dexie *and* mirror into store state.
- `src/db/database.js` (Dexie) — IndexedDB tables: `users`, `units`, `lessons`, `progress` (keyed by `lessonId`), `streakHistory` (keyed by date string).
- Components read live DB data with `useLiveQuery` (dexie-react-hooks) where reactivity to DB writes matters; otherwise from the store.

**Pure logic lives in `src/utils/` and is unit-tested in isolation** — components stay thin. When changing game rules, change the util and its test, not the component:
- `progression.js` — unit/lesson lock states (sequential within and across units); `getMaxExercises(ageBand)` → 6/8/10.
- `heartManager.js` — `MAX_HEARTS = 10`, refill 1 per 20 min, computed lazily from `heartsLastRefill` timestamp (no timers).
- `xpCalculator.js` — 10 XP per correct answer, +50 lesson-completion bonus.
- `streakTracker.js` — local-date streak logic.
- `skipUnits.js` — auto-completes units below a child's level. Age band `11-12` skips addition+subtraction entirely.
- `placementScoring.js` — maps the 8-question placement ladder to a starting `{ageBand, startingTier}` using three anti-luck signals (final position, total correct, highest *sustained* level).

**App flow** (`App.jsx`): seed DB → `loadUser()`. No user → `Onboarding` (manual age-band pick *or* `PlacementTest`, which calls `createUser` with a `startingTier`, auto-completing lower lessons). User exists → router with `LearningPath`, `ProgressScreen`, and `LessonEngine` (`/lesson/:id`).

**Lesson lifecycle** (`LessonEngine.jsx`): exercises cycle through three types — `type-answer`, `select-answer`, `follow-pattern`. `type-answer` allows one retry before costing a heart. Wrong answer (after retry) → `loseHeart()`. Completion → `addXp`, `updateStreak`, `completeLesson` (stars: ≥90% → 3, ≥70% → 2, else 1; keeps best). **Practice mode** (`location.state.isPractice`) replays a completed lesson to *earn* a heart, awards no XP, and costs no hearts.

## Conventions

- CSS Modules per component (`Foo.module.css`); global tokens/vars in `src/index.css`.
- Tests sit in `__tests__/` next to the code, use vitest + jsdom + `fake-indexeddb` (setup in `src/test-setup.js`).
- `exerciseGenerator.js` uses plain `Math.random`; tests make it deterministic by mocking with `vi`.

## Specs & plans

Design docs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Check there for the intended behavior of a feature before reverse-engineering it from code.
