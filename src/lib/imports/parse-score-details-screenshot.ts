import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedGameLog } from './parse-game-log';

type CardReference = {
  cardName: string;
  id: string;
};

export type ScoreDetailsScreenshotOcrColumn = {
  textLines: string[];
};

export type ParsedScoreDetailsScreenshot = {
  cardScoring: ImportPlayerCardScoringSummary[];
  detectedPlayerNames: string[];
};

type PlayerCardCandidate = {
  cardName: string;
  id: string;
  normalizedName: string;
};

type ParsedColumnCardLine = {
  card: PlayerCardCandidate;
  confidence: number;
  points: number;
};

const NON_CARD_LINE_PATTERN =
  /\b(?:efficiency|milestone|award|claimed|funded by)\b/i;

const SCORE_TOKEN_SUBSTITUTIONS: Record<string, string> = {
  '!': '1',
  '$': '5',
  '(': '1',
  ')': '1',
  '/': '1',
  ':': '1',
  ';': '1',
  I: '1',
  L: '1',
  S: '5',
  '\\': '1',
  f: '1',
  l: '1',
  '|': '1',
};

function normalizeScoreDetailsText(input: string) {
  return normalizePlayerAlias(
    input
      .replace(/[()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function buildUnique<T>(values: T[]) {
  return [...new Set(values)];
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (!left) {
    return right.length;
  }

  if (!right) {
    return left.length;
  }

  const previous = new Array(right.length + 1)
    .fill(0)
    .map((_, index) => index);
  const current = new Array(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
      previous[rightIndex] = current[rightIndex];
    }
  }

  return previous[right.length];
}

function buildPlayedCardsByPlayer(input: {
  cardReferences: CardReference[];
  events: ParsedGameLog['events'];
}) {
  const cardReferenceByNormalizedName = new Map(
    input.cardReferences.map((card) => [
      normalizeScoreDetailsText(card.cardName),
      card,
    ] as const),
  );
  const playedCardsByPlayer = new Map<string, PlayerCardCandidate[]>();

  for (const event of input.events) {
    if (event.eventType !== 'card_played' || !event.actor || !event.card) {
      continue;
    }

    const normalizedCardName = normalizeScoreDetailsText(event.card);
    const cardReference = cardReferenceByNormalizedName.get(normalizedCardName);

    if (!cardReference) {
      continue;
    }

    const playerKey = normalizeScoreDetailsText(event.actor);
    const existingCards = playedCardsByPlayer.get(playerKey) ?? [];

    if (existingCards.some((card) => card.id === cardReference.id)) {
      continue;
    }

    playedCardsByPlayer.set(playerKey, [
      ...existingCards,
      {
        cardName: cardReference.cardName,
        id: cardReference.id,
        normalizedName: normalizedCardName,
      },
    ]);
  }

  return playedCardsByPlayer;
}

function resolveExpectedPlayerName(input: {
  expectedPlayerNames: string[];
  textLines: string[];
  unmatchedPlayers: string[];
}) {
  const normalizedCandidates = buildUnique(
    input.textLines
      .flatMap((line) => {
        const normalizedLine = normalizeScoreDetailsText(line);
        return normalizedLine ? [normalizedLine] : [];
      })
      .filter(Boolean),
  );

  let bestMatch: { distance: number; playerName: string } | null = null;

  for (const playerName of input.unmatchedPlayers) {
    const normalizedPlayerName = normalizeScoreDetailsText(playerName);

    for (const candidate of normalizedCandidates) {
      const distance = levenshteinDistance(candidate, normalizedPlayerName);

      if (distance > 2) {
        continue;
      }

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          distance,
          playerName,
        };
      }
    }
  }

  if (bestMatch) {
    return bestMatch.playerName;
  }

  return input.unmatchedPlayers[0] ?? input.expectedPlayerNames[0] ?? null;
}

function parseScoreToken(token: string) {
  const trimmed = token.trim();

  if (!trimmed) {
    return null;
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (
    /^[-]?[Ss$§9]+$/.test(trimmed) &&
    !trimmed.includes('-')
  ) {
    return 5;
  }

  const substituted = [...trimmed]
    .map((character) => SCORE_TOKEN_SUBSTITUTIONS[character] ?? character)
    .join('')
    .replace(/[^0-9-]/g, '');

  if (/^-?\d+$/.test(substituted)) {
    return Number(substituted);
  }

  return null;
}

function extractScoreLineParts(line: string) {
  const tokens = line.split(/\s+/).filter(Boolean);

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const parsedPoints = parseScoreToken(tokens[index] ?? '');

    if (parsedPoints === null) {
      continue;
    }

    const nameText = tokens.slice(0, index).join(' ').trim();

    if (!nameText) {
      continue;
    }

    return {
      nameText,
      points: parsedPoints,
    };
  }

  return null;
}

function isNonCardLine(line: string) {
  return NON_CARD_LINE_PATTERN.test(line);
}

function scoreCardMatch(input: {
  candidate: PlayerCardCandidate;
  normalizedLineName: string;
}) {
  const distance = levenshteinDistance(
    input.normalizedLineName,
    input.candidate.normalizedName,
  );
  const longestLength = Math.max(
    input.normalizedLineName.length,
    input.candidate.normalizedName.length,
    1,
  );
  const similarity = 1 - distance / longestLength;

  return similarity;
}

function resolveCardFromLine(input: {
  line: string;
  playerCards: PlayerCardCandidate[];
}) {
  if (isNonCardLine(input.line)) {
    return null;
  }

  const scoreLineParts = extractScoreLineParts(input.line);

  if (!scoreLineParts) {
    return null;
  }

  const normalizedLineName = normalizeScoreDetailsText(scoreLineParts.nameText);

  if (!normalizedLineName) {
    return null;
  }

  let bestMatch: ParsedColumnCardLine | null = null;

  for (const playerCard of input.playerCards) {
    const confidence = scoreCardMatch({
      candidate: playerCard,
      normalizedLineName,
    });

    if (confidence < 0.5) {
      continue;
    }

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        card: playerCard,
        confidence,
        points: scoreLineParts.points,
      };
    }
  }

  return bestMatch;
}

