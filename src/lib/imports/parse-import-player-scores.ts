import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { normalizePlayerAlias } from './normalize-player-alias';

type ImportScorePlayer = {
  id: string;
  name: string;
};

type ImportScoreField = keyof LogGameDraftInput['playerScores'][string];

type StructuredPlayerScore = {
  name: string;
} & Partial<Record<ImportScoreField, number>>;

type ScoreEvidence =
  | string
  | {
      players?: StructuredPlayerScore[];
    };

const SCORE_FIELD_PATTERNS: Array<{
  field: ImportScoreField;
  pattern: RegExp;
}> = [
  { field: 'citiesPoints', pattern: /\b(?:cities|city points?)\s+(-?\d+)\b/gi },
  { field: 'greeneryPoints', pattern: /\b(?:greenery|greenery points?)\s+(-?\d+)\b/gi },
  {
    field: 'cardPointsTotal',
    pattern: /\b(?:cards|card points?|total card points?)\s+(-?\d+)\b/gi,
  },
  { field: 'cardPointsMicrobes', pattern: /\b(?:microbes?|microbe points?)\s+(-?\d+)\b/gi },
  { field: 'cardPointsAnimals', pattern: /\b(?:animals?|animal points?)\s+(-?\d+)\b/gi },
  { field: 'cardPointsJovian', pattern: /\b(?:jovian|jovian points?)\s+(-?\d+)\b/gi },
  { field: 'trPoints', pattern: /\b(?:tr|terraform rating)\s+(-?\d+)\b/gi },
  { field: 'milestonePoints', pattern: /\b(?:milestones?|milestone points?)\s+(-?\d+)\b/gi },
  { field: 'awardPoints', pattern: /\b(?:awards?|award points?)\s+(-?\d+)\b/gi },
  { field: 'totalPoints', pattern: /\b(?:total|total points?)\s+(-?\d+)\b/gi },
  { field: 'finalMegacredits', pattern: /\b(?:mc|final megacredits?)\s+(-?\d+)\b/gi },
];

function resolvePlayerId(name: string, players: ImportScorePlayer[]) {
  const normalizedName = normalizePlayerAlias(name);

  if (!normalizedName) {
    return null;
  }

  const exactMatches = players.filter(
    (player) => normalizePlayerAlias(player.name) === normalizedName,
  );

  if (exactMatches.length === 1) {
    return exactMatches[0]?.id ?? null;
  }

  const partialMatches = players.filter((player) =>
    normalizePlayerAlias(player.name).includes(normalizedName),
  );

  return partialMatches.length === 1 ? partialMatches[0]?.id ?? null : null;
}

function keepNonConflictingScore(
  target: Partial<Record<ImportScoreField, number>>,
  field: ImportScoreField,
  value: number,
  conflicts: Set<ImportScoreField>,
) {
  if (conflicts.has(field)) {
    return;
  }

  if (field in target && target[field] !== value) {
    delete target[field];
    conflicts.add(field);
    return;
  }

  target[field] = value;
}

function parseScoreFields(text: string) {
  const score: Partial<Record<ImportScoreField, number>> = {};
  const conflicts = new Set<ImportScoreField>();

  for (const { field, pattern } of SCORE_FIELD_PATTERNS) {
    pattern.lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1]);

      if (Number.isFinite(value)) {
        keepNonConflictingScore(score, field, value, conflicts);
      }
    }
  }

  return score;
}

function parseTextEvidenceLine(line: string) {
  const [namePart, scorePart] = line.split(/:(.+)/).map((part) => part?.trim());

  if (!namePart || !scorePart) {
    return null;
  }

  return {
    name: namePart,
    score: parseScoreFields(scorePart),
  };
}

export function parseImportPlayerScores(input: {
  evidence: ScoreEvidence;
  players: ImportScorePlayer[];
}): LogGameDraftInput['playerScores'] {
  const scores: LogGameDraftInput['playerScores'] = {};

  if (typeof input.evidence === 'string') {
    for (const line of input.evidence.split(/\r?\n/)) {
      const parsedLine = parseTextEvidenceLine(line.trim());

      if (!parsedLine) {
        continue;
      }

      const playerId = resolvePlayerId(parsedLine.name, input.players);

      if (playerId && Object.keys(parsedLine.score).length > 0) {
        scores[playerId] = parsedLine.score;
      }
    }

    return scores;
  }

  for (const playerScore of input.evidence.players ?? []) {
    const playerId = resolvePlayerId(playerScore.name, input.players);

    if (!playerId) {
      continue;
    }

    const populatedScore = Object.fromEntries(
      Object.entries(playerScore).filter(
        ([key, value]) => key !== 'name' && value !== undefined,
      ),
    ) as LogGameDraftInput['playerScores'][string];

    if (Object.keys(populatedScore).length > 0) {
      scores[playerId] = populatedScore;
    }
  }

  return scores;
}
