# Shared Filter and URL-State Contracts

## Status and scope

Phase 2, Step 2.2 defines the client-safe, presentation-agnostic contracts for
analytics sample filters, durable analytical selection, URL parsing,
normalization, deterministic serialization, scope compatibility, canonical
identity, and reset behavior.

This step does not connect a production page or route, query a repository,
authorize an identity, define a metric/sample/eligibility result, calculate an
analytic, or change Supabase. Route integration and repository authorization
remain later, separately assigned work.

## State ownership

The model separates four kinds of state:

1. `AnalyticsFilterState` narrows the eligible analytical sample.
2. `AnalyticsSelectionState` identifies comparison/highlight entities and the
   durable metric, point/evidence-row, series, and detail focus within that
   sample. A selected comparison entity is not automatically a sample filter.
3. `AnalyticsNavigationState` contains the route-owned pathname and analytics
   scope. Scope is not a shared query parameter.
4. `AnalyticsTransientInteractionState` contains hover, DOM focus, and open-menu
   state. It is never URL-addressable.

`AnalyticsUrlAddressableState` contains only the first two. The semantic chart
point and evidence-row focus share `point`; they do not have competing URL
fields. The Phase 1 adapter mirrors `pointId` to both
`selectedDataPointId` and `activeTableRowId`, while hover remains `null`.

## Filter registry

Registry support means a filter has an approved shared shape. A particular
metric must still declare that it supports a metric-specific filter.

| Domain | Canonical parameter | Identity/shape | Default | Aggregate-scope status |
| --- | --- | --- | --- | --- |
| Player | `player` | scalar player UUID | no invented player | group/domain supported; global unsupported; individual/comparison route-owned |
| Group | `group` | scalar group UUID | active authorized context | individual/comparison/domain supported; global unsupported; group route-owned |
| Date range | `from`, `to` | real ISO `YYYY-MM-DD` bounds | all eligible authorized history | supported |
| Game range | none | deferred | none | deferred pending an approved meaning |
| Map | repeated `map` | map UUID | all eligible maps | supported |
| Table size | repeated `playerCount` | integers 1 through 5 | all recorded table sizes | supported |
| Generation count | repeated `generationCount` | positive integers | all recorded final generations | supported; not elapsed duration |
| Game-length category | repeated `gameLength` | registered code | none | unavailable: no duration fact or approved category definition |
| Corporation | repeated `corporation` | corporation UUID | all recorded corporations | supported |
| Prelude | repeated `prelude` | Prelude UUID | all recorded Preludes | supported; no-Prelude versus missing remains unresolved data work |
| Corporation/Prelude pair | repeated `corporationPrelude` | `corporation-uuid~prelude-uuid` | all recorded pairs | supported |
| Card | repeated `card` | catalog UUID | all eligible catalog identities | supported; identity is not acquisition evidence |
| Tag | repeated `tag` | canonical code | all registered tags | supported |
| Score source | repeated `scoreSource` | registered score-source key | all eligible sources | supported |
| Player style | repeated `style` | canonical code | all eligible styles | supported |
| Game status | `status` | `draft` or `finalized` | `finalized`, omitted from canonical URL | finalized is supported for aggregate scopes; draft is rejected there |
| Data/import source | none | deferred | none | deferred pending an approved trustworthy taxonomy/read model |
| Minimum sample exclusion | `minSample` | nonnegative integer | absent; no universal threshold | supported when the metric declares it |

Every registry entry has a typed status for every scope: `supported`,
`unsupported`, `unavailable`, `deferred`, or `not-applicable`, with a user-safe
reason. The game scope treats aggregate filters as not applicable because its
route already owns one game. Compatibility does not grant access and does not
replace the Step 2.1 metric capability declaration.

No shared boolean or tri-state filter is approved in this step, so no truthy
string convention is invented. Future boolean/tri-state fields require a
registered parser, default, and canonical representation before use.

## Canonical identity

- Database-backed entities use canonical UUIDs.
- Tag and style values use lower-case canonical codes.
- Score sources use the registered score-source key union.
- Corporation/Prelude pairings use the ordered pair of canonical UUIDs.
- Durable selected entities use typed tokens such as `player:<uuid>`,
  `tag:<code>`, or
  `corporation-prelude-pairing:<corporation-uuid>:<prelude-uuid>`.
- Metric, point, series, and detail values are technical IDs, not labels.

