import { buildPlayerNameMatchKeys } from './build-player-name-match-keys';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { OcrImageBytes, OcrImageCrop, OcrOps } from './ocr/ocr-ops';
import { reconcileScoreRowStats } from './reconcile-score-row-stats';

type OcrPass =
  | {
      buffer: OcrImageBytes;
      kind: 'global';
    }
  | {
      buffer: OcrImageBytes;
      kind:
        | 'row_full'
        | 'row_name'
        | 'row_stats_hard'
        | 'row_stats_soft'
        | 'row_stats_isolated'
        | 'row_totals_soft';
      rowIndex: number;
    };

// Tesseract reads these digits best a little above their native size; the
// spread of scales and thresholds is what lets the checksum reconciliation pick
// a correct value for every column on low-resolution captures.
const ISOLATED_STATS_PASSES: ReadonlyArray<{
  scale: number;
  threshold?: number;
}> = [
  { scale: 3, threshold: 120 },
  { scale: 3, threshold: 140 },
  { scale: 5, threshold: 120 },
  { scale: 5, threshold: 140 },
  { scale: 4 },
];

export type ReadEndgameScreenshotOptions = {
  expectedPlayerCount?: number;
  expectedPlayerNames?: string[];
  /**
   * Player row rects, in the coordinates of the passed image. Supplied when the
   * caller located the table by content; otherwise the rows are guessed by
   * splitting the image, which only fits a tightly cropped score table.
   */
  rowRects?: OcrImageCrop[];
  /**
   * Where the score digits begin, in the coordinates of the passed image.
   * Recognising them without the stacked player name and corporation lines
   * beside them is what makes a row readable.
   */
  statsLeft?: number;
};

type RowOcrLines = {
  full: string[];
  name: string[];
  statsHard: string[];
  statsIsolated: string[];
  statsSoft: string[];
  totalsSoft: string[];
};

type ScoreTokenGroup = {
  lineIndex: number;
  tokens: string[];
};

const SCORE_HEADER_PATTERN = /victory points?\s+breakdown\s+after\b/i;
const OCR_INTEGER_PATTERN = /^\d+$/;
const OCR_TIME_TOKEN_PATTERN = /^\d{1,2}:\d{2}(?::\d{2})?$/;
const OCR_DIGIT_SUBSTITUTIONS: Record<string, string> = {
  B: '8',
  D: '0',
  I: '1',
  O: '0',
  Q: '8',
  S: '5',
  l: '1',
};

function normalizeOcrTextLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .map((line) =>
      line
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/[^A-Za-z0-9:]+$/, '')
        .trim(),
    )
    .filter(Boolean);
}

