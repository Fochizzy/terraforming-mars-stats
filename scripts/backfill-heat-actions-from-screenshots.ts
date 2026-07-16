/**
 * Backfill heat_actions on game_players from stored endgame score screenshots.
 *
 * For every finalized game that has a saved endgame_score screenshot but whose
 * game_players rows still have heat_actions = NULL, this script:
 *   1. Downloads the screenshot from Supabase Storage.
 *   2. Re-runs the same OCR pipeline used during import.
 *   3. Extracts heatActions from the parsed score rows.
 *   4. Updates game_players.heat_actions for each matching player.
 *
 * Usage:
 *   npx tsx scripts/backfill-heat-actions-from-screenshots.ts [--apply] [--limit=N]
 *
 * Defaults to --dry-run. Pass --apply to write changes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePlayerAlias } from '../src/lib/imports/normalize-player-alias';
import { sharpOcrOps } from '../src/lib/imports/ocr/sharp-ocr-ops';
import { parseEndgameScoreScreenshot } from '../src/lib/imports/parse-endgame-score-screenshot';
import { readGameResultScreenshot } from '../src/lib/imports/read-game-result-screenshot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScreenshotRow = {
  detected_layout: string | null;
  evidence_kind: string;
  game_id: string;
  game_log_import_id: string;
  id: string;
  storage_object_path: string;
};

type GamePlayerRow = {
  heat_actions: number | null;
  id: string;
  player_id: string;
};

type PlayerNameRow = {
  display_name: string;
  id: string;
};

type Summary = {
  gamesProcessed: number;
  gamesSkipped: number;
  gamesUpdated: number;
  playersUpdated: number;
  screenshotErrors: number;
  screenshotsProcessed: number;
};

const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Env / args
// ---------------------------------------------------------------------------

function readDotEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/.exec(line);
    if (!match?.[1]) continue;
    const key = match[1];
    const value = (match[2] ?? '').replace(/^['"]|['"]$/g, '').trim();
    if (!process.env[key]) process.env[key] = value;
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
    limit: Number(
      process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0',
    ),
  };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchScreenshots(supabase: SupabaseClient): Promise<ScreenshotRow[]> {
  const rows: ScreenshotRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('game_result_screenshot_imports')
      .select('id, game_id, game_log_import_id, storage_object_path, detected_layout, evidence_kind')
      .eq('evidence_kind', 'endgame_score')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    rows.push(...((data ?? []) as ScreenshotRow[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function fetchGamePlayers(
  supabase: SupabaseClient,
  gameId: string,
): Promise<GamePlayerRow[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select('id, player_id, heat_actions')
    .eq('game_id', gameId);

  if (error) throw error;
  return (data ?? []) as GamePlayerRow[];
}

async function fetchPlayerNames(
  supabase: SupabaseClient,
  playerIds: string[],
): Promise<PlayerNameRow[]> {
  if (playerIds.length === 0) return [];
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name')
    .in('id', playerIds);

  if (error) throw error;
  return (data ?? []) as PlayerNameRow[];
}

async function downloadScreenshot(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return new Uint8Array(await data.arrayBuffer());
}

async function updateHeatActions(
  supabase: SupabaseClient,
  gamePlayerId: string,
  heatActions: number,
) {
  const { error } = await supabase
    .from('game_players')
    .update({ heat_actions: heatActions })
    .eq('id', gamePlayerId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function main() {
  loadLocalEnv();

  const { apply, limit } = parseArgs();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE ?? 'tm-import-evidence';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let allScreenshots = await fetchScreenshots(supabase);

  if (limit > 0) {
    allScreenshots = allScreenshots.slice(0, limit);
  }

  console.log(
    `${apply ? 'Applying' : 'Dry run'} — ${allScreenshots.length} endgame screenshot(s) to process.`,
  );

  const summary: Summary = {
    gamesProcessed: 0,
    gamesSkipped: 0,
    gamesUpdated: 0,
    playersUpdated: 0,
    screenshotErrors: 0,
    screenshotsProcessed: 0,
  };

  // One screenshot per game is enough; dedupe by game_id keeping first.
  const seenGameIds = new Set<string>();
  const deduped = allScreenshots.filter((s) => {
    if (seenGameIds.has(s.game_id)) return false;
    seenGameIds.add(s.game_id);
    return true;
  });

  console.log(`${deduped.length} unique game(s) after dedup.`);

  for (const screenshot of deduped) {
    summary.gamesProcessed += 1;

    const gamePlayers = await fetchGamePlayers(supabase, screenshot.game_id);

    // Skip games where all players already have a heat_actions value.
    const nullPlayers = gamePlayers.filter((p) => p.heat_actions === null);
    if (nullPlayers.length === 0) {
      console.log(`game ${screenshot.game_id} | all heat_actions set — skip`);
      summary.gamesSkipped += 1;
      continue;
    }

    const playerNames = await fetchPlayerNames(
      supabase,
      gamePlayers.map((p) => p.player_id),
    );
    const displayNameById = new Map(playerNames.map((p) => [p.id, p.display_name]));

    // Download + OCR.
    let imageBytes: Uint8Array;
    try {
      imageBytes = await downloadScreenshot(supabase, bucket, screenshot.storage_object_path);
    } catch (err) {
      console.error(`game ${screenshot.game_id} | download failed:`, err);
      summary.screenshotErrors += 1;
      continue;
    }

    let ocrResult: Awaited<ReturnType<typeof readGameResultScreenshot>>;
    try {
      // Detect MIME type from magic bytes rather than assuming PNG.
      const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50;
      const isJpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8;
      const mimeType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/png';
      const file = new File([imageBytes.buffer as ArrayBuffer], screenshot.storage_object_path, {
        type: mimeType,
      });
      ocrResult = await readGameResultScreenshot(file, undefined, sharpOcrOps);
    } catch (err) {
      console.error(`game ${screenshot.game_id} | OCR failed:`, err);
      summary.screenshotErrors += 1;
      continue;
    }

    summary.screenshotsProcessed += 1;

    const parsed = parseEndgameScoreScreenshot(ocrResult.endgameLines, {
      layout: (screenshot.detected_layout ?? undefined) as
        | 'legacy'
        | 'victory_breakdown'
        | undefined,
    });

    if (parsed.playerRows.length === 0) {
      console.log(`game ${screenshot.game_id} | no parsed rows — skip`);
      summary.gamesSkipped += 1;
      continue;
    }

    // Match parsed rows → game_players by normalised display name.
    let gameUpdated = false;

    for (const gamePlayer of nullPlayers) {
      const displayName = displayNameById.get(gamePlayer.player_id);
      if (!displayName) continue;

      const normalizedName = normalizePlayerAlias(displayName);
      const parsedRow = parsed.playerRows.find(
        (row) => normalizePlayerAlias(row.playerName) === normalizedName,
      );

      if (!parsedRow) {
        console.log(
          `  game ${screenshot.game_id} | player "${displayName}" not found in OCR rows`,
        );
        continue;
      }

      if (typeof parsedRow.heatActions !== 'number') {
        console.log(
          `  game ${screenshot.game_id} | player "${displayName}" — no heatActions in parsed row`,
        );
        continue;
      }

      console.log(
        `  game ${screenshot.game_id} | player "${displayName}" | heatActions=${parsedRow.heatActions}${apply ? ' — updating' : ' — dry run'}`,
      );

      if (apply) {
        await updateHeatActions(supabase, gamePlayer.id, parsedRow.heatActions);
        summary.playersUpdated += 1;
        gameUpdated = true;
      }
    }

    if (gameUpdated) {
      summary.gamesUpdated += 1;
    }
  }

  console.log('\nSummary:');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
