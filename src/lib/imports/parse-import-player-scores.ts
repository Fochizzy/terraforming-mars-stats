import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { normalizePlayerAlias } from './normalize-player-alias';

export type ImportScoreField =
  | 'citiesPoints'
  | 'greeneryPoints'
  | 'cardPointsTotal'
  | 'cardPointsMicrobes'
  | 'cardPointsAnimals'
  | 'cardPointsJovian'
  | 'trPoints'
  | 'milestonePoints'
  | 'awardPoints'
  | 'totalPoints'
  | 'finalMegacredits'
  | 'heatActions';

export type ImportScorePlayer = {
  id?: string;
  name: string;
  playerId?: string;
} & Partial<Record<ImportScoreField, number>>;

export type StructuredImportScoreEvidence = {
  players: ImportScorePlayer[];
};

export type ParseImportPlayerScoresInput = {
  evidence: StructuredImportScoreEvidence | string;
  players: Array<{ id: string; name: string }>;
};

type ScoreObservation = {
  conflicted: boolean;
  values: Set<number>;
};

type ParsedTextScores = Record<
  string,
  Partial<Record<ImportScoreField, ScoreObservation>>
>;

type ScoreMatchCandidate = {
  end: number;
  field: ImportScoreField;
  specificity: number;
  start: number;
  value: number;
};

const scoreFields: ReadonlyArray<ImportScoreField> = [
  'citiesPoints',
  'greeneryPoints',
  'cardPointsTotal',
  'cardPointsMicrobes',
  'cardPointsAnimals',
  'cardPointsJovian',
  'trPoints',
  'milestonePoints',
  'awardPoints',
  'totalPoints',
  'finalMegacredits',
  'heatActions',
];

const fieldPatterns: Record<ImportScoreField, { aliases: string[] }> = {
  awardPoints: { aliases: ['award points', 'awards', 'award'] },
  cardPointsAnimals: { aliases: ['animal points', 'animals points', 'animals'] },
  cardPointsJovian: { aliases: ['jovian points', 'jovian'] },
  cardPointsMicrobes: { aliases: ['microbe points', 'microbes points', 'microbes'] },
  cardPointsTotal: {
    aliases: [
      'vp',
      'total card points',
      'card points total',
      'card points',
      'cards',
      'card',
    ],
  },
  citiesPoints: { aliases: ['cities points', 'city points', 'cities', 'city'] },
  finalMegacredits: {
    aliases: [
      'final megacredits',
      'megacredits',
      'final mc',
      'mc',
      'm€',
      'mã¢â€šâ¬',
    ],
  },
  greeneryPoints: { aliases: ['greenery points', 'greenery'] },
  heatActions: { aliases: ['heat actions', 'temperature raises', 'heat raises', 'heat'] },
  milestonePoints: { aliases: ['milestone points', 'milestones', 'milestone'] },
  totalPoints: { aliases: ['total points', 'total'] },
  trPoints: { aliases: ['terraform rating', 'tr'] },
};

function normalizeImportToken(input: string) {
  return normalizePlayerAlias(input).replace(/\s+/g, ' ');
}

// The community app closes its exported log with a machine-written block:
//   Final scores:
//   Player: Izzy, Total: 115, TR: 35, Milestones: 10, Awards: 10, ...
// Keys are matched after stripping everything but ASCII letters so currency
// mojibake ("M€", "MÃ¢â€šÂ¬") still resolves to the megacredits column.
const finalScoreFieldByKey: Record<string, ImportScoreField> = {
  award: 'awardPoints',
  awards: 'awardPoints',
  city: 'citiesPoints',
  cities: 'citiesPoints',
  greenery: 'greeneryPoints',
  heat: 'heatActions',
  heatactions: 'heatActions',
  heatraises: 'heatActions',
  m: 'finalMegacredits',
  mc: 'finalMegacredits',
  milestone: 'milestonePoints',
  milestones: 'milestonePoints',
  temperatureraises: 'heatActions',
  total: 'totalPoints',
  tr: 'trPoints',
  vp: 'cardPointsTotal',
};

function parseFinalScoreLine(line: string) {
  const parts = line.split(',').map((part) => part.split(':'));
  const [firstKey, ...firstValue] = parts[0] ?? [];

  if (!firstKey || firstKey.trim().toLowerCase() !== 'player') {
    return null;
  }

  const playerName = firstValue.join(':').trim();
  const fields: Partial<Record<ImportScoreField, number>> = {};

  for (const [key, ...valueParts] of parts.slice(1)) {
    const normalizedKey = (key ?? '').toLowerCase().replace(/[^a-z]/g, '');
    const field = finalScoreFieldByKey[normalizedKey];
    const value = Number(valueParts.join(':').trim());

    if (field && isValidScoreValue(value)) {
      fields[field] = value;
    }
  }

  // A real final-scores row names several columns; fewer mapped fields means
  // this "Player:" line was chat or some other coincidence — ignore it.
  return playerName && Object.keys(fields).length >= 3
    ? { fields, playerName }
    : null;
}

