# Live-Site Data-Capture v2 Compatibility Specification

## Status and verified production facts

The live site's `data-capture-hardening-v2` release persists canonical,
migration-ready game facts in `game_capture_*` tables so the redesign does not
launch with blank or reparsing-dependent data.

Verified **read-only against production** (`tm-stats` /
`qjtwgrjjwnqafbvkkfex`) on 2026-07-19 by this repository — not taken from
documentation:

- Migration ledger contains `20260719132042 data_capture_hardening_v2`
  (repo file `20260719120000_data_capture_hardening_v2.sql` on live-site branch
  `Fochizzy/moonrakers-app/data-capture-hardening-v2`, commit `bf081d918`).
- `game_mechanic_capture_deployments` carries marker
  `data-capture-hardening-v2` with cutoff `2026-07-19 13:20:42Z` and
  `parser_deployed_at 2026-07-19 13:24:14Z`, parser `tm-data-capture-v2`.
- All eight capture objects exist; catalogs are seeded (13 colonies, 23
  event-type pairs); capture data tables held **0 rows** at verification time
  (no real post-cutoff import had occurred yet).
- Legacy stores are unchanged: 42 games, 42 `game_log_imports`, 14,816
  `game_log_events`, 42 `game_expansion_facts` (all historical
  owner-confirmed absence, 0 non-null final Venus).

The redesign therefore runs against a database that is **already post-v2**,
while still being required to work against databases without the v2 schema
(disposable test clusters, and any environment predating the deployment).

## Chosen approach: a versioned read adapter at the repository boundary

Of the four candidate approaches — (1) read the tables directly everywhere,
(2) compatibility views, (3) migrate v2 data into redesign-native tables,
(4) versioned adapter at the repository boundary — the redesign uses **(4)**:

- `src/lib/imports/live-capture/contract.ts` — v2 row shapes, supported
  parser versions, and the one canonical model.
- `src/lib/imports/live-capture/map-live-capture.ts` — pure, tested mapping
  from both origins into the canonical model.
- `src/lib/db/game-capture-compat-repo.ts` — `readCanonicalGameCapture`, the
  single server-side read path with capability detection.

Why this is the smallest safe approach:

- **No data movement or duplication** (rejects 3): the live-site rows are the
  canonical facts; copying every row into parallel redesign tables would
  create a second source of truth with drift risk and no requirement behind
  it. The raw original source stays exactly where v2 wrote it.
- **No new production objects** (rejects 2): compatibility views require a
  production migration — production mutation is not authorized here, SQL view
  logic is harder to test than pure TypeScript, and views cannot express the
  per-environment capability probe this contract needs.
- **One place that knows the version** (rejects 1): direct reads scatter
  `tm-data-capture-v2` assumptions across consumers. The adapter validates the
  parser version, reports unknown versions explicitly
  (`unsupported_contract_version`), and is the only unit that changes when
  `tm-data-capture-v3` appears.

The adapter is read-only. The redesign's own import action keeps writing its
existing legacy persistence (`game_log_imports` + `game_log_events` +
`game_expansion_facts`); it does **not** write `game_capture_*` rows. Writing
partial v2 envelopes from a second producer with a different event vocabulary
would create exactly the two-incompatible-event-systems problem this
specification exists to prevent. Adopting the v2 writer for redesign imports
is a possible later step that would require its own vocabulary mapping and its
own authorization; it is deliberately out of scope for Step 4.3.

## One canonical model, two origins

`readCanonicalGameCapture({ gameId })` returns `CanonicalGameCapture`:

- `availability: 'live_capture_v2' | 'legacy_import' | 'none'` — which
  evidence system backs the model. `none` means no import evidence exists at
  all; game-level expansion facts (for example historical owner-confirmed
  absence) are still returned when present.
- `captureSchemaPresent` — whether the v2 schema exists in the connected
  database (capability detection, below).
- `source`, `parserRun`, `events`, `placements`, `mapDetection`,
  `unsupportedEvidence`, `expansionFacts`, `issues`,
  `observedUnsupportedParserVersions`.

Origin selection: if the game has at least one `game_capture_parser_runs` row
with a **supported** parser version, the newest such run (by `parser_ran_at`)
backs the model. Otherwise the newest `game_log_imports` row does. A missing
v2 run is **never** treated as parser failure or confirmed absence — it means
the game predates the v2 cutoff or was imported through the redesign path.

### Capability detection

