# Migration ↔ Production-Ledger Map

Authoritative mapping between `supabase/migrations/` filenames and the
production migration ledger (`tm-stats` / `qjtwgrjjwnqafbvkkfex`). The
executable source of truth is `src/lib/db/migration-ledger-map.ts`, enforced by
`src/lib/db/migration-ledger-map.test.ts`. Re-verify by re-listing the ledger
read-only and updating both files together.

## Current snapshot

Attested **2026-07-22**: **113 entries**, head
`20260722153233 close_authenticated_guest_identity_oracle`. The count and head
are pinned in `PRODUCTION_LEDGER_ATTESTATION`, so a later attestation that
disagrees fails rather than silently overwriting. This production snapshot must
be re-read live before any production-sensitive action.

> **Reconciled 2026-07-22 from repository evidence only.** This section was left
> at the earlier 110-entry snapshot after three further entries landed. It has
> been brought into line with `PRODUCTION_LEDGER_ATTESTATION` and
> `PRODUCTION_LEDGER_VERSIONS` in `src/lib/db/migration-ledger-map.ts`, the
> executable source of truth named at the top of this file. The version array
> there was counted directly rather than taken from its declared count: **113
> literals, 113 unique, maximum `20260722153233`** — an exact match for the
> attested count and head, with exactly 110 entries at or below the previous
> head `20260721201734`. **No live ledger was read for this reconciliation.**
> Nothing in this section is fresh production evidence; it restores agreement
> between two repository files that had diverged.

