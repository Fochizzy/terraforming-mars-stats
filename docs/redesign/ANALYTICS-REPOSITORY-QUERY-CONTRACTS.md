# Analytics Repository and Query Contracts

## Status and scope

Phase 2, Step 2.5 defines the shared repository boundary and implements one
focused, evidence-backed source slice: finalized game results and their player
results. It does not migrate a production consumer, create SQL, add a view or
RPC, change schema, or make unsupported card or generation facts available.

The boundary has four layers:

1. Step 2.2 owns canonical scope, filter, and selection state.
2. Client-safe repository contracts declare operations and result semantics.
3. A server repository validates, authorizes, queries, and normalizes persisted
   rows.
4. Step 2.4 calculation utilities consume normalized source observations.

Presentation components receive neither a Supabase query builder nor raw
database errors. They remain responsible only for labels, formatting, charts,
tables, and state presentation.

## Public client-safe contracts

`src/lib/analytics/repository-contracts.ts` defines:

- stable operation identifiers;
- typed operation declarations;
- Step 2.2 filter and selection inputs;
- authorization requirements;
- offset pagination and stable ordering;
- query metadata;
- normalized data, coverage, and evidence envelopes;
- `ready`, `empty`, `partial`, `unavailable`, and `error` results;
- typed user-safe errors and warnings; and
- server-only execution metadata for cancellation and diagnostic callbacks.

The execution context is intentionally separate from query identity. An
`AbortSignal`, request identifier, or diagnostic callback is not serialized as
a filter and cannot change the sample.

`src/lib/analytics/repository-records.ts` defines the normalized finalized-game
record. It preserves:

- game, group, game-player, and player database IDs;
- played date, map ID, player count, and final generation count;
- the literal finalized status;
- player placement, winner flag, and total points;
- explicit numeric zero;
- nullable missing observations;
- native versus imported provenance;
- per-player and per-game missing-field codes;
- complete versus partial source state; and
- returned-page coverage and source evidence.

No display label is accepted as repository identity. No display placeholder is
stored in a normalized record.

## Implemented operations

### `finalized-game-results.list`

Scope: one canonical group ID.

Authorization: authenticated current user plus an explicit `group_members`
membership check. The subsequent reads continue to use the normal authenticated
Supabase server client and database RLS.

Supported sample filters:

- open or closed played-date range;
- map IDs;
- player counts;
- generation counts; and
- the aggregate default finalized status.

The operation rejects every other active Step 2.2 filter. It does not silently
drop a card, player, group, expansion, Corporation, Prelude, score-source,
style, or minimum-sample filter. Empty multi-selects mean no restriction.
Duplicate values are canonicalized and reported as warnings. A malformed,
stale, oversized, or incompatible value fails before the game population query.

Pagination is bounded offset pagination with a default of 25 and maximum of
100. The query fetches at most one look-ahead row to determine `hasMore`.
Ordering is played date, then creation timestamp, then game ID. The first two
use the requested direction; game ID is always ascending as the final stable
tie-breaker.

### `finalized-game-result.get`

Scope: one canonical game ID.

Authorization: authenticated current user and existing `games` RLS. A missing
or unreadable row returns the same user-safe not-found result, so the repository
does not reveal another group's game existence.

The operation has no pagination and accepts no sample filter. Selection context
may be carried for a caller but never changes the game read.

### Unsupported scopes

These operations do not implement global, individual, comparison, or domain
reads. In particular, Step 2.5 does not introduce a global query that could
bypass `group_settings.global_analytics_enabled`. Global analytics remain
available only through separately approved opt-in-aware sources.

## Input normalization and safety

The repository reuses `AnalyticsFilterState`; it does not introduce a competing
filter model. Inputs are normalized before a Supabase client is opened.

Validation covers:

- canonical UUID scope and entity identity;
- valid and ordered ISO dates;
- operation-specific supported filters;
- explicit `minSample=0` as a supplied, unsupported filter rather than absence;
- maximum 50 values for each supported multi-select;
- nonnegative integral offset;
- limit from 1 through 100;
- registered ordering and tie-breakers; and
- canonical comparison, highlight, or focus selection identity.

Only parameterized Supabase query methods are used. A validation failure cannot
broaden the query.

## Raw and normalized record boundary

