# Phase 3, Step 3.1 Handoff — Navigation and Route Skeletons

## Assignment and authority

Explicit assignment: **Phase 3, Step 3.1 — Navigation and Route Skeletons**.
Authority order followed: the assignment; redesign state; this Phase 3
specification; approved decisions; latest preservation/Phase 2 handoffs; master
rules; master plan; and the master guide. Work occurred only in the protected
redesign worktree on `redesign/tm-stats-dashboard-rebuild`.

## Preflight and documents reviewed

- Redesign worktree began clean at `c17e8b1ba8bd099fb3cdf21024fe0a28ab9daf76`
  (`feat(redesign): restore glossary and full card lookup`).
- Phase 2, Merger remediation, the glossary, and the full Card Lookup were
  verified complete before this work began.
- The original `C:\Users\izzyh\Documents\Terraforming Mars` checkout was
  inspected read-only. It was dirty on `move-score-profile-below-insights-lab`
  and was not changed, cleaned, staged, reset, or copied.
- Reviewed `AGENTS.md`, `CLAUDE.md`, state, master rules, master plan, decisions,
  Page Architecture, data/analytics/asset inventories, both migration matrices,
  all phase-file status outlines, the completed Phase 2 plan, the master guide's
  Phase 3 section, and Phase 1/Phase 2/Merger/Glossary completion handoffs.
- Inspected all current app pages/handlers, `AppShell`, `BottomNav`, route guards,
  middleware, group context/switching, login recovery, and the Cards, Glossary,
  game, import, profile, group, and insights owners.

## Stale documentation reconciled

- The Phase 3 phase file was empty; it now records purpose, scope, canonical
  route contract, compatibility, exclusions, acceptance, validation, and gate.
- The Phase 2 plan now treats its old Step 2.6 and Glossary-next-action entries
  as historical and records the completed Glossary task at `c17e8b1ba`.
- The preservation specification now records its completed validation and commit.
- State and master-plan current sections now identify Phase 3 Step 3.1 and the
  next explicit-assignment gate; historical Phase 2 records remain labeled as
  history rather than current instructions.

## Current route inventory and canonical map

| Route family | Boundary/context | Step 3.1 result |
| --- | --- | --- |
| `/`, login/recovery, `/auth/*` | Public; no group | Unchanged |
| `/profile`, `/log-game`, `/log-game/import` | Authenticated; active group | Retained working owners |
| `/games` and `/saved-games` | Authenticated; active group | One existing Saved Games implementation, `/games` canonical and `/saved-games` compatible |
| `/insights` and `/group` | Authenticated; active group | Retained working legacy owners |
| `/insights/global`, `/insights/individual`, `/insights/group` | Authenticated; active group | New truthful unavailable shells |
| `/compare`, `/improvement`, `/leaderboard` | Authenticated; active group | New truthful unavailable shells |
| `/group/players`, `/group/settings` | Authenticated; active group | Retained working support routes |
| `/cards` | Authenticated; active group | Retained full repository-backed Card Lookup |
| `/glossary` | Authenticated; no group required | Retained fragment-addressable Glossary |
| unmatched route | Framework boundary | Intentional not-found page |

`/games/[gameId]` and `/games/[gameId]/replay` remain deferred Phase 5 routes;
creating a blank owner for them would misrepresent unapproved game identity and
permission behavior.

## Navigation architecture

- `src/lib/navigation/app-navigation.ts` is the one typed source for IDs, hrefs,
  visibility, group requirements, match modes, mobile/desktop placement,
  deterministic order, declared canonical paths, validation, and active matching.
- `AppNavigation` uses it for the eight desktop primary destinations and desktop
  utility destinations. Log a Game remains prominent.
- The adapted `BottomNav` derives mobile Profile, Insights, Log Game, Compare,
  and More from it. Native More contains remaining allowed destinations and
  Logout.
- `aria-current="page"` follows the most-specific canonical/legacy path. Query
  and fragment text do not affect matching; `/cards` and `/glossary#entry` stay
  active, and segment matching prevents unrelated similarly named paths.
- More focuses Close on open, closes on Escape and route change, restores trigger
  focus for explicit closes, and uses native dialog modality to make background
  content inert. Group-required links are filtered before client navigation is
  rendered; filtering never authorizes a route.

## Compatibility and security

- Legacy Insights `scope=global|individual|group|compare` redirects to canonical
  destinations and retains every other query value.
- The historical `#global-statistics` fragment is bridged in the browser while
  preserving its query because fragments do not reach Next server routing.
- `/insights` without a compatibility selector remains the legacy dashboard.
- `/saved-games` remains functional as the same implementation as `/games`.
  The prior Leaderboard link was merely `/group`, so it stays the legacy Group
  owner rather than redirecting ambiguously; new navigation targets `/leaderboard`.
- Middleware now protects `/games`, `/saved-games`, `/compare`, `/improvement`,
  and `/leaderboard` in addition to existing protected prefixes and preserves the
  requested query in the login `next` value. `(app)` remains the page guard and
  group-required pages retain existing server group checks. No service role,
  RLS bypass, or new authorization path was added.

## Routes intentionally unchanged

Cards preserves real catalog reading, query/filter/reset/detail state, art
fallback, and stable card identity. Glossary preserves all fragments, reload and
history behavior, exact target focus, stale-fragment unavailable state, and
controlled cross-links. Authentication, PIN recovery, game logging, import,
saved drafts, finalized access, group switching, Profile, legacy Insights, and
legacy Group behavior remain their current implementations.

## Files changed

- Navigation/route code: `src/lib/navigation/`, `src/components/navigation/`,
  `src/components/layout/`, `middleware.ts`, route guards, Insights compatibility,
  shared Saved Games route component, new route shells, loading, and not-found.
- Focused tests: navigation contract, desktop/mobile dialog behavior, updated
  shell test, and existing guard coverage.
- Documentation: state, decisions, Phase 3 spec, Phase 2 historical status,
  preservation status, Page Architecture, both migration matrices, master plan,
  and this handoff.

## Validation

| Command | Outcome |
| --- | --- |
| Focused navigation/guard suite | 5 files, 12 tests passed |
| `npm.cmd test` | 120 files, 599 tests passed |
| `npx.cmd tsc --noEmit` | Passed with no errors |
| `npm.cmd run lint` | Passed with four unchanged baseline warnings and Next lint deprecation |
| `npm.cmd run build` | Passed; 31 routes generated, including every new canonical shell and `/games` |
| `git diff --check` | Passed |

The unchanged lint warnings are three legacy `no-img-element` notices in
`score-profile-panel.tsx` and one unused `normalizeProfileHeadToHeadRow` in
`analytics-repo.ts`. No new warning remains.

## Limits, deferred work, and external state

No database, schema, migration, Supabase data, Storage, dependency, production
read/write, push, or deployment occurred. Shells intentionally contain no data
query, analytics calculation, mock result, or fake control. Moving analytics
content, defining leaderboard methodology, game detail/replay routes, and all
full destination implementations remain deferred to explicit later assignments.

## Next action and commit

Step 3.1 passes its repository acceptance criteria. Await explicit assignment
for Phase 3, Step 3.2. The focused completion commit hash and final clean status
are recorded by the post-commit verification immediately after this handoff is
committed; this self-contained handoff cannot know its own hash in advance.
