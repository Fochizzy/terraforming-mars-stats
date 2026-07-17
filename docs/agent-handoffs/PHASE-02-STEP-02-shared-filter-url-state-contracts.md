# Phase 2, Step 2.2 Handoff — Shared Filter and URL-State Contracts

## Status

Completed on 2026-07-17.

## Assignment

Complete only **Phase 2, Step 2.2 — Shared Filter and URL-State Contracts** in
`C:\Users\izzyh\Documents\Terraforming Mars Redesign` on
`redesign/tm-stats-dashboard-rebuild`; create one focused commit; do not push;
do not begin Step 2.3; do not change routes, production pages, repositories,
formulas, dependencies, migrations, schema, or Supabase state.

## Prerequisites verified

- The required branch was active and initial porcelain status was clean.
- Step 2.1 was committed at `f3800146d` and its handoff existed.
- `docs/REDESIGN_STATE.md` marked Step 2.1 complete and Step 2.2 next.
- `docs/redesign/MASTER-PLAN.md` existed and was tracked at `f0aca5cd1`.
- The corporation-logo policy commit `9545f5899` remained in history.
- Inspection of the Step 2.1 commit confirmed no migration, repository query,
  production page, route, or premature Step 2.2 integration.
- The original `C:\Users\izzyh\Documents\Terraforming Mars` worktree was not
  accessed or modified.

## Documents reviewed

The explicit assignment; `AGENTS.md`; `CLAUDE.md`; `docs/REDESIGN_STATE.md`;
`docs/redesign/MASTER-PLAN.md`;
`docs/redesign/phases/02-analytics-foundation.md`;
`docs/redesign/DECISIONS.md`; `docs/redesign/MASTER-RULES.md`;
`docs/redesign/DATA-CAPABILITIES.md`;
`docs/redesign/ANALYTICS-INVENTORY.md`;
`docs/redesign/PAGE-ARCHITECTURE.md`;
`docs/redesign/MIGRATION-MATRIX.md`;
`docs/redesign/COMPONENT-MIGRATION-MATRIX.md`; and the Step 2.0 and Step 2.1
handoffs. The Word guide was not needed because the higher-authority documents
and repository code resolved the Step 2.2 questions.

## Repository findings

- Step 2.1 already provides six scope types and thirteen stable subject types;
  Step 2.2 extends those contracts rather than defining a parallel identity or
  scope model.
- Phase 1 `DashboardSelection` coordinates entity/metric/point/legend/detail,
  and `reconcileDashboardSelection` already provides stale dependent cleanup.
  The Phase 1 URL adapter is deliberately caller-named and preserves unrelated
  parameters; no production analytics parameter names existed.
- `FilterToolbar` is presentation-only. Current analytics screens keep filters
  in component-local state and some current controls use display-label or `all`
  sentinel values, so they were inspected as evidence but not adopted as the
  shared contract.
- Current production search-parameter usage is unrelated to a canonical
  analytics contract. Scope remains route-owned.
- Repository-approved identity evidence is UUIDs for database-backed players,
  groups, games, maps, corporations, Preludes, and cards; canonical codes for
  expansions, tags, and styles; and the registered score-source key union.
- Recorded games support table size 1–5, positive final generation, real ISO
  dates, and draft/finalized status. There is no approved elapsed-duration or
  game-length category fact.
- Imported source/status values do not have an approved trustworthy shared
  analytics taxonomy/read model. Historical no-Prelude and missing evidence
  cannot yet be distinguished universally.
- The actual scripts are `npm.cmd test`, `npx.cmd tsc --noEmit`,
  `npm.cmd run lint`, and `npm.cmd run build`.

## Files changed

### Client-safe contracts and barrel

- `src/lib/analytics/filters.ts`
- `src/lib/analytics/filter-normalization.ts`
- `src/lib/analytics/filter-url-state.ts`
- `src/lib/analytics/index.ts`

### Focused tests

- `src/lib/analytics/filters.test.ts`
- `src/lib/analytics/filter-normalization.test.ts`
- `src/lib/analytics/filter-url-state.test.ts`

### Documentation

- `docs/redesign/SHARED-FILTER-URL-STATE-CONTRACTS.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/phases/02-analytics-foundation.md`
- `docs/redesign/MASTER-PLAN.md`
- `docs/REDESIGN_STATE.md`
- `docs/agent-handoffs/PHASE-02-STEP-02-shared-filter-url-state-contracts.md`

No other source, test, documentation, dependency, environment, migration,
route, page, repository, or generated file changed.

## Contracts introduced

- `ANALYTICS_FILTER_REGISTRY` and the 19-domain `AnalyticsFilterKey` vocabulary.
- Five typed compatibility outcomes for every filter/scope pair: `supported`,
  `unsupported`, `unavailable`, `deferred`, and `not-applicable`.
