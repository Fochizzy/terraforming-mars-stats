# Migration ↔ Production-Ledger Map

Authoritative mapping between `supabase/migrations/` filenames and the
production migration ledger (`tm-stats` / `qjtwgrjjwnqafbvkkfex`), captured
read-only on 2026-07-20. The executable source of truth is
`src/lib/db/migration-ledger-map.ts`, enforced by
`src/lib/db/migration-ledger-map.test.ts`, which fails on any unclassified
file, any gated migration that appears applied, or any renamed mapping that
points at a nonexistent ledger version. Re-verify by re-listing the ledger
read-only and updating both files together.

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

### Prepared and NOT applied (gated)

| Repo file | Purpose | Gate |
| --- | --- | --- |
| `20260717190000_add_merger_offer_rule_snapshots` | Phase 2 Merger package | owner-approved group UUID + dry run + explicit authorization |
| `20260719234500_separate_event_confidence_from_review_state` | confidence/review split (repeat-safe) | per-mutation protocol; pre-apply gate includes verifying no deployed writer emits the retired `'reviewed'` confidence (expand/contract) |
| `20260720100000_add_guest_identity_alias_source_control` | guest RPC alias-recording control | per-mutation protocol; required before the redesign's roster/manual guest paths ship |
| `20260720110000_extend_canonical_board_placement_contract` | full placement contract | per-mutation protocol; expansion-only (widened CHECKs, new nullable columns, rebuilt RPC) |

## Deployment rules

- `supabase/migrations/` is **not** a safe direct `db push` source against
  production: the renamed-drift files would re-apply, and the ledger holds
  remote-only history the repo does not. Production changes go through the
  per-mutation protocol (exact SQL, expected rows, rollback, re-run
  preflight, stop conditions) with `apply_migration`, in version order for
  the pending gated set.
- Clean-baseline replay of `supabase/migrations/` is correct and
  executable-tested end to end by `supabase/tests/executable/run.sh`
  (including double application of the gated split and placement
  migrations).
- Contractions (REVOKE / DROP / constraint tightening) additionally follow
  the expand/contract order recorded in `DECISIONS.md`: deploy the reader or
  writer that no longer needs the old shape, verify, then contract.
