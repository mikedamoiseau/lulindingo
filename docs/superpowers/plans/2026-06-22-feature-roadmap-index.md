# Feature Roadmap — Implementation Plans (2026-06-22)

Implementation plans for the ten features in [`docs/feature-roadmap-2026-06-22.html`](../../feature-roadmap-2026-06-22.html), ordered by report rank. Each plan makes concrete, opinionated design decisions and is structured TDD-first (pure logic in `src/utils/` with vitest, then UI), matching the project conventions in `CLAUDE.md`.

| # | Feature | Effort | Plan |
|---|---------|--------|------|
| 1 | Fact Vault — per-fact mastery & spaced review | High | [fact-vault](2026-06-22-fact-vault-plan.md) |
| 2 | Show Me How — worked strategy on a miss | Medium | [show-me-how](2026-06-22-show-me-how-plan.md) |
| 3 | Read Aloud — offline text-to-speech | Low | [read-aloud](2026-06-22-read-aloud-plan.md) |
| 4 | Story Problems — word problems + remainders | Medium | [story-problems](2026-06-22-story-problems-plan.md) |
| 5 | Missing-Number & Build-the-Equation puzzles | Medium | [equation-puzzles](2026-06-22-equation-puzzles-plan.md) |
| 6 | Grown-Up Corner — parent/teacher dashboard | Medium | [grown-up-corner](2026-06-22-grown-up-corner-plan.md) |
| 7 | Closest Wins — estimation mode | Low | [closest-wins](2026-06-22-closest-wins-plan.md) |
| 8 | Daily Quest Board — three daily goals | Medium | [daily-quest-board](2026-06-22-daily-quest-board-plan.md) |
| 9 | Family Profiles — many kids, one device | High | [family-profiles](2026-06-22-family-profiles-plan.md) |
| 10 | Dingo's Den — spend XP to build a world | Medium | [dingos-den](2026-06-22-dingos-den-plan.md) |

## Cross-cutting notes

- **Dexie migrations:** Fact Vault, Read Aloud, Grown-Up Corner, Daily Quest Board, Dingo's Den, and Family Profiles each bump `db.version`. If built together, coordinate the version numbers and migrations — they currently each assume the next `version(2)`. **Family Profiles is the riskiest** (re-keys `progress`/`streakHistory` by `userId`); do it migration-first and ideally before the others, or rebase their schema changes onto its compound keys.
- **Generator-touching plans** (Story Problems, Equation Puzzles, Closest Wins) must keep `npm run validate` green — each plan states whether it extends the validator or covers invariants via its own vitest sweep.
- **Dependency:** Grown-Up Corner's richest insights (weak facts) depend on Fact Vault; it ships a useful v1 from existing data and gains a branch when Fact Vault lands.
- **Suggested build order** (value × independence): Read Aloud → Show Me How → Closest Wins (low-risk, no schema churn) → Story Problems / Equation Puzzles (generator) → Daily Quest Board → Fact Vault → Grown-Up Corner → Dingo's Den → Family Profiles (most invasive last, or first if profile support is a hard requirement).
