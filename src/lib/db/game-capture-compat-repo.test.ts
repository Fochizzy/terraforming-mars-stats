import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  EVENT_COLUMNS,
  MAP_DETECTION_COLUMNS,
  PARSER_RUN_COLUMNS,
  PLACEMENT_COLUMNS,
  readCanonicalGameCapture,
  SOURCE_COLUMNS,
  UNSUPPORTED_COLUMNS,
} from './game-capture-compat-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

type QueryResult = { data?: unknown; error?: unknown };

function queryBuilder(
  result: QueryResult,
  onSelect: (columns: string) => void,
) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  // The selected column list is CAPTURED and asserted (audit §17) — a
  // select-list drift or column rename can no longer pass silently through
  // an argument-discarding mock.
  builder.select = vi.fn((columns: string) => {
    onSelect(columns);
    return builder;
  });
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (
    resolve: (value: QueryResult) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

/** One builder per from() call, consumed per table in order. */
function mockSupabase(queues: Record<string, QueryResult[]>) {
  const pending = Object.fromEntries(
    Object.entries(queues).map(([table, results]) => [table, [...results]]),
  );
  const selectedColumns: Record<string, string[]> = {};
  const from = vi.fn((table: string) => {
    const next = pending[table]?.shift();
    if (!next) {
      throw new Error(`Unexpected query for table ${table}`);
    }
    return queryBuilder(next, (columns) => {
      (selectedColumns[table] ??= []).push(columns);
    });
  });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);
  return { from, selectedColumns };
}

const GAME_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const HISTORICAL_FACTS_ROW = {
  backfill_version: 'venus-colonies-backfill-v1',
  backfilled_at: '2026-07-18T21:00:00Z',
  colonies_state: 'historical_parser_verified_owner_confirmed_absent',
  colony_built_count: 0,
  colony_trade_count: 0,
  detection_provenance: {},
  final_venus_scale: null,
  parser_version: 'terraforming-mars-venus-colonies-v1',
  source_coverage: {},
  source_game_log_import_id: null,
  venus_event_count: 0,
  venus_next_state: 'historical_parser_verified_owner_confirmed_absent',
};

