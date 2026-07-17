# Phase 2, Step 2.5 Handoff — Analytics Repository and Query Contracts

## Assignment

Complete Phase 2, Step 2.5 only on
`redesign/tm-stats-dashboard-rebuild`: define and implement typed analytics
repository/query contracts, one explicit source slice, normalization, tests,
documentation, and a focused commit. Do not push or begin Step 2.6.

## Prerequisites verified

Preflight passed before planning or editing:

- branch was `redesign/tm-stats-dashboard-rebuild`;
- worktree was clean;
- Step 2.4 commit `a9a223270` was present;
- the Step 2.4 handoff existed;
- state marked Step 2.4 complete and Step 2.5 next;
- `MASTER-PLAN.md` existed and was tracked;
- Steps 2.1 through 2.4 source contracts were intact;
- corporation-logo policy commit `9545f5899` remained in history;
- no Step 2.6 work existed; and
- no migration, view, schema, RPC, production mutation, Storage mutation, or
  deployment had been introduced.

## Documents reviewed

Required documents were read in the assignment's authority order:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/MASTER-PLAN.md`
- `docs/redesign/phases/02-analytics-foundation.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/MASTER-RULES.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/ANALYTICS-INVENTORY.md`
- `docs/redesign/PAGE-ARCHITECTURE.md`
- `docs/redesign/MIGRATION-MATRIX.md`
- `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`
- Phase 2 Step 2.0 through Step 2.4 handoffs

The Word master guide was not needed because the higher-authority documents and
verified repository sources resolved the assigned boundary.

## Repository audit

Inspected read-only:

- server/browser/admin Supabase client creation;
- group membership and current-user repository patterns;
- core tables, RLS helpers/policies, analytics views, and global opt-in rules;
- `analytics-repo.ts`, its mappers, fan-out reads, and current consumers;
- focused game, import, replay, reference, and metric repositories;
- Step 2.1 capability declarations;
- Step 2.2 filter/scope/URL normalization;
- Step 2.3 coverage, evidence, sample, denominator, and eligibility contracts;
- Step 2.4 canonical definitions/calculations;
- page loaders, component preparation, mocks, and existing repository tests;
- generated database type status; and
- existing pagination, ordering, `IN` batching, nested selects, RPC, and error
  patterns.

## Existing architecture findings

- The server client is created by `createSupabaseServerClient` with the public
  publishable key and cookie session. Authorization must remain current-user +
  RLS; the admin client is not appropriate for analytics reads.
- `supabase.auth.getUser()` is the existing server authorization pattern and
  returns an authenticated user suitable for authorization checks.
- Core `games`, `game_players`, and `game_log_imports` reads are protected by
  group/game policies. Group-list operations also benefit from an explicit
  membership check before the game query.
- Global analytics sources enforce `global_analytics_enabled`, but the selected
  slice has no approved global operation. It must reject global scope instead
  of approximating one.
- No generated Supabase `Database` type exists. Raw persistence DTOs therefore
  remain local and are validated before exposure.
- `analytics-repo.ts` is a broad 2,365-line legacy bundle. Some mappers coerce
  missing/invalid numbers to zero; some callers convert errors to empty arrays;
  several components import its DTOs directly; and several calculations remain
  outside the canonical layer. Migrating it was outside Step 2.5.
- Current replay/event readers can clamp missing generation to the final
  generation or rely on text actor identity. They are not safe substitutes for
  a generation-level analytics source.
- Card acquisition facts are not persisted. Key cards, cards played, final game
  generation count, and repeated hand snapshots cannot substitute for them.

Classification:

- approved/reused: authenticated server client, membership/RLS boundaries,
  parameterized Supabase filters, stable multi-column ordering, batched `IN`
  reads, Step 2.1–2.4 contracts;
- approved but duplicated/deferred: broad analytics bundle, existing result
  and placement DTOs, current win-margin SQL/snapshots;
- incompatible/deferred migration: missing-to-zero mappers, display-label
  pairing identity, route-level derivations, error-to-empty fallbacks;
- unsupported: card acquisition, per-generation TR, verified replay/event
  history, board control, opponent-adjusted performance; and
- authorization risk avoided: admin/service-role reads, client-trusted group
  ID, and a new global query without opt-in enforcement.

## Files changed

Source and tests:

- `src/lib/analytics/repository-contracts.ts`
- `src/lib/analytics/repository-contracts.test.ts`
- `src/lib/analytics/repository-records.ts`
- `src/lib/analytics/repository-records.test.ts`
- `src/lib/analytics/capability-declarations.ts`
- `src/lib/analytics/capability-declarations.test.ts`
- `src/lib/analytics/index.ts`
- `src/lib/db/analytics/finalized-game-results-repo.ts`
- `src/lib/db/analytics/finalized-game-results-repo.test.ts`

Documentation:

