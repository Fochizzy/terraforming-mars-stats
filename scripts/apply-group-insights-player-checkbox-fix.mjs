import fs from 'node:fs';

const analyticsPath = 'src/features/insights/player-combination-analytics.ts';
const workflowPath = '.github/workflows/apply-group-insights-player-checkbox-fix.yml';
const scriptPath = 'scripts/apply-group-insights-player-checkbox-fix.mjs';
let source = fs.readFileSync(analyticsPath, 'utf8');

const functionPattern = /export function buildPlayerCombinationOptions\(input: \{[\s\S]*?\n\}\n\nfunction findMatchingGameIds/;
const replacement = `export function buildPlayerCombinationOptions(input: {
  currentUserCanonicalId?: string;
  focusPeople: CrossGroupFocusPerson[];
  rows: SharedGameResultRow[];
}): PlayerCombinationOption[] {
  const gameIdsByPlayerId = new Map<string, Set<string>>();

  for (const row of input.rows) {
    const gameIds = gameIdsByPlayerId.get(row.playerId) ?? new Set<string>();
    gameIds.add(row.gameId);
    gameIdsByPlayerId.set(row.playerId, gameIds);
  }

  return input.focusPeople
    .map((person) => {
      const gameIds = new Set<string>();

      for (const playerId of person.playerIds) {
        for (const gameId of gameIdsByPlayerId.get(playerId) ?? []) {
          gameIds.add(gameId);
        }
      }

      const fallbackGamesPlayed =
        person.bundle.performance?.gamesPlayed ??
        new Set(person.bundle.trendRows.map((row) => row.gameId)).size;

      return {
        canonicalId: person.canonicalId,
        displayName: person.displayName,
        gamesPlayed: gameIds.size > 0 ? gameIds.size : fallbackGamesPlayed,
        playerIds: person.playerIds,
      };
    })
    .sort((left, right) => {
      if (left.canonicalId === input.currentUserCanonicalId) return -1;
      if (right.canonicalId === input.currentUserCanonicalId) return 1;
      return right.gamesPlayed - left.gamesPlayed || left.displayName.localeCompare(right.displayName);
    });
}

function findMatchingGameIds`;

if (!functionPattern.test(source)) throw new Error('Could not locate buildPlayerCombinationOptions.');
source = source.replace(functionPattern, replacement);
fs.writeFileSync(analyticsPath, source);
for (const path of [workflowPath, scriptPath]) if (fs.existsSync(path)) fs.rmSync(path);
