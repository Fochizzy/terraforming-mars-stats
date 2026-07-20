import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildGameLogTagSummaryRows } from '../../src/lib/db/game-import-repo';
import { PLAYABLE_CARD_TYPES } from '../../src/lib/db/reference-repo';
import {
  derivePlayerTagSummaries,
  PLAYER_TAG_CODES,
} from '../../src/lib/imports/derive-player-tag-summaries';

/**
 * Recompute `game_log_tag_summaries` for every stored import.
 *
 * Summaries are written once, at import time, against whatever the card
 * catalogue looked like then. Cards added or corrected later never retro-apply,
 * so an import can permanently under-count tags for cards that resolve fine
 * today.
 *
 * This deliberately reuses `derivePlayerTagSummaries` rather than
 * reimplementing it in SQL: ambiguity handling, tag-code normalisation and
 * player-name normalisation all have to match the import path exactly, or a
 * backfilled import silently stops matching a freshly imported one.
 *
 * Dry run by default. Pass --apply to write.
 */

const PAGE_SIZE = 1000;

function loadEnvLocal() {
  let contents: string;

  try {
    contents = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

type MinimalClient = {
  from: (table: string) => any;
};

async function readAll<TRow>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<TRow[]> {
  const rows: TRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as TRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return rows;
    }
  }
}

async function loadCardReferences(client: MinimalClient) {
  const rows = await readAll<{
    card_name: string;
    card_type: string;
    gameplay_tags: string[] | null;
    id: string;
  }>((from, to) =>
    client
      .from('cards')
      .select('id, card_name, card_type, gameplay_tags')
      .in('card_type', PLAYABLE_CARD_TYPES)
      .order('card_name')
      .range(from, to),
  );

  return rows.map((row) => ({
    cardName: row.card_name,
    cardType: row.card_type,
    id: row.id,
    sourceTags: (row.gameplay_tags ?? []) as never,
  }));
}

/**
 * Rebuild the parsed `card_played` events from what was stored. Only the fields
 * the tag derivation reads are needed: actor, card name, line number, raw line.
 */
async function loadPlayedEvents(client: MinimalClient, importId: string) {
  const rows = await readAll<{
    event_order: number;
    payload: Record<string, unknown> | null;
    raw_line: string | null;
  }>((from, to) =>
    client
      .from('game_log_events')
      .select('event_order, payload, raw_line')
      .eq('game_log_import_id', importId)
      .eq('event_type', 'card_played')
      .order('event_order')
      .range(from, to),
  );

  return rows.flatMap((row) => {
    const actor = String(row.payload?.actor ?? '').trim();
    const card = String(row.payload?.cardName ?? '').trim();

    if (!actor || !card) {
      return [];
    }

    return [
      {
        actor,
        card,
        eventType: 'card_played' as const,
        lineNumber: row.event_order,
        rawLine: row.raw_line ?? '',
      },
    ];
  });
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.',
    );
  }

  const apply = process.argv.includes('--apply');
  const client = createClient(supabaseUrl, serviceRoleKey) as unknown as MinimalClient;
  const cardReferences = await loadCardReferences(client);

  const imports = await readAll<{ game_id: string | null; id: string }>(
    (from, to) =>
      client
        .from('game_log_imports')
        .select('id, game_id')
        .order('created_at')
        .range(from, to),
  );

  console.log(
    `${cardReferences.length} playable cards, ${imports.length} imports.`,
  );

  let changedImports = 0;
  let recoveredCards = 0;
  let recoveredTags = 0;
  let written = 0;

  for (const importRow of imports) {
    const events = await loadPlayedEvents(client, importRow.id);

    if (events.length === 0) {
      continue;
    }

    const derived = derivePlayerTagSummaries({
      cardReferences,
      events: events as never,
    });

    const stored = await readAll<{
      matched_card_count: number;
      player_name: string;
      total_tag_count: number;
      unresolved_card_count: number;
    }>((from, to) =>
      client
        .from('game_log_tag_summaries')
        .select(
          'player_name, matched_card_count, unresolved_card_count, total_tag_count',
        )
        .eq('game_log_import_id', importRow.id)
        .range(from, to),
    );

    const storedByPlayer = new Map(
      stored.map((row) => [row.player_name, row]),
    );
    const deltas: string[] = [];

    for (const summary of derived) {
      const before = storedByPlayer.get(summary.playerName);
      const beforeMatched = before?.matched_card_count ?? 0;
      const beforeTags = before?.total_tag_count ?? 0;

      if (
        beforeMatched !== summary.matchedCardCount ||
        beforeTags !== summary.totalTags
      ) {
        deltas.push(
          `      ${summary.playerName}: matched ${beforeMatched} -> ${summary.matchedCardCount}, tags ${beforeTags} -> ${summary.totalTags}`,
        );
        recoveredCards += summary.matchedCardCount - beforeMatched;
        recoveredTags += summary.totalTags - beforeTags;
      }
    }

    if (deltas.length > 0) {
      changedImports += 1;
      console.log(`\n  import ${importRow.id} (game ${importRow.game_id})`);
      console.log(deltas.join('\n'));
    }

    if (!apply || deltas.length === 0) {
      continue;
    }

    // Same delete-then-insert the import path uses, with the same row builder,
    // so a backfilled import is indistinguishable from a freshly imported one.
    const { error: deleteError } = await client
      .from('game_log_tag_summaries')
      .delete()
      .eq('game_log_import_id', importRow.id);

    if (deleteError) {
      throw deleteError;
    }

    const rows = buildGameLogTagSummaryRows({
      gameLogImportId: importRow.id,
      tagCodes: PLAYER_TAG_CODES,
      tagSummaries: derived,
    });

    if (rows.length > 0) {
      const { error: insertError } = await client
        .from('game_log_tag_summaries')
        .insert(rows);

      if (insertError) {
        throw insertError;
      }
    }

    written += rows.length;
  }

  console.log(
    `\n${changedImports} of ${imports.length} imports would change: ${recoveredCards >= 0 ? '+' : ''}${recoveredCards} matched cards, ${recoveredTags >= 0 ? '+' : ''}${recoveredTags} tags.`,
  );

  if (apply) {
    console.log(`Rewrote ${written} summary rows across ${changedImports} imports.`);
  } else {
    console.log('Dry run — nothing written. Re-run with --apply to persist.');
  }
}

if (process.argv[1]?.endsWith('recompute-tag-summaries.ts')) {
  void main();
}