The first v2 query doubles as the schema probe: a missing-relation answer
(PostgREST `PGRST205` / PostgreSQL `42P01`) sets
`captureSchemaPresent = false` and falls through to the legacy path. The same
pattern covers the redesign's own gated column: `game_log_events.review_state`
is selected optimistically and the query is retried without it on a
missing-column answer (`42703` / `PGRST204`), so the adapter works before and
after migration `20260719234500` is applied.

## Table-by-table mapping

### `game_capture_import_sources` → `CanonicalCaptureSource`

Immutable original source retention. The adapter reads the hash and metadata
and **never selects `original_source_text`** — raw evidence stays behind its
RLS boundary and is not re-serialized into DTOs.

Hash semantics are explicit: v2's `source_sha256` digests the original,
untrimmed source bytes (`hashScope: 'original_source_bytes'`); the legacy
`game_log_imports.input_sha256` is a server-derived digest of the stored,
trimmed `raw_log_text` (`hashScope: 'stored_trimmed_log_text'`). The two are
different digests over different byte sequences and are never compared to one
another; v2 sources join legacy imports via `game_log_import_id`, not hashes.

### `game_capture_parser_runs` → `CanonicalParserRun`

One parser result per `(game, parser_version, source_sha256)`; reruns of the
same source and version replace their own snapshot (v2 RPC behavior), and a
new parser version creates a separate run. The adapter picks the newest
supported run and lists every unknown version it saw in
`observedUnsupportedParserVersions` without touching those rows. In the legacy
origin, the `game_log_imports` row itself is the run: its id, parser_version,
created_at, and server-derived `input_sha256` fill the same shape, and its
line/unparsed counts and parse status ride along as `coverage`
(`coverageState` stays `null` because the legacy path never recorded a v2-style
coverage classification — it is not fabricated).

### `game_capture_events` → `CanonicalCaptureEvent[]`

The normalized envelope maps field-for-field. Attribution is first-class:
`explicit_stable` (resolved stable player id), `explicit_unresolved` (actor
text with no resolution), `unattributed` (for example World Government —
never assigned to a nearby player), `not_applicable`. Legacy rows derive the
same statuses: stored `player_id` → `explicit_stable`; payload attribution
`world_government` → `unattributed`; nonempty payload actor →
`explicit_unresolved`; otherwise `not_applicable`.

Event identity: v2 `event_uid` is used verbatim. Legacy rows use their
deterministic `event_identity` when present; rows that predate deterministic
identities fall back to `legacy-order:<event_order>` — derived from stored
facts, stable across rereads, never random, and visibly labelled as derived.
Duplicate identities in either origin are reported as
`duplicate_event_identity` issues, never silently collapsed.

Event category: v2 categories pass through. Legacy `event_type` values map
through a fixed table (`tile_placed`/`tile_removed` → `tile_placement`,
`venus_*` → `venus`, `colony_*` → `colony`, played/bought/drawn/hand types →
`card_play`, and so on). Types with no honest v2 equivalent
(`terraforming_rating_*`, `player_identified`, `first_player_selected`) map to
`legacy_other` rather than being forced into a category they do not mean.

### Confidence and review state (Workstream 4 contract applied)

Canonical confidence is strictly `high`/`medium`/`low`; review state is
strictly `not_required`/`needs_review`/`reviewed`/`rejected`.

- v2 rows already carry three-valued confidence. v2 has **no** human-review
  lifecycle, so `reviewed`/`rejected` never derive from it; the adapter
  derives `needs_review` deterministically — when the row's own facts say it
  is not a clean, attributed, resolved parse (coverage
  `unsupported_pattern`/`conflicting`/`parser_failure`, attribution
  `explicit_unresolved`, confidence `low`, or an `unresolved` tile
  type/action/ownership on a placement; map detections: any non-`confident`
  state) — and `not_required` otherwise.
- Legacy rows written after migration `20260719234500` carry `review_state`
  directly. Older rows that still hold the overloaded confidence `reviewed`
  are split by exactly the migration's payload-deterministic rule:
  `resolution = 'corrected'` → `high`/`reviewed`; anything else →
  `low`/`needs_review`.
- An out-of-contract stored confidence is reported as an `invalid_row` issue
  and conservatively treated as `low` + `needs_review` — visibility is
  preserved without inventing certainty.

### `game_capture_board_placements` → `CanonicalCapturePlacement[]`

Replayable placements keep row/position **and** the flat upstream id, the
raw actor text, nullable stable attribution, map identity, tile type,
placement action, ownership, explicit source card/action, and raw evidence.

