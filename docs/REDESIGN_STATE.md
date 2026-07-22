# TM Stats Redesign State

## Current substep

Phase 4, Step 4.3 - Import Validation, Evidence Review, and Claimable Guest
Identity (**BLOCKED - the approved import-identity remediation has not been
built or independently reviewed. The WS1 Layer A ledger gate, ledger #106
carry, and replay-safety option (e) reconciliation are integrated. WS2's
reader half is deployed; its remaining issue is the confirmed live
private-name enumeration oracle and the approved replacement. Step 4.4 is
NOT STARTED.**)

## Current owner

Local documentation-only state reconciliation on
redesign/tm-stats-dashboard-rebuild. Preflight starting HEAD was
5597817fc6790fa4831ff968629ff49c81f16705. Concurrent commit
572c88c11779146dcef5c86bc9cf71298e47f91b landed before this task commit
and is its immediate pre-commit parent. No production access is part of this
reconciliation.

### Pre-remediation state reconciliation (2026-07-21)

This section is the current authority for Step 4.3 status. It supersedes stale
current-state claims below while retaining their historical record.

- **Local Git/tree evidence.** WS1 Layer A is integrated by implementation
  commit 850953cc8 (with hazard correction 2c583a7a3) and merge
  4160eb565; the ledger #106 carry is integrated by d2679c569 and merge
  c5021a52f; the option (e) replay-safety reconciliation is integrated by
  7290fcf9c and merge 0d90d40c3.
- **Ledger model.** src/lib/db/migration-ledger-map.ts records **110
  entries**, head 20260721201734 harden_claim_rpc_privacy. The #106 file is
  20260721173000_harden_claim_rpc_privacy.sql; it was applied in production
  under ledger version 20260721201734, so reconcile it by migration **name**,
  not timestamp/version adjacency.
- **Production facts - last independently verified 2026-07-21; must be
  re-read live before any production-sensitive action.** The #106 hardening is
  applied. The deployed public.match_import_player_names(uuid, text[]) is a
  confirmed live private-name enumeration oracle: it is SECURITY DEFINER,
  authenticated-only, accepts an unbounded caller-supplied candidate array,
  and returns field-identifying reasons with a 1:1 score. This classification
  was established by two independent read-only sessions and is recorded here,
  not reopened or re-adjudicated.
- **WS2.** The reader half shipped on the live-site lineage and is deployed.
  It already bounds its own input and tolerates both fine-grained and coarse
  match values, so no frontend-first step is required. The remaining WS2 issue
  is the confirmed oracle and its replacement.
- **20260720120000.** The coarsening migration is unapplied and is
  insufficient as a closure: it hides which private field matched but still
  confirms that a supplied private name belongs to a real identity. It is not
  authorized for application and must not be applied in the belief that it
  closes the oracle.
- **20260718050924.** The claimable-guest identity migration is not gated.
  Its content is applied as ledger 20260718181600 under renamed drift. It
  must never be applied to production under any protocol.
- **Approved design.** The import identity classification, exact source-bound
  matching with no fuzzy/prefix matching, uniform response set, server-only
  matcher boundary, and save-time revalidation are recorded in
  docs/redesign/DECISIONS.md under "Phase 4 Step 4.3 - Import identity
  classification and source-bound matching." This reconciliation does not
  duplicate or alter that decision.

Remaining Step 4.3 blockers, in required order:

1. Build the approved import-identity fix; obtain an independent review; then,
   and only with separate authorization, apply it under expand/contract.
2. Run the tile-attribution backfill **before** guest re-neutralization. Two of
   the 114 rows resolve only through the unlinked guest's display_name.
3. Perform guest re-neutralization.
4. Apply the remaining gated migrations 20260719234500, 20260720100000,
   and 20260720110000 under the per-mutation protocol and separate
   authorization.
5. Only then run the fresh independent closure audit.

Step 4.3 remains **BLOCKED**. Step 4.4 is **NOT STARTED**.

### Historical third remediation pass (2026-07-20) — PARTIAL, still BLOCKED

Authoritative handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-THIRD-REMEDIATION-PARTIAL-HANDOFF.md`.

Delivered and validated (commits `594244875`, `1efd6f447`):

- **Tile attribution (WS4).** `finalizeGameLog` now attributes imported
  placement events from the import's own recorded identity resolutions once
  the same-game participant map exists. Ambiguous, unresolved, and
  non-participant actors stay unattributed; retries are no-ops. 14 new tests.
- **Matching oracle (WS3).** Gated migration `20260720120000` coarsens the
  `match_import_player_names` disclosure to `exact`/`partial`. Both
  `match_reason` and `match_score` are coarsened — the score mapped 1:1 onto
  the reason and was a parallel oracle. Internal ranking unchanged, input
  bounded, authorization and `search_path=''` preserved. **Not applied.**
- **Ledger (WS6, partial).** Production-only `20260720021300` registered;
  `20260720120000` recorded as gated.
- **Backfill package (WS4).** `supabase/verification/tile-attribution-*.sql`,
  dry-run validated read-only: 114 rows, 3 games, 3 imports, 0 excluded.
  **Not executed.**

At the close of that historical branch, WS1 and WS2 had not yet landed. That
premise is superseded: WS1 Layer A is now integrated, the former
runtime-verifiable-stamp blocker is obsolete, and WS2's reader half is
deployed. WS5 was deliberately not executed; the owner retained the deploy
lock.

**Ordering correction.** The tile backfill must run *before* guest
re-neutralization. Two of the 114 rows resolve solely through the unlinked
guest's `display_name`; neutralizing first destroys that evidence permanently.

No production mutation was performed. The one outward-facing action was the
owner-approved `git push` of the live branch `fix/live-42501-on-capture-v2`,
which had existed on no remote while serving production.

### WS1 Layer A — ledger gate and harness reconciliation (2026-07-21)

Branch `fix/step-43-ws1-layer-a-ledger-gate`, off `0c6f45dfa`. Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-WS1-LAYER-A-LEDGER-GATE.md`. Hermetic:
no production access of any kind, nothing pushed, deployed, or applied, and no
file under `supabase/migrations/` touched.

- **Ledger snapshot refreshed to the 2026-07-21 read-only attestation:** 108
  entries, head `20260721081355 fix_event_card_tag_snapshot_correction`. The
  three additions over the previous 105-entry snapshot (`20260720221937`,
  `20260721035955`, `20260721081355`) were all applied from *other* branches
  under renamed ledger versions and have no file here; each is registered with
  its provenance. The attestation date, count, and head are pinned so a later
  count mismatch fails instead of being overwritten.
- **The gate is now bidirectional.** It previously partitioned repo files only
  — its own header claimed it partitioned the ledger too, but nothing iterated
  the snapshot. Every ledger version must now resolve to exactly one
  classification or fail as `LEDGER_INCOMPLETE`. This is precisely the hole the
  three cross-branch applications fell through.
- **Hazard class added, orthogonal to approval status.** Every migration file
  declares `contraction | expansion | neutral` explicitly (never derived from
  SQL); an undeclared file fails as `CLASSIFICATION_MISSING`. Current
  declarations: 13 contraction, 28 expansion, 8 neutral. (`20260720110000` was
  first declared `expansion`; an independent review disproved that on a
  disposable local cluster and it was corrected to `contraction` — see below.)
- **Harness reconciled.** The replay loop was applying gated `20260717190000`,
  `20260720100000` and `20260720120000` as if they were production history, so
  the "state production is in today" baseline ran against a database carrying
  three never-applied migrations. All five gated migrations are now excluded
  from the history replay and applied after the baselines, in ledger-version
  order, each twice for repeat-safety.
