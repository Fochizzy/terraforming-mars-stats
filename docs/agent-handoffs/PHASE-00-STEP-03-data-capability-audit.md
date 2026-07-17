# Phase 0 Step 0.3 Data Capability Audit Handoff

## Status

Completed on 2026-07-16.

## Branch and baseline

- Branch: redesign/tm-stats-dashboard-rebuild
- Starting revision after the card-definition input commit: 46dbc3254
- Starting working tree: clean
- Worktree: C:/Users/izzyh/Documents/Terraforming Mars Redesign
- Production application changes: none
- Database migrations created or run: none
- Supabase data or Storage changes: none
- Page redesign or asset inventory: none

The primary checkout at C:/Users/izzyh/Documents/Terraforming Mars was on a
different branch with unrelated work. This step used the existing clean
Terraforming Mars Redesign worktree already attached to the required branch.
The primary checkout was not switched, cleaned, or modified.

The card-acquisition requirements were committed after Step 0.2. The audit
therefore used the updated docs/redesign/DECISIONS.md,
docs/redesign/ANALYTICS-INVENTORY.md, and affected phase files as required
product definitions while independently verifying whether the values are
actually persisted.

## Completed scope

- Audited the local schema, RLS, views, functions, Storage records, generated and
  handwritten types, repositories, analytics queries, actions, forms, import
  persistence, finalization, snapshot refresh, tests, and existing documentation.
- Classified every requested capability using exactly one approved
  classification.
- Documented exact current objects, source paths, consumers, grain, joins,
  null/zero behavior, historical/import coverage, exactness, scope, limitations,
  future work, phase, and confidence.
- Added a dedicated 20-metric Card Acquisition and Conversion audit with the
  approved formulas, duplicate/identity rules, two aggregation methods, coverage
  requirements, context adjustments, and observational-language constraint.
- Stopped before Phase 0 Step 0.4. No asset inventory was started.

## Files inspected

### Required instructions, redesign documents, and handoff

- AGENTS.md
- CLAUDE.md
- docs/redesign/MASTER-RULES.md
- docs/redesign/PAGE-ARCHITECTURE.md
- docs/redesign/phases/00-repository-audit.md
- docs/redesign/CURRENT-ROUTE-MAP.md
- docs/redesign/COMPONENT-MIGRATION-MATRIX.md
- docs/redesign/BASELINE-VALIDATION.md
- docs/REDESIGN_STATE.md
- docs/redesign/DECISIONS.md
- docs/redesign/ANALYTICS-INVENTORY.md
- docs/agent-handoffs/PHASE-00-STEP-02-component-inventory.md
- docs/superpowers/specs/2026-07-03-terraforming-mars-stats-design.md
- Phase recommendation files under docs/redesign/phases, especially 02, 04, 05,
  08-13, and 16-20.

### Schema, views, functions, RLS, and Storage

Every SQL file under supabase/migrations was inspected. Capability-defining
migrations were:

- 20260703120000_create_core_tables.sql
- 20260703121500_create_core_rls.sql
- 20260703123000_create_reference_catalog.sql
- 20260703124500_create_storage_policies.sql
- 20260703130000_create_analytics_views.sql
- 20260704000000_drop_superseded_reference_policies.sql
- 20260704001728_add_group_write_and_reference_rls.sql
- 20260704030147_add_game_log_imports_and_evidence_storage.sql
- 20260704034500_make_group_members_equally_privileged.sql
- 20260704043302_seed_reference_dimensions.sql
- 20260704052314_add_catalog_filter_metadata.sql
- 20260704071832_allow_linked_player_profile_access.sql
- 20260704090000_extend_game_import_review_schema.sql
- 20260704100000_add_import_coverage_analytics.sql
- 20260704123000_add_username_profiles_and_player_resolution.sql
- 20260706132454_seed_all_map_milestones_and_awards.sql
- 20260706153000_support_hybrid_card_score_imports.sql
- 20260706190000_add_saved_player_claim_functions.sql
- 20260708013125_grant_import_coverage_permissions.sql
- 20260708013631_fix_replace_game_log_events_conflict_target.sql
- 20260708142459_add_persisted_metric_snapshots.sql
- the four 20260708 remote_history_placeholder migrations
- 20260708155338_add_card_gameplay_tags.sql
- 20260714183000_force_existing_user_pin_reset.sql
- 20260715024245_add_user_profile_email.sql
- 20260715032000_prevent_future_game_log_backfills.sql
- 20260715043000_add_domain_aware_ocr_corrections.sql
- 20260715113501_restore_ocr_confirmation_function.sql

### Repositories, server actions, forms, and derived logic

- All source and test files under src/lib/db, including analytics-repo.ts,
  final-terraforming-action-repo.ts, game-draft-repo.ts, game-import-repo.ts,
  game-pace-repo.ts, metric-refresh-repo.ts, reference-repo.ts,
  group-context-repo.ts, group-settings-repo.ts, player-repo.ts,
  log-game-player-resolution.ts, ocr-correction-repo.ts, and user-profile-repo.ts.
- src/lib/supabase/server.ts and src/lib/supabase/browser.ts.
- src/lib/validation/log-game.ts and the group/import validators.
- src/features/games/finalize-game.ts.
- src/features/games/log-game/log-game-draft.ts,
  use-log-game-draft.ts, log-game-wizard.tsx, and their tests.
- src/lib/imports/build-import-draft.ts,
  build-import-draft-notes.ts, build-import-evidence-path.ts, and
  normalize-player-alias.ts.
- src/app/(app)/log-game/page.tsx and
  src/app/(app)/log-game/import/page.tsx, including inline server actions.
