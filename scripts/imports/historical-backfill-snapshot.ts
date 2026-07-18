import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function fingerprintRows(rows: unknown[]) {
  const canonicalRows = rows
    .map((row) => JSON.stringify(canonicalize(row)))
    .sort();
  return createHash('sha256')
    .update(JSON.stringify(canonicalRows))
    .digest('hex');
}

async function selectRows(input: {
  client: SupabaseClient;
  column: string;
  ids: string[];
  table: string;
}) {
  if (input.ids.length === 0) {
    return [];
  }
  const { data, error } = await input.client
    .from(input.table)
    .select('*')
    .in(input.column, input.ids);
  if (error) {
    throw error;
  }
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function captureUnrelatedGameData(
  client: SupabaseClient,
  gameIds: string[],
) {
  const rowsByTable: Record<string, Array<Record<string, unknown>>> = {};
  const gameTables = [
    ['game_awards', 'game_id'],
    ['game_log_imports', 'game_id'],
    ['game_milestones', 'game_id'],
    ['game_players', 'game_id'],
    ['game_promo_sets', 'game_id'],
    ['game_result_screenshot_imports', 'game_id'],
    ['game_revisions', 'game_id'],
    ['games', 'id'],
  ] as const;
  for (const [table, column] of gameTables) {
    rowsByTable[table] = await selectRows({ client, column, ids: gameIds, table });
  }

  const gamePlayerIds = rowsByTable.game_players.flatMap((row) =>
    typeof row.id === 'string' ? [row.id] : [],
  );
  for (const table of [
    'game_player_declared_styles',
    'game_player_inferred_styles',
    'game_player_key_cards',
    'game_player_preludes',
  ]) {
    rowsByTable[table] = await selectRows({
      client,
      column: 'game_player_id',
      ids: gamePlayerIds,
      table,
    });
  }

  const importIds = rowsByTable.game_log_imports.flatMap((row) =>
    typeof row.id === 'string' ? [row.id] : [],
  );
  rowsByTable.game_log_events = await selectRows({
    client,
    column: 'game_log_import_id',
    ids: importIds,
    table: 'game_log_events',
  });

  return Object.fromEntries(
    Object.entries(rowsByTable)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([table, rows]) => [table, fingerprintRows(rows)]),
  );
}