function buildPlayerSummary(input: {
  expectedCardPointsTotal?: number;
  matchedCards: ParsedColumnCardLine[];
  playerName: string;
}) {
  const bestMatchByCardId = new Map<
    string,
    { confidence: number; points: number; cardName: string }
  >();

  for (const matchedCard of input.matchedCards) {
    const existingMatch = bestMatchByCardId.get(matchedCard.card.id);

    if (!existingMatch || matchedCard.confidence > existingMatch.confidence) {
      bestMatchByCardId.set(matchedCard.card.id, {
        cardName: matchedCard.card.cardName,
        confidence: matchedCard.confidence,
        points: matchedCard.points,
      });
    }
  }

  const autoScoredCards = [...bestMatchByCardId.entries()]
    .map(([cardId, match]) => ({
      cardId,
      cardName: match.cardName,
      category: 'other' as const,
      evidenceSummary: `Direct score details screenshot: ${match.points} VP.`,
      humanSummary: 'Read from score details screenshot.',
      points: match.points,
      sourceType: 'ocr' as const,
    }))
    .sort((left, right) => left.cardName.localeCompare(right.cardName));
  const total = autoScoredCards.reduce((sum, card) => sum + card.points, 0);

  return {
    autoScoredCards,
    pendingCards: [],
    playerName: input.playerName,
    totals: {
      animals: 0,
      complete:
        typeof input.expectedCardPointsTotal === 'number'
          ? total === input.expectedCardPointsTotal
          : false,
      jovian: 0,
      microbes: 0,
      other: total,
      total,
    },
  } satisfies ImportPlayerCardScoringSummary;
}

export function parseScoreDetailsScreenshot(input: {
  cardReferences: CardReference[];
  events: ParsedGameLog['events'];
  expectedCardPointTotalsByPlayerName?: Record<string, number>;
  expectedPlayerNames: string[];
  ocrColumns: ScoreDetailsScreenshotOcrColumn[];
}): ParsedScoreDetailsScreenshot {
  const playedCardsByPlayer = buildPlayedCardsByPlayer({
    cardReferences: input.cardReferences,
    events: input.events,
  });
  const detectedPlayerNames: string[] = [];
  const unmatchedPlayers = [...input.expectedPlayerNames];
  const cardScoring: ImportPlayerCardScoringSummary[] = [];

  for (const column of input.ocrColumns) {
    const playerName = resolveExpectedPlayerName({
      expectedPlayerNames: input.expectedPlayerNames,
      textLines: column.textLines,
      unmatchedPlayers,
    });

    if (!playerName) {
      continue;
    }

    const playerKey = normalizeScoreDetailsText(playerName);
    const playerCards = playedCardsByPlayer.get(playerKey) ?? [];

    if (playerCards.length === 0) {
      continue;
    }

    detectedPlayerNames.push(playerName);
    const unmatchedPlayerIndex = unmatchedPlayers.indexOf(playerName);

    if (unmatchedPlayerIndex >= 0) {
      unmatchedPlayers.splice(unmatchedPlayerIndex, 1);
    }

    const matchedCards = column.textLines.flatMap((line) => {
      const matchedCard = resolveCardFromLine({
        line,
        playerCards,
      });

      return matchedCard ? [matchedCard] : [];
    });

    if (matchedCards.length === 0) {
      continue;
    }

    cardScoring.push(
      buildPlayerSummary({
        expectedCardPointsTotal:
          input.expectedCardPointTotalsByPlayerName?.[playerName],
        matchedCards,
        playerName,
      }),
    );
  }

  return {
    cardScoring: cardScoring.sort((left, right) =>
      left.playerName.localeCompare(right.playerName),
    ),
    detectedPlayerNames,
  };
}
