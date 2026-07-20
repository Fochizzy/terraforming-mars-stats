// Deployed live-capture v2 schema contract fixture (audit §17).
//
// Captured READ-ONLY from production `qjtwgrjjwnqafbvkkfex` on 2026-07-20
// via information_schema.columns for the six capture tables (the deployment
// applied as ledger migration `20260719132042 data_capture_hardening_v2`).
// Regenerate with:
//
//   select table_name,
//          string_agg(column_name || ':' || data_type, ', '
//                     order by ordinal_position)
//   from information_schema.columns
//   where table_schema = 'public' and table_name like 'game_capture_%'
//   group by table_name order by table_name;
//
// The contract test asserts every column the adapter selects exists here
// with the expected type, so a rename, removal, or type change in the
// deployed contract fails the suite the moment this fixture is regenerated —
// and an adapter typo fails it immediately.

export type DeployedV2ColumnType =
  | 'ARRAY'
  | 'boolean'
  | 'integer'
  | 'jsonb'
  | 'text'
  | 'timestamp with time zone'
  | 'uuid';

export const DEPLOYED_V2_SCHEMA: Record<
  string,
  Record<string, DeployedV2ColumnType>
> = {
  game_capture_board_placements: {
    id: 'uuid',
    placement_uid: 'text',
    game_id: 'uuid',
    event_id: 'uuid',
    parser_run_id: 'uuid',
    event_sequence: 'integer',
    generation_number: 'integer',
    player_id: 'uuid',
    game_player_id: 'uuid',
    raw_actor_text: 'text',
    attribution_status: 'text',
    map_id: 'uuid',
    map_code: 'text',
    canonical_board_space_id: 'text',
    upstream_numeric_space_id: 'integer',
    board_row: 'integer',
    board_position: 'integer',
    tile_type: 'text',
    placement_action: 'text',
    ownership_state: 'text',
    source_card_or_action: 'text',
    raw_evidence: 'text',
    confidence: 'text',
    parser_version: 'text',
    provenance: 'text',
    created_at: 'timestamp with time zone',
  },
  game_capture_events: {
    id: 'uuid',
    event_uid: 'text',
    game_id: 'uuid',
    game_log_import_id: 'uuid',
    parser_run_id: 'uuid',
    source_sha256: 'text',
    event_sequence: 'integer',
    generation_number: 'integer',
    player_id: 'uuid',
    game_player_id: 'uuid',
    attribution_status: 'text',
    event_category: 'text',
    event_type: 'text',
    canonical_entity_id: 'text',
    source_line_number: 'integer',
    source_text: 'text',
    normalized_text: 'text',
    parameter_type: 'text',
    value_before: 'integer',
    value_after: 'integer',
    amount: 'integer',
    confidence: 'text',
    coverage_state: 'text',
    provenance: 'text',
    detail: 'jsonb',
    created_at: 'timestamp with time zone',
  },
  game_capture_import_sources: {
    id: 'uuid',
    game_id: 'uuid',
    game_log_import_id: 'uuid',
    source_format: 'text',
    source_route: 'text',
    original_source_text: 'text',
    source_sha256: 'text',
    source_byte_length: 'integer',
    upstream_app_version: 'text',
    export_generated_at: 'timestamp with time zone',
    imported_at: 'timestamp with time zone',
    created_at: 'timestamp with time zone',
  },
  game_capture_map_detections: {
    id: 'uuid',
    game_id: 'uuid',
    parser_run_id: 'uuid',
    game_log_import_id: 'uuid',
    exported_map_value: 'text',
    detection_state: 'text',
    detected_map_id: 'uuid',
    detected_map_code: 'text',
    candidate_map_codes: 'ARRAY',
    ocean_evidence: 'jsonb',
    objective_evidence: 'jsonb',
    randomized_objectives: 'boolean',
    conflict_state: 'text',
    unsupported_map: 'boolean',
    confidence: 'text',
    parser_version: 'text',
    provenance: 'text',
    created_at: 'timestamp with time zone',
  },
  game_capture_parser_runs: {
    id: 'uuid',
    game_id: 'uuid',
    game_log_import_id: 'uuid',
    source_id: 'uuid',
    source_sha256: 'text',
    parser_version: 'text',
    workflow_version: 'text',
    coverage_state: 'text',
    coverage: 'jsonb',
    provenance: 'text',
    parser_ran_at: 'timestamp with time zone',
    created_at: 'timestamp with time zone',
  },
  game_capture_unsupported_evidence: {
    id: 'uuid',
    game_id: 'uuid',
    parser_run_id: 'uuid',
    game_log_import_id: 'uuid',
    source_line_number: 'integer',
    raw_evidence: 'text',
    normalized_pattern: 'text',
    reason: 'text',
    parser_version: 'text',
    created_at: 'timestamp with time zone',
  },
};