Raw persistence rows are local DTOs in the server repository. Mapping validates
their technical identities, primitive types, dates, timestamps, relationships,
and uniqueness before exposing normalized records.

Mapping rules include:

- `0` remains `0`;
- `null` remains a missing observation and adds a missing-field code;
- no-player or mismatched player counts mark player results partial;
- absent winner evidence marks winner status partial;
- multiple winner flags remain identifiable as tied first;
- the newest linked import supplies import provenance;
- a game without an import is explicitly native; and
- unexpected or duplicate source relationships fail mapping rather than being
  inferred or discarded.

The normalized game exposes a final `generationCount`, not a generation-level
timeline. No missing generation event is assigned to the final generation.

## Calculation integration

`toWinPointDifferentialInputs` is a pure adapter from normalized records to the
Step 2.4 `WinPointDifferentialInput`. It does not calculate the differential.
The canonical Step 2.4 utility remains the only implementation of winner score
minus highest non-winning score.

The adapter preserves:

- sole winner versus non-winner versus tied-first outcome;
- missing scores;
- explicit zero scores;
- coverage; and
- source eligibility.

Tied-first remains indeterminate with no fabricated numeric result. Missing
winner evidence cannot become an ordinary loss or win.

## Result and error semantics

Successful data results are:

- `ready`: at least one complete normalized record;
- `empty`: a successful authorized query returned no records; or
- `partial`: at least one returned record lacks a required player-result
  observation.

`unavailable` is reserved for a non-executable Step 2.1 capability result. It
is not an empty result and it cannot be constructed from a supported or
partially supported capability.

Errors use stable categories including invalid input, unsupported scope or
filter, unauthorized, forbidden, not found, stale identity, query failure,
timeout, aborted request, and mapping failure. Results expose only user-safe
messages and retryability. A server diagnostic callback may receive the raw
cause and request ID for logging or tests; the cause is never copied into the
public result.

A query error is never returned as empty, partial, observed zero, or unavailable
capability.

## Coverage, evidence, and sample limits

Each successful response reports structural coverage for the returned page and
evidence for `games`, `game_players`, and linked `game_log_imports`. Schema
sources are verified from tracked repository migrations. Production-wide row
population remains unverified and is stated in both evidence and warnings.

Returned row count is not declared to be a metric sample size. A later consumer
must construct the Step 2.3 candidate, eligible, included, excluded, denominator,
and minimum-sample result for its exact metric. `hasMore` prevents a paginated
source page from being mistaken for a complete population.

Comparison, highlight, and focus selection are recorded as non-sample context.
They do not add a query predicate.

## Capability posture

The finalized-game source slice requires the existing supported placement and
winner capability. It optionally supplies the source observations needed by
canonical Win Point Differential.

The version 1 sole-winner game differential is now supported at game scope
through the normalized reader and Step 2.4 utility. Its tied-first numeric
policy remains unavailable. Typed Corporation/Prelude pairing dimensions still
require query work.

Card purchase, Cards Seen, hand acquisition, final-hand, per-generation TR,
and other unrecorded facts remain non-executable under the Step 2.1 capability
model. Final generation count is not substituted for a generation timeline,
and cards played are not substituted for any acquisition fact.

## Query bounds and N+1 prevention

The group list has these bounded persistence reads, excluding the auth service
call:

- membership: one;
- selected map validation: zero or one;
- bounded game page: one;
- all player results for the page: one batched `IN` query; and
- all import provenance for the page: one batched `IN` query.

An empty game page stops before child queries. The single-game operation uses
one game read and two batched child reads. Neither operation queries inside a
game or player loop.

## Deferred migration

`src/lib/db/analytics-repo.ts` and its production consumers remain unchanged.
They still contain broad bundles, coercing mappers, duplicated formulas, and
error/empty ambiguity documented by the audit. Migrating those consumers is
future page-phase work with parity tests, not Step 2.5.

Also deferred:

- global, individual, comparison, and domain repository operations;
- score-source null-preserving adapters;
- Corporation/Prelude typed pairing reads;
- verified event and replay readers;
- remote final-action contract verification;
- generated Supabase database types;
- any view, RPC, migration, schema, capture, or production page change; and
- cross-foundation integration validation assigned to Step 2.6.
