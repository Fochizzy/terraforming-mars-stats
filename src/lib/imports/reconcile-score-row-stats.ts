/**
 * A score row's six stat columns always sum to its total, which turns the total
 * into a checksum. Low-resolution captures put the digits at Tesseract's limit,
 * where no single OCR pass reads a whole row correctly but each column is read
 * correctly by *some* pass. Recognising the row at several scales and
 * thresholds and then picking the one combination that satisfies the checksum
 * recovers rows that every individual pass gets wrong.
 */
export type ReconciledScoreRowStats = {
  stats: number[];
  totalPoints: number;
};

const STAT_COLUMN_COUNT = 6;
const TOTAL_INDEX = STAT_COLUMN_COUNT;
const MAX_TOKENS = STAT_COLUMN_COUNT + 2;
const MAX_STAT_VALUE = 200;
const MAX_TOTAL_VALUE = 999;
const MIN_PARSED_TOKENS = 5;
const MAX_WILDCARDS = 2;
const MAX_COMBINATIONS = 4096;

const OCR_TIME_TOKEN_PATTERN = /^\d{1,2}:\d{2}/;
const OCR_INTEGER_PATTERN = /^\d+$/;
const OCR_DIGIT_SUBSTITUTIONS: Record<string, string> = {
  B: '8',
  D: '0',
  I: '1',
  O: '0',
  Q: '8',
  S: '5',
  l: '1',
};

/**
 * `null` marks a token that holds a digit Tesseract could not resolve; dropping
 * it instead would shift every later column into the wrong position.
 */
type StatToken = number | null;

function parseStatToken(token: string): StatToken | undefined {
  const cleaned = token.replace(/[^0-9A-Za-z]/g, '');

  if (!cleaned) {
    return undefined;
  }

  if (OCR_INTEGER_PATTERN.test(cleaned)) {
    return Number(cleaned);
  }

  const substituted = [...cleaned]
    .map((character) => OCR_DIGIT_SUBSTITUTIONS[character] ?? character)
    .join('');

  return OCR_INTEGER_PATTERN.test(substituted) ? Number(substituted) : null;
}

function tokenizeStatLine(line: string) {
  const tokens: StatToken[] = [];

  for (const rawToken of line.split(/\s+/).filter(Boolean)) {
    // The elapsed-time column ends the numeric run.
    if (OCR_TIME_TOKEN_PATTERN.test(rawToken)) {
      break;
    }

    const token = parseStatToken(rawToken);

    if (token === undefined) {
      continue;
    }

    tokens.push(token);

    if (tokens.length >= MAX_TOKENS) {
      break;
    }
  }

  return tokens;
}

function isUsablePass(tokens: StatToken[]) {
  const parsedCount = tokens.filter((token) => token !== null).length;
  const wildcardCount = tokens.length - parsedCount;

  return (
    tokens.length > TOTAL_INDEX &&
    parsedCount >= MIN_PARSED_TOKENS &&
    wildcardCount <= MAX_WILDCARDS
  );
}

function tallyValue(counts: Map<number, number>, value: number) {
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function pickMostFrequent(counts: Map<number, number>) {
  return (
    [...counts].sort(
      (left, right) => right[1] - left[1] || left[0] - right[0],
    )[0] ?? null
  );
}


export function reconcileScoreRowStats(
  statLines: string[],
): ReconciledScoreRowStats | null {
  const passes = statLines.map(tokenizeStatLine).filter(isUsablePass);

  if (passes.length === 0) {
    return null;
  }

  const statCandidates = Array.from(
    { length: STAT_COLUMN_COUNT },
    () => new Map<number, number>(),
  );
  const totalCandidates = new Map<number, number>();

  for (const pass of passes) {
    for (let index = 0; index < STAT_COLUMN_COUNT; index += 1) {
      const value = pass[index];

      if (typeof value === 'number' && value >= 0 && value <= MAX_STAT_VALUE) {
        tallyValue(statCandidates[index], value);
      }
    }

    const total = pass[TOTAL_INDEX];

    if (typeof total === 'number' && total >= 0 && total <= MAX_TOTAL_VALUE) {
      tallyValue(totalCandidates, total);
    }
  }

  const totalPoints = pickMostFrequent(totalCandidates)?.[0];

  if (totalPoints === undefined) {
    return null;
  }

  // A column every pass failed to read has no candidates of its own; the
  // checksum still pins it down, as long as it is the only such column.
  const unreadIndexes = statCandidates.flatMap((candidates, index) =>
    candidates.size === 0 ? [index] : [],
  );

  if (unreadIndexes.length > 1) {
    return null;
  }

  const unreadIndex = unreadIndexes[0] ?? -1;
  let combinations: Array<{ score: number; stats: number[] }> = [
    { score: 0, stats: [] },
  ];

  for (const [index, candidates] of statCandidates.entries()) {
    if (index === unreadIndex) {
      combinations = combinations.map((combination) => ({
        score: combination.score,
        stats: [...combination.stats, Number.NaN],
      }));
      continue;
    }

    const options = [...candidates];

    if (combinations.length * options.length > MAX_COMBINATIONS) {
      return null;
    }

    combinations = combinations.flatMap((combination) =>
      options.map(([value, count]) => ({
        score: combination.score + count,
        stats: [...combination.stats, value],
      })),
    );
  }

  const balanced = combinations
    .flatMap((combination) => {
      if (unreadIndex < 0) {
        return combination.stats.reduce((sum, value) => sum + value, 0) ===
          totalPoints
          ? [combination]
          : [];
      }

      const knownSum = combination.stats.reduce(
        (sum, value) => (Number.isNaN(value) ? sum : sum + value),
        0,
      );
      const missing = totalPoints - knownSum;

      if (missing < 0 || missing > MAX_STAT_VALUE) {
        return [];
      }

      return [
        {
          score: combination.score,
          stats: combination.stats.map((value) =>
            Number.isNaN(value) ? missing : value,
          ),
        },
      ];
    })
    .sort((left, right) => right.score - left.score);

  if (
    balanced.length === 0 ||
    (balanced.length > 1 && balanced[0].score === balanced[1].score)
  ) {
    return null;
  }

  return {
    stats: balanced[0].stats,
    totalPoints,
  };
}
