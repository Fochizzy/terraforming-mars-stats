import { buildPlayerNameMatchKeys } from './build-player-name-match-keys';
import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedGameLog } from './parse-game-log';

type CardReference = {
  cardName: string;
  id: string;
  sourceTags?: string[];
};

type CardCategory = 'animals' | 'jovian' | 'microbes' | 'other';

// Cards whose endgame VP land in the microbe/animal/jovian buckets carry the
// matching tag, so the tag is a reliable category signal for screenshot
// evidence; the resulting totals are still validated against the score table.
function deriveCardCategory(sourceTags?: string[]): CardCategory {
  const normalizedTags = (sourceTags ?? []).map((tag) => tag.toLowerCase());

  if (normalizedTags.some((tag) => tag.startsWith('microbe'))) {
    return 'microbes';
  }

  if (normalizedTags.some((tag) => tag.startsWith('animal'))) {
    return 'animals';
  }

  if (normalizedTags.some((tag) => tag.startsWith('jovian'))) {
    return 'jovian';
  }

  return 'other';
}

export type ScoreDetailsScreenshotOcrColumn = {
  textLines: string[];
};

export type ParsedScreenshotMilestoneClaim = {
  matchedMilestoneId: string | null;
  milestoneName: string;
  playerName: string;
  points: number;
};

export type ParsedScreenshotAwardPlacement = {
  awardName: string;
  fundedByPlayerName: string | null;
  matchedAwardId: string | null;
  placement: 1 | 2;
  playerName: string;
  points: number;
};

export type ParsedScreenshotEfficiency = {
  efficiency: number;
  playerName: string;
};

export type ParsedScoreDetailsScreenshot = {
  awardPlacements: ParsedScreenshotAwardPlacement[];
  cardScoring: ImportPlayerCardScoringSummary[];
  detectedPlayerNames: string[];
  efficiencies: ParsedScreenshotEfficiency[];
  milestoneClaims: ParsedScreenshotMilestoneClaim[];
};