- src/app/(app)/group/page.tsx, profile/page.tsx, insights/page.tsx, and
  cards/page.tsx.
- src/features/analytics, src/features/insights, and src/features/imports data
  consumers identified by the component migration matrix, including
  build-insight-cards.ts and game-pace-replay.tsx.
- src/features/styles/infer-style.ts.

### Tests

- supabase/tests/analytics_verification.sql
- supabase/tests/core_schema_verification.sql
- supabase/tests/import_schema_verification.sql
- supabase/tests/ocr_schema_verification.sql
- supabase/tests/persisted_metrics_schema_verification.sql
- supabase/tests/persisted_metrics_refresh_verification.sql
- supabase/tests/reference_seed_verification.sql
- Direct repository, finalization, log-game, import, analytics, profile, group,
  insights, and replay-adjacent application tests cited in
  docs/redesign/DATA-CAPABILITIES.md.

## Files changed

- Completed docs/redesign/DATA-CAPABILITIES.md.
- Updated docs/REDESIGN_STATE.md.
- Created docs/agent-handoffs/PHASE-00-STEP-03-data-capability-audit.md.

Only these documentation files belong to Step 0.3.

## Capability findings

### Fully supported now

- Players, groups/memberships/settings, games/status, final score totals,
  placement/winners, saved generation count, maps, expansions/promos,
  corporations, Preludes, corporation–Prelude relationships, final milestone and
  award results, declared/inferred styles, selected key cards, score-source
  totals, head-to-head results, and raw imported-game evidence/basic metadata.

“Available now” does not mean every historic record is complete. Optional
relationships, optional score components, and event-derived tag analytics have
coverage limitations documented in the audit.

### Derivable from current data

- Canonical win point differential is exactly derivable from final scores and
  winner flags, but existing SQL implementations require one tie-aware canonical
  formula and tests.
- Existing runtime/persisted derivations include placement score, adjacent-place
  differential, points per generation, expected score, normalized efficiency,
  score shares, close-game status, fixed award ROI, and heuristic inferred
  styles. Their exact formulas and limitations are documented.

### Query, repository, view, or RPC work

- Cards Played, tile placement events, and replay timelines have partial generic
  event shapes but no verified production writer/coverage.
- Opponent-adjusted performance needs an approved database view/RPC and
  time-aware model.
- Typed corporation–Prelude outputs, null-preserving score-source queries, and a
  canonical margin implementation need foundation work.

### New persisted fields or tables

- Cards Purchased, Cards Seen and all opportunity sources, all hand-entry
  sources, final hand cards, per-generation TR, final TR, elapsed game duration,
  production snapshots, engine timelines, canonical board coordinates,
  durable recommendations, and improvement goals/progress.

### Unsupported from recorded data

- Historical purchase/seen/conversion/utilization/carryover metrics.
- Spatial board-control analytics.
- Historical TR, production, or engine timelines reconstructed from final totals.
- Any causal interpretation of observational outcome associations.

## Card Acquisition and Conversion result

- Cards Purchased: not persisted.
- Cards Seen: not persisted.
- Research offers: not persisted.
- Draft receipts/opportunities: not persisted.
- Effect draws: not persisted.
- Total cards entering hand: not persisted.
- Cards remaining at game end: not persisted.
- Cards Played: schema can represent events and derived counts, but there is no
  verified current event writer and empty data cannot distinguish zero from
  unrecorded.
- Unique catalog card IDs can exist on generic events; stable opportunity,
  logical card-instance, and source-event identities do not.
- No acquisition/conversion rate or outcome range is currently eligible.
- Future multi-game summaries must separately publish ratio of totals and median
  per-game rate. Percentages must not be silently averaged.

## Historical and imported-data limitations

- Local source proves capability, not production population. No live data was
  queried in this documentation-only step.
- Non-null/default-zero score columns can conflate unrecorded with observed zero.
- Optional map/corporation/Prelude/style/key-card/card-score coverage varies.
- Current web imports preserve raw evidence and setup-only drafts; they do not
  populate structured gameplay, card acquisition, TR, production, or board data.
- Generic event, screenshot-extraction, tag-summary, and metric-snapshot
  production coverage requires later read-only linked-database verification.
- No missing temporal/card/board data can be honestly backfilled from final
  totals.

## Unresolved questions

- Event versus generation-aggregate versus hybrid card model.
- Stable opportunity/source-event identity and Cards Seen coverage semantics.
- Full hand-entry source taxonomy and drafting configuration.
- Tied-first win margin policy and overall point-differential definition.
- Final and per-generation TR source.
- Elapsed-duration source.
- Player/opponent-strength model and minimum history.
- Linked-database definition/security for get_final_terraforming_action_stats.
- Actual historical population and freshness of events/snapshots.
- Minimum samples/range definitions and global opt-in behavior.
- Whether owner/editor/viewer roles should enforce different permissions.

## Validation

- Confirmed the required branch before writing.
- Confirmed the worktree was clean before writing.
- Confirmed all 20 requested card metrics appear in the dedicated audit.
- Confirmed the seven approved classification labels are the only
  classifications used in capability rows.
- Confirmed all required audit sections are present.
- Confirmed the changed-file set is documentation-only.
- Ran documentation integrity checks and git diff --check.

Application tests, type checking, linting, build, browser checks, migrations, and
live Supabase queries were not run because Step 0.3 changes documentation only
and must not change or infer production data. The healthy baseline remains in
docs/redesign/BASELINE-VALIDATION.md.

## Next action

Begin Phase 0 Step 0.4, Asset Inventory, only when explicitly assigned. Do not
begin migrations, query implementation, page redesign, or Phase 1 as part of
this handoff.
