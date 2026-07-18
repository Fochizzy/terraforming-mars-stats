# Game data-capture contract (v2)

A hidden, additive capture contract for the current live site. It accumulates
migration-ready game facts so the redesigned site does not launch with blank or
reparsing-dependent data. It adds **no** dashboard, map view, heatmap, scoring
control, expansion selector, or manual-entry field, and it does not change the
current user workflow.

- Parser version: `tm-data-capture-v2`
- Schema migration: [`20260719120000_data_capture_hardening_v2.sql`](../supabase/migrations/20260719120000_data_capture_hardening_v2.sql)
- Release marker: `game_mechanic_capture_deployments` key `data-capture-hardening-v2`
- Writer RPC: `public.replace_game_capture_v2(uuid, uuid, jsonb)` — `SECURITY INVOKER`, fixed `search_path = public`
- Parser: [`src/lib/imports/capture/parse-game-capture.ts`](../src/lib/imports/capture/parse-game-capture.ts)
- Wiring: [`game-mechanic-capture-repo.ts`](../src/lib/db/game-mechanic-capture-repo.ts) (import + finalize entrypoints, names preserved)

## Relationship to prior migrations (schema drift)

Production applied `20260718200536_add_venus_colonies_import_facts` (creates
`game_expansion_facts` + the historical owner-confirmed backfill) and
`20260718204000_add_game_mechanic_capture` (empty `game_venus_events` /
`game_colony_events` + `game_mechanic_capture_deployments`). The first was never
committed. This branch adds a faithful, schema-only reconstruction of it so a
clean baseline builds, and the additive v2 migration on top. The additive
Venus/Colonies columns the Git v1 migration expected were never added to
`games`; game-level state lives in `game_expansion_facts`, and v2 keeps it there.

## What is captured, per newly imported game

| Concern | Store |
| --- | --- |
| Immutable original export (byte-for-byte) + sha256 + metadata | `game_capture_import_sources` |
| Versioned parser run + coverage telemetry | `game_capture_parser_runs` |
| Shared canonical event envelope | `game_capture_events` |
| Canonical board placements (row/position + flat id) | `game_capture_board_placements` |
| Map detection state + evidence | `game_capture_map_detections` |
| Private unsupported evidence | `game_capture_unsupported_evidence` |
| Game-level Venus/Colonies state + counts | `game_expansion_facts` (existing) |
| Canonical colony / event-type catalogues | `capture_colony_catalog`, `capture_event_type_catalog` |

### 1. Immutable source retention

`game_capture_import_sources` stores the exact, untrimmed export bytes, its
sha256, byte length, source format/route, and import timestamp. A `BEFORE
UPDATE` trigger makes the text and hash immutable; a re-parse with a mismatched
hash is rejected by the RPC. Raw sources are never placed in anon-readable
storage (RLS: members read, editors manage; no anon grant). The import path now
hands the original bytes to capture instead of the trimmed `raw_log_text`.

### 2. Shared canonical event envelope

Every supported event is one `game_capture_events` row: game id, import id,
parser run, source hash, sequence, generation, **nullable** stable player id and
game-player id, attribution status, category, type, canonical entity id, source
line number, original + normalized text, parameter type, before/after/amount,
confidence, coverage state, provenance, and a typed `detail` JSON for extras.
Attribution is first-class columns, never buried in JSON.

- **Deterministic identity:** `event_uid = <source-fingerprint>:<category>:<seq4>:<line>`.
  The same source parsed twice yields identical uids; legitimate repeated
  actions differ by sequence/line. `unique (game_id, event_uid)` makes retries
  idempotent — the RPC deletes and re-inserts a run's snapshot atomically.
- **Canonical catalogues:** `(event_category, event_type)` is a foreign key to
  `capture_event_type_catalog`; colony events must name a `capture_colony_catalog`
  colony (trigger). Arbitrary types/colonies are rejected.