type PlayerCardCandidate = {
  cardName: string;
  category: CardCategory;
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
        category: deriveCardCategory(cardReference.sourceTags),
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

  // The column header prints the in-game name, which may be the leading token
  // of the participant name the caller passed in.
  for (const player of buildPlayerNameMatchKeys(input.unmatchedPlayers)) {
    for (const key of player.keys) {
      for (const candidate of normalizedCandidates) {
        const distance = levenshteinDistance(candidate, key);

        if (distance > 2) {
          continue;
        }

        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = {
            distance,
            playerName: player.playerName,
          };
        }
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

type ScoreReference = {
  id: string;
  name: string;
};

const MILESTONE_LINE_PATTERN = /^claimed\s+(.+)$/i;
const AWARD_LINE_PATTERN = /^(1st|2nd|first|second)\s+place\s+for\s+(.+)$/i;
const FUNDED_BY_PATTERN = /funded\s+by\s+([A-Za-z][A-Za-z0-9 .'-]*?)\)?\s*$/i;
// The gap must not absorb the sign, so it only allows separator characters.
// A decimal part is required: OCR passes that drop the dot ("+043") would
// otherwise be read as implausible whole numbers.
const EFFICIENCY_PATTERN = /efficiency[:;\s]{0,3}([+\-−]?\d+[.,]\d+)/i;

// Trailing bracket noise ("5)" / "S)") must be stripped before digit repair,
// otherwise ")" itself gets repaired into a digit.
function parseDetailPointsToken(token: string) {
  return parseScoreToken(token.replace(/[)\]}.,;:]+$/, ''));
}

function extractDetailLineParts(text: string) {
  const tokens = text.split(/\s+/).filter(Boolean);

  if (tokens.length < 2) {
    return null;
  }

  const points = parseDetailPointsToken(tokens[tokens.length - 1] ?? '');
  const nameText = tokens.slice(0, -1).join(' ').trim();

  if (!nameText) {
    return null;
  }

  return {
    nameText,
    points,
  };
}

function matchScoreReference(input: {
  nameText: string;
  references: ScoreReference[];
}) {
  const normalizedName = normalizeScoreDetailsText(input.nameText);

  if (!normalizedName) {
    return null;
  }

  let bestMatch: { reference: ScoreReference; similarity: number } | null =
    null;

  for (const reference of input.references) {
    const normalizedReference = normalizeScoreDetailsText(reference.name);
    const distance = levenshteinDistance(normalizedName, normalizedReference);
    const longestLength = Math.max(
      normalizedName.length,
      normalizedReference.length,
      1,
    );
    const similarity = 1 - distance / longestLength;

    if (similarity < 0.6) {
      continue;
    }

    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { reference, similarity };
    }
  }

  return bestMatch?.reference ?? null;
}

type DetailClaimCandidate = {
  fundedByPlayerName?: string | null;
  key: string;
  matchedId: string | null;
  name: string;
  placement?: 1 | 2;
  pointCandidates: number[];
  standardPoints: number;
};

/**
 * Chooses per-claim point values so they sum to the milestone/award total
 * from the endgame score table: a unique combination of observed OCR values
 * wins; otherwise the standard values (5 per milestone, 5/2 per award
 * placement) are used when they explain the total.
 */
function resolveClaimPoints(input: {
  claims: DetailClaimCandidate[];
  expectedTotal?: number;
}) {
  const optionsPerClaim = input.claims.map((claim) => {
    const uniqueCandidates = buildUnique(claim.pointCandidates);

    return uniqueCandidates.length > 0
      ? uniqueCandidates
      : [claim.standardPoints];
  });

  if (typeof input.expectedTotal === 'number') {
    const combinationCount = optionsPerClaim.reduce(
      (count, options) => count * options.length,
      1,
    );

    if (combinationCount <= 256) {
      let combinations: number[][] = [[]];

      for (const options of optionsPerClaim) {
        combinations = combinations.flatMap((combination) =>
          options.map((value) => [...combination, value]),
        );
      }

      const matching = combinations.filter(
        (combination) =>
          combination.reduce((sum, value) => sum + value, 0) ===
          input.expectedTotal,
      );

      if (matching.length === 1) {
        return matching[0];
      }
    }

    const standardTotal = input.claims.reduce(
      (sum, claim) => sum + claim.standardPoints,
      0,
    );

    if (standardTotal === input.expectedTotal) {
      return input.claims.map((claim) => claim.standardPoints);
    }
  }

  return optionsPerClaim.map((options) => options[0]);
}

function collectColumnDetailClaims(input: {
  awardReferences: ScoreReference[];
  milestoneReferences: ScoreReference[];
  textLines: string[];
}) {
  const milestoneByKey = new Map<string, DetailClaimCandidate>();
  const awardByKey = new Map<string, DetailClaimCandidate>();
  let efficiency: number | null = null;
  let lastAwardKey: string | null = null;

  input.textLines.forEach((line, lineIndex) => {
    const efficiencyMatch = EFFICIENCY_PATTERN.exec(line);

    if (efficiencyMatch?.[1] && efficiency === null) {
      const normalizedValue = efficiencyMatch[1]
        .replace('−', '-')
        .replace(',', '.');
      const parsedValue = Number(normalizedValue);

      if (Number.isFinite(parsedValue)) {
        efficiency = parsedValue;
      }

      return;
    }

    const milestoneMatch = MILESTONE_LINE_PATTERN.exec(line.trim());

    if (milestoneMatch?.[1]) {
      const strippedMilestoneText = milestoneMatch[1]
        .replace(/\bmilestones?\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const lineParts =
        extractDetailLineParts(strippedMilestoneText) ??
        (/[a-z]/i.test(strippedMilestoneText)
          ? { nameText: strippedMilestoneText, points: null }
          : null);

      if (!lineParts) {
        return;
      }

      const matchedReference = matchScoreReference({
        nameText: lineParts.nameText,
        references: input.milestoneReferences,
      });
      const key =
        matchedReference?.id ?? normalizeScoreDetailsText(lineParts.nameText);

      if (!key) {
        return;
      }

      const existingClaim = milestoneByKey.get(key) ?? {
        key,
        matchedId: matchedReference?.id ?? null,
        name: matchedReference?.name ?? lineParts.nameText,
        pointCandidates: [],
        standardPoints: 5,
      };

      if (lineParts.points !== null) {
        existingClaim.pointCandidates.push(lineParts.points);
      }

      milestoneByKey.set(key, existingClaim);

      return;
    }

    const awardMatch = AWARD_LINE_PATTERN.exec(line.trim());

    if (awardMatch?.[1] && awardMatch[2]) {
      const placement: 1 | 2 = /^(1st|first)$/i.test(awardMatch[1]) ? 1 : 2;
      // Short award names ("Miner") keep the word "award" and the points on
      // the same OCR line, so only the funded-by fragment and the word
      // itself can be stripped — a trailing points token must survive. When
      // no points token is present the claim is still kept: resolveClaimPoints
      // falls back to the standard placement points.
      const strippedAwardText = awardMatch[2]
        .replace(/\(?\s*funded\s+by\b[^)]*\)?/gi, ' ')
        .replace(/\bawards?\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const lineParts =
        extractDetailLineParts(strippedAwardText) ??
        (/[a-z]/i.test(strippedAwardText)
          ? { nameText: strippedAwardText, points: null }
          : null);

      if (!lineParts) {
        return;
      }

      const matchedReference = matchScoreReference({
        nameText: lineParts.nameText,
        references: input.awardReferences,
      });
      const normalizedKey =
        matchedReference?.id ?? normalizeScoreDetailsText(lineParts.nameText);

      if (!normalizedKey) {
        return;
      }

      const key = `${normalizedKey}#${placement}`;
      const existingClaim = awardByKey.get(key) ?? {
        fundedByPlayerName: null,
        key,
        matchedId: matchedReference?.id ?? null,
        name: matchedReference?.name ?? lineParts.nameText,
        placement,
        pointCandidates: [],
        standardPoints: placement === 1 ? 5 : 2,
      };

      if (lineParts.points !== null) {
        existingClaim.pointCandidates.push(lineParts.points);
      }

      // The "(funded by X)" fragment usually wraps onto the next OCR line.
      const followingLine = input.textLines[lineIndex + 1] ?? '';
      const fundedByMatch =
        FUNDED_BY_PATTERN.exec(line) ?? FUNDED_BY_PATTERN.exec(followingLine);

      if (fundedByMatch?.[1] && !existingClaim.fundedByPlayerName) {
        existingClaim.fundedByPlayerName = fundedByMatch[1].trim();
      }

      awardByKey.set(key, existingClaim);
      lastAwardKey = key;

      return;
    }

    const trailingFundedByMatch = FUNDED_BY_PATTERN.exec(line);

    if (trailingFundedByMatch?.[1] && lastAwardKey) {
      const pendingAward = awardByKey.get(lastAwardKey);

      if (pendingAward && !pendingAward.fundedByPlayerName) {
        pendingAward.fundedByPlayerName = trailingFundedByMatch[1].trim();
      }
    }
  });

  return {
    awards: [...awardByKey.values()],
    efficiency: efficiency as number | null,
    milestones: [...milestoneByKey.values()],
  };
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
    { cardName: string; category: CardCategory; confidence: number; points: number }
  >();

  for (const matchedCard of input.matchedCards) {
    const existingMatch = bestMatchByCardId.get(matchedCard.card.id);

    if (!existingMatch || matchedCard.confidence > existingMatch.confidence) {
      bestMatchByCardId.set(matchedCard.card.id, {
        cardName: matchedCard.card.cardName,
        category: matchedCard.card.category,
        confidence: matchedCard.confidence,
        points: matchedCard.points,
      });
    }
  }

  const autoScoredCards = [...bestMatchByCardId.entries()]
    .map(([cardId, match]) => ({
      cardId,
      cardName: match.cardName,
      category: match.category,
      evidenceSummary: `Direct score details screenshot: ${match.points} VP.`,
      humanSummary: 'Read from score details screenshot.',
      points: match.points,
      sourceType: 'ocr' as const,
    }))
    .sort((left, right) => left.cardName.localeCompare(right.cardName));
  const totals = {
    animals: 0,
    complete: false,
    jovian: 0,
    microbes: 0,
    other: 0,
    total: 0,
  };

  for (const card of autoScoredCards) {
    totals[card.category] += card.points;
    totals.total += card.points;
  }

  totals.complete =
    typeof input.expectedCardPointsTotal === 'number'
      ? totals.total === input.expectedCardPointsTotal
      : false;

  return {
    autoScoredCards,
    pendingCards: [],
    playerName: input.playerName,
    totals,
  } satisfies ImportPlayerCardScoringSummary;
}

function findPlayedCards(input: {
  playedCardsByPlayer: Map<string, PlayerCardCandidate[]>;
  playerName: string;
}) {
  const normalizedName = normalizeScoreDetailsText(input.playerName);
  const leadingToken = normalizedName.split(' ')[0] ?? '';

  return (
    input.playedCardsByPlayer.get(normalizedName) ??
    input.playedCardsByPlayer.get(leadingToken) ??
    []
  );
}

export function parseScoreDetailsScreenshot(input: {
  awardReferences?: ScoreReference[];
  cardReferences: CardReference[];
  events: ParsedGameLog['events'];
  expectedAwardPointsByPlayerName?: Record<string, number>;
  expectedCardPointTotalsByPlayerName?: Record<string, number>;
  expectedMilestonePointsByPlayerName?: Record<string, number>;
  expectedPlayerNames: string[];
  milestoneReferences?: ScoreReference[];
  ocrColumns: ScoreDetailsScreenshotOcrColumn[];
}): ParsedScoreDetailsScreenshot {
  const playedCardsByPlayer = buildPlayedCardsByPlayer({
    cardReferences: input.cardReferences,
    events: input.events,
  });
  const detectedPlayerNames: string[] = [];
  const unmatchedPlayers = [...input.expectedPlayerNames];
  const cardScoring: ImportPlayerCardScoringSummary[] = [];
  const milestoneClaims: ParsedScreenshotMilestoneClaim[] = [];
  const awardPlacements: ParsedScreenshotAwardPlacement[] = [];
  const efficiencies: ParsedScreenshotEfficiency[] = [];

  for (const column of input.ocrColumns) {
    const playerName = resolveExpectedPlayerName({
      expectedPlayerNames: input.expectedPlayerNames,
      textLines: column.textLines,
      unmatchedPlayers,
    });

    if (!playerName) {
      continue;
    }

    // Cards are keyed by the actor name the log uses ("Izzy"), which may be the
    // leading token of the participant name ("Izzy Hodnett").
    const playerCards = findPlayedCards({
      playedCardsByPlayer,
      playerName,
    });
    const detailClaims = collectColumnDetailClaims({
      awardReferences: input.awardReferences ?? [],
      milestoneReferences: input.milestoneReferences ?? [],
      textLines: column.textLines,
    });
    const milestonePoints = resolveClaimPoints({
      claims: detailClaims.milestones,
      expectedTotal: input.expectedMilestonePointsByPlayerName?.[playerName],
    });
    const awardPoints = resolveClaimPoints({
      claims: detailClaims.awards,
      expectedTotal: input.expectedAwardPointsByPlayerName?.[playerName],
    });

    detailClaims.milestones.forEach((claim, claimIndex) => {
      milestoneClaims.push({
        matchedMilestoneId: claim.matchedId,
        milestoneName: claim.name,
        playerName,
        points: milestonePoints[claimIndex],
      });
    });
    detailClaims.awards.forEach((claim, claimIndex) => {
      awardPlacements.push({
        awardName: claim.name,
        fundedByPlayerName: claim.fundedByPlayerName ?? null,
        matchedAwardId: claim.matchedId,
        placement: claim.placement ?? 1,
        playerName,
        points: awardPoints[claimIndex],
      });
    });

    if (detailClaims.efficiency !== null) {
      efficiencies.push({
        efficiency: detailClaims.efficiency,
        playerName,
      });
    }

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

    if (matchedCards.length > 0) {
      cardScoring.push(
        buildPlayerSummary({
          expectedCardPointsTotal:
            input.expectedCardPointTotalsByPlayerName?.[playerName],
          matchedCards,
          playerName,
        }),
      );
    }
  }

  return {
    awardPlacements,
    cardScoring: cardScoring.sort((left, right) =>
      left.playerName.localeCompare(right.playerName),
    ),
    detectedPlayerNames,
    efficiencies,
    milestoneClaims,
  };
}