- `docs/redesign/ANALYTICS-REPOSITORY-QUERY-CONTRACTS.md`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/phases/02-analytics-foundation.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/ANALYTICS-INVENTORY.md`
- `docs/redesign/MIGRATION-MATRIX.md`
- `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`
- `docs/redesign/MASTER-PLAN.md`
- this handoff

No production page, component, route, migration, schema, SQL, RPC, environment,
dependency, Storage, or deployment file changed.

## Repository contracts introduced

Client-safe shared contracts now define:

- operation IDs;
- operation declarations;
- authorization requirements;
- supported scopes and filters;
- required/optional capability keys;
- stable ordering and pagination;
- Step 2.2 filter and selection query metadata;
- normalized records + Step 2.3 coverage/evidence;
- ready/empty/partial/unavailable/error results;
- typed warnings;
- typed public error categories; and
- execution-only cancellation/request diagnostics.

The server repository is not exported from the client-safe analytics barrel.
Its import of the server Supabase client maintains the server boundary.

## Query operations introduced

### `finalized-game-results.list`

- group scope only;
- current-user authentication;
- explicit group membership check;
- RLS-preserving finalized game read;
- optional date, map, player-count, and generation-count filters;
- bounded offset pagination; and
- page-wide player/import batching.

### `finalized-game-result.get`

- game scope only;
- current-user authentication;
- RLS-readable finalized game;
- no pagination or sample filter; and
- page-wide-shaped player/import reads for the one game.

## Query input contracts

- Inputs reuse `AnalyticsFilterState`; no parallel filter type was created.
- Comparison/highlight/focus uses `AnalyticsSampleSelectionContext` and is
  normalized separately from filters.
- Selection context is returned in metadata but never adds a Supabase predicate.
- Stable canonical UUIDs are required for group, game, map, player, and source
  row identity.
- The list operation explicitly supports date range, map, player count,
  generation count, and finalized status only.
- Every other active filter fails as `unsupported-filter`; it is not ignored.
- Duplicate multi-select values are deduplicated with a warning.
- Open ranges stay open; reversed ranges fail before a client is opened.
- Explicit `minSample=0` remains supplied state and is rejected as unsupported,
  not mistaken for absence.
- Supported multi-selects are capped at 50 values.
- Cancellation, request ID, and diagnostics are execution metadata, not query
  identity.

## Normalized output contracts

The normalized finalized-game record carries:

- game/group IDs and final game facts;
- stable game-player/player IDs;
- placement, winner flag, and total points;
- native or newest linked-import provenance;
- per-player and per-game missing-field codes;
- complete/partial state; and
- returned-page coverage and evidence.

Mapping validates identity, primitive types, timestamps, relationships, and
duplicates. Numeric zero remains zero. Null remains missing and is never filled
with zero. Multiple winners remain tied-first evidence. Display labels are not
accepted as IDs.

The record contains a final generation count only. It does not claim a
generation observation or timeline.

## Error contracts

Public categories cover invalid input, unsupported scope/filter, unavailable
capability, unauthorized, forbidden, not found, stale identity, query failure,
timeout, aborted request, mapping failure, and unexpected persistence response.

Public results contain a stable user-safe message and retryability only. Raw
persistence errors are delivered only through the optional server diagnostic
callback for logging/tests. Query failures cannot become empty, zero, partial,
or capability-unavailable results.

## Authorization behavior

- All reads use the existing current-user server client.
- No service-role/admin client is used.
- Group list requires a matching `group_members` row before querying games.
- Single-game read relies on the existing game RLS path after authentication.
- Unreadable and absent single games share the same not-found response.
- URL/filter identities do not authorize access.
- No global operation was added, so no path bypasses global opt-in.

The design follows official Supabase guidance for server-side authentic user
retrieval, RLS, query filters, stable range pagination, and abort signals.

## Capability integration

- Operation declarations require `placement-and-winners`.
- Canonical Win Point Differential is an optional source consumer.
- The version 1 sole-winner differential is now declared supported for game
  scope through the normalized reader and Step 2.4 utility.
- Its tied-first numeric policy remains unresolved and yields indeterminate.
- Typed Corporation/Prelude pairing dimensions retain
  `requires-query-work` status.
- Cards Purchased and per-generation TR retain `requires-new-fields`.
- No unavailable fact is replaced by a related persisted field.

## Filter integration

Supported filter application is explicit and tested. Unsupported filter,
malformed input, stale map, empty multi-select, duplicate values, explicit zero,
open range, invalid range, large multi-select, missing scope identity, and
invalid pagination behavior are deterministic. Invalid normalization cannot
silently widen the database query.

## Sample and coverage integration

Every successful result includes structural coverage and evidence for the
returned records. Sources declare schema verified and production population
unverified. The result emits a matching limitation warning.

Returned page count is not a metric sample. `hasMore` exposes pagination
incompleteness. A later metric consumer must still construct Step 2.3 candidate,
eligible, included, excluded, denominator, and minimum-sample semantics for its
exact metric. Selection context remains non-sample context.

## Calculation-utility integration

`toWinPointDifferentialInputs` maps the normalized source to the Step 2.4 input
contract. The repository contains no Win Point Differential arithmetic. Tests
call `calculateWinPointDifferential` to prove:

- sole-winner evaluation uses the versioned utility;
- explicit zero remains an observed operand;
- missing scores remain missing;
- tied-first remains indeterminate; and
- absent winner evidence is unavailable input, not an ordinary outcome.

## Pagination and ordering

- list default limit: 25;
- list maximum limit: 100;
- strategy: offset + one look-ahead row;
- primary order: `played_on` in requested direction;
- secondary order: `created_at` in requested direction;
- final tie-breaker: `id` ascending; and
- single-game operation: no pagination.

Invalid offset, limit, field, direction, or tie-breaker input fails before the
game query.

## N+1 safeguards

Excluding the auth service call, a nonempty group page uses:

- one membership read;
- zero/one map identity read;
- one bounded game page read;
- one batched game-player read; and
- one batched import-provenance read.

An empty page skips child reads. A single game uses one game and two child
reads. There is no query inside a game or player loop. Direct tests assert one
child read per table and the stable ordering/range call sequence.

## Tests added

Focused tests cover:

- valid/invalid inputs;
- supported filters and unsupported filter rejection;
- malformed/stale identity;
- unauthenticated/forbidden/not-found behavior;
- successful empty versus query failure;
- unavailable capability;
- partial imported records;
- zero versus missing;
- finalized filtering;
- stable mapping and no display-label identity;
- deterministic order and bounded/invalid pagination;
- duplicate multi-select and explicit zero filter;
- open/invalid ranges;
- selection not affecting sample predicates;
- Step 2.4 utility integration and tie evidence;
- unavailable card acquisition/per-generation TR;
- batched query count;
- abort support; and
- public error redaction with private diagnostic context.

## Validation commands and results

- Focused tests:
  `npm.cmd test -- --run src/lib/analytics/capability-declarations.test.ts src/lib/analytics/repository-contracts.test.ts src/lib/analytics/repository-records.test.ts src/lib/db/analytics/finalized-game-results-repo.test.ts`
  — 4 files, 43 tests passed.
- Full tests: `npm.cmd test` — 101 files, 540 tests passed.
- Type check: `npx.cmd tsc --noEmit` — passed.
- Lint: `npm.cmd run lint` — passed with four pre-existing warnings.
- Build: `npm.cmd run build` — passed; 23/23 pages generated.

## Known warnings

Unchanged baseline warnings:

- three `@next/next/no-img-element` warnings in
  `src/features/insights/score-profile-panel.tsx`; and
- one unused `normalizeProfileHeadToHeadRow` warning in
  `src/lib/db/analytics-repo.ts`.

`next lint` also reports its upstream deprecation notice. No warning was caused
by Step 2.5 and no unrelated warning was changed.

## Decisions made

- Select finalized game/player results as the focused slice because recorded
  facts can honestly feed one approved Step 2.4 metric.
- Keep contracts and normalized records client-safe; keep Supabase execution in
  a server repository.
- Use authenticated current-user + explicit group membership + RLS, never
  privileged access.
- Use bounded offset pagination because it matches existing repository
  conventions; require stable multi-column ordering.
- Validate map IDs in one bounded query before reading the game population.
- Treat coverage as returned-page evidence, not aggregate sample size.
- Carry selection as non-sample metadata.
- Preserve raw cause only in the diagnostic callback.
- Keep every unsupported scope/fact explicit rather than implementing an
  approximation.

## Deferred migrations

- all `analytics-repo.ts` production consumers;
- global/individual/comparison/domain operations;
- generated Supabase database types;
- null-preserving score-source adapters;
- typed Corporation/Prelude pairing reads;
- card acquisition capture/read models;
- verified event/replay generation sources;
- remote final-action verification;
- aggregate sample/denominator construction per destination metric;
- any view/RPC/schema/migration/index; and
- production page/route/component integration.

## Unsupported capabilities

- Cards Purchased, Cards Seen, cards drawn/received, total hand acquisitions,
  and end-hand snapshots;
- per-generation/final TR;
- trustworthy Cards Played/event/replay timelines;
- canonical board control;
- opponent-adjusted performance; and
- global reads through this focused repository.

No related final total or event shape was substituted for these facts.

## Limitations and risks

- Production population/freshness was not queried; evidence states
  `populationVerified: false`.
- No generated database types exist; mapping therefore performs runtime source
  validation.
- Offset pagination is stable for a fixed snapshot but concurrent inserts can
  shift later offsets. A cursor strategy can be evaluated only if a future
  consumer needs snapshot-stable traversal.
- Returned pages are not aggregate metric samples.
- Tied-first has no approved numeric differential policy.
- Legacy consumers still use their existing query/error/coercion behavior until
  later parity migrations.

## Repository state

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Commit: reported in the completion report because a commit cannot contain its
  own final hash without changing that hash.
- Worktree: expected clean after the focused Step 2.5 commit.
- Push/deploy: none requested or performed.

## Exact next action

Only an explicit assignment may begin Phase 2, Step 2.6 — Analytics Foundation
Integration Validation. Do not infer authorization for production page
integration, navigation, route migration, schema/migration/view/RPC work,
deployment, Supabase mutation, or Step 3 from this completed repository
substep.