describe('readCanonicalGameCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats a missing v2 schema as capability-absent and serves the legacy shape', async () => {
    mockSupabase({
      game_capture_parser_runs: [
        {
          error: {
            code: 'PGRST205',
            message:
              "Could not find the table 'public.game_capture_parser_runs' in the schema cache",
          },
        },
      ],
      game_expansion_facts: [{ data: HISTORICAL_FACTS_ROW }],
      game_log_imports: [
        {
          data: {
            confidence_summary: { map: { detected_state: 'confident' } },
            created_at: '2026-07-10T00:00:00Z',
            detected_source: 'manual_web_import',
            id: 'import-1',
            input_sha256: 'a'.repeat(64),
            line_count: 100,
            parse_status: 'parsed_setup_fields',
            parser_version: 'terraforming-mars-log-v1',
            unparsed_line_count: 4,
          },
        },
      ],
      game_log_events: [
        {
          data: [
            {
              board_position: null,
              board_row: null,
              board_space: '20',
              colony_id: null,
              confidence_level: 'high',
              event_identity: 'tile:5:placed:mars:20:ocean',
              event_order: 5,
              event_provenance: 'exported_log',
              event_type: 'tile_placed',
              game_player_id: null,
              generation_number: 2,
              map_id: 'map-1',
              owner_game_player_id: null,
              owner_player_id: null,
              ownership_state: 'unknown',
              parameter_after: null,
              parameter_before: null,
              parameter_steps: null,
              parser_version: 'terraforming-mars-tile-actions-v2',
              payload: { actor: 'Player A' },
              placement_action: 'placed',
              placement_board: 'mars',
              placement_format: 'flat-id',
              player_id: 'player-1',
              raw_line: 'Player A placed Ocean tile at 20',
              resource_amount: null,
              resource_type: null,
              review_state: 'not_required',
              source_entity: null,
              source_line_number: 5,
              source_space_id: '20',
              tile_type: 'ocean',
            },
          ],
        },
      ],
    });

    const capture = await readCanonicalGameCapture({ gameId: GAME_ID });

    expect(capture.captureSchemaPresent).toBe(false);
    expect(capture.availability).toBe('legacy_import');
    expect(capture.origin).toBe('redesign_legacy_import');
    expect(capture.parserRun).toMatchObject({
      id: 'import-1',
      parserVersion: 'terraforming-mars-log-v1',
      sourceSha256: 'a'.repeat(64),
    });
    expect(capture.source).toMatchObject({
      hashScope: 'stored_trimmed_log_text',
      sha256: 'a'.repeat(64),
    });
    expect(capture.placements).toHaveLength(1);
    expect(capture.placements[0]).toMatchObject({
      placementAction: 'place',
      playerId: 'player-1',
      tileTypeVocabulary: 'upstream_tile_code',
    });
    // Historical owner-confirmed absence passes through untouched: null final
    // Venus is not zero, and the state is not parser-only.
    expect(capture.expansionFacts).toMatchObject({
      finalVenusScale: null,
      venusNextState: 'historical_parser_verified_owner_confirmed_absent',
    });
    expect(capture.issues).toEqual([]);
  });

  it('prefers the newest supported v2 parser run and reports unsupported versions', async () => {
    const { selectedColumns } = mockSupabase({
      game_capture_parser_runs: [
        {
          data: [
            {
              coverage: {},
              coverage_state: 'complete',
              game_id: GAME_ID,
              game_log_import_id: 'import-9',
              id: 'run-old',
              parser_ran_at: '2026-07-19T10:00:00Z',
              parser_version: 'tm-data-capture-v2',
              provenance: 'live_capture',
              source_id: 'source-1',
              source_sha256: 'b'.repeat(64),
              workflow_version: null,
            },
            {
              coverage: {},
              coverage_state: 'complete',
              game_id: GAME_ID,
              game_log_import_id: 'import-9',
              id: 'run-new',
              parser_ran_at: '2026-07-19T12:00:00Z',
              parser_version: 'tm-data-capture-v2',
              provenance: 'live_capture',
              source_id: 'source-1',
              source_sha256: 'b'.repeat(64),
              workflow_version: null,
            },
            {
              coverage: {},
              coverage_state: 'complete',
              game_id: GAME_ID,
              game_log_import_id: 'import-9',
              id: 'run-future',
              parser_ran_at: '2026-07-19T13:00:00Z',
              parser_version: 'tm-data-capture-v3-future',
              provenance: 'live_capture',
              source_id: 'source-1',
              source_sha256: 'c'.repeat(64),
              workflow_version: null,
            },
          ],
        },
      ],
      game_expansion_facts: [
        {
          data: {
            ...HISTORICAL_FACTS_ROW,
            backfill_version: null,
            backfilled_at: null,
            colonies_state: 'confirmed_absent',
            parser_version: 'tm-data-capture-v2',
            venus_next_state: 'confirmed_absent',
          },
        },
      ],
      game_capture_events: [
        {
          data: [
            {
              amount: null,
              attribution_status: 'explicit_stable',
              canonical_entity_id: null,
              confidence: 'high',
              coverage_state: 'complete',
              detail: {},
              event_category: 'generation',
              event_sequence: 1,
              event_type: 'generation_started',
              event_uid: 'fp:generation:0001:1',
              game_id: GAME_ID,
              game_player_id: 'gp-1',
              generation_number: 1,
              id: 'evt-1',
              normalized_text: null,
              parameter_type: null,
              parser_run_id: 'run-new',
              player_id: 'player-1',
              provenance: 'live_capture',
              source_line_number: 1,
              source_text: 'Generation 1',
              value_after: null,
              value_before: null,
            },
          ],
        },
      ],
      game_capture_board_placements: [{ data: [] }],
      game_capture_map_detections: [
        {
          data: [
            {
              candidate_map_codes: ['tharsis'],
              confidence: 'high',
              conflict_state: 'none',
              detected_map_code: 'tharsis',
              detected_map_id: 'map-t',
              detection_state: 'confident',
              exported_map_value: null,
              game_id: GAME_ID,
              game_log_import_id: 'import-9',
              id: 'det-1',
              objective_evidence: {},
              ocean_evidence: {},
              parser_run_id: 'run-new',
              parser_version: 'tm-data-capture-v2',
              provenance: 'live_capture',
              randomized_objectives: false,
              unsupported_map: false,
            },
          ],
        },
      ],
      game_capture_unsupported_evidence: [{ data: [] }],
      game_capture_import_sources: [
        {
          data: [
            {
              export_generated_at: null,
              game_id: GAME_ID,
              game_log_import_id: 'import-9',
              id: 'source-1',
              imported_at: '2026-07-19T09:59:00Z',
              source_byte_length: 4096,
              source_format: 'manual_web_import',
              source_route: '/import',
              source_sha256: 'b'.repeat(64),
              upstream_app_version: null,
            },
          ],
        },
      ],
    });

    const capture = await readCanonicalGameCapture({ gameId: GAME_ID });

    expect(capture.availability).toBe('live_capture_v2');
    expect(capture.captureSchemaPresent).toBe(true);
    expect(capture.parserRun?.id).toBe('run-new');
    expect(capture.observedUnsupportedParserVersions).toEqual([
      'tm-data-capture-v3-future',
    ]);
    expect(
      capture.issues.filter(
        (issue) => issue.code === 'unsupported_contract_version',
      ),
    ).toHaveLength(1);
    expect(capture.source).toMatchObject({
      byteLength: 4096,
      hashScope: 'original_source_bytes',
      sha256: 'b'.repeat(64),
    });
    expect(capture.mapDetection).toMatchObject({
      detectedMapCode: 'tharsis',
      detectionState: 'confident',
      reviewState: 'not_required',
    });
    expect(capture.events).toHaveLength(1);
    expect(capture.issues.filter((issue) => issue.code === 'semantic_violation'))
      .toEqual([]);

    // The runtime selects are exactly the exported contract lists that the
    // deployed-schema fixture test verifies column by column (audit §17):
    // renaming a v2 column now fails here or there, never silently.
    expect(selectedColumns['game_capture_parser_runs']).toEqual([
      PARSER_RUN_COLUMNS,
    ]);
    expect(selectedColumns['game_capture_import_sources']).toEqual([
      SOURCE_COLUMNS,
    ]);
    expect(selectedColumns['game_capture_events']).toEqual([EVENT_COLUMNS]);
    expect(selectedColumns['game_capture_board_placements']).toEqual([
      PLACEMENT_COLUMNS,
    ]);
    expect(selectedColumns['game_capture_map_detections']).toEqual([
      MAP_DETECTION_COLUMNS,
    ]);
    expect(selectedColumns['game_capture_unsupported_evidence']).toEqual([
      UNSUPPORTED_COLUMNS,
    ]);
  });

  it('reports availability none for a game with no import evidence while preserving historical facts', async () => {
    mockSupabase({
      game_capture_parser_runs: [{ data: [] }],
      game_expansion_facts: [{ data: HISTORICAL_FACTS_ROW }],
      game_log_imports: [{ data: null }],
    });

    const capture = await readCanonicalGameCapture({ gameId: GAME_ID });

    expect(capture.availability).toBe('none');
    expect(capture.captureSchemaPresent).toBe(true);
    expect(capture.origin).toBeNull();
    expect(capture.events).toEqual([]);
    // Missing logs are not parser failure and not confirmed absence: the
    // owner-confirmed historical state and the null final Venus survive.
    expect(capture.expansionFacts).toMatchObject({
      finalVenusScale: null,
      venusNextState: 'historical_parser_verified_owner_confirmed_absent',
    });
  });

  it('falls back to the pre-split column list when review_state does not exist yet', async () => {
    mockSupabase({
      game_capture_parser_runs: [{ data: [] }],
      game_expansion_facts: [{ data: null }],
      game_log_imports: [
        {
          data: {
            confidence_summary: null,
            created_at: '2026-07-10T00:00:00Z',
            detected_source: 'manual_web_import',
            id: 'import-2',
            input_sha256: null,
            line_count: 10,
            parse_status: 'parsed_setup_fields',
            parser_version: 'terraforming-mars-log-v1',
            unparsed_line_count: 0,
          },
        },
      ],
      game_log_events: [
        {
          error: {
            code: '42703',
            message: 'column game_log_events.review_state does not exist',
          },
        },
        {
          data: [
            {
              board_position: null,
              board_row: null,
              board_space: null,
              colony_id: null,
              confidence_level: 'reviewed',
              event_identity: null,
              event_order: 8,
              event_provenance: 'exported_log',
              event_type: 'milestone_claimed',
              game_player_id: null,
              generation_number: 3,
              map_id: null,
              owner_game_player_id: null,
              owner_player_id: null,
              ownership_state: null,
              parameter_after: null,
              parameter_before: null,
              parameter_steps: null,
              parser_version: null,
              payload: { actor: 'Player A', resolution: 'corrected' },
              placement_action: null,
              placement_board: null,
              placement_format: null,
              player_id: null,
              raw_line: 'Player A claimed Mayor milestone',
              resource_amount: null,
              resource_type: null,
              source_entity: null,
              source_line_number: null,
              source_space_id: null,
              tile_type: null,
            },
          ],
        },
      ],
    });

    const capture = await readCanonicalGameCapture({ gameId: GAME_ID });

    expect(capture.availability).toBe('legacy_import');
    // The overloaded pre-split value is split by the same deterministic rule
    // the migration applies: corrected -> high confidence, reviewed state.
    expect(capture.events[0]).toMatchObject({
      confidence: 'high',
      reviewState: 'reviewed',
    });
  });
});
