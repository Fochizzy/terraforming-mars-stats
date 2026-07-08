import { createWorker } from 'tesseract.js';
import { normalizePlayerAlias } from './normalize-player-alias';

type TopCropConfig = {
  heightRatio: number;
  leftRatio: number;
  topRatio: number;
  widthRatio: number;
};

type OcrPass =
  | {
      blob: Blob;
      kind: 'global';
    }
  | {
      blob: Blob;
      kind:
        | 'row_full'
        | 'row_name'
        | 'row_stats_hard'
        | 'row_stats_soft'
        | 'row_totals_soft';
      rowIndex: number;
    };

type RowOcrLines = {
  full: string[];
  name: string[];
  statsHard: string[];
  statsSoft: string[];
  totalsSoft: string[];
};

type CropSource = {
  height: number;
  image: CanvasImageSource;
  width: number;
};

export type ReadEndgameScreenshotInBrowserOptions = {
  expectedPlayerCount?: number;
  expectedPlayerNames?: string[];
};

const BROWSER_OCR_ASSET_PATHS = {
  corePath: '/ocr/core',
  langPath: '/ocr/lang',
  workerPath: '/ocr/worker.min.js',
} as const;
const DEFAULT_BROWSER_OCR_PARAMETERS = {
  preserve_interword_spaces: '1',
  tessedit_char_whitelist:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:'|-",
} as const;
const SINGLE_LINE_BROWSER_OCR_PARAMETERS = {
  ...DEFAULT_BROWSER_OCR_PARAMETERS,
  tessedit_pageseg_mode: '7',
} as const;
const ENDGAME_HEADING_PATTERN =
  /^victory points?\s+breakdown after\s+\d+\s+generations?$/i;
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
const FOCUSED_ENDGAME_CROP: TopCropConfig = {
  heightRatio: 0.1,
  leftRatio: 0.024,
  topRatio: 0.009,
  widthRatio: 0.56,
};
const EXPANDED_ENDGAME_CROP: TopCropConfig = {
  heightRatio: 0.18,
  leftRatio: 0.016,
  topRatio: 0.006,
  widthRatio: 0.62,
};

function normalizeOcrLine(line: string) {
  return line.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeOcrTextLines(text: string) {
  return text
    .split(/\r?\n/g)
    .map(normalizeOcrLine)
    .map((line) =>
      line
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/[^A-Za-z0-9:]+$/, '')
        .trim(),
    )
    .filter(Boolean);
}

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getExpectedRowCount(options?: ReadEndgameScreenshotInBrowserOptions) {
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

type ScoreTokenGroup = {
  lineIndex: number;
  tokens: string[];
};

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

    const [
      trPoints,
      greeneryPoints,
      citiesPoints,
      milestonePoints,
      awardPoints,
      cardPointsTotal,
      totalPoints,
    ] = numericValues as number[];

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

    const [
      trPoints,
      greeneryPoints,
      citiesPoints,
      milestonePoints,
      awardPoints,
      cardPointsTotal,
      totalPoints,
    ] = numericValues as number[];

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
    .map(
      (group) =>
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
    if (SCORE_HEADER_PATTERN.test(line) || ENDGAME_HEADING_PATTERN.test(line)) {
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

function countLikelyScoreRows(lines: string[]) {
  return lines.filter((line) => {
    if (ENDGAME_HEADING_PATTERN.test(line)) {
      return false;
    }

    return countScoreTokens(line) >= 7;
  }).length;
}

function shouldRetryWithExpandedCrop(input: {
  endgameLines: string[];
  options?: ReadEndgameScreenshotInBrowserOptions;
}) {
  const likelyScoreRowCount = countLikelyScoreRows(input.endgameLines);
  const expectedPlayerCount = Math.max(
    input.options?.expectedPlayerCount ?? 0,
    input.options?.expectedPlayerNames?.length ?? 0,
  );

  if (likelyScoreRowCount === 0) {
    return true;
  }

  return expectedPlayerCount > 1 && likelyScoreRowCount === 1;
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error('Unable to load the game result screenshot.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function convertCanvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Unable to prepare the screenshot crop for OCR.'));
    }, 'image/png');
  });
}

function applyThreshold(canvas: HTMLCanvasElement, threshold: number) {
  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const grayscale = (data[index] + data[index + 1] + data[index + 2]) / 3;
    const value = grayscale >= threshold ? 255 : 0;

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
}

