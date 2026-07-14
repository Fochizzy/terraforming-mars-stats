import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGameLog } from '../src/lib/imports/parse-game-log';
import { buildGameLogEventWrites } from '../src/lib/imports/build-game-log-event-writes';
import { getPublicEnv } from '../src/lib/env';

type GameLogImportRow = {
  game_id: string;
  id: string;
  raw_log_text: string;
};

type ExistingEventRow = {
  event_type: string;
  payload: Record<string, unknown> | null;
};

type CardRow = {
  card_name: string;
  id: string;
};

type ReprocessSummary = {
  changedImports: number;
  existingRemovedEvents: number;
  imports: number;
  parsedEvents: number;
  parsedRemovedEvents: number;
  skippedEmpty: number;
  unchangedImports: number;
  writtenEvents: number;
};

const PAGE_SIZE = 500;

function readDotEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/.exec(line);

    if (!match?.[1]) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2] ?? '';
    const value = rawValue
      .replace(/^['"]|['"]$/g, '')
      .trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  readDotEnvFile(resolve(process.cwd(), '.env.local'));
  readDotEnvFile(resolve(process.cwd(), '.env'));
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));

  return {
    apply: args.has('--apply'),
    dryRun: args.has('--dry-run') || !args.has('--apply'),
    limit: Number(
      process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ??
        '0',
    ),
  };
}

function hasRemovedEvent(event: { eventType: string; operation?: string }) {
  return event.eventType === 'resource_changed' && event.operation === 'removed';
}

function hasExplicitRemovalPayload(payload: Record<string, unknown> | null) {
  if (!payload || payload.operation !== 'removed') {
    return false;
  }

  return Boolean(
    payload.affectedPlayer ||
      payload.targetPlayerName ||
      payload.targetPlayer ||
      payload.sourcePlayerName,
  );
}

function summarizeExistingEvents(events: ExistingEventRow[]) {
  const removedEvents = events.filter(
    (event) =>
      event.event_type === 'resource_changed' &&
      event.payload?.operation === 'removed',
  );

  return {
    explicitRemovedEvents: removedEvents.filter((event) =>
      hasExplicitRemovalPayload(event.payload),
    ).length,
    removedEvents: removedEvents.length,
    totalEvents: events.length,
  };
}

function summarizeNewEvents(
  events: ReturnType<typeof buildGameLogEventWrites>,
) {
  const removedEvents = events.filter(
    (event) =>
      event.eventType === 'resource_changed' &&
      event.payload?.operation === 'removed',
  );

  return {
    explicitRemovedEvents: removedEvents.filter((event) =>
      hasExplicitRemovalPayload(event.payload ?? null),
    ).length,
    removedEvents: removedEvents.length,
    totalEvents: events.length,
  };
}

async function fetchAllImports(supabase: SupabaseClient) {
  const rows: GameLogImportRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('game_log_imports')
      .select('id, game_id, raw_log_text')
      .neq('raw_log_text', '')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as GameLogImportRow[]));

    if (!data || data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

async function fetchCards(supabase: SupabaseClient) {
  const rows: CardRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, card_name')
      .order('card_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as CardRow[]));

    if (!data || data.length < PAGE_SIZE) {
      return rows.map((row) => ({
        cardName: row.card_name,
        id: row.id,
      }));
    }
  }
}

async function fetchExistingEvents(
  supabase: SupabaseClient,
  gameLogImportId: string,
) {
  const { data, error } = await supabase
    .from('game_log_events')
    .select('event_type, payload')
    .eq('game_log_import_id', gameLogImportId);

  if (error) {
    throw error;
  }

  return (data ?? []) as ExistingEventRow[];
}

async function replaceEvents(
  supabase: SupabaseClient,
  gameLogImportId: string,
  events: ReturnType<typeof buildGameLogEventWrites>,
) {
  const { data, error } = await supabase.rpc('replace_game_log_events', {
    p_events: events.map((event) => ({
      board_space: event.boardSpace ?? null,
      card_id: event.cardId ?? null,
      confidence_level: event.confidenceLevel,
      event_order: event.eventOrder,
      event_type: event.eventType,
      generation_number: event.generationNumber ?? null,
      line_classification: event.lineClassification ?? null,
      payload: event.payload ?? {},
      raw_line: event.rawLine,
      resource_amount: event.resourceAmount ?? null,
      resource_type: event.resourceType ?? null,
      tile_type: event.tileType ?? null,
    })),
    p_game_log_import_id: gameLogImportId,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<{ event_order: number; id: string }>;
}

async function main() {
  loadLocalEnv();

  const { apply, limit } = parseArgs();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before reprocessing imports.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const [cards, allImports] = await Promise.all([
    fetchCards(supabase),
    fetchAllImports(supabase),
  ]);
  const imports = limit > 0 ? allImports.slice(0, limit) : allImports;
  const summary: ReprocessSummary = {
    changedImports: 0,
    existingRemovedEvents: 0,
    imports: imports.length,
    parsedEvents: 0,
    parsedRemovedEvents: 0,
    skippedEmpty: 0,
    unchangedImports: 0,
    writtenEvents: 0,
  };

  console.log(
    `${apply ? 'Applying' : 'Dry run'} reprocess for ${imports.length} import(s).`,
  );
  console.log(`Loaded ${cards.length} card reference(s).`);

  for (const row of imports) {
    const rawLogText = row.raw_log_text.trim();

    if (!rawLogText) {
      summary.skippedEmpty += 1;
      continue;
    }

    const parsedGameLog = parseGameLog(rawLogText);
    const newEvents = buildGameLogEventWrites({
      cards,
      parsedGameLog,
    });
    const existingEvents = await fetchExistingEvents(supabase, row.id);
    const existingSummary = summarizeExistingEvents(existingEvents);
    const newSummary = summarizeNewEvents(newEvents);
    const changed =
      existingSummary.totalEvents !== newSummary.totalEvents ||
      existingSummary.removedEvents !== newSummary.removedEvents ||
      existingSummary.explicitRemovedEvents !==
        newSummary.explicitRemovedEvents;

    summary.parsedEvents += newSummary.totalEvents;
    summary.parsedRemovedEvents += newSummary.removedEvents;
    summary.existingRemovedEvents += existingSummary.removedEvents;

    if (changed) {
      summary.changedImports += 1;
    } else {
      summary.unchangedImports += 1;
    }

    console.log(
      [
        row.id,
        `events ${existingSummary.totalEvents}->${newSummary.totalEvents}`,
        `removed ${existingSummary.removedEvents}->${newSummary.removedEvents}`,
        `explicit ${existingSummary.explicitRemovedEvents}->${newSummary.explicitRemovedEvents}`,
        changed ? 'changed' : 'same',
      ].join(' | '),
    );

    if (apply) {
      const written = await replaceEvents(supabase, row.id, newEvents);
      summary.writtenEvents += written.length;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
