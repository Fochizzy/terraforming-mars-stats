# Phase 4 Step 4.3B Venus Next / Colonies historical verification

- Generated at: 2026-07-18T20:07:09.167Z
- Historical cutoff: 2026-07-18T00:00:00.000Z
- Mode: authorized write and verification
- Production schema ready: yes
- Production write performed: yes

## Counts

| Measure | Count |
| --- | ---: |
| Total historical games | 42 |
| Eligible games | 42 |
| Games with retained parseable logs | 42 |
| Games without retained logs | 0 |
| Parser-confirmed Venus absence | 42 |
| Parser-confirmed Colonies absence | 42 |
| Unexpected Venus presence | 0 |
| Unexpected Colonies presence | 0 |
| Unexpected Venus events | 0 |
| Unexpected Colony events | 0 |
| Incomplete evidence | 0 |
| Unsupported patterns | 0 |
| Conflicting evidence | 0 |
| Parser exceptions | 0 |
| Duplicate events | 0 |
| Unresolved player associations | 0 |
| Already populated | 0 |
| Planned writes | 42 |

## Review gate

Games requiring review: none

The dry run writes no game changes. A write is permitted only when every review
and unexpected-result counter is zero, the migration has been applied, and the
separate confirmation token is supplied. Rows are inserted only for games below
the fixed cutoff that do not already have a game-expansion fact row.

## Write verification

```json
{
  "actualPersistedRows": 42,
  "existingBackfillRows": 0,
  "expectedPersistedRows": 42,
  "newlyInsertedRows": 42,
  "secondRunPlannedWrites": 0,
  "historicalEventRowsCreated": 0,
  "unrelatedDataUnchanged": true,
  "verifiedUnrelatedTables": [
    "game_awards",
    "game_log_events",
    "game_log_imports",
    "game_milestones",
    "game_player_declared_styles",
    "game_player_inferred_styles",
    "game_player_key_cards",
    "game_player_preludes",
    "game_players",
    "game_promo_sets",
    "game_result_screenshot_imports",
    "game_revisions",
    "games"
  ]
}
```
