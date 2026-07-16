import { normalizePlayerAlias } from './normalize-player-alias';

export type ParsedScreenshotPlayerRow = {
  awardPoints?: number;
  cardPointsAnimals?: number;
  cardPointsJovian?: number;
  cardPointsMicrobes?: number;
  cardPointsTotal?: number;
  citiesPoints?: number;
  finalMegacredits?: number;
  greeneryPoints?: number;
  milestonePoints?: number;
  playerName: string;
  totalPoints?: number;
  trPoints?: number;
};

export type ParsedEndgameScoreScreenshot = {
  playerRows: ParsedScreenshotPlayerRow[];
};

type ParsedRowCandidate = {
  confidence: number;
  row: ParsedScreenshotPlayerRow;
};

type ScoreLayout = 'legacy' | 'victory_breakdown';

const CARD_BREAKDOWN_PATTERN =
  /^([A-Za-z][A-Za-z0-9 .'-]*?)\s+Microbes\s+(\d+)\s+Animals\s+(\d+)\s+Jovian\s+(\d+)$/i;

const OCR_TIME_TOKEN_PATTERN = /^\d{1,2}:\d{2}(?::\d{2})?$/;
const OCR_INTEGER_TOKEN_PATTERN = /^\d+$/;
const OCR_TRAILING_INTEGER_PATTERN = /^(\d+)[^\d]+$/;
const STANDALONE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 .'-]*$/;
const OCR_DIGIT_SUBSTITUTIONS: Record<string, string> = {
  B: '8',
  D: '0',
  I: '1',
  O: '0',
  Q: '8',
  S: '5',
  l: '1',
};

function toNumber(value: string) {
  return Number(value);
}

function normalizeOcrLine(line: string) {
  return line.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizePlayerKey(playerName: string) {
  return normalizePlayerAlias(playerName);
}

function parseOcrIntegerToken(token: string) {
  if (OCR_INTEGER_TOKEN_PATTERN.test(token)) {
    return Number(token);
  }

  const trailingIntegerMatch = OCR_TRAILING_INTEGER_PATTERN.exec(token);

  if (trailingIntegerMatch?.[1]) {
    return Number(trailingIntegerMatch[1]);
  }

  const substituted = [...token]
    .map((character) => OCR_DIGIT_SUBSTITUTIONS[character] ?? character)
    .join('');

  if (OCR_INTEGER_TOKEN_PATTERN.test(substituted)) {
    return Number(substituted);
  }

  return null;
}

function countDefinedFields(row: ParsedScreenshotPlayerRow) {
  return Object.entries(row).filter(
    ([field, value]) => field !== 'playerName' && typeof value === 'number',
  ).length;
}

function computeExpectedTotal(row: ParsedScreenshotPlayerRow, layout: ScoreLayout) {
  if (
    typeof row.trPoints !== 'number' ||
    typeof row.greeneryPoints !== 'number' ||
    typeof row.citiesPoints !== 'number' ||
    typeof row.milestonePoints !== 'number' ||
    typeof row.awardPoints !== 'number'
  ) {
    return null;
  }

  if (layout === 'victory_breakdown') {
    if (typeof row.cardPointsTotal !== 'number') {
      return null;
    }

    return (
      row.trPoints +
      row.milestonePoints +
      row.awardPoints +
      row.greeneryPoints +
      row.citiesPoints +
      row.cardPointsTotal
    );
  }

  return (
    row.trPoints +
    row.greeneryPoints +
    row.citiesPoints +
    row.milestonePoints +
    row.awardPoints +
    (row.cardPointsTotal ?? 0)
  );
}

function scoreRowConfidence(row: ParsedScreenshotPlayerRow, layout: ScoreLayout) {
  let confidence = countDefinedFields(row);
  const expectedTotal = computeExpectedTotal(row, layout);

  if (
    typeof row.totalPoints === 'number' &&
    expectedTotal !== null &&
    row.totalPoints === expectedTotal
  ) {
    confidence += 20;
  }

  if (typeof row.finalMegacredits === 'number') {
    confidence += 2;
  }

  return confidence;
}

function mergeRows(
  preferred: ParsedScreenshotPlayerRow,
  fallback: ParsedScreenshotPlayerRow,
): ParsedScreenshotPlayerRow {
  return {
    awardPoints: preferred.awardPoints ?? fallback.awardPoints,
    cardPointsAnimals:
      preferred.cardPointsAnimals ?? fallback.cardPointsAnimals,
    cardPointsJovian:
      preferred.cardPointsJovian ?? fallback.cardPointsJovian,
    cardPointsMicrobes:
      preferred.cardPointsMicrobes ?? fallback.cardPointsMicrobes,
    cardPointsTotal: preferred.cardPointsTotal ?? fallback.cardPointsTotal,
    citiesPoints: preferred.citiesPoints ?? fallback.citiesPoints,
    finalMegacredits:
      preferred.finalMegacredits ?? fallback.finalMegacredits,
    greeneryPoints: preferred.greeneryPoints ?? fallback.greeneryPoints,
    milestonePoints: preferred.milestonePoints ?? fallback.milestonePoints,
    playerName: preferred.playerName,
    totalPoints: preferred.totalPoints ?? fallback.totalPoints,
    trPoints: preferred.trPoints ?? fallback.trPoints,
  };
}

function looksLikeStandalonePlayerName(line: string) {
  return (
    STANDALONE_NAME_PATTERN.test(line) &&
    !/\d/.test(line) &&
    !/^(card points|victory point breakdown)/i.test(line)
  );
}

function collectScoreIntegers(line: string) {
  const tokens = line.split(' ');
  const firstScoreTokenIndex = tokens.findIndex((token) => /\d/.test(token));

  if (firstScoreTokenIndex < 0) {
    return null;
  }

  const textPrefix = tokens.slice(0, firstScoreTokenIndex).join(' ').trim();
  const values: number[] = [];

  for (const token of tokens.slice(firstScoreTokenIndex)) {
    if (OCR_TIME_TOKEN_PATTERN.test(token)) {
      break;
    }

    const parsedInteger = parseOcrIntegerToken(token);

    if (parsedInteger !== null) {
      values.push(parsedInteger);
      continue;
    }

    if (/\d/.test(token)) {
      break;
    }
  }

  return {
    textPrefix,
    values,
  };
}

function buildLegacyRow(
  playerName: string,
  values: number[],
): ParsedScreenshotPlayerRow | null {
  if (values.length >= 8) {
    return {
      awardPoints: values[4],
      cardPointsTotal: values[5],
      citiesPoints: values[2],
      finalMegacredits: values[7],
      greeneryPoints: values[1],
      milestonePoints: values[3],
      playerName,
      totalPoints: values[6],
      trPoints: values[0],
    };
  }

  if (values.length >= 7) {
    const expectedTotalWithCardPoints =
      values[0] + values[1] + values[2] + values[3] + values[4] + values[5];

    if (expectedTotalWithCardPoints === values[6]) {
      return {
        awardPoints: values[4],
        cardPointsTotal: values[5],
        citiesPoints: values[2],
        greeneryPoints: values[1],
        milestonePoints: values[3],
        playerName,
        totalPoints: values[6],
        trPoints: values[0],
      };
    }

    return {
      awardPoints: values[4],
      citiesPoints: values[2],
      finalMegacredits: values[6],
      greeneryPoints: values[1],
      milestonePoints: values[3],
      playerName,
      totalPoints: values[5],
      trPoints: values[0],
    };
  }

  return null;
}

function buildVictoryBreakdownRow(
  playerName: string,
  values: number[],
): ParsedScreenshotPlayerRow | null {
  if (values.length >= 8) {
    return {
      awardPoints: values[2],
      cardPointsTotal: values[5],
      citiesPoints: values[4],
      finalMegacredits: values[7],
      greeneryPoints: values[3],
      milestonePoints: values[1],
      playerName,
      totalPoints: values[6],
      trPoints: values[0],
    };
  }

  if (values.length >= 7) {
    return {
      awardPoints: values[2],
      cardPointsTotal: values[5],
      citiesPoints: values[4],
      greeneryPoints: values[3],
      milestonePoints: values[1],
      playerName,
      totalPoints: values[6],
      trPoints: values[0],
    };
  }

  return null;
}

function parseScoreRow(input: {
  line: string;
  pendingPlayerName: string | null;
  scoreLayout: ScoreLayout;
}): ParsedRowCandidate | null {
  const scoreParts = collectScoreIntegers(input.line);

  if (!scoreParts || scoreParts.values.length < 7) {
    return null;
  }

  const playerName = input.pendingPlayerName ?? scoreParts.textPrefix;

  if (!playerName || !looksLikeStandalonePlayerName(playerName)) {
    return null;
  }

  const row =
    input.scoreLayout === 'victory_breakdown'
      ? buildVictoryBreakdownRow(playerName, scoreParts.values)
      : buildLegacyRow(playerName, scoreParts.values);

  if (!row) {
    return null;
  }

  return {
    confidence: scoreRowConfidence(row, input.scoreLayout),
    row,
  };
}

export function parseEndgameScoreScreenshot(
  ocrLines: string[],
): ParsedEndgameScoreScreenshot {
  const playerRowsByKey = new Map<string, ParsedRowCandidate>();
  const pendingBreakdowns = new Map<
    string,
    Pick<
      ParsedScreenshotPlayerRow,
      'cardPointsAnimals' | 'cardPointsJovian' | 'cardPointsMicrobes'
    >
  >();
  const rowOrder: string[] = [];
  let pendingPlayerName: string | null = null;
  let scoreLayout: ScoreLayout = 'legacy';

  for (const line of ocrLines) {
    const trimmedLine = normalizeOcrLine(line);

    if (!trimmedLine) {
      continue;
    }

    if (/^victory point breakdown after\b/i.test(trimmedLine)) {
      scoreLayout = 'victory_breakdown';
      continue;
    }

    const breakdownMatch = CARD_BREAKDOWN_PATTERN.exec(trimmedLine);

    if (
      breakdownMatch?.[1] &&
      breakdownMatch[2] &&
      breakdownMatch[3] &&
      breakdownMatch[4]
    ) {
      const playerName = breakdownMatch[1].trim();
      const playerKey = normalizePlayerKey(playerName);
      const breakdown = {
        cardPointsAnimals: toNumber(breakdownMatch[3]),
        cardPointsJovian: toNumber(breakdownMatch[4]),
        cardPointsMicrobes: toNumber(breakdownMatch[2]),
      };
      const existingRow = playerRowsByKey.get(playerKey);

      if (existingRow) {
        existingRow.row = mergeRows(existingRow.row, {
          ...breakdown,
          playerName: existingRow.row.playerName,
        });
        continue;
      }

      pendingBreakdowns.set(playerKey, breakdown);
      continue;
    }

    const parsedRow = parseScoreRow({
      line: trimmedLine,
      pendingPlayerName,
      scoreLayout,
    });

    if (parsedRow) {
      const playerKey = normalizePlayerKey(parsedRow.row.playerName);
      const pendingBreakdown = pendingBreakdowns.get(playerKey);

      if (pendingBreakdown) {
        parsedRow.row = mergeRows(parsedRow.row, {
          ...pendingBreakdown,
          playerName: parsedRow.row.playerName,
        });
      }

      const existingRow = playerRowsByKey.get(playerKey);

      if (!existingRow) {
        playerRowsByKey.set(playerKey, parsedRow);
        rowOrder.push(playerKey);
      } else if (parsedRow.confidence > existingRow.confidence) {
        playerRowsByKey.set(playerKey, {
          confidence: parsedRow.confidence,
          row: mergeRows(parsedRow.row, existingRow.row),
        });
      } else {
        playerRowsByKey.set(playerKey, {
          confidence: existingRow.confidence,
          row: mergeRows(existingRow.row, parsedRow.row),
        });
      }

      pendingPlayerName = null;
      continue;
    }

    if (looksLikeStandalonePlayerName(trimmedLine)) {
      pendingPlayerName = trimmedLine;
    }
  }

  return {
    playerRows: rowOrder
      .map((playerKey) => playerRowsByKey.get(playerKey)?.row)
      .filter((row): row is ParsedScreenshotPlayerRow => Boolean(row)),
  };
}