- **The contraction is exercised as a contraction.** `20260720120000` is a
  `create or replace` whose only predecessor is production-only
  `20260720021300` (no repo file), so the harness had been *creating* the
  function rather than replacing it, with no assertion referencing it. A
  modelled pre-image of the deployed predecessor is installed first, and the
  disclosed classification is asserted before (fine-grained `full_name_exact`
  etc. with the 1:1 score) and after (coarse `exact`/`partial`, same resolved
  player, bounded input, ACL preserved). The pre-image is reconstructed from
  repository-local evidence only and is confined to the harness.

Validation at the final commit: `npx tsc --noEmit` exit 0; 177 files / 970
tests pass; lint at the four baseline warnings; production build green;
`bash supabase/tests/executable/run.sh` passes end to end; `git diff --check`
clean.

This historical WS1 branch did not itself start Layer B/C, WS2, guest
re-neutralization, the tile backfill, the closure audit, or Step 4.4. Current
state is governed by the pre-remediation reconciliation above: the WS2 reader
half subsequently deployed, while Step 4.4 remains not started.

### Ledger #106 carried onto this lineage (2026-07-21)

Branch `fix/carry-106-to-redesign`, off redesign HEAD `4160eb565`. Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-CARRY-106-CLAIM-RPC-PRIVACY-TO-REDESIGN.md`.
One read-only production ledger read; no production write, nothing pushed,
deployed, or applied.

The #106 claim-RPC hardening is **applied to production** (ledger
`20260721201734 harden_claim_rpc_privacy`), but its file existed only on the
live-site branch `fix/106-claim-rpc-privacy-remediation` (fix commit
`9ddd0de59`, tip `48d612fc8`). This lineage's record of the three claim RPCs was
still the **pre-fix, vulnerable** definitions — so a later redesign deploy or
`db diff` could have reproduced them and silently restored the enumeration
oracle in production. That is what this closes.

- **Migration carried verbatim.**
  `supabase/migrations/20260721173000_harden_claim_rpc_privacy.sql`, byte-identity
  proven by blob hash (`461e0ecbb…` on both sides), not by inspection. The SQL
  was not altered. It is three `create or replace function` statements and
  nothing else — no object created, dropped or renamed, no grant touched.
- **Snapshot refreshed to a fresh read-only attestation: 110 entries**, head
  `20260721201734 harden_claim_rpc_privacy` (was 108 / `20260721081355`). The
  refreshed snapshot is an exact set match against that read.
- **The two new entries classify differently, which is the point.**
  `20260721193508 fold_player_card_outcome_context_into_definer` has no file
  here and is registered production-only with provenance
  (`20260721194500_…` on `814e60210`, `fix/live-compare-data-remove-declared-style`).
  `20260721201734` is renamed drift, because its file is now carried.
- **The drift mapping is keyed by NAME.** `apply_migration` stamped the UTC
  apply time over the filename version and nothing in the ledger points back at
  the file. Timestamp adjacency would also mispair: `20260721193508`'s ledger
  version *precedes* its filename version `20260721194500`. New export
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME` records the pairing and the
  new test asserts it against the real filename on disk.
- **Declared `contraction`, and pinned.** It creates, drops and grants nothing,
  so the raw SQL reads like a no-op on the contract surface; it is not. Exact
  whole-name matching replaces prefix matching, a 3-character input floor and a
  10-row cap are imposed, the private-first-name label fallback becomes a
  neutral placeholder, and `group_name` is nulled. Already applied *and* a
  contraction — the case the orthogonal hazard dimension exists for.
- **WS1 Layer A confirmed present** on redesign HEAD before any edit: explicit
  hazard declarations plus the bidirectional completeness check. The
  reconciliation depends on both. Declarations now 14 contraction, 28 expansion,
  8 neutral (50 files); production-only register 69 entries.

Validation at the final commit: 177 files / 971 tests pass; `npx tsc --noEmit`
exit 0; lint at the four baseline warnings, none new; production build green;
`bash supabase/tests/executable/run.sh` passes end to end, with the new file
replaying last in the production-history half; `git diff --check` clean.

At the close of that branch, WS2, WS1 Layer B/C, converge, and the closure
audit had not begun. The 20260718050924 reconciliation was parked at that
point and is now delivered; WS2's reader half subsequently deployed. See the
next section, which also corrects the former gated label.

### Claim-RPC grant and replay safety reconciled (2026-07-21)

Branch `fix/reconcile-claim-rpc-grant-replay-safety`, off redesign HEAD
`c5021a52f`. Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-RECONCILE-CLAIM-RPC-GRANT-REPLAY-SAFETY.md`.
Two read-only production reads (ledger metadata; one function definition for a
fidelity check); no production write, nothing pushed, deployed, or applied.

**`20260718050924` is not gated.** `GATED_UNAPPLIED` does not contain it and
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` maps it to `20260718181600`, which is
in the live ledger. Only its *version string* is absent from the ledger; its
*content* is applied. Earlier records — including `DEPLOY-STATE.md` — call it
"gated", which is wrong and is itself an exposure path, since it invites an
apply under the per-mutation protocol.

**The defect, measured** in a disposable cluster at `c5021a52f` before any
edit: a clean-baseline replay left `list_claimable_player_profiles()` and
`claim_player_profile(uuid)` at `{postgres=X}` — `authenticated` could not
execute either — and left `claim_player_profiles_by_name()` on the default
`PUBLIC` grant, callable by `anon`. Production holds `authenticated=X` on all
three and `anon` on none. Two causes: this file's six revokes (lines 525–530),
and the fact that the restoring grant (ledger `20260720221937`) had no file on
this lineage.

- **Revoke block removed**, replaced by a comment giving three independent
  reasons: the contract requires the confirmed-claim lifecycle and the file
  never touched `claim_player_profiles_by_name()`, so the revoke disabled the
  confirmed path while leaving the unconfirmed bulk path open; `authenticated`
  EXECUTE is production state; and ledger `20260721201734` changed what the
  functions *disclose and accept*, never *who may call them*. Nothing else in
  the file changed. It is consequently **no longer byte-identical** to the SQL
  applied as `20260718181600` — the one deliberate exception, recorded in both
  the map doc and the constant's docstring.
- **Non-idempotency preserved as a safety property**, with a comment saying so.
  The unguarded index and policy statements make an accidental `db push` abort
  on `42P07`; guarded, it would succeed, having already created the
  Data-API-exposed `public.player_private_identities`. No `if not exists` was
  added anywhere.
- **Grant carried verbatim.**
  `20260720190000_grant_authenticated_claim_rpc_execute.sql` from `b11cae71b`,
  blob-identity proven (`f1ad9cb9b…` both sides). Registered as renamed drift
  `→ 20260720221937`, name-keyed, hazard `expansion` (its REVOKEs remove only
  the implicit `PUBLIC` default and `anon`; nothing is stranded).
  `20260720221937` moved out of the production-only register (69 → 68).
- **Harness pre-image added** for production-only ledger entry
  `20260712115539`, which creates `claim_player_profiles_by_name()` and has no
  repo file — without it the grant migration aborted. Body reconstructed from
  repository-local evidence with fidelity **confirmed by hash** against
  production (`b68036b3c…`, 2925 bytes); deliberately the current body, not the
  July-12 original that carried the prefix-fanout oracle. Stated limitation:
  #106 is exercised as a REPLACE on that function, not as a behavioural
  before/after.
- **Ledger re-attested read-only: still 110 entries, head `20260721201734`**,
  exact set match. Declarations now 14 contraction, **29** expansion, 8 neutral
  (51 files).

**Replay end state**, measured against the repository files: all three claim
RPCs end with explicit `authenticated` EXECUTE, no `anon`, no `PUBLIC` —
production's shape, and the previous `anon` exposure on
`claim_player_profiles_by_name()` is closed.

Validation at the final commit: 177 files / 973 tests pass; `npx tsc --noEmit`
exit 0; lint at the four baseline warnings, none new; production build green;
`bash supabase/tests/executable/run.sh` passes end to end; `git diff --check`
clean.

