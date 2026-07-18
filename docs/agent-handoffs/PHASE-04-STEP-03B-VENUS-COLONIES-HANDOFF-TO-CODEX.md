# Phase 4, Step 4.3B — Venus Next and Colonies parsing/persistence/backfill — handoff to Codex

Date: 2026-07-18
Branch: `redesign/tm-stats-dashboard-rebuild`
Map-identification checkpoint commit: `c9e92f6d2`
Status: **Step 4.3 remains active. Do not close it until Step 4.3B below is complete.**

This is an explicit, user-approved scope amendment. Step 4.3B is part of Step 4.3.
It does **not** belong to Step 4.4. Step 4.4 remains "Final Review, Finalization,
and Draft Safety" and must not begin automatically.

---

## 1. Map-identification checkpoint (complete — do not redo)

The current map-identification work is complete and committed at `c9e92f6d2`
(`feat(log-game): import catalog, tile-evidence map detection, and claimable
guest identity`). Do not discard, rewrite, or re-mix it. It contains:

- **Upstream shared catalog.** Card and tile reference data synced into Supabase
  (`public.cards`, `public.terraforming_mars_tile_types`) via `scripts/catalog/`
  (daily workflow + manual dispatch, server-only service role). Raw manifests
  preserved; absent effects stay null; duplicates preserved as reversible audit
  rows; the Cards page reads only `is_catalog_visible = true`.
- **Tile-evidence map reconstruction.** `terraforming-mars-tile-types.ts` (45
  types incl. 7 Moon), `parse-terraforming-mars-tile-actions.ts` (current flat
  `at NN` / Moon `mNN` and historical `on row R position P`),
  `build-imported-board-state.ts`, and `detect-import-board-map-independent.ts`
  (ocean-fingerprint map signal; objective configuration is a separate input).
- **Server import path converted** (`src/app/(app)/log-game/import/page.tsx`):
  parses tile actions, reconstructs the board, calls the independent detector,
  requires a confirmed (non-`unknown`) objective setup, allows every map incl.
  Hollandia under randomized objectives, rejects only true conflicts or a
  confident detected-map mismatch, scopes objective validation by configuration
  (map relationships vs global catalog), passes tile actions to
  `buildTerraformingMarsLogEvents`, and persists tile/board/conflict evidence in
  `confidenceSummary`.
- **`objectiveConfiguration`** threaded through the draft schema and every call
  site (Manual Entry = `board_defined`; imported = `unknown` until reviewed;
  owned by the Setup step in the manual-entry registry).
- **Claimable guest identity/privacy migration applied to production** with
  explicit user confirmation:
  `supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql`.
  Adds `player_private_identities` (RLS), `private` schema + normalizers,
  `private.resolve_public_player_name`, `public.get_public_player_names`,
  `public.resolve_import_guest_identity`, and privacy-wrapped redefinitions of
  `analytics.player_game_results` and the final-action/OCR RPCs. No identity
  backfill. Verified live (view returns rows with no null names; 0 rows in the
  private table; 0 players created); advisors re-run with no new security
  findings and only three INFO-level performance notes on the new empty table.

Live catalog migrations already applied (versions differ from local filenames
because the Supabase tool assigns fresh versions):
`20260718154209 sync_upstream_cards_and_tile_catalog`,
`20260718154932 reconcile_upstream_card_identities`, plus the identity migration
above. Catalog snapshot `a63ac3f9-4725-49f5-a967-04899ad52c19`: 996 cards, 45
tiles; 1,143 retained card rows (1,090 visible, 53 superseded).

Validation at the checkpoint: `tsc --noEmit` clean; `vitest` 160 files / 843
tests; `next lint` exit 0 with the four accepted baseline warnings
(3× `no-img-element` in `score-profile-panel.tsx`, 1× unused
`normalizeProfileHeadToHeadRow` in `analytics-repo.ts`); `next build` 32/32 pages
with `ƒ Middleware`.

Open (carried into 4.3B or later): committed privacy-sanitized real tile-export
fixtures are not yet added (parser is verified against real private PDFs and
synthetic fixtures); the objective-alias data-only migration remains separately
gated; the seven upstream expansion milestones (Hoverlord, Networker, Purifier,
One Giant Step, Lunarchitect, Risktaker, Tunneler) remain explicit catalog gaps.