Vocabulary mapping:

| Concern | v2 | Legacy | Canonical |
| --- | --- | --- | --- |
| Action | `place/replace/remove/convert/ownership_change/unresolved` | `placed`/`removed` | v2 vocabulary; legacy `placed`→`place`, `removed`→`remove` (pure renames) |
| Ownership | `owned/neutral/unowned/unresolved` | `explicit_owner/unknown/not_applicable` | union; legacy `explicit_owner`→`owned` (owner ids ride along), `unknown`/`not_applicable` preserved |
| Tile type | coarse class (`ocean/city/greenery/special/neutral/unresolved`) | fine upstream code (`mining_rights`, `moon_mine`, …) | value preserved verbatim plus `tileTypeVocabulary` (`capture_coarse_class` vs `upstream_tile_code`); the adapter does not invent a translation between vocabularies |
| Identity | `placement_uid` | tile event `event_identity` (or derived `legacy-order:` fallback) | duplicates → `duplicate_placement_identity` issue |

Legacy owner columns (`owner_player_id`, `owner_game_player_id`) are carried;
v2 placements have no owner id columns, so those stay null there.

### `game_capture_map_detections` → `CanonicalMapDetection`

Detection state (`confident/ambiguous/conflicting/missing/unsupported`),
candidates, ocean/objective evidence, randomized-objective flag, conflict
state, and provenance map directly. The legacy origin builds the same shape
from the persisted `confidence_summary.map` block (detector states
`confident/ambiguous/conflicting/missing`, candidate codes, ocean space ids,
objective configuration). Nothing infers a map from randomized objectives, and
an unresolved map is never defaulted — the shape reports exactly what was
persisted. Review state: `confident` → `not_required`; anything else →
`needs_review`.

### `game_capture_unsupported_evidence` → `CanonicalUnsupportedEvidence[]`

Private source evidence awaiting parser improvement: always
`needs_review`, never a public event row, never confirmed absence, never a
zero. RLS keeps it editor-only; non-editors simply receive no rows. The
legacy origin has no row-wise unsupported store (only the unparsed-line count,
surfaced through the parser run's coverage), so it returns an empty list —
honestly, not as a claim that nothing was unsupported.

### `game_expansion_facts` → `CanonicalExpansionFacts`

The shared game-level mechanic state used by both the live site and the
redesign. Forward states (`confirmed_present/confirmed_absent/
incomplete_evidence/unsupported_log_pattern/conflicting_evidence`) and the two
historical states (`historical_parser_verified_owner_confirmed_absent`,
`historical_owner_confirmed_absent`) pass through untouched, with
`final_venus_scale` null meaning missing/not-applicable — never zero. The
adapter evaluates each mechanic against the shared semantic matrix
(`src/lib/imports/canonical-data-semantics.ts`) and surfaces any violation as
a `semantic_violation` issue instead of reinterpreting the data.

## Compatibility requirements coverage

| Requirement | How it is met |
| --- | --- |
| Production before v2 deployment | schema probe → `captureSchemaPresent: false`, legacy path |
| Production after v2 deployment | verified live; v2 path when a supported run exists |
| Historical games without v2 runs | legacy path; availability `legacy_import` |
| Future games with v2 runs | v2 path; availability `live_capture_v2` |
| Future parser versions | unknown versions reported as `unsupported_contract_version`, newest supported run used, legacy fallback otherwise |
| Reruns of the same source | v2 uniqueness `(game, parser_version, source_sha256)`; adapter picks newest supported run |
| Partial coverage | run + per-event coverage states pass through; partial never upgraded to complete |
| Unsupported evidence | private rows mapped `needs_review`; never absence, never zero |
| Conflicting evidence | coverage/conflict states pass through; conflicting → `needs_review` |
| Missing logs | availability `none` with expansion facts preserved |
| Confirmed historical absence | historical states pass through with null final Venus (not zero) |
| Explicit zero vs missing | `classifyMeasuredValue` / `classifyFinalValueForState`; null never coerced |
| Not applicable | absence states classify null final value as `not_applicable` |
| Attributed / unattributed events | first-class attribution statuses in both origins; unattributed never reassigned |

## Reconciliation

The read-only production reconciliation between the legacy stores and the v2
capture stores is a separate immutable artifact:
`docs/redesign/reports/phase-04-step-03-compat/` (see Workstream 9). It is
regenerated by re-running its documented queries, never by editing the
artifact.