function collectStructuredLogScores(
  players: Array<{ id: string; name: string }>,
  evidence: string,
): LogGameDraftInput['playerScores'] {
  const scores: LogGameDraftInput['playerScores'] = {};

  for (const rawLine of evidence.split(/\r?\n/)) {
    const parsedLine = parseFinalScoreLine(rawLine.trim());

    if (!parsedLine) {
      continue;
    }

    const playerId = resolvePlayerIdByName(players, parsedLine.playerName);

    if (playerId) {
      scores[playerId] = { ...scores[playerId], ...parsedLine.fields };
    }
  }

  return scores;
}

export function extractStructuredLogScores(
  input: ParseImportPlayerScoresInput,
): LogGameDraftInput['playerScores'] {
  return typeof input.evidence === 'string'
    ? collectStructuredLogScores(input.players, input.evidence)
    : {};
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidScoreValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 999
  );
}

function createObservation(): ScoreObservation {
  return {
    conflicted: false,
    values: new Set<number>(),
  };
}

function observeValue(
  fields: Partial<Record<ImportScoreField, ScoreObservation>>,
  field: ImportScoreField,
  value: number,
) {
  const observation = fields[field] ?? createObservation();

  if (observation.conflicted) {
    fields[field] = observation;
    return;
  }

  if (observation.values.size === 0 || observation.values.has(value)) {
    observation.values.add(value);
  } else {
    observation.values.clear();
    observation.conflicted = true;
  }

  fields[field] = observation;
}

function materializeObservations(
  observations: Partial<Record<ImportScoreField, ScoreObservation>>,
) {
  const output: Partial<Record<ImportScoreField, number>> = {};

  for (const field of scoreFields) {
    const observation = observations[field];

    if (!observation || observation.conflicted || observation.values.size !== 1) {
      continue;
    }

    const value = [...observation.values][0];

    if (value !== undefined) {
      output[field] = value;
    }
  }

  return output;
}

function resolvePlayerIdByName(
  players: Array<{ id: string; name: string }>,
  name: string,
) {
  const normalizedName = normalizeImportToken(name);
  const matches = players.filter(
    (player) => normalizeImportToken(player.name) === normalizedName,
  );

  return matches.length === 1 ? matches[0]!.id : '';
}

function resolvePlayerId(
  players: Array<{ id: string; name: string }>,
  row: ImportScorePlayer,
) {
  const explicitId = row.playerId?.trim() || row.id?.trim() || '';

  if (explicitId && players.some((player) => player.id === explicitId)) {
    return explicitId;
  }

  return resolvePlayerIdByName(players, row.name);
}

function parseStructuredEvidence(
  players: Array<{ id: string; name: string }>,
  evidence: StructuredImportScoreEvidence,
): LogGameDraftInput['playerScores'] {
  const observations: Record<
    string,
    Partial<Record<ImportScoreField, ScoreObservation>>
  > = {};

  for (const row of evidence.players) {
    const playerId = resolvePlayerId(players, row);

    if (!playerId) {
      continue;
    }

    const playerObservations = observations[playerId] ?? {};

    for (const field of scoreFields) {
      const value = row[field];

      if (!isValidScoreValue(value)) {
        continue;
      }

      observeValue(playerObservations, field, value);
    }

    observations[playerId] = playerObservations;
  }

  return Object.fromEntries(
    Object.entries(observations).flatMap(([playerId, playerObservations]) => {
      const compacted = materializeObservations(playerObservations);

      return Object.keys(compacted).length > 0
        ? [[playerId, compacted] as const]
        : [];
    }),
  );
}

function buildFieldMatchers(field: ImportScoreField) {
  const aliases = fieldPatterns[field].aliases;
  const escaped = aliases
    .slice()
    .sort((left, right) => right.length - left.length)
    .map((alias) => escapeRegExp(alias));

  const matchers = escaped.flatMap((alias) => [
    new RegExp(`\\b(${alias})\\s*:?\\s*([0-9]{1,3})\\b`, 'gi'),
    new RegExp(`\\b([0-9]{1,3})\\s*:?\\s*(${alias})\\b`, 'gi'),
  ]);

  if (field !== 'finalMegacredits') {
    return matchers;
  }

  return [
    ...matchers,
    /(?:^|[\s(])((?:m(?:c|Ã¢â€šÂ¬|â€šÂ¬|€)))\s*:?\s*([0-9]{1,3})(?:$|[\s)])/gi,
    /(?:^|[\s(])([0-9]{1,3})\s*:?\s*((?:m(?:c|Ã¢â€šÂ¬|â€šÂ¬|€)))(?:$|[\s)])/gi,
    /(?:^|[\s(])(m[^0-9a-z]{2,})\s*:?\s*([0-9]{1,3})(?:$|[\s)])/gi,
    /(?:^|[\s(])([0-9]{1,3})\s*:?\s*(m[^0-9a-z]{2,})(?:$|[\s)])/gi,
  ];
}