Worktree note: `.codex/config.toml` is Codex's own local agent config; it was
left untracked (not committed) and is not project state.

---

## 2. Step 4.3B assignment — Automatic Venus Next and Colonies Parsing, Persistence, Historical Parser Verification, and Backfill

Continue **after** the map-identification checkpoint. This is the exact,
user-approved scope.

### 2.1 Sequencing

1. (done) map-identification completion commit `c9e92f6d2`.
2. Venus/Colonies parser and schema implementation.
3. Historical dry-run and backfill implementation.
4. Step 4.3 documentation and closure.

Use clean, sequential commits; do not mix unrelated cleanup into them.

### 2.2 Explicit authorization

Implementation of the following is explicitly authorized: automatic Venus Next
presence detection; automatic Colonies presence detection; Venus tracker
parsing; player-attributed and unattributed Venus event parsing; Colony
construction event parsing; Colony trade event parsing; canonical persistence
contracts; the minimal required schema migration; parser and source provenance;
a historical parser dry run; an idempotent historical absence backfill; focused
tests; planning-document updates; and the Step 4.3 completion handoff.

**No Venus or Colonies information may require manual entry.**

### 2.3 Source authority (in order)

1. real exported game logs (parser compatibility);
2. upstream application source and wiki (supported behavior and identifiers);
3. linked Venus Next and Colonies rulebooks (official mechanics);
4. TM Stats canonical records (local normalized representation).

Develop and test against **retained real export fixtures**. Do not design the
parser from guessed wording, screenshots, card metadata, or the existing local
seed alone. All supported imports originate from logs exported by the upstream
Terraforming Mars web application.

### 2.4 Required automatic detection

Determine Venus Next and Colonies state automatically from the complete exported
log. Use explicit states: `confirmed_present`, `confirmed_absent`,
`incomplete_evidence`, `unsupported_log_pattern`, `conflicting_evidence`,
`historical_parser_verified_owner_confirmed_absent`,
`historical_owner_confirmed_absent`.

Do not convert incomplete, unsupported, or conflicting evidence into confirmed
absence. Do not infer expansion presence solely from card metadata.

**Venus Next** may be confirmed from: explicit game-option evidence; Venus
tracker or global-parameter evidence; canonical Venus parameter movement; or
another upstream-supported unambiguous marker. When present, parse all supported
facts available: final Venus scale; Venus scale snapshots; generation when
available; attributed player; unattributed tracker movement; number of scale
steps; before/after tracker values when available; explicitly supported TR
effects; source action/project/card/effect when available; original source
evidence; parser confidence; parser version. Do not infer Venus movement from
generic TR gain; do not assign unattributed movement to a nearby player; do not
interpolate missing tracker values; do not infer an absent starting value; do
not convert missing coverage into zero.

**Colonies** may be confirmed from: explicit game-option evidence; Colony setup
evidence; colony construction; trade with a colony; or another upstream-supported
unambiguous marker. At minimum distinguish `built_colony` and
`traded_with_colony`. For each event preserve when available: stable player ID;
generation; event sequence; canonical colony ID; action type; payment or
trade-fleet details; attributable colony-track movement; original source
evidence; parser confidence; parser version. Do not infer a Colony trade from
generic resource gain; do not treat all colony-track movement as a player action;
do not combine construction and trading into one ambiguous event type; do not
assign an unattributed event to a player.

### 2.5 No manual-entry requirement

Do not add Venus Next / Colonies checkboxes, expansion-selection controls, Venus
tracker inputs, Venus/Colony action inputs, manual correction fields for these
mechanics, a generic `expansionCodes` workflow, or a generic "used expansion"
form. Manual Entry must not request Venus or Colonies information. Import Review
may later display parser-derived values, evidence, coverage, and warnings as
read-only information. Unsupported log wording should create parser evidence and
a development fixture — not a manual-entry field.

### 2.6 Schema requirements

Audit the existing schema before editing. Use the smallest canonical schema that
preserves:

- **Game-level state:** Venus Next detection state; Colonies detection state;
  detection provenance; parser version; source coverage; final Venus scale when
  available; source-log association.