- **Categories:** card_play, tile_placement, global_parameter, venus, colony,
  milestone, award, standard_project, generation, pass, action_order,
  card_points, resource, unsupported. (Fine-grained resource deltas remain in
  the legacy `game_log_events` store; the envelope carries canonical actions.)

### 3. Canonical board placements

`game_capture_board_placements` preserves both the flat upstream space id
(`canonical_board_space_id` / `upstream_numeric_space_id`) **and** the raw
`board_row` / `board_position` — the "row R position P" format is converted to a
flat id without discarding row/position. Each row records canonical tile type
(ocean/city/greenery/special/neutral/unresolved), placement action
(place/replace/remove/convert/ownership_change/unresolved), ownership state, raw
actor text, nullable attribution, map id/code, source card/action (only when
explicit), and evidence. Enough to rebuild a board without reparsing.

### 4. Map detection + evidence

`game_capture_map_detections` records the detection state
(confident/ambiguous/conflicting/missing/unsupported), detected map, candidate
maps, ocean-space evidence, objective evidence, randomized-objective and
conflict state, confidence, and provenance. An unresolved map is **never**
defaulted to Tharsis; randomized objectives never determine the map; ambiguity
is preserved.

### 5–8. Global parameters, Venus, Colonies, timing

Explicit global-parameter changes (temperature/oxygen/ocean/venus) capture
before/after/amount when the source states them, and stay null otherwise — no
inference from TR, no interpolation, no assigning unattributed movement to a
nearby player. Venus/Colonies flow through the envelope (`venus`/`colony`
categories with typed detail) and roll up into `game_expansion_facts` state +
counts. Generation starts and pass events are captured; action order is the
event sequence.

### Venus/Colonies state classification (v2 rule)

States: `confirmed_present`, `confirmed_absent`, `incomplete_evidence`,
`unsupported_log_pattern`, `conflicting_evidence`. Unlike v1, a content-bearing
log only yields `confirmed_absent` when it is an **authoritative full export**
(recognizable game structure: generations + actions + passes). A content-bearing
log without recognizable structure stays `incomplete_evidence` rather than being
silently defaulted to absent. A Venus-tagged card alone is never proof.

### 9. Coverage telemetry + unsupported evidence

Each parser run stores coverage: total/recognized/represented lines, unsupported
lines, unresolved entities/players/board-spaces/tile-types, duplicate
candidates, conflicting evidence, parser exceptions, and an overall coverage
state (complete/partial/unsupported_pattern/conflicting/parser_failure).
Unsupported source lines are retained privately (editor-only) with a sanitized
`normalized_pattern` for reporting.

### 10. Historical games and cutoff

The 42 historical `game_expansion_facts` rows (owner-confirmed absence) are
preserved exactly — v2 never rewrites their state, provenance, or backfill
columns, never creates historical Venus/Colony events, and never zeroes a
historical Venus scale. Games imported after the `data-capture-hardening-v2`
cutoff are classified by the parser and never receive a blanket legacy default.

## No-blank-row contract

Absence is a game-state fact (`state = confirmed_absent`, zero child rows). The
capture tables never hold placeholder children with null player/generation/type.
Missing is never coalesced to zero: an absent Venus game has
`final_venus_scale = NULL` and `venus_event_count = 0` — distinct facts.

## Access control

RLS is enabled on every capture table. Members read via `can_read_game`; editors
manage via `can_edit_game`; unsupported evidence is editor-only. Catalogues are
authenticated-read-only. No table grants anon. The writer RPC is `SECURITY
INVOKER` with a fixed `search_path`, revoked from public/anon, executable by
`authenticated`. The v2 migration also revokes the stray anon grants the v1
event tables inherited from the public-schema default.

## Current-workflow compatibility

Import, scoring, player assignment, corporations, Preludes, Merger, milestones,
awards, cards, notes, winners, and ties are unchanged. Capture is non-blocking:
an import or finalize never fails because capture hit an unsupported pattern —
the evidence is retained and capture can be re-run (forward-fix).