- `AnalyticsFilterState`, `AnalyticsSelectionState`, and
  `AnalyticsUrlAddressableState`, with separate navigation and transient
  interaction state.
- Canonical parser and normalizer primitives for UUID, code, date, positive and
  nonnegative integer, table size, score source, UUID pair, and technical
  selection ID.
- Typed parser input provenance, issues, identity-resolution states, canonical
  state versus applicable-query state, and safe Phase 1 selection adapters.
- Parse, normalize, serialize, canonicalize, reset, and partial-reset utilities
  over `URLSearchParams`, with explicit alias configuration.

## Supported filter domains and scope compatibility

- Date range; map; table size; generation count; expansion; corporation;
  Prelude; corporation/Prelude pairing; card; tag; score source; style;
  finalized-game status; and explicit minimum-sample exclusion have shared
  contracts for aggregate scopes, subject to metric capability declarations.
- Player filtering is supported for group/domain scopes, unsupported globally,
  and route/selection-owned for individual/comparison/game scopes.
- Group filtering is supported for individual/comparison/domain scopes,
  unsupported globally, and route-owned for group/game scopes.
- Aggregate filters are not applicable to the single-game route scope.
- Game range is deferred with no canonical parameter because no ordinal,
  rolling-window, or explicit-game meaning was approved.
- Imported/data-source status is deferred with no canonical parameter because
  no trustworthy taxonomy/read model is approved.
- Game length has the reserved `gameLength` contract but is unavailable because
  elapsed duration and category definitions do not exist.

Registry support is not metric support and does not authorize access.

## URL parameter schema

Canonical filter order:

```text
player, group, from, to, map, playerCount, generationCount, gameLength,
expansion, corporation, prelude, corporationPrelude, card, tag, scoreSource,
style, status, minSample
```

Durable selection order:

```text
entity, metric, point, series, detail
```

`map`, `playerCount`, `generationCount`, `gameLength`, `expansion`,
`corporation`, `prelude`, `corporationPrelude`, `card`, `tag`, `scoreSource`,
`style`, and `entity` are repeated parameters. `corporationPrelude` values are
`<corporation-uuid>~<prelude-uuid>`. Selected entities are typed tokens such as
`player:<uuid>`. There is no shared `scope` parameter. `point` is also the
semantic evidence-row focus; no duplicate table-row parameter is introduced.

## Parsing behavior

- Structural parsing never queries, authorizes, mutates a router, or throws for
  malformed user input.
- Per-field status distinguishes omitted default, explicit empty, accepted, and
  rejected input.
- Multi-values are parsed independently, deduplicated, and sorted.
- Scalar duplicates keep the first valid value and report later conflicts.
- Dates must be real ISO `YYYY-MM-DD`; table sizes are integers 1–5; generation
  values are positive integers; `minSample` is nonnegative.
- Display labels do not parse as UUID or technical identity.
- Aliases are accepted only through an explicit collision-checked map; canonical
  input wins a canonical/alias conflict.

## Normalization behavior

- Values are canonicalized without locale-dependent ordering or input mutation.
- Reversed date bounds clear both bounds and report an issue rather than
  silently changing the requested meaning.
- Unsupported, unavailable, deferred, and not-applicable active filters are
  cleared with distinct typed issues.
- Aggregate draft status normalizes to the finalized default with an issue.
- Accepted identity is retained and applicable. Unknown, stale, and
  authorization-rejected identity is removed. Unresolved, loading, and
  query-error identity remains URL-restorable but is withheld from applicable
  query state.
- Filter identity remains separate from comparison/highlight selection.
- Phase 1 availability reconciliation preserves compatible selections and
  clears only invalidated entity/point/series/detail state.

## Serialization behavior

- Serialization normalizes first, emits canonical parameter names and registry
  order, and sorts repeated values by stable identity.
- Defaults and empty selections are omitted; explicit `minSample=0` is retained.
- Unrelated query fields preserve their relative order.
- Configured aliases are removed and only canonical names are emitted.
- Token/API/authorization fields and internal/error details are stripped.
- Labels, logo paths, asset/Storage URLs, private data, query errors, hover,
  tooltip, focus, and menu state are never emitted.
- Parse/normalize/serialize round trips are deterministic and idempotent.

## Defaults

- No player, group, entity, date, threshold, or category identity is invented.
- Empty multi-select means no restriction over the eligible authorized sample.
- Both absent date bounds mean all eligible authorized history.
- `status` defaults to `finalized` for aggregate analytics and is omitted from
  the canonical URL.
- `minSample` defaults to absent. Zero is an explicit preserved exclusion value,
  not missing and not a universal low-sample threshold.
- No boolean or tri-state filter representation is invented because none is
  approved in this filter vocabulary.

## Reset behavior

- Full reset removes canonical analytics fields, configured aliases, and
  prohibited private/error fields while preserving unrelated query state.
- Partial reset removes every parameter belonging to a selected filter domain
  (for example, both `from` and `to` for `date-range`) or a selected durable
  view field, plus its explicit aliases.
