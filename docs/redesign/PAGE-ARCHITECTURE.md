# TM Stats Page Architecture

## Primary navigation

1. Log a Game
2. My Profile
3. Global Insights
4. Individual Insights
5. Group Insights
6. Compare
7. Improvement
8. Leaderboard

## Supporting destinations

- Games Library
- Game Detail
- Game Replay
- Cards
- Glossary
- Corporations
- Preludes
- Players
- Groups
- Group Members
- Group Settings

## Target routes

- `/log-game`
- `/log-game/import`
- `/games`
- `/games/[gameId]`
- `/games/[gameId]/replay`
- `/profile`
- `/insights/global`
- `/insights/individual`
- `/insights/group`
- `/compare`
- `/improvement`
- `/leaderboard`
- `/cards`
- `/glossary`

## Phase 3 route ownership and compatibility

Step 3.1 makes the target primary paths navigable without moving the existing
analytics implementations. `/insights` and `/group` remain legacy route owners
until their later destination steps prove parity. New `/insights/global`,
`/insights/individual`, `/insights/group`, `/compare`, `/improvement`, and
`/leaderboard` are truthful route shells only.

`/games` is canonical for the existing Saved Games implementation; `/saved-games`
remains a compatible alias. `/insights?scope=global|individual|group|compare`
keeps non-scope query state while redirecting to the matching canonical route.
The former `/insights#global-statistics` link is handled in the browser because
fragments are unavailable to server routing.

All `(app)` pages are authenticated. Every current route except `/glossary`
requires active group context; group-required navigation is omitted when that
server-side fact is absent. `/glossary` remains authenticated and is available
without a group. The `AppShell` navigation model owns desktop, mobile, utility,
and active-route behavior from one typed source.

## Page responsibilities

The primary analytics destinations are specified by their phase documents under
`docs/redesign/phases/`, which govern their own pages. This section points at
those documents rather than restating per-page scope (process rule P-2 in
`docs/redesign/MASTER-RULES.md`):

- My Profile — `docs/redesign/phases/06-my-profile.md`
- Global Insights — `docs/redesign/phases/08-global-insights.md`
- Individual Insights — `docs/redesign/phases/09-individual-insights.md`
- Group Insights — `docs/redesign/phases/10-group-insights.md`
- Compare — `docs/redesign/phases/11-compare.md`, `docs/redesign/phases/19-compare-and-improvement-expansion.md`
- Improvement — `docs/redesign/phases/12-improvement.md`, `docs/redesign/phases/19-compare-and-improvement-expansion.md`
- Leaderboard — `docs/redesign/phases/07-leaderboard.md`

Games Library, Game Detail, and Game Replay are specified by
`docs/redesign/phases/05-games-detail-and-replay.md`.

The destinations below are not governed by a phase 5-20 document and retain their
scope here.

### Log a Game

Game entry, imports, drafts, validation, and finalization.

### Card Database

Authenticated full reference browsing for the available catalog. It owns stable
catalog identity, stored metadata, art fallback, search, and filters; it does
not imply card-play or card-outcome analytics.

### Glossary

Authenticated, shareable definitions for current and historical product terms.
It owns stable entry fragments and controlled explanatory-text links, while
current analytics contracts remain the authority for semantic meaning.