- **Venus records:** game ID; stable player ID when attributed; generation when
  available; sequence or deterministic event identity; event type; scale steps;
  before/after values when available; source entity when available; evidence;
  confidence; provenance.
- **Colony records:** game ID; stable player ID when attributed; generation when
  available; sequence or deterministic event identity; canonical action type;
  canonical colony ID when resolved; supported action details; evidence;
  confidence; provenance.

Prefer canonical event records from which analytics derive totals and booleans.
Do not persist only broad booleans (`usedVenus`, `usedColonies`,
`tookColonyAction`). Do not store structured facts only inside notes or opaque
JSON when repository conventions require normalized records. Add uniqueness or
deterministic idempotency protection so retries and duplicate finalization cannot
create duplicate events. Review RLS, authorization, historical compatibility,
rollback, and indexes. Do not make unrelated schema changes.

Established repository conventions to follow: apply migrations via the Supabase
migration tool (the tool assigns a fresh version; the local filename version may
differ, as with the three Step 4.3 migrations); never `db push`; analytics views
use `security_invoker` and must re-grant; keep the private/personal split behind
the `private` schema and `resolve_public_player_name` (do not surface private
names in any new reader). `game_log_events` already carries
`event_type`/`generation_number`/`event_order`/`payload`/`tile_type`/`card_id`/
`resource_type`/`resource_amount`/`board_space`; the import path already emits
`tile_placed`/`tile_removed`. Reuse this event stream where possible before
adding new tables.

### 2.7 Historical parser dry run

The owner has confirmed every existing TM Stats game used neither Venus Next nor
Colonies. Use all historical games with retained source logs as a **negative
integration corpus**. Do not start with a blanket database update.

Run the **same production parser** intended for future imports against every
eligible historical source log — same normalizers, event identity, dedup, player
resolution, evidence handling, and provenance code. A special backfill-only
parser path is prohibited. Expected result for every historical game: Venus
absent; Colonies absent; no Venus snapshots/events; no Colony construction/trade
events; final Venus scale not applicable.

Produce machine-readable and human-readable dry-run reports containing: total
historical games; games with retained parseable logs; games without retained
logs; parser-confirmed Venus absence; parser-confirmed Colonies absence;
unexpected Venus presence; unexpected Colonies presence; unexpected Venus events;
unexpected Colony events; incomplete evidence; unsupported patterns; conflicting
evidence; parser exceptions; duplicate events; unresolved player associations;
IDs of games requiring review. The dry run must not write game changes. Do not
continue automatically if unexpected or unresolved results exist; report every
exception with its source evidence and parser interpretation.

### 2.8 Historical backfill

Run the write backfill only after the dry run passes, or every exception has been
explicitly reviewed and resolved. For games verified through retained logs,
persist provenance equivalent to
`historical_parser_verified_owner_confirmed_absent`. For games without retained
parseable logs, persist `historical_owner_confirmed_absent` (do not describe
these as parser verified).

For eligible historical games persist: Venus Next confirmed absent; Colonies
confirmed absent; zero derived Venus action count; zero derived Colony
construction count; zero derived Colony trade count; provenance; parser version
where applicable; backfill version; backfill timestamp. Do not set final Venus
scale to zero; do not create Venus tracker snapshots, Venus event rows, or Colony
event rows; do not overwrite explicit future-style Venus/Colonies data; do not
modify scores, placements, winners/ties, players/IDs, maps, milestones/awards,
corporations, Preludes/Merger, card data, generation data, notes, or unrelated
evidence.

The backfill must be bounded, auditable, transactional where supported, safe to
rerun, and idempotent. Before writing, report: eligible game count;
parser-verified count; owner-confirmed-only count; already-populated count;
excluded count; exact update conditions. After writing, verify: expected == actual
row counts; no historical Venus events created; no historical Colony events
created; no unrelated game data changed; no explicit future-style data
overwritten; a second run requires zero changes.

### 2.9 Production execution boundary