Display names, translations, corporation/card names, logo filenames, asset
paths, Storage URLs, and presentation text are never identity and are never
serialized by these contracts.

## Parsing boundary

`parseAnalyticsUrlState` is structural and side-effect free. It accepts a
`URLSearchParams`, applies only the canonical parsers and explicit route-supplied
aliases, and returns syntactically canonical state, per-field raw-input status,
and typed issues. It performs no metadata query and no authorization check.

Input status preserves:

- `omitted-default` when a parameter was absent;
- `explicit-empty` when it was present but empty;
- `accepted` when at least one value parsed; and
- `rejected` when input was present but no value parsed.

Malformed values are discarded and reported without throwing. Repeated
multi-select values are parsed separately, deduplicated, and sorted by canonical
identity. A repeated scalar keeps the first valid value and reports later
conflicts. A reversed date range is never silently swapped.

Aliases are opt-in through an explicit route-provided map. A canonical field
wins when its alias also appears, with a typed conflict issue. Blank aliases,
aliases that collide with canonical fields, and aliases assigned to more than
one field are configuration errors. Serialization never emits an alias.

## Normalization boundary

`normalizeAnalyticsFilterState` applies canonical syntax, date-range order,
scope compatibility, aggregate-status policy, and the optional pure identity
resolver. It returns two states:

- `state` is canonical URL-restorable state; and
- `applicableState` contains only values safe to pass to a later query boundary.

Identity resolution remains distinguishable:

| Resolution | Canonical/restorable state | Applicable query state |
| --- | --- | --- |
| `accepted` | retained | retained |
| `unknown` | removed | removed |
| `stale` | removed | removed |
| `authorization-rejected` | removed | removed |
| `unresolved` | retained temporarily | withheld |
| `loading` | retained temporarily | withheld |
| `query-error` | retained temporarily | withheld |

The resolver may consult already-loaded metadata but performs no query itself.
Its explanations must be user-safe. URL identity is always untrusted; later
server repositories must revalidate access.

`normalizeAnalyticsSelectionState` keeps comparison/highlight selection
separate from filtering. Invalid, unknown, stale, or authorization-rejected
entities are removed from durable selection. Phase 1 availability
reconciliation preserves compatible entity/metric selection and clears point,
series, and detail only when their available identities are invalidated.

## Serialization and canonicalization

`serializeAnalyticsUrlState` normalizes before writing. It:

- preserves unrelated parameters in their existing relative order;
- removes canonical analytics fields and configured aliases before rewriting;
- appends canonical fields in registry order;
- sorts and deduplicates repeated values;
- omits the `finalized` status default and all empty/default fields;
- preserves explicit `minSample=0`;
- writes date bounds independently as `from` and `to`;
- never writes navigation or transient interaction state; and
- strips known authorization, token, and error-detail parameters.

The canonical order is:

```text
player, group, from, to, map, playerCount, generationCount, gameLength,
corporation, prelude, corporationPrelude, card, tag, scoreSource,
style, status, minSample, entity, metric, point, series, detail
```

The former repeated `expansion` parameter was retired in Phase 4, Step 4.2.
Canonicalization removes stale occurrences instead of preserving them as
unrelated route state.

`canonicalizeAnalyticsUrlState` composes parse, normalize, and serialize at a
route boundary. The utilities do not mutate a router, so they cannot create a
render/router synchronization loop by themselves.

The prohibited field list includes access/refresh tokens, generic token/API or
authorization fields, and error/query-error details. Private metadata and
authorization values must not be placed in URL state under any other name.

## Reset behavior

`resetAnalyticsUrlState` removes all canonical analytics fields, configured
aliases, and prohibited fields while preserving unrelated route query state.
Route-owned defaults are applied later by parsing/normalization.

`partiallyResetAnalyticsUrlState` removes complete filter domains (both `from`
and `to` for `date-range`) or named durable selection fields and their aliases.
It also strips prohibited fields. Empty multi-selects mean no restriction and
serialize as no parameter; an explicit empty input remains visible in parser
metadata until canonicalization removes it.

## Deferred work

- Game-range meaning (ordinal range, rolling window, or explicit game set).
- A trustworthy imported/manual data-source and import-status taxonomy.
- Game-length facts and approved category definitions.
- Registered runtime vocabulary loading and server authorization/query work.
- Metric-specific filter support, sample/coverage/eligibility results, and
  formulas (Steps 2.3 and later).
- Production page/route/router integration.
