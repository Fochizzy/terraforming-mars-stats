import fs from 'node:fs';

const path = 'src/features/insights/player-combination-analytics.ts';
let source = fs.readFileSync(path, 'utf8');

const oldFunction = `export function buildPlayerCombinationOptions(input: {
  currentUserCanonicalId?: string;
  focusPeople: CrossGroupFocusPerson[];
  rows: SharedGameResultRow[];
}): PlayerCombinationOption[] {
  const gameIdsByPlayerId = new Map<string, Set<string>>();

  for (const