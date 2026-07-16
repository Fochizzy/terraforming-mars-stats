import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { normalizePlayerAlias } from './normalize-player-alias';

type OcrPass =
  | {
      buffer: Buffer;
      kind: 'global';
    }
  | {
      buffer: Buffer;
      kind:
        | 'row_full'
        | 'row_name'
        | 'row_stats_hard'
        | 'row_stats_soft'
        | 'row_totals_soft';
      rowIndex: number;
    };

export type ReadEndgameScreenshotOptions = {
  expectedPlayerCount?: number;
  expectedPlayerNames?: string[];
};

type RowOcrLines = {
  full: string[];
  name: string[];
  statsHard: string[];
  statsSoft: string[];
  totalsSoft: string[];
};

type ScoreTokenGroup = {
  lineIndex: number;
  tokens: string[];
};

const SCORE_HEADER_PATTERN = /^victory point breakdown after\b/i;
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
const TESSERACT_SINGLE_LINE_PAGE_SEGMENTATION_MODE = 7;
const SINGLE_LINE_OCR_OPTIONS = {
  tessedit_pageseg_mode: TESSERACT_SINGLE_LINE_PAGE_SEGMENTATION_MODE,
} as unknown as Parameters<typeof Tesseract.recognize>[2];

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
  const normalizedExpectedPlayers = expectedPlayerNames
    .map((playerName) => ({
      normalized: normalizePlayerAlias(playerName),
      playerName,
    }))
    .filter((player) => player.normalized);

  if (normalizedExpectedPlayers.length === 0) {
    return null;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizePlayerAlias(candidate);

    if (!normalizedCandidate) {
      continue;
    }

    const exactMatch = normalizedExpectedPlayers.find(
      (player) => player.normalized === normalizedCandidate,
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
      const distance = levenshteinDistance(
        normalizedCandidate,
        player.normalized,
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
  const resolvedPlayerName = resolveExpectedPlayerName(
    [
      ...input.rowLines.name.flatMap(buildNameCandidates),
      ...input.rowLines.full.flatMap(buildNameCandidates),
    ],
    input.expectedPlayerNames,
  );

  if (!resolvedPlayerName) {
    return normalizedFullLines;
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

  return compactSynthesizedScoreLines(
    buildUniqueLines([
      ...synthesizedLines,
      ...synthesizedStatLines,
      ...normalizedFullLines,
    ]),
  );
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

async function buildRowPasses(input: {
  height: number;
  imageBuffer: Buffer;
  rowCount: number;
  width: number;
}) {
  const passes: OcrPass[] = [];
  const left = Math.floor(input.width * 0.01);
  const rowWidth = clamp(
    Math.floor(input.width * 0.92),
    1,
    input.width - left,
  );
  const rowStartTop = clamp(Math.floor(input.height * 0.39), 0, input.height - 1);
  const rowBottom = clamp(Math.floor(input.height * 0.98), 1, input.height);
  const rowAreaHeight = Math.max(1, rowBottom - rowStartTop);

  for (let rowIndex = 0; rowIndex < input.rowCount; rowIndex += 1) {
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
    const rowHeight = Math.max(1, nextTop - top);
    const nameWidth = clamp(Math.floor(rowWidth * 0.28), 1, rowWidth);
    const statsLeft = clamp(
      left + Math.floor(rowWidth * 0.23),
      left,
      input.width - 1,
    );
    const statsWidth = clamp(
      Math.floor(rowWidth * 0.68),
      1,
      input.width - statsLeft,
    );
    const totalsLeft = clamp(
      left + Math.floor(rowWidth * 0.68),
      left,
      input.width - 1,
    );
    const totalsWidth = clamp(
      Math.floor(rowWidth * 0.2),
      1,
      input.width - totalsLeft,
    );

    const fullBuffer = await sharp(input.imageBuffer)
      .extract({
        height: rowHeight,
        left,
        top,
        width: rowWidth,
      })
      .resize({ width: rowWidth * 4 })
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(140)
      .png()
      .toBuffer();
    const nameBuffer = await sharp(input.imageBuffer)
      .extract({
        height: rowHeight,
        left,
        top,
        width: nameWidth,
      })
      .resize({ width: nameWidth * 5 })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
    const statsBuffer = await sharp(input.imageBuffer)
      .extract({
        height: rowHeight,
        left: statsLeft,
        top,
        width: statsWidth,
      })
      .resize({ width: statsWidth * 5 })
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(140)
      .png()
      .toBuffer();
    const softStatsBuffer = await sharp(input.imageBuffer)
      .extract({
        height: rowHeight,
        left: statsLeft,
        top,
        width: statsWidth,
      })
      .resize({ width: statsWidth * 5 })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
    const totalsBuffer = await sharp(input.imageBuffer)
      .extract({
        height: rowHeight,
        left: totalsLeft,
        top,
        width: totalsWidth,
      })
      .resize({ width: totalsWidth * 8 })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

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
  imageBuffer: Buffer,
  options?: ReadEndgameScreenshotOptions,
) {
  const passes: OcrPass[] = [{ buffer: imageBuffer, kind: 'global' }];
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    return passes;
  }

  const rowCount = getExpectedRowCount(options);

  if (!rowCount) {
    return passes;
  }

  const rowPasses = await buildRowPasses({
    height: metadata.height,
    imageBuffer,
    rowCount,
    width: metadata.width,
  });

  return [...passes, ...rowPasses];
}

export async function readEndgameScreenshot(
  file: File,
  options?: ReadEndgameScreenshotOptions,
) {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const ocrPasses = await buildOcrPasses(imageBuffer, options);
  const expectedPlayerNames = options?.expectedPlayerNames ?? [];
  const globalLines: string[] = [];
  const rowLinesByIndex = new Map<number, RowOcrLines>();
  let firstError: unknown = null;

  for (const ocrPass of ocrPasses) {
    try {
      const ocrResult =
        ocrPass.kind === 'global' || ocrPass.kind === 'row_name'
          ? await Tesseract.recognize(ocrPass.buffer, 'eng')
          : await Tesseract.recognize(
              ocrPass.buffer,
              'eng',
              SINGLE_LINE_OCR_OPTIONS,
            );
      const lines = normalizeOcrTextLines(ocrResult.data.text);

      if (ocrPass.kind === 'global') {
        globalLines.push(...lines);
        continue;
      }

      const existingRowLines = rowLinesByIndex.get(ocrPass.rowIndex) ?? {
        full: [],
        name: [],
        statsHard: [],
        statsSoft: [],
        totalsSoft: [],
      };

      if (ocrPass.kind === 'row_full') {
        existingRowLines.full.push(...lines);
      } else if (ocrPass.kind === 'row_name') {
        existingRowLines.name.push(...lines);
      } else if (ocrPass.kind === 'row_stats_hard') {
        existingRowLines.statsHard.push(...lines);
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
  const synthesizedRowLines =
    expectedPlayerNames.length === 0
      ? []
      : [...rowLinesByIndex.entries()]
          .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
          .flatMap(([, rowLines]) =>
            synthesizeRowScoreLines({
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