The three entries added since the 110-entry snapshot. Each is carried in this
repository under a filename version different from its apply-time ledger
version, so all three are paired by **name** in
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`:

| Ledger version | Ledger name | Repo file version |
| --- | --- | --- |
| `20260722132159` | add_source_bound_import_identity_staging | `20260722012658` |
| `20260722144034` | coarsen_import_name_match_reasons | `20260720120000` |
| `20260722153233` | close_authenticated_guest_identity_oracle | `20260722153000` |

Two of those move a file **out of the gated set**: `20260722012658` and
`20260720120000` are applied and are no longer prepared-and-unapplied.
`GATED_UNAPPLIED` now holds five entries, and `20260722012707` is the only
remaining half of the source-bound replacement. Applied is not closed —
`20260722144034` was an interim mitigation that independent review found
insufficient as a closure; see the gated table below.

**Prior snapshots, retained.** The 110-entry snapshot (head
`20260721201734 harden_claim_rpc_privacy`, independently verified 2026-07-21)
was itself preceded by a 108-entry snapshot with head `20260721081355`; those
two additions are recorded below. The 2026-07-21 claim-RPC grant reconciliation
re-attested 110 entries read-only with an exact `PRODUCTION_LEDGER_VERSIONS` set
match — no entry added or removed. What changed there was a *classification*,
not the ledger: `20260720221937 grant_authenticated_claim_rpc_execute` moved
from production-only to renamed drift, because its file is now carried here as
`20260720190000`.

## What the gate enforces

The drift test runs in **both** directions, and the two directions catch
different failures:

| Direction | Property | Failure |
| --- | --- | --- |
| repo → ledger | every migration file resolves to exactly one classification | unclassified file |
| repo → ledger | no gated migration appears applied | `GATED_MIGRATION_APPLIED` |
| repo → ledger | every renamed mapping points at a real ledger version | broken mapping |
| ledger → repo | every ledger version resolves to exactly one classification | `LEDGER_INCOMPLETE` |
| hazard | every migration file declares a hazard class | `CLASSIFICATION_MISSING` |

The ledger → repo direction is what catches a production application made from
a *different* branch. Three such entries landed between the 2026-07-20 and
2026-07-21 attestations and left no trace on this branch; before this direction
existed they would have been invisible to the gate. Two more landed later on
2026-07-21 — `20260721193508` and the ledger #106 hardening `20260721201734`.
The #106 file is now carried on this branch, which is what moves it out of the
production-only register and into renamed drift.

Hazard class is **orthogonal** to classification. Classification answers "what
is this migration's relationship to production history"; hazard class answers
"what does applying it do to a deployed reader or writer". A gated migration
can be an expansion, and an already-applied migration can have been a
contraction.

## Why filenames and ledger versions differ

Migrations applied through the connected management tool (`apply_migration`)
are recorded under the **apply-time timestamp**, not the filename timestamp.
The SQL was verified byte-identical at application time; only the version
label differs. This is expected drift, now documented rather than implicit.

### The one deliberate byte-divergence

`20260718050924_claimable_guest_identity_privacy` is the single exception, and
it is intentional rather than drift. As applied (ledger `20260718181600`) it
ended with six revokes of EXECUTE on `list_claimable_player_profiles()` and
`claim_player_profile(uuid)` from `public`, `anon` and `authenticated`, written
when registration-time claiming was still deferred. Production then restored
that grant — ledger `20260720221937 grant_authenticated_claim_rpc_execute` — so
replaying the file as applied left the claim RPCs unreachable for every
signed-in caller, and a clean-baseline replay of this directory reproduced a
state production has not been in since 2026-07-20.

Those six lines are removed from the repo file, and nothing else in it changed.
The file itself carries the reasoning at that position. Two facts keep this
honest rather than convenient:

- The ledger #106 hardening (`20260721201734`, repo file `20260721173000`)
  changed what those functions **disclose and accept**, never **who may call
  them**. It creates, drops and grants nothing. It does not make the revoke
  safe; the dimensions are orthogonal.
- The file never touched `claim_player_profiles_by_name()`. Replaying the
  revoke therefore disabled the explicitly confirmed, per-profile claim path
  required by `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` while leaving the
  unconfirmed bulk auto-link path callable — a net privacy regression.

`supabase/tests/claimable-guest-identity-privacy-migration.test.ts` pins the
absence of those revokes, so the block cannot silently return.

### `20260718050924` is not gated, and must never be applied

It is recorded here as renamed drift, and `GATED_UNAPPLIED` does not contain
it. Earlier records — including `DEPLOY-STATE.md` — describe it as a "gated"
migration awaiting reconciliation. That is wrong: only its *version string* is
absent from the ledger; its *content* is applied, as `20260718181600`.

Applying the file to production is never correct. It would abort on `42P07`
(its unguarded index names already exist) **after** executing
`create table public.player_private_identities` — the Data-API-exposed table of
guest first names, last names and normalized personal names that
`20260718212339` (ledger `20260719191911`) moved into the `private` schema —
and it would revert the hardened definer functions installed by
`20260719191911` and `20260721035955`. Its non-idempotency is a **safety
property**, documented in the file: guarding those statements would let an
accidental `db push` succeed instead of aborting. No `if not exists` guard may
be added to it, and the migration test pins that too.

## Classifications

### Applied, same version (repo-native)

Every repo file whose version appears verbatim in the ledger (the bulk of
the early history, plus `20260718041532`, `20260718200536`,
`20260715024245`, `20260715113501`, …). These replay cleanly and production
skips them by version.

### Applied under a different ledger version (renamed drift)

| Repo file (version) | Ledger version | Ledger name |
| --- | --- | --- |
| `20260718050924_claimable_guest_identity_privacy` | `20260718181600` | claimable_guest_identity_privacy |
| `20260718114500_sync_upstream_cards_and_tile_catalog` | `20260718154209` | sync_upstream_cards_and_tile_catalog |
| `20260718120000_reconcile_upstream_card_identities` | `20260718154932` | reconcile_upstream_card_identities |
| `20260718212339_remediate_guest_identity_privacy_boundary` | `20260719191911` | remediate_guest_identity_privacy_boundary |
| `20260718212340_harden_game_log_event_contract` | `20260719192054` | harden_game_log_event_contract |
| `20260718212342_add_objective_catalog_aliases` | `20260719192148` | add_objective_catalog_aliases |
| `20260719223000_isolate_player_personal_names_from_data_api` | `20260719203944` | isolate_player_personal_names_from_data_api |
| `20260719223500_enable_rls_on_player_legacy_identities` | `20260719204250` | enable_rls_on_player_legacy_identities |
| `20260719230000_security_invoker_on_import_integrity_audit` | `20260719205420` | security_invoker_on_import_integrity_audit |
| `20260720190000_grant_authenticated_claim_rpc_execute` | `20260720221937` | grant_authenticated_claim_rpc_execute |
| `20260721173000_harden_claim_rpc_privacy` | `20260721201734` | harden_claim_rpc_privacy |
| `20260720120000_coarsen_import_name_match_reasons` | `20260722144034` | coarsen_import_name_match_reasons |
| `20260722012658_add_source_bound_import_identity_staging` | `20260722132159` | add_source_bound_import_identity_staging |
| `20260722153000_close_authenticated_guest_identity_oracle` | `20260722153233` | close_authenticated_guest_identity_oracle |

These files must **never** be renamed to their ledger versions casually and
must never be pushed directly: a plain `supabase db push` would re-apply
their content as new versions.

**The ledger #106 row is keyed by name, not by version.** The file was authored
and applied on the live-site branch `fix/106-claim-rpc-privacy-remediation`
(fix commit `9ddd0de59`, tip `48d612fc8`); `apply_migration` stamped the UTC
apply time `20260721201734` over the filename version `20260721173000`. Nothing
in the ledger points back at the filename, so version cannot be the join key —
and adjacency in time is not a safe substitute either, because the *other*
2026-07-21 addition (`20260721193508`) was stamped with a ledger version that
*precedes* its filename version. What survives the rename is the migration
**name**: `harden_claim_rpc_privacy` appears both in the ledger entry and in the
filename. `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME` records that pairing
and the drift test asserts it against the real filename on disk, so renaming or
deleting the file fails the gate instead of orphaning the mapping.

This row is why the file is carried here at all. The #106 bodies are live in
production, but the definitions this lineage recorded for the three claim RPCs
were still the pre-fix, vulnerable ones. A redesign deploy or `db diff` taken
against that stale record could have reintroduced the enumeration oracle and
silently reverted production.

**The B-05 grant row is name-keyed for the same reason**, and carried for a
parallel one. `apply_migration` stamped `20260720221937` over the filename
version `20260720190000`; `grant_authenticated_claim_rpc_execute` is the only
key common to the file and the ledger entry. Before it was carried, no file on
this branch restored the `authenticated` EXECUTE that `20260718050924` revoked
— `20260706190000_add_saved_player_claim_functions` grants nothing at all, and
the #106 hardening grants nothing either — so a clean-baseline replay of this
directory ended with the claim RPCs unreachable for every signed-in caller,
which is not the state production is in. Carrying it, together with removing
the revoke block, is what closes that gap.

### Applied under an unconfirmed `remote_only` version

`20260704000000_drop_superseded_reference_policies`,
`20260714183000_force_existing_user_pin_reset`,
`20260715032000_prevent_future_game_log_backfills`,
`20260715043000_add_domain_aware_ocr_corrections` — their content is live in
production (verified behaviorally; for example the `input_sha256` trigger is
active), but the ledger records only name-anonymized `remote_only` entries
(`20260714233758`, `20260715030517`, `20260715031157`, `20260715034351`,
`20260715034414`, `20260715170238`), so the exact pairing cannot be
confirmed from the ledger alone.

### Reconstructed remote-only (same version, restores clean replay)

- `20260711232834_add_find_duplicate_game_log_import` — faithful schema-only
  reconstruction of the deployed function and its ACL.
- `20260712114538_add_player_username_full_name` — faithful schema-only
  reconstruction of the remote-only players column addition.

Production skips both by version; disposable clusters gain the objects.

### Remote-only ledger history with no repo file

Everything else in the ledger (the analytics/RPC iteration history from
`20260708164000` through `20260717032629`, `20260712112659`,
`20260712115539`, `20260712220257`, plus `20260718212722
[20260718204000_add_game_mechanic_capture]`, `20260718234835
lock_down_public_backup_tables`, and the live-site release `20260719132042
data_capture_hardening_v2`). The repo does not carry these files; the
disposable harness does not need them for the redesign's objects.

`20260720021300 add_import_player_name_matching_rpc` also belongs here. It
was applied from the live-site session and created the SECURITY DEFINER
function `public.match_import_player_names`, which restored server-side
import name matching after the personal-name Data API revokes. It is
production-only with no repo file. The repo file
`20260720120000_coarsen_import_name_match_reasons` amends that deployed
function rather than creating it.

Production findings last independently verified 2026-07-21 (and requiring a
fresh live read before any production-sensitive action) classify that deployed
function as a **confirmed private-name enumeration oracle**. The live-site
reader half is already deployed, bounds its own input, and tolerates both the
fine-grained and coarse response vocabularies. The remaining WS2 work is the
approved server-only replacement. 20260720120000 was applied on 2026-07-22 as
ledger `20260722144034` and is still insufficient as a closure: coarsening the
response hides which private field matched but still confirms that a
caller-supplied private name belongs to a real identity. The oracle is
therefore mitigated, not closed.

Every ledger version in this category is now registered explicitly in
`PRODUCTION_ONLY_LEDGER_VERSIONS` (68 entries), which is what makes the
ledger → repo direction complete. Most are remote-only history whose migration
*names* were never captured, so no name is asserted for them; the entries whose
identity is attested carry provenance in `PRODUCTION_ONLY_ENTRY_PROVENANCE`.

### Applied from another branch (2026-07-20 → 2026-07-21)

Three entries were added to the ledger after the 2026-07-20 snapshot and still
have no file on this branch; each was applied from another branch under a
renamed ledger version.

| Ledger version | Ledger name | Source file (other branch) | Branch |
| --- | --- | --- | --- |
| `20260721035955` | secure_public_player_labels_service_role | `20260721013000_secure_public_player_labels_service_role.sql` | `origin/fix/public-player-label-service-role-boundary` |
| `20260721081355` | fix_event_card_tag_snapshot_correction | `20260720223000_fix_event_card_tag_snapshot_correction.sql` | `origin/fix/event-card-snapshot-migration-bounded-rebuild` |
| `20260721193508` | fold_player_card_outcome_context_into_definer | `20260721194500_fold_player_card_outcome_context_into_definer.sql` | `814e60210` (`fix/live-compare-data-remove-declared-style`) |

The last row is the `player_card_outcomes` timeout remediation. Note that its
ledger version *precedes* its filename version — the reason renamed applications
are paired by name rather than by timestamp order.

Two further entries from this window are **not** listed here, because their
files are now carried on this branch and they are therefore renamed drift with
declared hazard classes rather than production-only entries:
`20260720221937 grant_authenticated_claim_rpc_execute` (carried as
`20260720190000`) and `20260721201734 harden_claim_rpc_privacy` (carried as
`20260721173000`).

Because the three files above are not on this branch they carry no hazard class
here.
Hazard class is declared per **file present on this branch**; if one of these
files is ever brought over it must gain a declaration at that point. Until
then the ledger → repo completeness check is the only property that applies to
them.

### Prepared and NOT applied (gated)

| Repo file | Hazard | Purpose | Gate |
| --- | --- | --- | --- |
| `20260717190000_add_merger_offer_rule_snapshots` | expansion | Phase 2 Merger package | owner-approved group UUID + dry run + explicit authorization |
| `20260719234500_separate_event_confidence_from_review_state` | **contraction** | confidence/review split (repeat-safe) | per-mutation protocol; pre-apply gate includes verifying no deployed writer emits the retired `'reviewed'` confidence (expand/contract) |
| `20260720100000_add_guest_identity_alias_source_control` | expansion | guest RPC alias-recording control | per-mutation protocol; required before the redesign's roster/manual guest paths ship |
| `20260720110000_extend_canonical_board_placement_contract` | **contraction** | full placement contract | per-mutation protocol; expand/contract order. The pre-apply gate must confirm no `game_log_events` row carries owner ids with a non-`explicit_owner` `ownership_state`: the added CHECK is not `not valid`, so one such row fails the `ALTER TABLE` |
| `20260722012707_retire_free_form_import_name_matcher` | **contraction** | removes authenticated execution from the deployed arbitrary `text[]` matcher | apply only after the expansion and compatible reader are live and verified; separate explicit authorization required |

This table is the five entries of `GATED_UNAPPLIED`. **Two files left it on
2026-07-22 and are recorded above as renamed drift instead:**

- `20260722012658_add_source_bound_import_identity_staging` — the expansion half
  of the source-bound replacement, applied as `20260722132159`. Its contraction
  half `20260722012707` is still gated, and the compatible server reader is
  still not deployed, so the pairing rule is unchanged: reader first, then
  contraction, under separate explicit authorization.
- `20260720120000_coarsen_import_name_match_reasons` — applied as
  `20260722144034`. **Applied is not closed.** It was an interim mitigation and
  independent review found it insufficient as a closure: it coarsens the
  disclosed reason and score but leaves the private-name confirmation oracle
  open, and it is not part of the source-bound replacement proof. Do not cite it
  as the closure. The closure is `20260722012707`, still gated.

## Hazard classes

Every migration **file** on this branch declares one hazard class in
`MIGRATION_HAZARD_CLASS`. The declaration is explicit and never derived from
the SQL: the hazard depends on what was *deployed before* the migration, which
the SQL alone does not record. A file with no declaration fails as
`CLASSIFICATION_MISSING`.

- **`contraction`** — removes or narrows a contract surface that existed
  before this migration and does not restore an equal-or-broader replacement
  in the same file: a `REVOKE` on a pre-existing object, a dropped object with
  no replacement, a tightened `CHECK` or constraint on an existing table, a
  narrowed vocabulary, or a rebuilt function that discloses less. These
  require the expand/contract order recorded in `DECISIONS.md`.
- **`expansion`** — only adds or widens: new tables, columns, functions,
  policies or grants; relaxed constraints; a replacement that accepts every
  previously valid call.
- **`neutral`** — no contract surface change: data-only seeds and
  reconciliations, comments, no-op history placeholders.

Where a file mixes hazards, the strongest present wins. Current declarations:
**16 contraction, 30 expansion, 8 neutral** (54 files) — counted from
`MIGRATION_HAZARD_CLASS` and reconciled against `supabase/migrations/` on
2026-07-22. The 54th file is `20260722153000`, whose declaration is below.

### Contractions

| File | Narrowing |
| --- | --- |
| `20260704000000_drop_superseded_reference_policies` | drops 11 pre-existing policies, creates none |
| `20260715032000_prevent_future_game_log_backfills` | triggers reject writes the deployed contract accepted |
| `20260715113501_restore_ocr_confirmation_function` | revokes PUBLIC/anon execute on the already-deployed confirmation function |
| `20260718041532_remove_game_expansion_tracking` | drops `game_expansions`, `group_default_expansions`, `expansions` |
| `20260718050924_claimable_guest_identity_privacy` | revokes on pre-existing functions and the `private` schema; drops alias constraints; drops two `domain_text_aliases` read policies and replaces them with a narrower one. Still a contraction after the claim-RPC revokes were removed — none of those other narrowings changed |
| `20260718212339_remediate_guest_identity_privacy_boundary` | drops member-read policies on private identities; revokes execute on a pre-existing function |
| `20260718212340_harden_game_log_event_contract` | tightens CHECKs on the deployed `game_log_events` contract |
| `20260719223000_isolate_player_personal_names_from_data_api` | the Data API revokes that broke the deployed frontend on 2026-07-19 |
| `20260719223500_enable_rls_on_player_legacy_identities` | enabling RLS narrows previously unrestricted access |
| `20260719230000_security_invoker_on_import_integrity_audit` | moves the view to the caller's rights |
| `20260719234500_separate_event_confidence_from_review_state` | retires `'reviewed'` from the confidence vocabulary |
| `20260720110000_extend_canonical_board_placement_contract` | mixed, so the strongest wins. It widens the action/ownership vocabularies and adds nullable columns, but `game_log_events_owner_requires_explicit_state` is a CHECK on the pre-existing `owner_player_id`/`owner_game_player_id`/`ownership_state` columns, and not `not valid`. The deployed contract accepts owner ids alongside `ownership_state = 'unknown'`; afterwards that write is rejected and the `ALTER TABLE` fails if any such row already exists. The rebuilt RPC adds rejections its predecessor lacked (owner consistency; the Mars/Moon board-layout format checks) |
| `20260720120000_coarsen_import_name_match_reasons` | narrows the disclosed match classification a deployed caller can read |
| `20260721173000_harden_claim_rpc_privacy` | rebuilds three deployed claim RPCs to disclose less and accept less: prefix/substring name matching becomes exact whole-name matching, a 3-character normalized-input floor and a 10-row cap are imposed, the private-first-name label fallback becomes a neutral placeholder, and `group_name` is returned null in the candidate list |
| `20260722012707_retire_free_form_import_name_matcher` | revokes authenticated/public/anon execution on the pre-existing arbitrary-name matcher; intentionally separate from the expansion |
| `20260722153000_close_authenticated_guest_identity_oracle` | revokes `authenticated` EXECUTE on the pre-existing `public.resolve_import_guest_identity`, removing a surface that role held before the migration and restoring no replacement. Applied as ledger `20260722153233`; a contraction even though the pre-apply zero-caller sweep proved no deployed reader depends on it |

`20260721173000` is the case where the *ledger* classification and the *hazard*
classification pull in opposite directions, which is exactly why the two
dimensions are kept orthogonal. It is already applied to production, so nothing
about it is pending; but it is still a contraction, because a reader written
against the pre-fix bodies — one that expected prefix matches, a populated
`group_name`, or a personal-name label — would break against the deployed
result. It creates, drops and grants nothing: `authenticated` keeps EXECUTE on
all three functions (ledger `20260720221937`), and the live claim flow depends
on that. The narrowing is entirely in what the bodies disclose and accept.

Three declarations deserve their reasoning stated, because the raw SQL reads
the other way:

- `20260720190000_grant_authenticated_claim_rpc_execute` contains four `REVOKE`
  statements, and is still an `expansion`. What it revokes is the implicit
  `PUBLIC` EXECUTE that `CREATE FUNCTION` grants by default (plus `anon` on
  `claim_player_profiles_by_name()`), and it grants explicit EXECUTE to
  `authenticated` on all three claim RPCs in the same file. No deployed reader
  was written against the `PUBLIC` grant, and the functions' own
  `auth.uid() is null` gate already rejected anonymous callers, so nothing is
  stranded: every real signed-in caller gains access rather than losing it.
  Declared `expansion`.
- `20260720100000_add_guest_identity_alias_source_control` **drops** the
  deployed 7-argument `resolve_import_guest_identity` signature, but creates an
  8-argument superset whose new parameter defaults to the previous behaviour,
  so every previously valid call still resolves. Declared `expansion`.
- `20260704034500`, `20260704071832` and `20260704123000` drop policies and
  recreate them under equal-or-broader definitions (`owners …` → `members …`,
  `editors …` → `members …`). Declared `expansion`.

### Neutral

| File | Why |
| --- | --- |
| `20260704043302_seed_reference_dimensions` | inserts only |
| `20260706132454_seed_all_map_milestones_and_awards` | inserts only |
| `20260708013631_fix_replace_game_log_events_conflict_target` | one function body; no contract surface change |
| `20260708143547`, `20260708143922`, `20260708150649`, `20260708162535` `_remote_history_placeholder` | no-ops |
| `20260718212342_add_objective_catalog_aliases` | inserts only |

## Deployment rules

- `supabase/migrations/` is **not** a safe direct `db push` source against
  production: the renamed-drift files would re-apply, and the ledger holds
  remote-only history the repo does not. Production changes go through the
  per-mutation protocol (exact SQL, expected rows, rollback, re-run
  preflight, stop conditions) with `apply_migration`, in version order for
  the pending gated set.
- Clean-baseline replay of `supabase/migrations/` is correct and
  executable-tested end to end by `supabase/tests/executable/run.sh`, which
  runs in two separated halves: production history first (no gated migration
  may precede a baseline assertion about the state production is in today),
  then every gated migration in ledger-version order, each applied twice for
  repeat-safety.
- The harness models the one production-only ledger entry the gated work
  depends on, `20260720021300`, so that `20260720120000` is exercised as a
  true REPLACE of its deployed predecessor rather than silently created.
  `production-preimage-20260720021300-match-import-player-names.sql` is a
  reconstruction from repository-local evidence only — no production system
  was read to produce it. Its fidelity is asserted only for the surface the
  contraction changes (signature, return shape, ACL, disclosed classification,
  absence of an input bound); it must never be promoted into
  `supabase/migrations/` or cited as evidence about production.
- Contractions (REVOKE / DROP / constraint tightening) additionally follow
  the expand/contract order recorded in `DECISIONS.md`: deploy the reader or
  writer that no longer needs the old shape, verify, then contract.
