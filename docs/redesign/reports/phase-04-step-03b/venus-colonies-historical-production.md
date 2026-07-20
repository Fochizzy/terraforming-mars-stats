# Phase 4 Step 4.3B Venus Next / Colonies historical backfill (production execution)

- Executed at: 2026-07-18T20:07:09.167Z
- Historical cutoff: 2026-07-18T00:00:00.000Z
- Production project: `qjtwgrjjwnqafbvkkfex`
- Mode: **authorized production execution** (separate explicit user
  authorization, after the read-only dry run and the applied schema migration
  recorded in the live ledger as `20260718200536 add_venus_colonies_import_facts`)
- Production write performed: **yes**
- Machine-readable twin: `venus-colonies-historical-production.json`

This is the production counterpart of the read-only dry run
(`venus-colonies-historical-dry-run.md` / `.json`, generated
2026-07-18T19:39:18.704Z before the schema migration was applied). The two
artifacts are separate and immutable; neither overwrites the other.

## Correction note (audit finding F-08)

Commit `b0deed8cb` originally recorded this production execution **over** the
dry-run files, destroying the separate dry-run artifact and leaving a report
that simultaneously claimed `Production write performed: yes` and "The dry
run writes no game changes." The Step 4.3 remediation restored the original
dry-run artifacts byte-exact from commit `41bc1221e` and moved the production
execution results into this separately named artifact. The JSON twin is the
byte-exact production payload from `b0deed8cb`; this Markdown replaces the
contradictory dry-run boilerplate with accurate production language.

## Counts (verified at execution)

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

## Write predicates

Rows were inserted only where every predicate held:

- `games.created_at < 2026-07-18T00:00:00.000Z` (the fixed historical cutoff);
- no existing `public.game_expansion_facts` row for the game;
- the same production parser reported the expected owner-confirmed absence
  state for both mechanics; and
- no unsupported, conflicting, incomplete, unexpected, duplicate, or
  unresolved parser result existed for the game.

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

- **Actual rows:** 42 `game_expansion_facts` rows inserted, all
  `historical_parser_verified_owner_confirmed_absent` for both mechanics,
  null `final_venus_scale`, zero event counts. Zero historical `venus_*` or
  `colony_*` event rows were created.
- **Second-run behavior:** an immediate re-plan after the write produced
  **zero** planned writes (insert-only idempotency confirmed).
- **Rollback / failure state:** the execution completed without error; no
  rollback was required. The reversible path remains deleting only the 42
  rows carrying `backfill_version =
  'phase-04-step-03b-owner-confirmed-absence-v1'`; no other table was
  touched.
- **Unrelated tables:** the 13 fingerprinted tables listed above were
  verified unchanged before and after the write.
