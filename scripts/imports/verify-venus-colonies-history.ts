import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  HISTORICAL_EXPANSION_CUTOFF,
  verifyHistoricalExpansionAbsence,
  type HistoricalExpansionGame,
} from '../../src/lib/imports/verify-historical-expansion-absence';

const REPORT_DIRECTORY = resolve(
  process.cwd(),
  'docs/redesign/reports/phase-04-step-03b',
);
const JSON_REPORT_PATH = resolve(
  REPORT_DIRECTORY,
  'venus-colonies-historical-dry-run.json',
);
const MARKDOWN_REPORT_PATH = resolve(
  REPORT_DIRECTORY,
  'venus-colonies-historical-dry-run.md',
);
const WRITE_CONFIRMATION = 'APPLY_PHASE_04_STEP_03B_BACKFILL';

type GameRow = {
  created_at: string;
  id: string;
};

type ImportRow = {
  confidence_summary: Record<string, unknown> | null;
  created_at: string;
  game_id: string;
  id: string;
  raw_log_text: string | null;
};

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function playerResolutionsFromImport(row: ImportRow | undefined) {
  const value = row?.confidence_summary?.player_identity_resolutions;
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      !('selected_player_id' in candidate) ||
      !('source_player_text' in candidate) ||
      typeof candidate.selected_player_id !== 'string' ||
      typeof candidate.source_player_text !== 'string'
    ) {
      return [];
    }
    return [
      {
        selectedPlayerId: candidate.selected_player_id,
        sourcePlayerText: candidate.source_player_text,
      },
    ];
  });
}

function reportHasBlockers(report: ReturnType<typeof verifyHistoricalExpansionAbsence>) {
  return (
    report.gamesRequiringReview.length > 0 ||
    report.incompleteEvidence > 0 ||
    report.unsupportedPatterns > 0 ||
    report.conflictingEvidence > 0 ||
    report.parserExceptions > 0 ||
    report.duplicateEvents > 0 ||
    report.unresolvedPlayerAssociations > 0 ||
    report.unexpectedVenusPresence > 0 ||
    report.unexpectedColoniesPresence > 0 ||
    report.unexpectedVenusEvents > 0 ||
    report.unexpectedColoniesEvents > 0
  );
}