const fieldMatchers: Record<ImportScoreField, RegExp[]> = Object.fromEntries(
  scoreFields.map((field) => [field, buildFieldMatchers(field)]),
) as Record<ImportScoreField, RegExp[]>;

function overlaps(left: ScoreMatchCandidate, right: ScoreMatchCandidate) {
  return left.start < right.end && right.start < left.end;
}

function collectClauseScoreCandidates(clause: string) {
  const candidates: ScoreMatchCandidate[] = [];

  for (const field of scoreFields) {
    for (const matcher of fieldMatchers[field]) {
      matcher.lastIndex = 0;

      for (const match of clause.matchAll(matcher)) {
        const valueText = match[2] ?? match[1];
        const value = Number(valueText);

        if (!isValidScoreValue(value)) {
          continue;
        }

        const start = match.index ?? 0;
        const end = start + match[0].length;

        candidates.push({
          end,
          field,
          specificity: match[0].length,
          start,
          value,
        });
      }
    }
  }

  return candidates;
}

function selectClauseScoreCandidates(candidates: ScoreMatchCandidate[]) {
  const accepted: ScoreMatchCandidate[] = [];

  for (const candidate of candidates.sort(
    (left, right) =>
      right.specificity - left.specificity || left.start - right.start,
  )) {
    if (accepted.some((acceptedCandidate) => overlaps(candidate, acceptedCandidate))) {
      continue;
    }

    accepted.push(candidate);
  }

  return accepted;
}

function collectTextScoreObservations(
  clause: string,
  playerId: string,
  scores: ParsedTextScores,
) {
  const playerScores = scores[playerId] ?? {};
  const candidates = selectClauseScoreCandidates(
    collectClauseScoreCandidates(clause),
  );

  for (const candidate of candidates) {
    observeValue(playerScores, candidate.field, candidate.value);
  }

  scores[playerId] = playerScores;
}

function parseTextEvidence(
  players: Array<{ id: string; name: string }>,
  evidence: string,
): LogGameDraftInput['playerScores'] {
  // A machine-written final-scores row beats scraping loose "<n> TR" or
  // "bought 2 card(s)" mentions, which otherwise register false conflicts.
  const structuredScores = collectStructuredLogScores(players, evidence);
  const normalizedPlayers = players.map((player) => {
    const token = normalizeImportToken(player.name);

    return {
      id: player.id,
      tokenMatcher: new RegExp(`(?:^|\\s)${escapeRegExp(token)}(?:\\s|$)`),
    };
  });
  const scores: ParsedTextScores = {};

  for (const rawLine of evidence.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const normalizedLine = normalizeImportToken(line);
    const matches = normalizedPlayers.filter(({ tokenMatcher }) =>
      tokenMatcher.test(normalizedLine),
    );

    if (matches.length !== 1) {
      continue;
    }

    for (const clause of line.split(/[;,]/)) {
      const trimmedClause = clause.trim();

      if (!trimmedClause) {
        continue;
      }

      collectTextScoreObservations(trimmedClause, matches[0]!.id, scores);
    }
  }

  const scrapedScores = Object.fromEntries(
    Object.entries(scores).flatMap(([playerId, playerObservations]) => {
      const compacted = materializeObservations(playerObservations);

      return Object.keys(compacted).length > 0
        ? [[playerId, compacted] as const]
        : [];
    }),
  );

  const playerIds = new Set([
    ...Object.keys(scrapedScores),
    ...Object.keys(structuredScores),
  ]);

  return Object.fromEntries(
    [...playerIds].map((playerId) => [
      playerId,
      structuredScores[playerId] ?? scrapedScores[playerId] ?? {},
    ]),
  );
}

export function parseImportPlayerScores(
  input: ParseImportPlayerScoresInput,
): LogGameDraftInput['playerScores'] {
  if (typeof input.evidence === 'string') {
    return parseTextEvidence(input.players, input.evidence);
  }

  return parseStructuredEvidence(input.players, input.evidence);
}