function buildUniqueLines(lines: string[]) {
  const seen = new Set<string>();
  const uniqueLines: string[] = [];

  for (const line of lines) {
    if (seen.has(line)) {
      continue;
    }

    seen.add(line);
    uniqueLines.push(line);
  }

  return uniqueLines;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getExpectedRowCount(options?: ReadEndgameScreenshotOptions) {
  return clamp(
    Math.max(
      options?.expectedPlayerCount ?? 0,
      options?.expectedPlayerNames?.length ?? 0,
    ),
    0,
    5,
  );
}

function extractTextPrefix(line: string) {
  const tokens = line.split(' ');
  const firstScoreTokenIndex = tokens.findIndex((token) => /\d/.test(token));

  if (firstScoreTokenIndex < 0) {
    return line.trim();
  }

  return tokens.slice(0, firstScoreTokenIndex).join(' ').trim();
}

function extractScoreSuffix(line: string) {
  const tokens = line.split(' ');
  const firstScoreTokenIndex = tokens.findIndex((token) => /\d/.test(token));

  if (firstScoreTokenIndex < 0) {
    return '';
  }

  return tokens.slice(firstScoreTokenIndex).join(' ').trim();
}

function normalizeOcrIntegerToken(token: string) {
  if (OCR_INTEGER_PATTERN.test(token)) {
    return token;
  }

  const substituted = [...token]
    .map((character) => OCR_DIGIT_SUBSTITUTIONS[character] ?? character)
    .join('');

  return OCR_INTEGER_PATTERN.test(substituted) ? substituted : null;
}

function extractScoreTokens(line: string) {
  const scoreSuffix = extractScoreSuffix(line);

  if (!scoreSuffix) {
    return [];
  }

  const tokens = scoreSuffix.split(' ').filter(Boolean);
  const extractedTokens: string[] = [];

  for (const token of tokens) {
    if (OCR_TIME_TOKEN_PATTERN.test(token)) {
      break;
    }

    const normalizedInteger = normalizeOcrIntegerToken(token);

    if (normalizedInteger) {
      extractedTokens.push(normalizedInteger);
      continue;
    }

    if (/\d/.test(token) && extractedTokens.length >= 6) {
      break;
    }
  }

  return extractedTokens;
}

function countScoreTokens(line: string) {
  return extractScoreTokens(line).length;
}

function buildNameCandidates(line: string) {
  const prefix = extractTextPrefix(line);
  const tokens = prefix.split(' ').filter(Boolean);
  const candidates = [prefix];

  if (tokens[0]) {
    candidates.push(tokens[0]);
  }

  if (tokens[0] && tokens[1]) {
    candidates.push(`${tokens[0]} ${tokens[1]}`);
  }

  return buildUniqueLines(candidates.filter(Boolean));
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

function resolveExpectedPlayerName(
  candidates: string[],
  expectedPlayerNames: string[],
) {
  const normalizedExpectedPlayers = buildPlayerNameMatchKeys(expectedPlayerNames)
    .map((player) => ({
      keys: player.keys.filter(Boolean),
      playerName: player.playerName,
    }))
    .filter((player) => player.keys.length > 0);

  if (normalizedExpectedPlayers.length === 0) {
    return null;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizePlayerAlias(candidate);

    if (!normalizedCandidate) {
      continue;
    }

    const exactMatch = normalizedExpectedPlayers.find((player) =>
      player.keys.includes(normalizedCandidate),
    );

    if (exactMatch) {
      return exactMatch.playerName;
    }
  }

  let bestMatch: { distance: number; playerName: string } | null = null;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizePlayerAlias(candidate);

    if (!normalizedCandidate) {
      continue;
    }

    for (const player of normalizedExpectedPlayers) {
      const distance = Math.min(
        ...player.keys.map((key) =>
          levenshteinDistance(normalizedCandidate, key),
        ),
      );

      if (distance > 1) {
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

  return bestMatch?.playerName ?? null;
}

function measureNameDistance(candidates: string[], matchKeys: string[]) {
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizePlayerAlias(candidate);

    if (!normalizedCandidate) {
      continue;
    }

    for (const key of matchKeys) {
      bestDistance = Math.min(
        bestDistance,
        levenshteinDistance(normalizedCandidate, key),
      );
    }
  }

  return bestDistance;
}

const MAX_ASSIGNED_NAME_DISTANCE = 4;
const MAX_FINAL_MEGACREDITS = 999;

/**
 * Reads the megacredits column, which the screenshot prints directly after the
 * total. Unreadable tokens are kept as gaps rather than skipped: skipping one
 * would silently promote the elapsed-time or action-count column into the
 * megacredits slot.
 */
function extractMegacreditsAfterTotal(line: string, totalPoints: number) {
  const tokens: Array<number | null> = [];

  for (const token of line.split(' ').filter(Boolean)) {
    if (OCR_TIME_TOKEN_PATTERN.test(token)) {
      break;
    }

    const normalizedInteger = normalizeOcrIntegerToken(token);

    tokens.push(normalizedInteger === null ? null : Number(normalizedInteger));
  }

  const totalIndex = tokens.indexOf(totalPoints);

  if (totalIndex < 0) {
    return null;
  }

  const megacredits = tokens[totalIndex + 1];

  return typeof megacredits === 'number' &&
    megacredits >= 0 &&
    megacredits <= MAX_FINAL_MEGACREDITS
    ? megacredits
    : null;
}

/**
 * The name cell is the whole prefix before the score digits, so its first one
 * or two tokens hold the player name. `buildNameCandidates` cannot be used
 * here: it stops at the first token containing a digit, and OCR routinely turns
 * an underlined "Izzy" into "1z22y".
 */
function buildRawNameCandidates(line: string) {
  const tokens = line.split(' ').filter(Boolean);

  return buildUniqueLines(
    [tokens[0], tokens.slice(0, 2).join(' '), line].filter(Boolean),
  );
}

/**
 * A located score table holds exactly one row per player, so the rows and the
 * expected names can be matched as a whole. Assigning names globally recovers
 * rows whose own OCR is too mangled to match on its own, because every other
 * row claims its name first.
 */
function assignRowPlayerNames(input: {
  expectedPlayerNames: string[];
  rowCandidates: string[][];
}) {
  const matchKeys = buildPlayerNameMatchKeys(input.expectedPlayerNames);
  const pairs = input.rowCandidates.flatMap((candidates, rowIndex) =>
    matchKeys.map((player) => ({
      distance: measureNameDistance(candidates, player.keys),
      playerName: player.playerName,
      rowIndex,
    })),
  );
  const assignments = new Map<number, string>();
  const takenNames = new Set<string>();

  for (const pair of pairs.sort((left, right) => left.distance - right.distance)) {
    if (
      pair.distance > MAX_ASSIGNED_NAME_DISTANCE ||
      assignments.has(pair.rowIndex) ||
      takenNames.has(pair.playerName)
    ) {
      continue;
    }

    assignments.set(pair.rowIndex, pair.playerName);
    takenNames.add(pair.playerName);
  }

  return assignments;
}

function normalizePlayerScoreLine(
  line: string,
  expectedPlayerNames: string[],
) {
  const resolvedPlayerName = resolveExpectedPlayerName(
    buildNameCandidates(line),
    expectedPlayerNames,
  );
  const scoreTokens = extractScoreTokens(line).slice(0, 8);

  if (!resolvedPlayerName || scoreTokens.length < 6) {
    return null;
  }

  return `${resolvedPlayerName} ${scoreTokens.join(' ')}`.trim();
}

function collectScoreTokenGroups(lines: string[]) {
  return lines.flatMap<ScoreTokenGroup>((line, lineIndex) => {
    const tokens = extractScoreTokens(line);

    return tokens.length > 0 ? [{ lineIndex, tokens }] : [];
  });
}

function parseLooseInteger(token: string) {
  const digits = token.match(/\d+/g)?.join('') ?? '';

  return digits ? Number(digits) : null;
}

const SCORE_STAT_COLUMN_COUNT = 6;

/**
 * The score table's six stat columns always sum to its total, so a line that
 * does not balance was misread.
 */
function isBalancedScoreLine(line: string) {
  const tokens = extractScoreTokens(line);

  if (tokens.length <= SCORE_STAT_COLUMN_COUNT) {
    return false;
  }

  const values = tokens.slice(0, SCORE_STAT_COLUMN_COUNT + 1).map(parseLooseInteger);

  if (values.some((value) => value === null)) {
    return false;
  }

  const numbers = values as number[];
  const statsSum = numbers
    .slice(0, SCORE_STAT_COLUMN_COUNT)
    .reduce((sum, value) => sum + value, 0);

  return statsSum === numbers[SCORE_STAT_COLUMN_COUNT];
}

function compactSynthesizedScoreLines(lines: string[]) {
  const candidates = lines.map((line) => ({
    line,
    tokens: extractScoreTokens(line),
  }));
  const droppedLines = new Set<string>();
  const exactSevenTokenPrefixes = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.tokens.length !== 7) {
      continue;
    }

    const numericValues = candidate.tokens.map(parseLooseInteger);

    if (numericValues.some((value) => value === null)) {
      continue;
    }

    const [trPoints, greeneryPoints, citiesPoints, milestonePoints, awardPoints, cardPointsTotal, totalPoints] =
      numericValues as number[];

    if (
      trPoints +
        greeneryPoints +
        citiesPoints +
        milestonePoints +
        awardPoints +
        cardPointsTotal ===
      totalPoints
    ) {
      exactSevenTokenPrefixes.add(candidate.tokens.slice(0, 6).join(' '));
    }
  }

  for (const candidate of candidates) {
    if (candidate.tokens.length !== 7) {
      continue;
    }

    const prefixKey = candidate.tokens.slice(0, 6).join(' ');

    if (!exactSevenTokenPrefixes.has(prefixKey)) {
      continue;
    }

    const numericValues = candidate.tokens.map(parseLooseInteger);

    if (numericValues.some((value) => value === null)) {
      continue;
    }

    const [trPoints, greeneryPoints, citiesPoints, milestonePoints, awardPoints, cardPointsTotal, totalPoints] =
      numericValues as number[];

    if (
      trPoints +
        greeneryPoints +
        citiesPoints +
        milestonePoints +
        awardPoints +
        cardPointsTotal !==
      totalPoints
    ) {
      droppedLines.add(candidate.line);
    }
  }

  for (const candidate of candidates) {
    if (candidate.tokens.length < 7) {
      continue;
    }

    for (const otherCandidate of candidates) {
      if (
        otherCandidate.line === candidate.line ||
        otherCandidate.tokens.length < 7 ||
        otherCandidate.tokens.length >= candidate.tokens.length
      ) {
        continue;
      }

      const startsWithOtherCandidate = otherCandidate.tokens.every(
        (token, index) => candidate.tokens[index] === token,
      );

      if (startsWithOtherCandidate) {
        droppedLines.add(candidate.line);
      }
    }
  }

  return lines.filter((line) => !droppedLines.has(line));
}

function synthesizeRowScoreLines(input: {
  assignedPlayerName?: string;
  expectedPlayerNames: string[];
  rowLines: RowOcrLines;
}) {
  const normalizedFullLines = input.rowLines.full.flatMap((line) => {
    const normalizedLine = normalizePlayerScoreLine(
      line,
      input.expectedPlayerNames,
    );

    return normalizedLine ? [normalizedLine] : [];
  });
  const resolvedPlayerName =
    input.assignedPlayerName ??
    resolveExpectedPlayerName(
      [
        ...input.rowLines.name.flatMap(buildNameCandidates),
        ...input.rowLines.full.flatMap(buildNameCandidates),
      ],
      input.expectedPlayerNames,
    );

  if (!resolvedPlayerName) {
    return normalizedFullLines;
  }

  // A checksum-balanced reading of the isolated digits is strictly better than
  // anything synthesized from the noisier whole-row crops, so it replaces them
  // outright. Keeping the others around would let a line that misread the
  // megacredits column win on field count alone.
  const reconciledStats = reconcileScoreRowStats(input.rowLines.statsIsolated);

  if (reconciledStats) {
    const reconciledPrefix = `${resolvedPlayerName} ${[
      ...reconciledStats.stats,
      reconciledStats.totalPoints,
    ].join(' ')}`;
    // The megacredits column has no checksum of its own. It is only trusted
    // when it sits immediately after a total that agrees with the reconciled
    // one, which pins down which column was actually read.
    const megacreditLines = input.rowLines.totalsSoft.flatMap((line) => {
      const megacredits = extractMegacreditsAfterTotal(
        line,
        reconciledStats.totalPoints,
      );

      return megacredits === null ? [] : [`${reconciledPrefix} ${megacredits}`];
    });

    return buildUniqueLines(
      megacreditLines.length > 0 ? megacreditLines : [reconciledPrefix],
    );
  }

  const preferredBaseGroups = collectScoreTokenGroups([
    ...input.rowLines.statsHard,
    ...input.rowLines.statsSoft,
    ...input.rowLines.full,
  ]).filter((group) => group.tokens.length >= 6);
  const totalsGroups = collectScoreTokenGroups(input.rowLines.totalsSoft).filter(
    (group) => group.tokens.length >= 2,
  );
  const synthesizedStatLines = collectScoreTokenGroups([
    ...input.rowLines.statsSoft,
    ...input.rowLines.statsHard,
    ...input.rowLines.full,
  ])
    .filter((group) => group.tokens.length >= 6)
    .map((group) =>
      `${resolvedPlayerName} ${group.tokens.slice(0, 8).join(' ')}`.trim(),
    );
  const synthesizedLines: string[] = [];

  for (const baseGroup of preferredBaseGroups) {
    const baseTokens = baseGroup.tokens.slice(0, 6);

    if (baseTokens.length < 6) {
      continue;
    }

    for (const totalsGroup of totalsGroups) {
      synthesizedLines.push(
        `${resolvedPlayerName} ${[...baseTokens, ...totalsGroup.tokens.slice(0, 2)].join(' ')}`.trim(),
      );
    }
  }

  // Without the checksum the synthesized lines are unverified guesses, and a
  // wrong score is worse than a missing one: the review step can ask for the
  // number, but it cannot know a written one is wrong.
  return compactSynthesizedScoreLines(
    buildUniqueLines([
      ...synthesizedLines,
      ...synthesizedStatLines,
      ...normalizedFullLines,
    ]),
  ).filter(isBalancedScoreLine);
}

function buildHelpfulGlobalLines(input: {
  expectedPlayerNames: string[];
  globalLines: string[];
}) {
  const helpfulLines: string[] = [];

  for (const line of input.globalLines) {
    if (SCORE_HEADER_PATTERN.test(line)) {
      helpfulLines.push(line);
      continue;
    }

    if (input.expectedPlayerNames.length === 0) {
      if (countScoreTokens(line) >= 6) {
        helpfulLines.push(line);
      }

      continue;
    }

    const normalizedScoreLine = normalizePlayerScoreLine(
      line,
      input.expectedPlayerNames,
    );

    if (normalizedScoreLine) {
      helpfulLines.push(normalizedScoreLine);
    }
  }

  return buildUniqueLines(helpfulLines);
}

/**
 * Splits a tightly cropped score table into evenly sized player rows. Used only
 * when the caller could not locate the rows from the screenshot's pixels.
 */
function buildEvenRowRects(input: {
  height: number;
  rowCount: number;
  width: number;
}): OcrImageCrop[] {
  const left = Math.floor(input.width * 0.01);
  const rowWidth = clamp(Math.floor(input.width * 0.92), 1, input.width - left);
  const rowStartTop = clamp(Math.floor(input.height * 0.39), 0, input.height - 1);
  const rowBottom = clamp(Math.floor(input.height * 0.98), 1, input.height);
  const rowAreaHeight = Math.max(1, rowBottom - rowStartTop);

  return Array.from({ length: input.rowCount }, (_, rowIndex) => {
    const top = clamp(
      rowStartTop + Math.floor((rowAreaHeight * rowIndex) / input.rowCount),
      0,
      input.height - 1,
    );
    const nextTop =
      rowIndex === input.rowCount - 1
        ? rowBottom
        : clamp(
            rowStartTop +
              Math.floor((rowAreaHeight * (rowIndex + 1)) / input.rowCount),
            top + 1,
            input.height,
          );

    return {
      height: Math.max(1, nextTop - top),
      left,
      top,
      width: rowWidth,
    };
  });
}

async function buildIsolatedStatsPasses(input: {
  imageBuffer: OcrImageBytes;
  ops: OcrOps;
  rowIndex: number;
  statsRect: OcrImageCrop;
}) {
  const passes: OcrPass[] = [];

  for (const { scale, threshold } of ISOLATED_STATS_PASSES) {
    passes.push({
      buffer: await input.ops.transformImage(input.imageBuffer, {
        crop: input.statsRect,
        grayscale: true,
        normalize: true,
        resizeWidth: input.statsRect.width * scale,
        sharpen: true,
        ...(threshold === undefined ? {} : { threshold }),
      }),
      kind: 'row_stats_isolated',
      rowIndex: input.rowIndex,
    });
  }

  return passes;
}

async function buildRowPasses(input: {
  height: number;
  imageBuffer: OcrImageBytes;
  ops: OcrOps;
  rowRects: OcrImageCrop[];
  statsLeft?: number;
  width: number;
}) {
  const passes: OcrPass[] = [];

  for (const [rowIndex, rowRect] of input.rowRects.entries()) {
    if (
      input.statsLeft !== undefined &&
      input.statsLeft > rowRect.left &&
      input.statsLeft < rowRect.left + rowRect.width
    ) {
      passes.push(
        ...(await buildIsolatedStatsPasses({
          imageBuffer: input.imageBuffer,
          ops: input.ops,
          rowIndex,
          statsRect: {
            height: rowRect.height,
            left: input.statsLeft,
            top: rowRect.top,
            width: rowRect.left + rowRect.width - input.statsLeft,
          },
        })),
      );
    }

    const left = rowRect.left;
    const rowWidth = rowRect.width;
    const top = rowRect.top;
    const rowHeight = rowRect.height;
    const rowRight = left + rowWidth;
    const hasLocatedStats =
      input.statsLeft !== undefined &&
      input.statsLeft > left &&
      input.statsLeft < rowRight;
    const nameWidth = hasLocatedStats
      ? clamp(input.statsLeft! - left, 1, rowWidth)
      : clamp(Math.floor(rowWidth * 0.28), 1, rowWidth);
    const statsLeft = hasLocatedStats
      ? input.statsLeft!
      : clamp(left + Math.floor(rowWidth * 0.23), left, input.width - 1);
    const statsWidth = hasLocatedStats
      ? clamp(rowRight - statsLeft, 1, input.width - statsLeft)
      : clamp(Math.floor(rowWidth * 0.68), 1, input.width - statsLeft);
    // The trailing columns (total, megacredits) start a little past the middle
    // of the digits; anchoring them to the name boundary keeps the total inside
    // the crop whatever the name column's width happens to be.
    const totalsLeft = hasLocatedStats
      ? clamp(statsLeft + Math.floor(statsWidth * 0.4), left, input.width - 1)
      : clamp(left + Math.floor(rowWidth * 0.68), left, input.width - 1);
    const totalsWidth = hasLocatedStats
      ? clamp(rowRight - totalsLeft, 1, input.width - totalsLeft)
      : clamp(Math.floor(rowWidth * 0.2), 1, input.width - totalsLeft);

    const fullBuffer = await input.ops.transformImage(input.imageBuffer, {
      crop: {
        height: rowHeight,
        left,
        top,
        width: rowWidth,
      },
      grayscale: true,
      normalize: true,
      resizeWidth: rowWidth * 4,
      sharpen: true,
      threshold: 140,
    });
    const nameBuffer = await input.ops.transformImage(input.imageBuffer, {
      crop: {
        height: rowHeight,
        left,
        top,
        width: nameWidth,
      },
      grayscale: true,
      normalize: true,
      resizeWidth: Math.min(nameWidth * 8, 1200),
      sharpen: true,
    });
    const statsBuffer = await input.ops.transformImage(input.imageBuffer, {
      crop: {
        height: rowHeight,
        left: statsLeft,
        top,
        width: statsWidth,
      },
      grayscale: true,
      normalize: true,
      resizeWidth: statsWidth * 5,
      sharpen: true,
      threshold: 140,
    });
    const softStatsBuffer = await input.ops.transformImage(input.imageBuffer, {
      crop: {
        height: rowHeight,
        left: statsLeft,
        top,
        width: statsWidth,
      },
      grayscale: true,
      normalize: true,
      resizeWidth: statsWidth * 5,
      sharpen: true,
    });
    const totalsBuffer = await input.ops.transformImage(input.imageBuffer, {
      crop: {
        height: rowHeight,
        left: totalsLeft,
        top,
        width: totalsWidth,
      },
      grayscale: true,
      normalize: true,
      resizeWidth: Math.min(totalsWidth * 8, 1800),
      sharpen: true,
    });

    passes.push({
      buffer: fullBuffer,
      kind: 'row_full',
      rowIndex,
    });
    passes.push({
      buffer: nameBuffer,
      kind: 'row_name',
      rowIndex,
    });
    passes.push({
      buffer: statsBuffer,
      kind: 'row_stats_hard',
      rowIndex,
    });
    passes.push({
      buffer: softStatsBuffer,
      kind: 'row_stats_soft',
      rowIndex,
    });
    passes.push({
      buffer: totalsBuffer,
      kind: 'row_totals_soft',
      rowIndex,
    });
  }

  return passes;
}

async function buildOcrPasses(
  imageBuffer: OcrImageBytes,
  ops: OcrOps,
  options?: ReadEndgameScreenshotOptions,
) {
  const passes: OcrPass[] = [{ buffer: imageBuffer, kind: 'global' }];
  const size = await ops.getImageSize(imageBuffer);

  if (!size) {
    return passes;
  }

  const rowCount = getExpectedRowCount(options);
  const rowRects = options?.rowRects?.length
    ? options.rowRects
    : rowCount
      ? buildEvenRowRects({
          height: size.height,
          rowCount,
          width: size.width,
        })
      : [];

  if (rowRects.length === 0) {
    return passes;
  }

  const rowPasses = await buildRowPasses({
    height: size.height,
    imageBuffer,
    ops,
    rowRects,
    statsLeft: options?.statsLeft,
    width: size.width,
  });

  return [...passes, ...rowPasses];
}

export async function readEndgameScreenshot(
  file: File,
  options: ReadEndgameScreenshotOptions | undefined,
  ops: OcrOps,
) {
  const imageBuffer = new Uint8Array(await file.arrayBuffer());
  const ocrPasses = await buildOcrPasses(imageBuffer, ops, options);
  const expectedPlayerNames = options?.expectedPlayerNames ?? [];
  const globalLines: string[] = [];
  const rowLinesByIndex = new Map<number, RowOcrLines>();
  let firstError: unknown = null;

  for (const ocrPass of ocrPasses) {
    try {
      const ocrText = await ops.recognizeText(ocrPass.buffer, {
        singleLine: ocrPass.kind !== 'global' && ocrPass.kind !== 'row_name',
      });
      const lines = normalizeOcrTextLines(ocrText);

      if (ocrPass.kind === 'global') {
        globalLines.push(...lines);
        continue;
      }

      const existingRowLines = rowLinesByIndex.get(ocrPass.rowIndex) ?? {
        full: [],
        name: [],
        statsHard: [],
        statsIsolated: [],
        statsSoft: [],
        totalsSoft: [],
      };

      if (ocrPass.kind === 'row_full') {
        existingRowLines.full.push(...lines);
      } else if (ocrPass.kind === 'row_name') {
        existingRowLines.name.push(...lines);
      } else if (ocrPass.kind === 'row_stats_hard') {
        existingRowLines.statsHard.push(...lines);
      } else if (ocrPass.kind === 'row_stats_isolated') {
        // Each pass contributes one candidate reading of the digit row.
        existingRowLines.statsIsolated.push(lines.join(' '));
      } else if (ocrPass.kind === 'row_stats_soft') {
        existingRowLines.statsSoft.push(...lines);
      } else {
        existingRowLines.totalsSoft.push(...lines);
      }

      rowLinesByIndex.set(ocrPass.rowIndex, existingRowLines);
    } catch (error) {
      if (!firstError) {
        firstError = error;
      }
    }
  }

  const helpfulGlobalLines = buildHelpfulGlobalLines({
    expectedPlayerNames,
    globalLines,
  });
  const orderedRows = [...rowLinesByIndex.entries()].sort(
    ([leftIndex], [rightIndex]) => leftIndex - rightIndex,
  );
  // Rows located from pixels are one per player, which lets the names be
  // matched as a set rather than row by row.
  const assignedNames =
    options?.rowRects?.length === expectedPlayerNames.length &&
    expectedPlayerNames.length > 0
      ? assignRowPlayerNames({
          expectedPlayerNames,
          rowCandidates: orderedRows.map(([, rowLines]) => [
            ...rowLines.name.flatMap(buildRawNameCandidates),
            ...rowLines.full.flatMap(buildRawNameCandidates),
          ]),
        })
      : new Map<number, string>();
  const synthesizedRowLines =
    expectedPlayerNames.length === 0
      ? []
      : orderedRows.flatMap(([, rowLines], position) =>
          synthesizeRowScoreLines({
            assignedPlayerName: assignedNames.get(position),
            expectedPlayerNames,
            rowLines,
          }),
        );
  const combinedLines = buildUniqueLines([
    ...helpfulGlobalLines,
    ...synthesizedRowLines,
  ]);

  if (combinedLines.length === 0 && firstError) {
    throw firstError;
  }

  return combinedLines;
}