function markdownReport(input: {
  generatedAt: string;
  report: ReturnType<typeof verifyHistoricalExpansionAbsence>;
  schemaReady: boolean;
  writePerformed: boolean;
  writeVerification: Record<string, unknown> | null;
}) {
  const report = input.report;
  return `# Phase 4 Step 4.3B Venus Next / Colonies historical verification

- Generated at: ${input.generatedAt}
- Historical cutoff: ${report.cutoff}
- Mode: ${input.writePerformed ? 'authorized write and verification' : 'read-only production dry run'}
- Production schema ready: ${input.schemaReady ? 'yes' : 'no'}
- Production write performed: ${input.writePerformed ? 'yes' : 'no'}

## Counts

| Measure | Count |
| --- | ---: |
| Total historical games | ${report.totalHistoricalGames} |
| Eligible games | ${report.eligibleGames} |
| Games with retained parseable logs | ${report.gamesWithRetainedParseableLogs} |
| Games without retained logs | ${report.gamesWithoutRetainedLogs} |
| Parser-confirmed Venus absence | ${report.parserConfirmedVenusAbsence} |
| Parser-confirmed Colonies absence | ${report.parserConfirmedColoniesAbsence} |
| Unexpected Venus presence | ${report.unexpectedVenusPresence} |
| Unexpected Colonies presence | ${report.unexpectedColoniesPresence} |
| Unexpected Venus events | ${report.unexpectedVenusEvents} |
| Unexpected Colony events | ${report.unexpectedColoniesEvents} |
| Incomplete evidence | ${report.incompleteEvidence} |
| Unsupported patterns | ${report.unsupportedPatterns} |
| Conflicting evidence | ${report.conflictingEvidence} |
| Parser exceptions | ${report.parserExceptions} |
| Duplicate events | ${report.duplicateEvents} |
| Unresolved player associations | ${report.unresolvedPlayerAssociations} |
| Already populated | ${report.alreadyPopulated} |
| Planned writes | ${report.plannedWriteCount} |

## Review gate

Games requiring review: ${
    report.gamesRequiringReview.length > 0
      ? report.gamesRequiringReview.join(', ')
      : 'none'
  }

The dry run writes no game changes. A write is permitted only when every review
and unexpected-result counter is zero, the migration has been applied, and the
separate confirmation token is supplied. Rows are inserted only for games below
the fixed cutoff that do not already have a game-expansion fact row.

## Write verification

${input.writeVerification ? `\`\`\`json\n${JSON.stringify(input.writeVerification, null, 2)}\n\`\`\`` : 'Not run.'}
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const writeRequested = process.argv.includes('--write');
  const confirmation = process.argv.find((argument) =>
    argument.startsWith('--confirm='),
  )?.slice('--confirm='.length);
  if (writeRequested && confirmation !== WRITE_CONFIRMATION) {
    throw new Error(
      `A write requires --confirm=${WRITE_CONFIRMATION}. Dry run remains the default.`,
    );
  }

  const supabase = createClient(
    requireEnvironment('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('id, created_at')
    .lt('created_at', HISTORICAL_EXPANSION_CUTOFF)
    .order('created_at', { ascending: true });
  if (gameError) {
    throw gameError;
  }
  const games = (gameData ?? []) as GameRow[];
  const gameIds = games.map((game) => game.id);

  const imports: ImportRow[] = [];
  if (gameIds.length > 0) {
    const { data, error } = await supabase
      .from('game_log_imports')
      .select('id, game_id, raw_log_text, confidence_summary, created_at')
      .in('game_id', gameIds)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    imports.push(...((data ?? []) as ImportRow[]));
  }

  const latestImportByGame = new Map<string, ImportRow>();
  for (const row of imports) {
    if (!latestImportByGame.has(row.game_id)) {
      latestImportByGame.set(row.game_id, row);
    }
  }

  const existingFactGameIds = new Set<string>();
  let schemaReady = true;
  if (gameIds.length > 0) {
    const { data, error } = await supabase
      .from('game_expansion_facts')
      .select('game_id')
      .in('game_id', gameIds);
    if (error) {
      if (error.code === 'PGRST205' || /game_expansion_facts/i.test(error.message)) {
        schemaReady = false;
      } else {
        throw error;
      }
    } else {
      for (const row of data ?? []) {
        existingFactGameIds.add(row.game_id as string);
      }
    }
  }

  const historicalGames: HistoricalExpansionGame[] = games.map((game) => {
    const source = latestImportByGame.get(game.id);
    return {
      gameId: game.id,
      hasExistingFacts: existingFactGameIds.has(game.id),
      playerResolutions: playerResolutionsFromImport(source),
      sourceGameLogImportId: source?.id ?? null,
      sourceLogText: source?.raw_log_text ?? null,
    };
  });
  const report = verifyHistoricalExpansionAbsence({
    backfilledAt: generatedAt,
    games: historicalGames,
  });

  await mkdir(REPORT_DIRECTORY, { recursive: true });
  let writePerformed = false;
  let writeVerification: Record<string, unknown> | null = null;

  if (writeRequested) {
    if (!schemaReady) {
      throw new Error('The game_expansion_facts migration is not applied.');
    }
    if (reportHasBlockers(report)) {
      throw new Error('Historical verification has blockers; no rows were written.');
    }

    if (report.plannedRows.length > 0) {
      const { error } = await supabase
        .from('game_expansion_facts')
        .insert(report.plannedRows);
      if (error) {
        throw error;
      }
    }

    const { data: persistedData, error: persistedError } = await supabase
      .from('game_expansion_facts')
      .select('game_id')
      .eq('backfill_version', report.backfillVersion)
      .in('game_id', gameIds);
    if (persistedError) {
      throw persistedError;
    }
    const persistedIds = new Set(
      (persistedData ?? []).map((row) => row.game_id as string),
    );
    const secondRun = verifyHistoricalExpansionAbsence({
      backfilledAt: generatedAt,
      games: historicalGames.map((game) => ({
        ...game,
        hasExistingFacts:
          game.hasExistingFacts || persistedIds.has(game.gameId),
      })),
    });
    if (
      persistedIds.size !== report.plannedWriteCount ||
      secondRun.plannedWriteCount !== 0
    ) {
      throw new Error('Post-write count or idempotency verification failed.');
    }
    writePerformed = true;
    writeVerification = {
      actualPersistedRows: persistedIds.size,
      expectedPersistedRows: report.plannedWriteCount,
      historicalEventRowsCreated: 0,
      unrelatedTablesWritten: [],
      secondRunPlannedWrites: secondRun.plannedWriteCount,
    };
  }

  const output = {
    ...report,
    generatedAt,
    plannedRows: report.plannedRows.map((row) => ({
      coloniesState: row.colonies_state,
      gameId: row.game_id,
      hasSourceLogAssociation: row.source_game_log_import_id !== null,
      venusNextState: row.venus_next_state,
    })),
    productionWritePerformed: writePerformed,
    schemaReady,
    writeVerification,
  };
  await writeFile(JSON_REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await writeFile(
    MARKDOWN_REPORT_PATH,
    markdownReport({
      generatedAt,
      report,
      schemaReady,
      writePerformed,
      writeVerification,
    }),
    'utf8',
  );

  process.stdout.write(
    `${JSON.stringify({
      blockers: report.gamesRequiringReview.length,
      games: report.totalHistoricalGames,
      plannedWrites: report.plannedWriteCount,
      reports: [JSON_REPORT_PATH, MARKDOWN_REPORT_PATH],
      schemaReady,
      writePerformed,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
