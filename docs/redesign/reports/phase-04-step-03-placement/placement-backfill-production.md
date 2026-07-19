# Phase 4 Step 4.3 — canonical placement backfill (production execution)

- Executed at: 2026-07-19T19:22:00Z
- Production project: `qjtwgrjjwnqafbvkkfex`
- Mode: **authorized production execution**
- Authorization: the user approved "apply all four" after the gated per-mutation
  plan was presented.

This is the production counterpart of the read-only dry run
(`placement-backfill-dry-run.md`); the two artifacts are separate and neither
overwrites the other.

## Applied migrations (ledger)

| Ledger version | Name | Repo file |
| --- | --- | --- |
| `20260719191911` | `remediate_guest_identity_privacy_boundary` | `20260718212339_…` |
| `20260719192054` | `harden_game_log_event_contract` | `20260718212340_…` |
| `20260719192148` | `add_objective_catalog_aliases` | `20260718212342_…` |

`apply_migration` assigned current-timestamp ledger versions; the SQL is
byte-identical to the committed repo files (only the filename timestamps differ —
expected repo/ledger drift).

## Backfill

- Predicate: `public.game_log_events where event_type in ('tile_placed','tile_removed')`.
- Method: one self-verifying atomic `UPDATE` deriving typed placement fields
  from existing columns (`event_order`, `event_type`, `board_space`,
  `tile_type`, `raw_line`) and the game map. Player and game-player are resolved
  by **alias-only** unique match, which stays correct after the privacy
  migration neutralized unlinked `display_name`. The exact statement is
  `placement-backfill.sql` in this directory.

| Measure | Value |
| --- | ---: |
| Expected rows | 1500 |
| Rows updated | 1500 |
| Excluded rows | 0 |
| New event rows created | 0 |
| Flat placements | 1400 |
| Grid placements | 100 |
| Player attributions | 1467 |
| Game-player attributions | 1467 |
| Unresolved attributions (null) | 33 |
| Owner fields set | 0 |

Unresolved placements keep `player_id`, `owner_player_id`, and
`owner_game_player_id` null with `ownership_state = 'unknown'`. The actor is
never treated as ownership.

## Constraints validated (NOT VALID → VALID)

- `game_log_events_typed_placement_required`
- `game_log_events_expansion_identity_required`
- `game_log_events_colony_id_fk`

## Postconditions

| Check | Result |
| --- | --- |
| Tile events fully typed | 1500 |
| Attributed | 1467 |
| Unresolved | 33 |
| Owner fields set | 0 |
| Validated constraints | 3 |
| Non-tile events untouched | yes |
| Games unchanged | 42 |
| Idempotency re-run diffs | 0 |

## Privacy, grants, and advisors

- `player_private_identities` is in the `private` schema; `authenticated` cannot
  select it or `player_import_aliases`. All 6 unlinked players' `display_name`
  and (generated) `normalized_display_name` are neutralized.
- Colony catalogue: 23 rows. Objective aliases: 7 rows.
- Security advisors: **no new regression attributable to this remediation**.
  `player_private_identities` reports `rls_enabled_no_policy` (INFO — the intended
  deny-all direct-access state); the three guarded SECURITY DEFINER functions
  report `authenticated_security_definer_function_executable` (WARN, by design)
  and are not anon-executable. The single ERROR
  (`security_definer_view public.game_log_import_integrity_audit`) is pre-existing
  and unrelated.

## Idempotency

Re-deriving the typed placement fields from the stored columns after the backfill
produced **zero** differences from the persisted values, confirming the backfill
is idempotent and safe to re-run.
