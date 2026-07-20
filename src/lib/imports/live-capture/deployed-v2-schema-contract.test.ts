import { describe, expect, it } from 'vitest';
import {
  EVENT_COLUMNS,
  MAP_DETECTION_COLUMNS,
  PARSER_RUN_COLUMNS,
  PLACEMENT_COLUMNS,
  SOURCE_COLUMNS,
  UNSUPPORTED_COLUMNS,
} from '@/lib/db/game-capture-compat-repo';
import {
  DEPLOYED_V2_SCHEMA,
  type DeployedV2ColumnType,
} from './deployed-v2-schema';

// Adapter select-list ↔ deployed-schema contract (audit §17). A mocked
// query harness cannot catch a production column rename; this test pins
// every column the adapter selects against the read-only capture of the
// deployed v2 schema, with the Postgres type each mapping relies on. It
// fails when a selected column is missing from the deployed contract, when
// the fixture (regenerated after a production change) drops or retypes a
// column the adapter still selects, or when an adapter select list drifts.

const ADAPTER_SELECTS: Array<{
  columns: string;
  expectedTypes: Record<string, DeployedV2ColumnType>;
  table: string;
}> = [
  {
    columns: PARSER_RUN_COLUMNS,
    expectedTypes: {
      coverage: 'jsonb',
      coverage_state: 'text',
      parser_ran_at: 'timestamp with time zone',
      parser_version: 'text',
      source_sha256: 'text',
    },
    table: 'game_capture_parser_runs',
  },
  {
    columns: SOURCE_COLUMNS,
    expectedTypes: {
      source_byte_length: 'integer',
      source_format: 'text',
      source_sha256: 'text',
    },
    table: 'game_capture_import_sources',
  },
  {
    columns: EVENT_COLUMNS,
    expectedTypes: {
      amount: 'integer',
      attribution_status: 'text',
      detail: 'jsonb',
      event_sequence: 'integer',
      event_uid: 'text',
      value_after: 'integer',
      value_before: 'integer',
    },
    table: 'game_capture_events',
  },
  {
    columns: PLACEMENT_COLUMNS,
    expectedTypes: {
      board_position: 'integer',
      board_row: 'integer',
      ownership_state: 'text',
      placement_action: 'text',
      placement_uid: 'text',
      raw_actor_text: 'text',
      tile_type: 'text',
      upstream_numeric_space_id: 'integer',
    },
    table: 'game_capture_board_placements',
  },
  {
    columns: MAP_DETECTION_COLUMNS,
    expectedTypes: {
      candidate_map_codes: 'ARRAY',
      detection_state: 'text',
      randomized_objectives: 'boolean',
      unsupported_map: 'boolean',
    },
    table: 'game_capture_map_detections',
  },
  {
    columns: UNSUPPORTED_COLUMNS,
    expectedTypes: {
      normalized_pattern: 'text',
      raw_evidence: 'text',
      reason: 'text',
    },
    table: 'game_capture_unsupported_evidence',
  },
];

function splitColumns(select: string) {
  return select.split(',').map((column) => column.trim());
}

describe('deployed v2 schema contract', () => {
  it('selects only columns that exist in the deployed capture schema', () => {
    for (const { columns, table } of ADAPTER_SELECTS) {
      const deployed = DEPLOYED_V2_SCHEMA[table];
      expect(deployed, `${table} must be in the deployed fixture`).toBeTruthy();
      for (const column of splitColumns(columns)) {
        expect(
          deployed[column],
          `${table}.${column} is selected by the adapter but absent from the deployed schema fixture — a rename or removal breaks the read path`,
        ).toBeTruthy();
      }
    }
  });

  it('keeps the load-bearing column types the mappings rely on', () => {
    for (const { expectedTypes, table } of ADAPTER_SELECTS) {
      const deployed = DEPLOYED_V2_SCHEMA[table];
      for (const [column, expectedType] of Object.entries(expectedTypes)) {
        expect(
          deployed[column],
          `${table}.${column} type changed or column removed (expected ${expectedType})`,
        ).toBe(expectedType);
      }
    }
  });

  it('never selects the immutable original source text into DTOs', () => {
    // The raw source stays behind its RLS boundary; re-selecting it would
    // violate the compatibility specification.
    expect(splitColumns(SOURCE_COLUMNS)).not.toContain('original_source_text');
  });
});
