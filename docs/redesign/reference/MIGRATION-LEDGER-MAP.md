# Migration ↔ Production-Ledger Map

Authoritative mapping between `supabase/migrations/` filenames and the
production migration ledger (`tm-stats` / `qjtwgrjjwnqafbvkkfex`). The
executable source of truth is `src/lib/db/migration-ledger-map.ts`, enforced by
`src/lib/db/migration-ledger-map.test.ts`. Re-verify by re-listing the ledger
read-only and updating both files together.

## Current snapshot

Captured read-only on **2026-07-21**: **108 entries**, head
`20260721081355 fix_event_card_tag_snapshot_correction`. The previous snapshot
(2026-07-20) held 105 entries with head `20260720021300`; the three additions
are recorded below. The count and head are pinned in
`PRODUCTION_LEDGER_ATTESTATION`, so a later attestation that disagrees fails
rather than silently overwriting.

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
existed they would have been invisible to the gate.

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

These files must **never** be renamed to their ledger versions casually and
must never be pushed directly: a plain `supabase db push` would re-apply
their content as new versions.

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
production-only with no repo file. The gated repo file
`20260720120000_coarsen_import_name_match_reasons` amends that deployed
function rather than creating it.

Every ledger version in this category is now registered explicitly in
`PRODUCTION_ONLY_LEDGER_VERSIONS` (68 entries), which is what makes the
ledger → repo direction complete. Most are remote-only history whose migration
*names* were never captured, so no name is asserted for them; the entries whose
identity is attested carry provenance in `PRODUCTION_ONLY_ENTRY_PROVENANCE`.

### Applied from another branch (2026-07-20 → 2026-07-21)

Three entries were added to the ledger after the previous snapshot. None has a
file on this branch; each was applied from another branch under a renamed
ledger version.

| Ledger version | Ledger name | Source file (other branch) | Branch |
| --- | --- | --- | --- |
| `20260720221937` | grant_authenticated_claim_rpc_execute | `20260720190000_grant_authenticated_claim_rpc_execute.sql` | `b11cae71b` (`fix/b05-claim-rpc-authenticated-grants`) |
| `20260721035955` | secure_public_player_labels_service_role | `20260721013000_secure_public_player_labels_service_role.sql` | `origin/fix/public-player-label-service-role-boundary` |
| `20260721081355` | fix_event_card_tag_snapshot_correction | `20260720223000_fix_event_card_tag_snapshot_correction.sql` | `origin/fix/event-card-snapshot-migration-bounded-rebuild` |

Because their files are not on this branch they carry no hazard class here.
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
| `20260720110000_extend_canonical_board_placement_contract` | expansion | full placement contract | per-mutation protocol; expansion-only (widened CHECKs, new nullable columns, rebuilt RPC) |
| `20260720120000_coarsen_import_name_match_reasons` | **contraction** | closes the private-name confirmation oracle in `match_import_player_names` | per-mutation protocol; **must ship with** the live-site reader move off `display_name`/`normalized_display_name`/`full_name`/private aliases (B-02 + H-01 as one expand/contract sequence) |

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
**12 contraction, 29 expansion, 8 neutral** (49 files).

### Contractions

| File | Narrowing |
| --- | --- |
| `20260704000000_drop_superseded_reference_policies` | drops 11 pre-existing policies, creates none |
| `20260715032000_prevent_future_game_log_backfills` | triggers reject writes the deployed contract accepted |
| `20260715113501_restore_ocr_confirmation_function` | revokes PUBLIC/anon execute on the already-deployed confirmation function |
| `20260718041532_remove_game_expansion_tracking` | drops `game_expansions`, `group_default_expansions`, `expansions` |
| `20260718050924_claimable_guest_identity_privacy` | revokes on pre-existing functions and the `private` schema; drops alias constraints |
| `20260718212339_remediate_guest_identity_privacy_boundary` | drops member-read policies on private identities; revokes execute on a pre-existing function |
| `20260718212340_harden_game_log_event_contract` | tightens CHECKs on the deployed `game_log_events` contract |
| `20260719223000_isolate_player_personal_names_from_data_api` | the Data API revokes that broke the deployed frontend on 2026-07-19 |
| `20260719223500_enable_rls_on_player_legacy_identities` | enabling RLS narrows previously unrestricted access |
| `20260719230000_security_invoker_on_import_integrity_audit` | moves the view to the caller's rights |
| `20260719234500_separate_event_confidence_from_review_state` | retires `'reviewed'` from the confidence vocabulary |
| `20260720120000_coarsen_import_name_match_reasons` | narrows the disclosed match classification a deployed caller can read |

Two declarations deserve their reasoning stated, because the raw SQL reads the
other way:

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