async function createProcessedCropBlob(input: {
  cropHeight: number;
  cropLeft: number;
  cropTop: number;
  cropWidth: number;
  filter?: string;
  scale: number;
  source: CropSource;
  threshold?: number;
}) {
  const targetWidth = Math.max(1, Math.round(input.cropWidth * input.scale));
  const targetHeight = Math.max(1, Math.round(input.cropHeight * input.scale));
  const canvas = document.createElement('canvas');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to prepare the screenshot crop for OCR.');
  }

  if (input.filter) {
    context.filter = input.filter;
  }

  context.drawImage(
    input.source.image,
    input.cropLeft,
    input.cropTop,
    input.cropWidth,
    input.cropHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  if (typeof input.threshold === 'number') {
    applyThreshold(canvas, input.threshold);
  }

  return convertCanvasToBlob(canvas);
}

async function buildTopCropSource(input: {
  config: TopCropConfig;
  image: HTMLImageElement;
}) {
  const width = input.image.naturalWidth || input.image.width;
  const height = input.image.naturalHeight || input.image.height;
  const cropWidth = Math.max(1, Math.floor(width * input.config.widthRatio));
  const cropHeight = Math.max(1, Math.floor(height * input.config.heightRatio));
  const cropLeft = Math.floor(width * input.config.leftRatio);
  const cropTop = Math.floor(height * input.config.topRatio);
  const targetWidth = Math.max(cropWidth, 1800);
  const scale = targetWidth / cropWidth;
  const targetHeight = Math.max(1, Math.round(cropHeight * scale));
  const canvas = document.createElement('canvas');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to prepare the screenshot crop for OCR.');
  }

  context.filter = 'grayscale(1) contrast(1.6) brightness(1.15)';
  context.drawImage(
    input.image,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return {
    height: targetHeight,
    image: canvas,
    width: targetWidth,
  } satisfies CropSource;
}

async function buildRowPasses(input: {
  rowCount: number;
  source: CropSource;
}) {
  const passes: OcrPass[] = [];
  const left = Math.floor(input.source.width * 0.01);
  const rowWidth = clamp(
    Math.floor(input.source.width * 0.92),
    1,
    input.source.width - left,
  );
  const rowStartTop = clamp(
    Math.floor(input.source.height * 0.39),
    0,
    input.source.height - 1,
  );
  const rowBottom = clamp(
    Math.floor(input.source.height * 0.98),
    1,
    input.source.height,
  );
  const rowAreaHeight = Math.max(1, rowBottom - rowStartTop);

  for (let rowIndex = 0; rowIndex < input.rowCount; rowIndex += 1) {
    const top = clamp(
      rowStartTop + Math.floor((rowAreaHeight * rowIndex) / input.rowCount),
      0,
      input.source.height - 1,
    );
    const nextTop =
      rowIndex === input.rowCount - 1
        ? rowBottom
        : clamp(
            rowStartTop +
              Math.floor((rowAreaHeight * (rowIndex + 1)) / input.rowCount),
            top + 1,
            input.source.height,
          );
    const rowHeight = Math.max(1, nextTop - top);
    const nameWidth = clamp(Math.floor(rowWidth * 0.28), 1, rowWidth);
    const statsLeft = clamp(
      left + Math.floor(rowWidth * 0.23),
      left,
      input.source.width - 1,
    );
    const statsWidth = clamp(
      Math.floor(rowWidth * 0.68),
      1,
      input.source.width - statsLeft,
    );
    const totalsLeft = clamp(
      left + Math.floor(rowWidth * 0.68),
      left,
      input.source.width - 1,
    );
    const totalsWidth = clamp(
      Math.floor(rowWidth * 0.2),
      1,
      input.source.width - totalsLeft,
    );

    const [fullBlob, nameBlob, statsHardBlob, statsSoftBlob, totalsBlob] =
      await Promise.all([
        createProcessedCropBlob({
          cropHeight: rowHeight,
          cropLeft: left,
          cropTop: top,
          cropWidth: rowWidth,
          filter: 'grayscale(1) contrast(1.65) brightness(1.1)',
          scale: 4,
          source: input.source,
          threshold: 140,
        }),
        createProcessedCropBlob({
          cropHeight: rowHeight,
          cropLeft: left,
          cropTop: top,
          cropWidth: nameWidth,
          filter: 'grayscale(1) contrast(1.45) brightness(1.15)',
          scale: 5,
          source: input.source,
        }),
        createProcessedCropBlob({
          cropHeight: rowHeight,
          cropLeft: statsLeft,
          cropTop: top,
          cropWidth: statsWidth,
          filter: 'grayscale(1) contrast(1.7) brightness(1.08)',
          scale: 5,
          source: input.source,
          threshold: 140,
        }),
        createProcessedCropBlob({
          cropHeight: rowHeight,
          cropLeft: statsLeft,
          cropTop: top,
          cropWidth: statsWidth,
          filter: 'grayscale(1) contrast(1.55) brightness(1.12)',
          scale: 5,
          source: input.source,
        }),
        createProcessedCropBlob({
          cropHeight: rowHeight,
          cropLeft: totalsLeft,
          cropTop: top,
          cropWidth: totalsWidth,
          filter: 'grayscale(1) contrast(1.5) brightness(1.18)',
          scale: 8,
          source: input.source,
        }),
      ]);

    passes.push({
      blob: fullBlob,
      kind: 'row_full',
      rowIndex,
    });
    passes.push({
      blob: nameBlob,
      kind: 'row_name',
      rowIndex,
    });
    passes.push({
      blob: statsHardBlob,
      kind: 'row_stats_hard',
      rowIndex,
    });
    passes.push({
      blob: statsSoftBlob,
      kind: 'row_stats_soft',
      rowIndex,
    });
    passes.push({
      blob: totalsBlob,
      kind: 'row_totals_soft',
      rowIndex,
    });
  }

  return passes;
}