20260718050924 must never be applied to production under any protocol. At
the close of this historical branch, WS2, WS1 Layer B/C, converge, and the
closure audit had not begun; WS2's reader half subsequently deployed.

## Status

**Phase 4 - Log a Game - Active. Step 4.3 is BLOCKED pending the approved
import-identity remediation and ordered follow-up work (not closed, not
self-approved).** The remediation commits build on `8e11d3167`
(the user's expanded master-guide docs commit on top of audit-end
`c9473be25`); the full commit list and finding-by-finding resolution matrix
are in the authoritative handoff. Validation at the final commit: typecheck
clean, full vitest suite green (`--no-file-parallelism`), lint at the four
baseline warnings, production build green, `git diff --check` clean, and the
executable PostgreSQL harness passes end to end — including double
application of both gated migrations, the pre-split RPC compatibility pin,
the guest-privacy lifecycle, the full placement contract through the real
RPC, and the fixture-to-persistence bridge
(`ALL_FIXTURE_ASSERTIONS_PASSED`).

### Production status (verified read-only 2026-07-20)

- **Live-site v2 is deployed** (ledger `20260719132042
  data_capture_hardening_v2`; cutoff 2026-07-19 13:20:42Z; parser
  `tm-data-capture-v2` deployed 13:24:14Z) and its capture data tables held
  **zero rows** as of the recorded verification.
- **The redesign application is not deployed.** Production serves the
  live-site app (worker rolled back to version `eb4e5821…`, the 13:24Z
  v2-hardening build, after an unrelated live-site incident on 2026-07-19;
  see the handoff's deploy-events record). Deploy coordination now lives in
  the live repo's DEPLOY-STATE.md with the user holding the deploy lock.
- **Migration `20260719234500` is NOT applied**, and neither are the two new
  gated migrations `20260720100000` (guest RPC alias-recording control) and
  `20260720110000` (placement contract). The reconstruction files
  `20260711232834`/`20260712114538` are skipped by version. The full
  filename↔ledger mapping is `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`;
  its drift test is bidirectional and hazard-classified as of the 2026-07-21
  attestation (110 ledger entries, head 20260721201734
  harden_claim_rpc_privacy).
- **Backup-table security remediation is complete** (remote ledger
  `20260718234835 lock_down_public_backup_tables`), not outstanding.
- **No production mutation was performed by this remediation** — read-only
  verification only; zero rows, grants, policies, or schema objects changed.

### Production baseline re-based (user-directed, 2026-07-19/20)

Between the audit's verified starting state and this remediation's final
verification, the **user directed** operations in a concurrent session
(player linking and duplicate cleanup, plus deletion of the one draft game
so its wrong-group import can be retried). Re-verified read-only afterwards:
**41** games (all finalized), **41** imports, **14,402** events, **1,467**
typed placements (the deleted draft carried the 33 unresolved-attribution
placements; all remaining placements are attributed), **41** expansion facts
(all `historical_parser_verified_owner_confirmed_absent`, **0** non-null
final Venus, **0** Venus/Colony events, **0** non-unknown ownership), and
**25** players (1 unlinked). This is documented provenance, not drift; the
audit-era figures (42/42/14,816/1,500/42, 28 players) were correct when
captured. Known follow-ups deliberately deferred until after the closure
audit: merging the duplicate same-roster groups `987ce716`/`19426f66`, the
wrong-group guest hazard for the pending re-import, and resolving the
duplicate-source finalized game pair
(`30750df1-…`/`784f9a7c-…`, one shared source hash — now blocked at import
time by the remediated action).

### Second remediation pass outcomes (2026-07-20)

- **Privacy (F-01/B4/H5).** `normalizedImportedValue` is removed from the
  client-facing resolution schema, its confidence-summary serialization, and
  legacy snapshots are stripped at the parse boundary on resume. Every
  first-and-last-name guest creation path — imports, `/group/players` (now
  explicit first/last fields), and Manual Entry's new-player references —
  goes through the guarded `resolve_import_guest_identity` RPC with private
  storage and neutral `Guest XXXXXXXX` labels; the raw `display_name`
  writers (`createPlayerIfMissing`, `upsertPlayer`) are removed. Gated
  migration `20260720100000` adds `p_record_import_alias` so non-import
  creations record no false `game_log` alias evidence. Executable section K
  proves the lifecycle end to end with sentinel names.
- **Placements (F-02).** Gated migration `20260720110000` completes the
  redesign-owned contract: actions
  placed/removed/replaced/converted/ownership_changed/unresolved, ownership
  explicit_owner/neutral/unowned/unknown/not_applicable/unresolved,
  first-class `raw_actor_text` and constrained `tile_type_class` on events,
  first-class `original_source_sha256`/`original_source_byte_length`/
  `parser_run_identity` on imports, an owner-ids-require-explicit_owner
  rule, and the map-independent board-layout check in the rebuilt RPC. The
  builder emits the new fields (ownership stays evidence-seamed and unknown
  — never fabricated), and the adapter maps the widened vocabulary with
  honest nulls on rows predating the columns. Executable section L drives
  every case through the real RPC.
- **Review state (F-03/H2).** `20260719234500` is repeat-safe (guarded DDL;
  the harness applies it twice) and `pre-split-compat.sql` pins today's
  production behavior: the emitted payload (with the `review_state` key) is
  accepted by the deployed pre-split RPC and the computed review value is
  discarded — the exact gap the gated migration closes. Sections J/L/M
  assert all four review states against persisted rows, including the fixed
  `not_required` default that is never re-derived from confidence.
- **Source integrity (H6/H3/§19).** No trim anywhere on the immutable
  source: stored text is byte-identical to the submission and
  `original_sha256` covers the true original bytes (CRLF/LF, trailing
  newline, and leading whitespace all change it; parsing uses a separately
  trimmed value on both client and server). Duplicate-source detection runs
  in the action before any write via the deployed
  `find_duplicate_game_log_import` RPC plus classified matches
  (exact/trimmed/hash-only, draft/finalized, same-parser), returning a
  reviewable `duplicate_source` state; an explicit acknowledgment proceeds
  and records the association. `confidence_summary.run` carries a
  recoverable persisting→complete state; the adapter surfaces incomplete
  runs and failure injection proves partial runs are never read as
  successful.
- **Map gate (F-05/H1).** `evaluateImportMapGate` is the one shared rule;
  the client resolves the same off-reserve exception evidence the server
  resolves, so a verified Artificial Lake ocean passes both sides while an
  unexplained off-reserve ocean against board-defined objectives stays a
  true conflict.
- **Fixture bridge (F-09/H4).** `build-fixture-payloads.ts` drives the real
  `createImportDraft` entry (extracted behind an explicit dependency seam)
  per mechanic category into the disposable PostgreSQL through the real RPC,
  with SQL assertions on persisted states, counts, hashes, placements,
  attribution, and review values; `buildGameExpansionFactInput` has direct
  unit tests. The conflicting-evidence record enters at the parser/fact
  layer — the one documented deviation, since explicit absent-option
  evidence is not constructible through the action's trusted inputs.
- **Reports (F-08/§16/§17).** The Venus/Colonies dry run is restored
  byte-exact from `41bc1221e`; the production execution lives in
  `venus-colonies-historical-production.{md,json}` with a correction note;
  a test pins every dry-run/production pair as separate. The reconciliation
  artifact is regenerated with per-system coverage, both systems' duplicate
  metrics (surfacing the real legacy duplicate pair), and no unmeasured
  adapter-failure figure. The deployed v2 schema is captured as a contract
  fixture with tests that fail on renamed/missing/retyped columns, and the
  adapter's mocked harness now asserts the actual runtime select lists.
- **Resume semantics (§19).** A draft snapshot missing
  `objectiveConfiguration` resumes as `unknown` (requires review), never as
  silently confirmed `board_defined`.

**Step 4.3 must not be marked complete until a fresh independent read-only
audit passes. Step 4.4 has not started.**

Authoritative handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md`.

### Prior pass — F-01–F-10 remediation and v2 continuation (2026-07-19)

The first bounded remediation (F-01–F-10, commits `cfafd823`..`4e20aeb8`,
four production mutation groups applied and verified) and the 2026-07-19
continuation session (`435077bf`.., live-site v2 integration) are recorded
below as completed history. Its validation was green at the time: 171 test
files / 910 tests, typecheck clean, lint at the four baseline warnings,
build 32/32 pages, executable harness passing.

### Live-site data-capture v2 relationship (verified 2026-07-19; counts re-based 2026-07-20 — see above)

The live site's `data-capture-hardening-v2` release **is deployed to
production** — verified read-only against `qjtwgrjjwnqafbvkkfex`, not taken
from documentation: ledger migration `20260719132042 data_capture_hardening_v2`;
marker `data-capture-hardening-v2` with cutoff 2026-07-19 13:20:42Z and
`parser_deployed_at` 13:24:14Z (`tm-data-capture-v2`); all eight capture
objects present with seeded catalogs (13 colonies, 23 event-type pairs); all
capture data tables empty (no real post-cutoff import yet). The redesign
consumes that contract through a versioned read adapter at the repository
boundary (`src/lib/db/game-capture-compat-repo.ts` +
`src/lib/imports/live-capture/`), specified table-by-table in
`docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md`, with the
read-only reconciliation artifact in
`docs/redesign/reports/phase-04-step-03-compat/` (42/42 games legacy-only, 0 v2
rows, 0 duplicate identities, 0 unsupported contract versions). The redesign
does not write `game_capture_*` rows and never duplicates them.

### Continuation session outcomes (2026-07-19, commits `435077bf`..)

- **Confidence/review-state split.** `confidence_level` is strictly
  high/medium/low and a new constrained `review_state`
  (not_required/needs_review/reviewed/rejected) carries the review lifecycle;
  the shared TS contract, both parsers, the event builder, and
  `replace_game_log_events` were split accordingly. Gated migration
  `20260719234500` (NOT applied to production; production has zero
  `confidence_level='reviewed'` rows, verified read-only) maps any legacy
  overloaded rows payload-deterministically and is exercised in the executable
  harness against seeded legacy rows.
- **Clean-baseline repair.** The F-01 completion migration depended on
  `players.full_name`/`username`, which exist in production only via
  remote-only ledger migration `20260712114538`; a faithful schema-only
  reconstruction file under that same version restores the full-history
  replay. Production skips it by version.
- **Source identity wiring.** The import action persists the SHA-256 and byte
  length of the original submitted text, a deterministic parser-run identity
  (source hash + parser version), and whether the stored text was trimmed;
  the server-derived `input_sha256` is unchanged and never conflated with it.
- **Semantic matrix.** `src/lib/imports/canonical-data-semantics.ts` is the one
  executable matrix distinguishing zero/missing/unknown/incomplete/unsupported/
  conflicting/confirmed/not-applicable/unattributed and parser- versus
  owner-verified states; the adapter surfaces violations as issues.
- **Fixtures.** Six explicitly labelled `synthetic-but-format-faithful` full
  exports (Venus-only, Colonies-only, both, off-reserve ocean, unsupported
  wording, printed objective aliases) with provenance in `FIXTURES.md`; none is
  described as a retained real export.
- **Executable negative tests.** The harness now proves the event RPC rejects a
  non-member caller, duplicate identities, unrelated player UUIDs, and the
  retired overloaded confidence, and persists the split contract end to end.
- **End-to-end action test.** The real server action is driven from a submitted
  log through the real parsers to the exact persistence payloads, including the
  incomplete-evidence (never confirmed-absent) state for a log without
  complete-game terminators and null (never zero) final Venus.
- **Draft-evidence isolation.** A behavioral test pins that draft save/resume
  touches only games/game_promo_sets/game_revisions and can never rewrite
  import evidence, duplicate a parser run, or mutate expansion state.

**Production mutations applied and verified (2026-07-19, user approved "apply all
four").** The three remediation migrations are in the live ledger as
`20260719191911` (privacy), `20260719192054` (event contract), and
`20260719192148` (objective aliases); their SQL is byte-identical to the
committed repo files (ledger versions differ from filenames — expected drift).
The 1,500-row canonical placement backfill was executed and verified: 1500 tile
events fully typed, 1467 player + 1467 game-player attributions, 33 unresolved
(null), 100 grid / 1400 flat, 0 owner fields set, 3 constraints validated,
non-tile events untouched, 42 games unchanged, idempotency re-run zero diffs.
`player_private_identities` is in the `private` schema (authenticated cannot
read it or `player_import_aliases`); 6 unlinked labels neutralized; 23 colonies
and 7 objective aliases present. Security advisors show no new regression
attributable to the remediation. Reports:
`docs/redesign/reports/phase-04-step-03-placement/`.

**F-01 was materially incomplete and has been completed (2026-07-19).**
Independent re-verification against production found that the first pass moved
`player_private_identities` — which holds **0 rows** — into `private` and
neutralized `players.display_name`, while the actual personal-name data in
`public.players.full_name` stayed readable by every group member. Impersonating a
real authenticated member returned all 6 unlinked players' `full_name` and
`username`; for the 22 linked players those values are an exact denormalized copy
of the otherwise self-only `public.user_profiles`, exposing all 4 distinct real
people. Closed by ledger migrations `20260719203944`
(`isolate_player_personal_names_from_data_api`, repo file `20260719223000_…`)
and `20260719204250` (`enable_rls_on_player_legacy_identities`, repo file
`20260719223500_…`; ledger versions corrected 2026-07-20 per audit B3 — see
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`): the 6 unlinked rows' values are
preserved in `private.player_legacy_identities` (private schema, client grants
revoked, RLS deny-all) rather than destroyed, and table-level SELECT on
`public.players` is revoked from `anon`/`authenticated` then re-granted per
column excluding `full_name`/`username`. Verified after: the original attack
returns `permission denied`, the copy-then-read path
(`set display_name = full_name`) is blocked, legitimate reads still return 23
rows, all 28 player rows retain their data, and the ELO leaderboard is unchanged
at its 4 baseline entries. The neutral-label rewrite of
`get_elo_leaderboard`/`get_player_usernames`/`list_claimable_player_profiles` was
built, executable-tested and **rejected** — it split the leaderboard 4→6 and
double counted two real people while the fallback only ever surfaced a registered
*public* username. Full rationale in the authoritative handoff.