- Defaults are restored by the subsequent parse/normalize boundary, not by a
  hidden router mutation.

## Stable-identity rules

Database-backed entities serialize canonical UUIDs. Expansion/tag/style values
serialize canonical codes. Score sources serialize registered keys. Pairings
serialize both canonical UUIDs. Durable entity selection serializes a typed
subject token. Display names, translations, filenames, paths, and URLs are
presentation metadata only.

## Invalid and stale-value behavior

Malformed and incompatible values are discarded with typed user-safe issues;
they never crash or become zero. Unknown/stale/authorization-rejected identities
cannot remain active. Unresolved/loading/query-error values may remain
restorable long enough for metadata recovery but cannot enter applicable query
state. A stale selected entity clears dependent point, series, and detail focus;
the metric remains when independently valid.

## Tests added

Three files / 49 focused tests cover registry completeness and every
compatibility status; supported/deferred/unavailable domains; defaults; stable
UUID/code normalization; real/reversed dates; explicit zero; display-label
rejection; every identity-resolution status; filter-versus-selection separation;
Phase 1 point/evidence mapping and availability reconciliation; valid and
malformed parsing; omitted/empty/accepted/rejected input; scalar conflicts;
repeated values; deterministic ordering; UUID pairs; round trips; default
omission; aliases and alias collisions; canonicalization; prohibited private
fields; resets and partial resets; and unsupported/unavailable scope filters.

## Validation results

- Focused: `npx.cmd vitest run src/lib/analytics/filters.test.ts
  src/lib/analytics/filter-normalization.test.ts
  src/lib/analytics/filter-url-state.test.ts` — 3 files / 49 tests passed.
- Full: `npm.cmd test` — 91 files / 448 tests passed.
- Typecheck: `npx.cmd tsc --noEmit` — passed with no errors.
- Lint: `npm.cmd run lint` — exit 0 with the four unchanged baseline warnings.
- Build: `npm.cmd run build` — passed; 23/23 pages generated, with the same four
  baseline warnings.
- `git diff --check` — passed before staging; the final staged check and diff
  review are recorded in the completion report.

## Known warnings

Unchanged from the Step 2.1 baseline: three `@next/next/no-img-element`
warnings in `src/features/insights/score-profile-panel.tsx`, one unused
`normalizeProfileHeadToHeadRow` warning in `src/lib/db/analytics-repo.ts`, and
the `next lint` deprecation notice. No unrelated warning was fixed and no audit
fix was run.

## Decisions made

- The route owns scope; no shared `scope` query field.
- Repeated multi-select parameters, canonical registry order, first-valid scalar
  conflict handling, explicit aliases only, and canonical-only serialization.
- Separate sample filters, durable comparison/highlight/focus selection,
  navigation, and transient interaction.
- UUID-pair corporation/Prelude identity and typed subject tokens.
- Finalized aggregate default; explicit zero preserved.
- Canonical state separated from applicable query state for recoverable metadata
  conditions.
- No unapproved boolean, tri-state, game-range, data-source, or duration
  semantics.

## Deferred work

- Step 2.3 metric, denominator, eligibility, exclusion, sample, coverage, and
  evaluated-result contracts.
- Step 2.4 formulas and versioned definitions.
- Step 2.5 repositories, server authorization, runtime vocabulary loading, and
  query DTOs.
- Game-range meaning, imported/data-source taxonomy, game-length facts and
  categories, and universal no-Prelude versus missing evidence.
- Production route/page/router integration.

## Limitations and risks

- Syntactic acceptance is not proof that a stable ID exists or is authorized;
  callers need loaded metadata and later server-side revalidation.
- A shared filter can still be unsupported by a particular metric; later metric
  contracts must declare compatibility rather than relying on registry status.
- Unresolved/loading/query-error URL identity can remain visible for recovery,
  but consumers must use `applicableState`, not raw canonical state, for query
  inputs.
- No production row or remote RPC verification was performed; no repository or
  Supabase read was needed for these pure contracts.

## Commit hash

The focused Step 2.2 commit is
`feat(analytics): define shared filter and URL-state contracts`; its hash is
reported in the completion report because a commit cannot contain its own hash.

## Exact next action

Begin **Phase 2, Step 2.3 — Metric, Sample, Coverage, and Eligibility
Contracts** only when explicitly assigned. Do not begin formulas, repository
queries, schema/migrations, Supabase mutation, production page integration,
routes, navigation, deployment, or Step 2.4+ with that assignment.

## Confirmations

- Step 2.3 was not started.
- No analytics formula or metric-result contract was added.
- No repository query, page, route, navigation, middleware, dependency,
  environment file, schema, migration, database view/RPC, Supabase data,
  Storage object, deployment, or production asset changed.
- The Step 2.1 and corporation-logo policy commits remain intact.
- Nothing was pushed.