async function buildOcrPasses(input: {
  options?: ReadEndgameScreenshotInBrowserOptions;
  source: CropSource;
}) {
  const passes: OcrPass[] = [
    {
      blob: await createProcessedCropBlob({
        cropHeight: input.source.height,
        cropLeft: 0,
        cropTop: 0,
        cropWidth: input.source.width,
        filter: 'grayscale(1) contrast(1.55) brightness(1.12)',
        scale: 1,
        source: input.source,
      }),
      kind: 'global',
    },
  ];
  const rowCount = getExpectedRowCount(input.options);

  if (!rowCount) {
    return passes;
  }

  return [...passes, ...(await buildRowPasses({ rowCount, source: input.source }))];
}

async function readEndgameCropLinesInBrowser(input: {
  options?: ReadEndgameScreenshotInBrowserOptions;
  source: CropSource;
  worker: Awaited<ReturnType<typeof createWorker>>;
}) {
  const ocrPasses = await buildOcrPasses({
    options: input.options,
    source: input.source,
  });
  const expectedPlayerNames = input.options?.expectedPlayerNames ?? [];
  const globalLines: string[] = [];
  const rowLinesByIndex = new Map<number, RowOcrLines>();

  for (const ocrPass of ocrPasses) {
    await input.worker.setParameters(
      ocrPass.kind === 'global' || ocrPass.kind === 'row_name'
        ? DEFAULT_BROWSER_OCR_PARAMETERS
        : SINGLE_LINE_BROWSER_OCR_PARAMETERS,
    );
    const ocrResult = await input.worker.recognize(ocrPass.blob);
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

  return buildUniqueLines([
    ...helpfulGlobalLines,
    ...synthesizedRowLines,
  ]);
}

export async function readGameResultEndgameLinesInBrowser(
  file: File,
  options?: ReadEndgameScreenshotInBrowserOptions,
) {
  const image = await loadImageElement(file);
  const [focusedSource, expandedSource] = await Promise.all([
    buildTopCropSource({
      config: FOCUSED_ENDGAME_CROP,
      image,
    }),
    buildTopCropSource({
      config: EXPANDED_ENDGAME_CROP,
      image,
    }),
  ]);
  const worker = await createWorker('eng', 1, BROWSER_OCR_ASSET_PATHS);

  try {
    const focusedLines = await readEndgameCropLinesInBrowser({
      options,
      source: focusedSource,
      worker,
    });
    const focusedHasHeading = focusedLines.some((line) =>
      ENDGAME_HEADING_PATTERN.test(line),
    );
    const expandedLines = shouldRetryWithExpandedCrop({
      endgameLines: focusedLines,
      options,
    }) || !focusedHasHeading
      ? await readEndgameCropLinesInBrowser({
          options,
          source: expandedSource,
          worker,
        })
      : [];
    const headingLines = expandedLines.filter((line) =>
      ENDGAME_HEADING_PATTERN.test(line),
    );

    return buildUniqueLines([
      ...headingLines,
      ...focusedLines,
      ...expandedLines,
    ]);
  } finally {
    await worker.terminate();
  }
}