Creating and testing the migration and backfill is authorized. **Before applying
the migration or backfill to the linked production database, inspect the
repository's production-change governance** (`CLAUDE.md`, `MASTER-RULES.md`,
`MASTER-PLAN.md` prohibit schema/migration/production-data changes without
separate explicit authorization). If separate production-execution authorization
is required: prepare the migration; run local/test validation; produce the
production dry-run report; document the exact production command; **stop before
production mutation; request the required authorization.** Do not claim
production was updated unless it was actually executed and verified. (Note: in
this checkpoint the identity/privacy migration was applied only after an explicit
in-session user confirmation; apply the same gate to Venus/Colonies.)

### 2.10 Required tests

Add focused tests for: **presence detection** (explicit Venus/Colonies present
and absent; tracker/setup/construction/trade confirmations; related card alone
does not confirm; incomplete stays incomplete; unsupported stays unsupported;
conflicting stays conflicting); **Venus parsing** (final tracker value; multiple
increases; attributed and unattributed increases; generation attribution; missing
generation; partial coverage; duplicate-event prevention; no interpolation; no
generic-TR inference); **Colony parsing** (construction; trade; multiple trades;
multiple colonies; multiple players; unresolved colony identifier; unattributed
event; generation attribution; duplicate-event prevention; no
generic-resource-gain inference); **historical verification and backfill** (all
retained logs use the production parser; all expected games resolve absent; no
historical events created; missing logs use separate provenance; explicit
future-style data not overwritten; unrelated data unchanged; dry run performs no
writes; backfill idempotent; second run changes zero rows; expected == actual
counts); and **regression** (map detection intact; randomized objectives intact;
unknown maps never default to Tharsis; guest creation intact; private-name
protection intact; missing distinct from zero; generic gameplay expansion
tracking remains removed; `expansionCodes` not restored; Merger intact; draft
save/resume intact).

### 2.11 Documentation

Update `docs/redesign/MASTER-RULES.md`, `docs/redesign/DATA-CAPABILITIES.md`,
`docs/redesign/DECISIONS.md`, `docs/redesign/phases/04-log-a-game.md`,
`docs/REDESIGN_STATE.md`, and any migration documentation required by convention.
Create a dedicated Step 4.3B handoff or a clearly bounded 4.3B section inside the
final Step 4.3 handoff, recording: schema changes; migration file; RLS review;
parser version; fixture inventory; historical dry-run counts; dry-run report
paths; backfill counts; backfill report paths; provenance states; idempotency
result; production application state; exact tests; known limitations; exact next
action.

### 2.12 Step 4.3 closure gate

Do not mark Step 4.3 complete until: map detection is integrated (done); Venus and
Colonies automatic detection is integrated; Venus and Colony event parsing is
integrated; schema support exists; the historical production-parser dry run is
complete; every exception is resolved or explicitly blocked; the backfill is
tested and idempotent; production status is honestly documented; focused tests
pass; regression tests pass; typecheck passes; lint completes with documented
accepted warnings only; build passes; planning documents are current; the final
Step 4.3 handoff exists; and the worktree is clean.

Then set the next action to: **Await explicit assignment for Phase 4, Step 4.4 —
Final Review, Finalization, and Draft Safety.** Do not begin Step 4.4
automatically.

---

## 3. Recommended first moves for Codex

1. Verify HEAD is `c9e92f6d2` and the worktree is clean (ignore untracked
   `.codex/`). Confirm the three Step 4.3 migrations in the live ledger.
2. Gather retained real exported logs (the owner keeps import artifacts in
   Downloads/Desktop per prior sessions) and add sanitized real fixtures — this
   also closes the carried-over map-format fixture gap.
3. Audit the existing schema and the `game_log_events` stream before designing
   new tables; prefer canonical event records over booleans.
4. Build Venus/Colonies detection + parsing against the real fixtures; add the
   focused tests in 2.10.
5. Design the minimal migration; run local/static validation; **stop at the
   production boundary and request authorization** (2.9).
6. Implement the shared production parser dry-run over historical logs; produce
   both report formats; resolve exceptions before any backfill.
7. Implement the idempotent absence backfill; dry-run report, then request
   production authorization; verify idempotency.
8. Update planning docs; write the final Step 4.3 (incl. 4.3B) closure handoff;
   commit along the 2.1 boundaries; leave the worktree clean.
