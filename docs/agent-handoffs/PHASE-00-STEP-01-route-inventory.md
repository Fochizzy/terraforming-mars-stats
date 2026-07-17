# Phase 0 Step 0.1 Route Inventory Handoff

## Status

Completed on 2026-07-16.

## Branch and baseline

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Starting revision: `8a6daeff5`
- Starting working tree: clean when audit edits began
- Production application changes: none
- Database or query changes: none

The worktree initially showed staged baseline documentation from another process.
That work was committed as `8a6daeff5` before this audit edited any files. The
route inventory was refreshed against that clean branch tip.

## Completed scope

- Read the repository and redesign rules required for Step 0.1.
- Inspected every `src/app` page and route handler, both shared layouts,
  middleware, route guards, URL helpers, direct route dependencies, and route-level
  repository calls.
- Documented 14 page routes, 4 route handlers, and the favicon metadata route.
- Mapped current ownership to the approved target page architecture.
- Stopped before component inventory, data-capability audit, asset inventory, or
  production redesign work.

## Files changed

- Created `docs/redesign/CURRENT-ROUTE-MAP.md`.
- Updated `docs/REDESIGN_STATE.md`.
- Created `docs/agent-handoffs/PHASE-00-STEP-01-route-inventory.md`.

## Key findings

1. `/insights` currently combines global, individual, and compare ownership. Its
   `scope=individual` and `scope=compare` navigation state is not read.
2. `/group` is the destination for both Group Insights and Leaderboard, and it also
   consumes global analytics summaries.
3. `/saved-games` is the current game library, but finalized games have no detail
   or replay routes. The target architecture renames this destination to `/games`.
4. `/reset-pin` and `/auth/reset-pin` duplicate the recovery page; current recovery
   bridges select `/auth/reset-pin`.
5. `/cards` and `/saved-games` are protected by the `(app)` layout but absent from
   middleware's protected-prefix list, so unauthenticated redirects do not preserve
   their original destination.
6. The no-group redirect points to `/log-game/import`, which itself throws when no
   current group exists.
7. Auth helpers reference nonexistent `/claim-player` and
   `/log-game/import-single` paths.
8. No dynamic App Router segments exist in the current application.

## Data and authorization observations

- Protected pages use a cookie-presence layout guard plus page-level Supabase
  `getUser()` and active-group resolution.
- Group context reads `user_profiles`, `group_members`, and `groups`, and may update
  the last active group.
- `/saved-games` queries `games` directly instead of using a repository.
- `/group`, `/insights`, and `/profile` depend on broad persisted analytics bundles;
  splitting routes will require careful query ownership work in later phases.
- No live Supabase query was required for this documentation-only route audit.

## Validation

Documentation validation performed for this step:

- Verified every current `page.tsx`, `route.ts`, and `favicon.ico` source appears in
  `CURRENT-ROUTE-MAP.md`.
- Verified every source path listed in the route map exists.
- Ran `git diff --check` on the Step 0.1 changes.

Application tests, type checking, linting, build, Playwright, and screenshots were
not rerun because no production code, schema, query, style, or UI behavior changed.
The prior baseline is documented in `docs/redesign/BASELINE-VALIDATION.md`.

## Open decisions and blockers

- No blocker remains for Step 0.1.
- Final URLs for Players, Groups, Group Members, and Group Settings are not defined
  in the approved target-route list.
- No-group onboarding ownership must be resolved before route migration.
- Component retain/refactor/move/retire decisions are intentionally deferred to
  Step 0.2.

## Next action

Begin Phase 0 Step 0.2, Component Inventory, only when explicitly assigned. Do not
move routes or modify production UI as part of that handoff.