**Import integrity audit view RLS bypass fixed (2026-07-19).** The advisor ERROR
`security_definer_view public.game_log_import_integrity_audit` had been recorded
as "pre-existing and unrelated" — true of its origin, but it understated a live
cross-tenant exposure. The view has no tenant filter and was created without
`security_invoker`, so it ran as `postgres` and bypassed the caller's RLS: a
signed-out `anon` caller saw all 42 rows (RLS permits 0) and an ordinary member
saw 42 (RLS permits 39), disclosing game ids, parse status, parser version,
sha256 values and validation errors for every import in the system. Closed by
ledger migration `20260719205420`
(`security_invoker_on_import_integrity_audit`, repo file `20260719230000_…`;
ledger version corrected 2026-07-20 per audit B3); `anon` now returns 0, the member
returns exactly 39, `service_role` still returns 42, and **security advisors
report 0 ERROR**. No application code reads the view.

**Step 4.3 must not be marked complete until a fresh independent read-only audit
passes. Step 4.4 has not started.**

Authoritative handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md`.

### Prior Step 4.3B status (Venus/Colonies import facts)

The earlier Step 4.3B Venus/Colonies parser, schema, and 42-row historical
absence backfill remain applied and production-verified. That earlier note
described Step 4.3 as "closed"; the independent closure audit reopened Step 4.3
for the F-01–F-10 remediation above, which supersedes any "closed" claim.

Commits `aeebf8b7`, `cef2ff1d`, `41bc1221`, and `e88fc25f` implement the future-import
parser/schema/persistence path, historical production-parser verifier, sanitized
reports, and zero-change rerun verification. A complete exported log with no
supported Venus/Colony events now records No (`confirmed_absent`) per the
user's explicit clarification. Partial, unsupported, and conflicting evidence
remain distinct; no manual expansion controls or generic `expansionCodes` were
restored.

The production migration was applied through the connected Supabase tool as
`20260718200536_add_venus_colonies_import_facts`. Its first attempt stopped before
DDL because production already had the equivalent `(game_id, id)` constraint; the
reviewed migration was amended to guard that existing constraint, then applied
successfully. The post-migration preflight found 42 eligible complete logs and
zero blockers. The authorized insert-only backfill created 42 facts, zero
historical Venus/Colony event rows, preserved all fingerprinted unrelated data,
and a second plan contained zero writes.

Final repository validation: 164 test files / 862 tests passed; `npx.cmd tsc
--noEmit` passed; lint exited 0 with four pre-existing warnings; and build passed
at 32/32 pages with middleware present. Docker Desktop is not running, so local
migration execution remains unverified; static migration coverage passes. The
production schema migration and 42-row fact backfill were independently verified.
No push or deployment occurred. Step 4.4, Step 4.5, and Phase 5 were not started.

### Step 4.3 continuation — upstream catalog, tiles, and map reconstruction (2026-07-18, Claude)

Claude continued Step 4.3 after the upstream-catalog/map handoff. Completed and
validated in the repository this session:

- The authoritative **server import path**
  (`src/app/(app)/log-game/import/page.tsx`) was converted off the old
  objective-only detector. It now parses ordered tile actions, reconstructs the
  board, calls `detectImportBoardMapIndependent` with the importer's objective
  configuration, allows every map (including Hollandia), requires a confirmed
  (non-`unknown`) objective setup, rejects only true detector conflicts or a
  confident detected-map mismatch, validates objectives by configuration scope
  (map relationships for board-defined, the global catalog for randomized),
  passes tile actions to `buildTerraformingMarsLogEvents`, and persists the
  objective configuration, ordered tile actions, reconstructed board, unknown
  tile count, and conflicts in the import `confidenceSummary`.
- `LogGameImportShell` now forwards `objectiveConfiguration` to the server action
  (it was previously dropped); `web-import-page` gates the client submit on the
  same map-conflict rule so the reason is surfaced before save.
- `objectiveConfiguration` was threaded through all `LogGameDraftInput` call
  sites: Manual Entry uses `board_defined`, imported drafts stay `unknown` until
  reviewed, and it is owned by the Setup step in the manual-entry registry.
- Reference-catalog fixtures gained `allAwards`/`allMilestones`; the Cards-page
  `is_catalog_visible` filter is covered by a test.

Validation this session: `npx.cmd tsc --noEmit` clean; `npx.cmd vitest run` 160
files / 843 tests passed; `next lint` exit 0 with the same four pre-existing
warnings; `next build` exit 0, 32/32 pages, `ƒ Middleware` present.

Governance docs updated: `MASTER-RULES.md` (upstream source-authority,
export-format governance, map/objective interpretation), `DECISIONS.md`,
`DATA-CAPABILITIES.md` (Step 4.3 addendum with fixture/map/format/language
matrices), this file, and `MASTER-PLAN.md`.

Identity/privacy migration applied (user-confirmed this session): the
`claimable_guest_identity_privacy` migration
(`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql`) was
applied to production after full read-only vetting. Live verification confirmed
the `player_private_identities` table (RLS on, two member-scoped policies), the
`private` schema and normalizers, `private.resolve_public_player_name`,
`public.get_public_player_names`, `public.resolve_import_guest_identity`, the
privacy-wrapped `analytics.player_game_results` view (113 rows, zero null
names), and the redefined final-action/OCR RPCs. It performed **no identity
backfill** (0 rows in `player_private_identities`; 0 players created this
session; newest player row predates the session). Its final-action reader
consumes the new `tile_placed` greenery/ocean events. Advisors re-run: no new
security findings attributable to the migration; three INFO-level performance
notes on the new (empty) identity table only.

Still open before Step 4.3 can be marked complete:

- separately authorize, apply, and verify the Venus/Colonies migration and
  42-row historical absence backfill;
- the objective-alias data-only migration remains separately gated.

No push or deployment occurred.

### Prior Step 4.2 status

**Phase 4 — Log a Game — Active. Step 4.2 is complete in the repository.**
Manual Entry now uses one typed six-step registry and a responsive, accessible
step-navigation shell. Step order, labels, descriptions, field ownership,
review-issue ownership, status, and heading focus are centralized. The existing
single draft form, explicit Save Draft action, resume URL, and finalization path
remain authoritative; no parallel mobile workflow or persistence state machine
was introduced.

The user explicitly broadened Step 4.2 to remove gameplay expansion tracking
product-wide. Group defaults, Manual Entry, imports, draft snapshots,
saved-game relations, analytics filters/URL state, eligibility, and interaction
analytics no longer track expansions. Legacy snapshots reopen safely with their
former `expansionCodes` key discarded. Prelude selections remain optional,
directly recordable evidence; missing Prelude rows remain missing. Intrinsic
catalog expansion metadata remains available for cards, corporations, Preludes,
card requirements, and catalog browsing.

Migration `20260718041532_remove_game_expansion_tracking.sql` was applied to
the linked production Supabase project. It replaced the interaction views with
corporation–Prelude-only definitions, preserved the production
multi-corporation read path, and removed `public.game_expansions`,
`public.group_default_expansions`, and `public.expansions`. Post-migration
verification confirmed all three relations are absent, interaction output is
corporation–Prelude only, and intrinsic catalog expansion metadata remains
populated. No application push or deploy occurred.

Validation: focused expansion/wizard coverage passed 16 files / 108 tests; full
suite passed 131 files / 663 tests; `npx tsc --noEmit` is clean; lint passed
with the same four pre-existing warnings; build passed at 31/31 pages with
`ƒ Middleware`. Responsive harness checks passed at 1440, 1024, 768, and 390
pixels with no page overflow, reachable horizontal step navigation at narrow
widths, visible active steps, and stacked full-width mobile actions.

Local migration reset remains unverified because Docker Desktop is not running;
the migration has static tests and was verified directly after production
application. The current workflow still has no trustworthy card-acquisition
count writer or coverage contract. At Step 4.2 completion, Step 4.3 had not
begun.

### Prior Phase 3 closure status

**Phase 3 — Navigation and Routes — Complete.** Steps 3.1 through 3.4 are
complete. Step 3.4 independently re-verified the separately landed middleware
execution fix at `e4a444f2d5ef8a6904966c8667ef59acdc346c50` before closing
the phase.

### Step 3.4 finding and resolution: `middleware.ts` never executed

Live verification (unconditional-redirect probe placed as the first line of
the `middleware` function; `.next/server/middleware-manifest.json` inspected
after a fully clean `.next` in both `next dev` and `next build`; production
build's route table, which normally prints a `ƒ Middleware` line) confirmed
`middleware.ts`, at the repository root, was not being discovered or
compiled by Next.js 15.5.20 in this repository, in either mode. Stale mixed
dev/build `.next` state, Turbopack, `next.config.ts` exclusions, file
encoding, and Next's sibling-lockfile workspace-root misdetection were each
ruled out before escalating.

This was **pre-existing and not a Phase 3 regression**: `middleware.ts`'s
structure and `src/lib/supabase/middleware.ts` both predate Step 3.1 (git
blame traces to `0d1176484`, "feat: add Supabase auth shell and protected
routing"), and the failure reproduced identically on routes Phase 3 never
touched (`/profile`, `/group`) as well as ones it did (`/cards`, `/games`,
`/compare`). None of Steps 3.1-3.3 could have caught it: all three explicitly
recorded "no live authenticated browser verification" as a known limitation,
relying on jsdom/Vitest, which never exercises Next's middleware pipeline.

**Root cause and fix** (diagnosed and applied by the spawned task, verified
independently here): Next.js only scans for `middleware.ts` in the directory
that is the immediate parent of the App Router (`src/app` → `src/`) once a
`src/` layout is in use — never the repository root. A pure file
relocation, `middleware.ts` → `src/middleware.ts`, with no logic change
(imports already resolved via the `@/*` alias), fixed it. Verified
independently after the fix landed:

- `.next/server/middleware-manifest.json` populated with a real `"/"` entry
  in both `next dev` and a clean `next build`.
- Production build's route table now prints `ƒ Middleware   106 kB`.
- `next dev`'s log shows `○ Compiling /middleware ...` / `✓ Compiled
  /middleware`.
- Live, unauthenticated `curl` requests: `GET /cards` → `307` to
  `/login?next=%2Fcards`; `GET /profile` → `307` to `/login?next=%2Fprofile`;
  `GET /games?foo=bar` → `307` to `/login?foo=bar&next=%2Fgames%3Ffoo%3Dbar`
  (the `next` value itself, `/games?foo=bar`, is fully and correctly
  preserved and is the only param the login page reads via
  `normalizeNextPath(resolvedSearchParams?.next)`; the harmless top-level
  `foo=bar` duplicate is inert and pre-existing in the query-cloning logic
  Step 3.1 wrote — noted but not fixed, since it doesn't fail the closure
  criterion and touching redirect-URL construction further would broaden
  scope beyond the actual blocker).
- No more uncaught `AuthSessionMissingError` server logs for these requests
  — middleware now intercepts cleanly before the protected page's Server
  Component body ever executes.
- Full suite re-run after the fix: 124 test files / 614 tests passed; `npx
  tsc --noEmit` clean; lint at the same 4 pre-existing baseline warnings;
  build 31/31 pages with the `ƒ Middleware` line present.

**Concurrent-session note:** the spawned task ran in the same working
directory as this Step 3.4 session (not an isolated worktree), which briefly
surfaced as an unexplained `middleware.ts` → `src/middleware.ts` move mid-task
before its commit landed. Confirmed via `git status`/`git log` that no history
was lost or overwritten; Step 3.4 paused all repository edits until the user
confirmed the concurrent session and its commit had completed, then resumed
and re-verified from the committed state rather than trusting the interim
working-tree change.

Step 3.1 established the Phase 3 route framework without moving analytics or
workflow implementation: one typed navigation contract, canonical paths,
deterministic active matching, group-aware visibility, route shells, Insights
compatibility handling, canonical `/games` ownership using the existing Saved
Games implementation, and intentional loading/not-found/unavailable states.

Step 3.2's preflight found that Step 3.1's committed navigation had built a
fixed mobile `BottomNav` bar, a native-dialog "More" drawer, and a
`mobile-primary`/`mobile-more` destination split showing a materially reduced
destination set on narrow screens versus desktop — a direct conflict with
this step's explicit direction that TM Stats is a responsive website, not a
native mobile application, and its explicit prohibition on a mobile
bottom-navigation bar, an app drawer, and a separate mobile information
architecture. This conflict was surfaced to the user before any edit; the user
approved resolving it as in-scope Step 3.2 work.

Step 3.2 replaced that pattern with one responsive navigation architecture:
the same eight primary destinations (Log a Game prominent) render identically
at every viewport width in one row (scrolling horizontally at narrow widths,
as it already did); only the four secondary utility destinations (Games,
Cards, Glossary, Group Settings) plus Logout collapse into a single semantic
"Menu" overflow panel below the desktop breakpoint, keeping Step 3.1's native
dialog accessibility mechanics (background inertness, focus-in, Escape close,
focus restoration, close-on-route-change). Step 3.2 also completed route-level
page titles and descriptions for every canonical destination via one
centralized, validated `src/lib/navigation/route-metadata.ts` registry.

No production database, schema, migration, Storage, dependency, push, or
deployment action is authorized or was performed by Step 3.1 or Step 3.2.

### Prior preservation status

Completed in the repository. The assigned preservation task restored the
authenticated `/glossary` route with 125 historical compatibility identities,
current-contract wording, accessible fragments, and safe centralized
cross-linking. It restored `/cards` as the full server-repository Card Database,
with real catalog records, stable IDs, metadata search, composed filters,
responsive browsing, real-art fallback, and a metadata detail dialog. Promo-only
browsing is no longer the canonical Card Database.

Full validation passes at 117 test files / 590 tests; `npx.cmd tsc --noEmit`
passes; lint and build pass with the same four baseline lint warnings; and the
build generates 24/24 pages. No production database, schema, migration, Storage,
deployment, push, dependency, or original-repository mutation occurred. Card
outcome statistics and acquisition metrics remain explicitly unavailable where
their reader/evidence contract is not approved.

Phase 2 remains formally complete. This separately assigned preservation task is
also complete in the repository; production execution remains separately gated.

## Phase 3, Step 3.1 completion

Completed at commit `dcf5cac1ca8476707e615d7480cfbfd7b8885b51`
(`feat(navigation): define phase 3 route skeletons`). Full validation passed at
120 test files / 599 tests, typecheck clean, lint with the same four baseline
warnings, and build at 31/31 routes.

## Phase 3, Step 3.2 completion

Completed. See `docs/agent-handoffs/PHASE-03-STEP-02-responsive-web-navigation-and-route-context-validation.md`
for the full record. Summary: Step 3.1's committed mobile navigation
(fixed `BottomNav` bar, native-dialog "More" drawer, reduced `mobile-primary`/
`mobile-more` destination set) directly conflicted with this step's explicit
"responsive website, not an app" direction and was flagged to the user before
editing; the user approved fixing it as in-scope Step 3.2 work. Replaced with
one navigation architecture at every viewport width — all eight primary
destinations always visible in one row, only the four secondary utility
destinations plus Logout collapsing into a narrow-width "Menu" overflow that
reuses Step 3.1's native-dialog accessibility mechanics. Added a centralized,
validated route-metadata registry supplying page titles/descriptions for every
canonical destination. Full validation passed at 121 test files / 606 tests,
typecheck clean, lint with the same four baseline warnings, and build at 28
generated routes (no route added or removed). No analytics, formula, schema,
migration, Storage, dependency, production, push, or deployment action
occurred. Live browser responsive verification at 1440/1024/768/390px was not
performed — no authenticated test credentials exist and a local dev server
could not safely be started (port 3000 already in use by another process) —
so this step relied on automated jsdom tests plus manual CSS/media-query
review instead; this is recorded as a known limitation in the handoff, not
claimed as done.

## Phase 3, Step 3.3 completion

Completed. See
`docs/agent-handoffs/PHASE-03-STEP-03-brand-asset-preservation-and-responsive-website-integration.md`
for the full record. Summary: Step 3.3 was authorized after Step 3.2 completed,
specifically to integrate five approved brand assets (shared header banner,
gold/silver/bronze leaderboard laurels, authentication Mars landscape
background). Preflight found the banner was already the approved asset,
checksum-identical and already integrated via `AppShell`'s bundled Next.js
import; the laurels were already wired into the real leaderboard
(`GroupDashboard` under `/group`) but with outdated artwork; the auth
background was a placeholder SVG, not yet the approved PNG. Preflight also
found no Supabase Storage bucket suitable for site-brand/decorative assets and
no existing precedent for storing this asset category there (banner/background
have always been bundled-static or public-static repository files); the user
was asked and chose to keep that existing repository-file convention rather
than create a new Storage bucket, so no Storage upload occurred.
Delivered: laurels reprocessed from the newly approved source art (verified
genuine alpha transparency, no baked checkerboard; no repositioning needed —
content already filled ~92%+ of each canvas) into 256x256 optimized PNGs
(~94% smaller than source); the auth background converted to a single
optimized WebP at native 1672x941 resolution (~92% smaller than source, no
upsampling). All five assets are now resolved through the existing
`resolveStaticSiteAsset` typed registry (extended with 4 new keys) rather than
hardcoded paths, including the banner for the first time. The leaderboard rows
now render an always-visible "#N" rank text (independent of any image) via a
new small client component, with the laurel treated as purely decorative
(empty alt, `aria-hidden`) and dropped safely if the image fails to load,
without hiding the row. The user separately asked for the new background on
the reset-PIN pages too; both `(auth)/reset-pin` and the legacy `auth/reset-pin`
route were updated alongside `/login`. `forgot-pin` has no background today and
was left unchanged. Full validation passed at 124 test files / 614 tests
(10 new/updated test files covering the registry, the rank badge, the
leaderboard rank/laurel mapping, and the three auth-background pages),
typecheck clean, lint with the same four baseline warnings, and build at
31/31 pages. Live browser responsive review covered `/login` and `/reset-pin`
at 390/768/1440px (a dev server could be started this time via a new
`.claude/launch.json`); the leaderboard and authenticated header could not be
checked live because no authenticated test credentials exist (the same
limitation recorded in the Step 3.2 handoff), so that part relied on the
sharp-rendered composite checks (light/dark/orange backgrounds) plus the
automated test suite instead. No analytics, formula, schema, migration,
Storage, production, dependency, push, or deployment action occurred; Step 3.4
and Phase 4 were not started.

## Last completed commit

`e88fc25f` — `fix(imports): verify unrelated backfill data` (latest
Step 4.3B implementation commit before governance closure).

## Current phase

Phase 4 — Log a Game (active; Steps 4.1 and 4.2 complete; Step 4.3B
repository work complete; production migration and 42-row backfill awaiting
separate explicit authorization)

## Prior completed substep

Step 2.5 — Analytics Repository and Query Contracts

## Prior Step 2.5 status

Completed. Step 2.5 added client-safe typed operation/result contracts,
normalized finalized-game source records, and authenticated server readers for
a bounded group page and one RLS-readable game. The operations reuse Step 2.2
filters, keep selection out of the sample, report Step 2.3 coverage/evidence,
preserve zero/missing/native/imported/tied-first facts, and feed the Step 2.4
Win Point Differential utility without duplicating its formula. Inputs are
validated before broad reads; ordering is stable; child rows are batched; raw
errors are redacted; and empty, partial, unavailable, unauthorized, and failed
results remain distinct. Full validation passes at 101 test files / 540 tests,
with typecheck clean, the same four baseline lint warnings, and 23/23 build
pages. No SQL, migration, view, RPC, schema, Supabase state, Storage,
dependency, route, navigation, deployment, production page, or legacy consumer
changed.

## Corporation logo asset replacement (separately authorized, post-2.5)

Completed. A separately approved production task replaced every corporation logo
and remapped `public.corporations.logo_path`. All 116 corporations now resolve to
uniform 800×800 content-addressed tiles (`corporation-logo-<sha256>.png`) on
white/black/orange (`#f06a32`) backgrounds; 112 distinct objects (4 shared
cross-edition pairs). Matching used verified `id`+`code` identity (16 user-supplied
replacements, 4 near-miss adjudications, 96 name matches; 0 unmatched/ambiguous).
Production reconciliation: 116 resolvable, 0 broken, 228 objects (116 prior
retained for rollback + 112 new), all referenced new objects `image/png`.
Only `logo_path` and `tm-corporation-logos` objects changed — no corporation
identity field, schema, RLS, bucket config, unrelated asset, or deployment.
Repository validation at commit: asset suite 48/48, typecheck clean; full
`vitest`/`lint`/`build` recorded in the commit. Rollback:
`docs/redesign/assets/corporation-logos/ROLLBACK.md`. This task did **not** begin
Step 2.6.

## Tag and standard score icon replacement (separately authorized, 2026-07-17)

Completed. A separately approved production task replaced 19 canonical root
objects in public `tm-tag-icons` and all 10 canonical standard root objects in
public `tm-score-icons`. The user-supplied `Tags.zip` PNGs were converted to
lossless WebP at their source dimensions so the established `.webp` paths and
one-hour cache contract remain valid; `galatic.png` intentionally replaced the
canonical `galactic.webp` object. The `icons.zip` PNGs were uploaded byte-exact,
with `terraforming_rating.png` mapped to `Terraform_Rating.png` and the existing
standard no-cache contract preserved.

Post-change production reconciliation: 19/19 requested tag objects and 10/10
requested score objects were downloaded after upload and matched the prepared
SHA-256 values. Supabase metadata reports 21 objects / 14,921,436 bytes in
`tm-tag-icons` and 21 objects / 12,583,743 bytes in `tm-score-icons`, with the
expected WebP/PNG MIME types. `earth.webp`, `science.webp`, all ten `axis/`
objects, and the legacy UUID score icon retained their prior timestamps and
bytes. No database row, schema, migration, RLS policy, bucket configuration,
application file, dependency, deployment, or unrelated Storage object changed.
The pre-change objects and verification reports are retained locally under the
ignored `.npm-cache/tm-asset-replacement-backup-20260717/` rollback scratchpad.
This task did **not** begin Phase 4, Step 4.2.

Same-day authorized follow-up: only `tm-score-icons/Other_Card.png` was replaced
again from the revised user-supplied PNG. The prior 1,336,222-byte object
(`df53e751…f0537a0a`) was backed up, the new 1,595,283-byte object
(`25c0d8e9…f07a5208`) was downloaded after upload and matched SHA-256, and
Supabase retained `image/png` plus `max-age=0, no-cache`. The bucket now contains
21 objects / 12,842,804 bytes. No other object or project state changed; details
are in `docs/agent-handoffs/OTHER-CARD-SCORE-ICON-REPLACEMENT.md`.

Second same-day authorized follow-up: only `tm-tag-icons/jovian.webp`,
`microbe.webp`, `plant.webp`, and `space.webp` were refreshed from the revised
user-supplied PNGs. Each source was converted to lossless WebP without resizing;
all four final objects are 1254×1254 with alpha. The current targets were backed
up first, and all four post-upload downloads matched their prepared SHA-256
values. Supabase retained `image/webp` and `max-age=3600`; the bucket now
contains 21 objects / 14,910,938 bytes. No fifth object or other project state
changed. Details are in
`docs/agent-handoffs/JOVIAN-MICROBE-PLANT-SPACE-TAG-ICON-REPLACEMENT.md`.

## Branch

redesign/tm-stats-dashboard-rebuild

## Prior owner

Codex — analytics repository and query contracts

## Prior Step 2.5 completed commit

Step 2.5 focused completion commit (hash recorded in the completion report)

## Historical Phase 2 next action

Completed: Step 2.6 and its separately assigned Merger closure are complete in
the repository. The later Glossary/Card Lookup preservation task is also complete
at `c17e8b1ba`; this entry is retained as historical sequencing context.

## Next action

**Step 4.3 remains BLOCKED.** The approved next action is to build the
source-bound, server-only import-identity fix recorded in
docs/redesign/DECISIONS.md, then obtain independent review. Any production
change requires a later, separate authorization under expand/contract.

After that review and authorization gate, the required sequence is:
tile-attribution backfill before guest re-neutralization; guest
re-neutralization; migrations 20260719234500, 20260720100000, and
20260720110000 under the per-mutation protocol; then the fresh independent
closure audit. Two of the 114 tile-attribution rows resolve only through the
unlinked guest's display_name, so reversing the backfill/re-neutralization
order would destroy required evidence.

Production facts are last independently verified 2026-07-21 and must be
re-read live before any production-sensitive action. Migration 20260720120000
remains unapplied, insufficient as an oracle closure, and unauthorized for
application as one. Migration 20260718050924 is not gated and must never be
applied.

Do not begin Step 4.4/4.5/Phase 5, push, deploy, or apply a migration without
separate authorization.

## Active blockers

**No Step 4.3B production blocker remains.** The linked production project has
`game_expansion_facts` under RLS, the expected typed event columns and policies,
and 42 verified historical absence facts. The separately gated objective-alias
migration remains out of scope.

The objective-alias data-only migration remains separately gated and is not
authorized by Step 4.3B. No workaround may hard-code a second UI catalog or
overload display names.

No repository blocker prevents Step 4.2 completion. Docker Desktop was not
running, so local `supabase db reset` verification was unavailable; static
migration coverage and direct post-application production verification passed.
The linked Supabase project has pre-existing security-advisor findings that are
outside this substep and require separately authorized remediation.

No Phase 3 blocker remains. The `middleware.ts` execution defect discovered
during Step 3.4 (see above) is resolved at commit
`e4a444f2d5ef8a6904966c8667ef59acdc346c50`, independently re-verified.

No repository blocker remains for Phase 2. The separately gated production
package needs an owner-approved target group UUID, a read-only dry run with no
catalog or conflicting-record stop condition, and explicit production execution
authorization. It must not be applied by a future unrelated task.

Separately, later analytics and consumer work remains blocked, where applicable,
by undecided tied-first numeric win-margin behavior;
overall point-differential baseline; leaderboard and opponent-strength
methodology; metric-specific sample, coverage, and range thresholds; approval
of current weighting/efficiency/style/award/final-action formulas;
final-action RPC source/security verification; card opportunity/acquisition
identity and coverage; TR, duration, production/engine, and board capture
contracts; role/global-opt-in semantics; generated database types; and
acceptance of live-only schema, RPC, and Storage contracts. Current repository
and UI heuristics that coerce null to zero or hard-code confidence thresholds
remain deferred migration work.

## Database migration status

Two Phase 4, Step 4.3 catalog migrations were applied to the linked production
project `tm-stats`/`qjtwgrjjwnqafbvkkfex` (verified in the live migration
ledger):

- `20260718154209 sync_upstream_cards_and_tile_catalog`
  (`supabase/migrations/20260718114500_sync_upstream_cards_and_tile_catalog.sql`)
  — creates `public.terraforming_mars_tile_types` (45 upstream `TileType`
  values, authenticated read-only), adds `cards.last_synced_at`, and removes
  unsafe default-zero behavior from deployed card global-effect columns.
- `20260718154932 reconcile_upstream_card_identities`
  (`supabase/migrations/20260718120000_reconcile_upstream_card_identities.sql`)
  — adds `cards.is_catalog_visible` and `cards.superseded_by_card_id`, preserves
  53 identity-mismatch rows as reversible audit rows, and hides only those from
  catalog consumers. It deletes nothing; a direct deletion of the 53 rows was
  rejected by the production safety reviewer and must not be retried.

Verified live: snapshot `a63ac3f9-4725-49f5-a967-04899ad52c19`, 996 upstream
cards and 45 tile types; 1,143 retained card rows (1,090 visible, 53 superseded);
0 visible duplicate-name groups.

A third Phase 4, Step 4.3 migration, `claimable_guest_identity_privacy`
(`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql`), was
applied to production this session with explicit user confirmation, after
reading the full SQL, running its focused static tests (6/6), and verifying its
interaction with the new tile events. It creates private claimable-guest
identity storage and normalization, mode-aware alias indexes, member-scoped RLS,
import-resolution/public-name RPCs, and privacy-preserving replacements for
affected public readers (`analytics.player_game_results` and the final-action/OCR
RPCs). It performed no production identity backfill. Live verification and the
re-run security/performance advisors passed with no new security regressions.

A fourth Phase 4, Step 4.3 migration was applied to production through the
connected Supabase tool and is recorded in the live ledger as
`20260718200536 add_venus_colonies_import_facts`
(`supabase/migrations/20260718200536_add_venus_colonies_import_facts.sql`). It
creates RLS-protected `game_expansion_facts`, extends canonical
`game_log_events`, and replaces the invoker-security event RPC. The verified
backfill inserted 42 historical absence facts only; no historical expansion
events or unrelated-data changes occurred.

A second, minimal data-only migration is required but not authorized. It should
insert only approved milestone/award aliases into the existing
`domain_text_aliases` table using canonical entity IDs, separately normalized
alias text, `source = 'catalog'`, and the existing unique
`(entity_type, normalized_alias_text)` contract. It requires no new table,
column, index, view, RPC, or RLS policy. Rollback must delete only those inserted
catalog alias rows; canonical maps/objectives/relationships and historical game
IDs remain unchanged.

One unapplied Phase 2 migration is prepared:
`20260717190000_add_merger_offer_rule_snapshots.sql`. Its verification SQL,
group-scoped dry run, idempotent historical policy backfill, and rollback are
reviewable locally. No migration, schema query, or data backfill was applied to
a linked or production database.

## Latest handoff

- docs/agent-handoffs/PHASE-04-STEP-03-PRE-REMEDIATION-STATE-2026-07-21.md
  (documentation-only state reconciliation before the approved remediation)
- docs/agent-handoffs/PHASE-04-STEP-03-CARRY-106-CLAIM-RPC-PRIVACY-TO-REDESIGN.md
  (ledger #106 carried onto this lineage; ledger snapshot reconciled to 110)
- docs/agent-handoffs/PHASE-04-STEP-03-WS1-LAYER-A-LEDGER-GATE.md
  (bidirectional ledger gate and hazard classification)
- docs/agent-handoffs/PHASE-04-STEP-03B-VENUS-COLONIES-PRODUCTION-COMPLETE-HANDOFF.md
  (production migration and historical backfill verified)

- docs/agent-handoffs/PHASE-03-STEP-04-navigation-and-route-phase-closure.md
  (Phase 3 complete)
- docs/agent-handoffs/PHASE-03-STEP-03-brand-asset-preservation-and-responsive-website-integration.md
- docs/agent-handoffs/PHASE-03-STEP-02-responsive-web-navigation-and-route-context-validation.md
- docs/agent-handoffs/PHASE-03-STEP-01-navigation-and-route-skeletons.md
- docs/agent-handoffs/GLOSSARY-CARD-DATABASE-PRESERVATION-AND-CROSS-LINKING.md
- docs/agent-handoffs/PHASE-02-VALIDATION-REMEDIATION-AND-CLOSURE.md
- docs/agent-handoffs/PHASE-02-STEP-06-analytics-foundation-integration-validation.md
- docs/agent-handoffs/CORPORATION-LOGO-ASSET-REPLACEMENT-AND-REMAPPING.md
  (separately authorized production asset task, post-2.5)
- docs/agent-handoffs/PHASE-02-STEP-05-analytics-repository-query-contracts.md

## Production Supabase mutation record

The corporation-logo task applied production Storage uploads and
`public.corporations.logo_path` updates under separate explicit authorization.
These are not represented by Git; their verified results and rollback are in the
handoff and `docs/redesign/assets/corporation-logos/`. No Phase 2 migration, view,
RPC, schema, Storage, or other Supabase state was applied or changed.

<!-- BEGIN POST-STEP-4-2-IDENTITY-CLARIFICATION -->

## Post-Step 4.2 scope clarification

Step 4.2 remains complete and must not be reopened solely for this clarification.

The next authorized Phase 4 assignment is:

**Phase 4, Step 4.3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Import, Validation, Evidence Review, and Claimable Guest
Identity Creation**

Step 4.3 must comply with:

`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`

This clarification does not authorize:

- registration-time claiming
- database schema changes
- migrations
- production identity mutation
- Step 4.4
- Step 4.5
- Phase 5

<!-- END POST-STEP-4-2-IDENTITY-CLARIFICATION -->
