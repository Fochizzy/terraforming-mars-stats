# Phase 4 Step 4.3 — canonical placement backfill dry run

- Generated at: 2026-07-19T00:00:00.000Z
- Production project: `qjtwgrjjwnqafbvkkfex`
- Mode: **read-only dry run**
- Writes performed: **0**

This dry run is a read-only preflight. The production backfill and its execution
report are a **separate** immutable artifact
(`placement-backfill-production.md` / `.json`) and must not overwrite this file.

The backfill cannot run until migration
`20260718212340_harden_game_log_event_contract` is applied to production, because
the typed placement columns and the canonical colony catalogue must exist first.

## Counts

| Measure | Count |
| --- | ---: |
| Total historical games | 42 |
| Games with retained parseable logs | 42 |
| Games without retained logs | 0 |
| Total tile placements | 1500 |
| Flat-format placements (`at NN` / `at mNN`) | 1400 |
| Grid-format placements (`on row R position P`) | 100 |
| Parser failures | 0 |
| Unsupported patterns | 0 |
| Parser-confirmed Venus absence | 42 |
| Parser-confirmed Colonies absence | 42 |
| Planned typed-placement rows | 1500 |
| Expected stable-player attributions | 1467 |
| Unresolved placement attributions | 33 |
| Writes performed | 0 |

## Map distribution

| Map | Code | Games | Placements |
| --- | --- | ---: | ---: |
| Elysium | `elysium` | 19 | 698 |
| Hellas | `hellas` | 13 | 437 |
| Tharsis | `tharsis` | 10 | 365 |

Ambiguous maps: 0 · Unsupported maps: 0 · Unknown maps: 0.

## Attribution

Actor text is normalized exactly as the parser does (lower-case, runs of
non-alphanumeric characters collapsed to a single space, trimmed) and matched to
a unique player within the placement's game, via
`player_import_aliases.normalized_alias` first (so the resolution survives the
privacy migration's neutralization of unlinked `players.display_name`) and the
normalized display name as a fallback.

- Attributed to a unique in-game player: **1467**
- Unresolved: **33**

Unresolved placements keep `player_id`, `owner_player_id`, and
`owner_game_player_id` null with `ownership_state = 'unknown'`. Attribution is
never fabricated. The 100 grid placements recover their original row/position
from the stored `raw_line`; the 1,400 flat placements retain their upstream
numeric space id.

## Write gate

No placement is written by this dry run. The production backfill is permitted
only after migration `20260718212340` is applied, the read-only preflight is
re-run and still matches (1500 placements, 1467 attributions, 33 unresolved),
and separate explicit authorization is given. Backfill updates only existing
tile-event rows and creates no new event rows.
