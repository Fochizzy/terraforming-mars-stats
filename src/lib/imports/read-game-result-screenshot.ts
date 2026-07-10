import {
  locateGameResultRegions,
  type GameResultRegions,
} from './locate-game-result-regions';
import type { OcrImageBytes, OcrImageCrop, OcrOps } from './ocr/ocr-ops';
import { readOcrTextLinesWithOps } from './ocr/read-ocr-text-lines-with-ops';
import type { EndgameScoreLayout } from './parse-endgame-score-screenshot';
import { readEndgameScreenshot } from './read-endgame-screenshot';
import { readScoreDetailsScreenshot } from './read-score-details-screenshot';

export type ReadGameResultScreenshotOptions = {
  expectedPlayerCount?: number;
  expectedPlayerNames?: string[];
};

/**
 * How many steps of each global parameter a player raised. In a finished game
 * the columns sum to the full ranges: 19 temperature steps, 14 oxygen steps and
 * 9 oceans.
 */
export type GameResultGlobalParameters = {
  oceans: number;
  oxygen: number;
  playerName: string;
  temperature: number;
  /** Terraforming steps contributed in total; equals the three columns summed. */
  total: number;
};

export type ReadGameResultScreenshotResult = {
  /**
   * Column order of `endgameLines`. Screenshot reads leave this unset so the
   * layout keeps being detected from the heading; PDF reads know it up front.
   */
  endgameLayout?: EndgameScoreLayout;
  endgameLines: string[];
  /** Set when the evidence states the generation count outside `endgameLines`. */
  generationCount?: number | null;
  /** Only the printed PDF carries this table; screenshots crop it away. */
  globalParameters?: GameResultGlobalParameters[];
  scoreDetailsColumns: Array<{
    textLines: string[];
  }>;
};

type TopCropConfig = {
  heightRatio: number;
  leftRatio: number;
  topRatio: number;
  widthRatio: number;
};

const ENDGAME_HEADING_PATTERN =
  /victory points?\s+breakdown\s+after\s+\d+\s+generations?/i;
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
// The heading sits at the very top edge of combined-result captures, so this
// strip must start at y=0 — starting lower slices the text and OCR misses it.
const HEADING_STRIP_CROP: TopCropConfig = {
  heightRatio: 0.05,
  leftRatio: 0,
  topRatio: 0,
  widthRatio: 1,
};
const TABLE_CROP_PADDING = 3;

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

function extractTopCropBuffer(input: {
  config: TopCropConfig;
  height: number;
  imageBuffer: OcrImageBytes;
  ops: OcrOps;
  width: number;
}) {
  return input.ops.transformImage(input.imageBuffer, {
    crop: {
      height: Math.max(1, Math.floor(input.height * input.config.heightRatio)),
      left: Math.floor(input.width * input.config.leftRatio),
      top: Math.floor(input.height * input.config.topRatio),
      width: Math.max(1, Math.floor(input.width * input.config.widthRatio)),
    },
  });
}

function countLikelyScoreRows(lines: string[]) {
  return lines.filter((line) => {
    if (ENDGAME_HEADING_PATTERN.test(line)) {
      return false;
    }

    return (line.match(/\b\d+\b/g)?.length ?? 0) >= 7;
  }).length;
}

function shouldRetryWithExpandedCrop(input: {
  endgameLines: string[];
  options?: ReadGameResultScreenshotOptions;
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

function buildTableCrop(
  regions: GameResultRegions,
  size: { height: number; width: number },
): OcrImageCrop {
  const rows = regions.scoreTableRows;
  const left = Math.min(...rows.map((row) => row.left));
  const right = Math.max(...rows.map((row) => row.left + row.width));
  const top = Math.min(...rows.map((row) => row.top));
  const bottom = Math.max(...rows.map((row) => row.top + row.height));
  const paddedLeft = Math.max(0, left - TABLE_CROP_PADDING);
  const paddedTop = Math.max(0, top - TABLE_CROP_PADDING);

  return {
    height: Math.min(size.height - paddedTop, bottom - paddedTop + TABLE_CROP_PADDING),
    left: paddedLeft,
    top: paddedTop,
    width: Math.min(size.width - paddedLeft, right - paddedLeft + TABLE_CROP_PADDING),
  };
}

async function readLocatedRegions(input: {
  imageBuffer: OcrImageBytes;
  options: ReadGameResultScreenshotOptions | undefined;
  ops: OcrOps;
  regions: GameResultRegions;
  size: { height: number; width: number };
}): Promise<ReadGameResultScreenshotResult> {
  const tableCrop = buildTableCrop(input.regions, input.size);
  const [tableBuffer, headingBuffer] = await Promise.all([
    input.ops.transformImage(input.imageBuffer, { crop: tableCrop }),
    input.ops.transformImage(input.imageBuffer, {
      crop: input.regions.scoreTableHeading,
    }),
  ]);
  // The located rows are in full-image coordinates; the endgame reader receives
  // the cropped table, so they have to be rebased onto it.
  const rowRects = input.regions.scoreTableRows.map((row) => ({
    height: row.height,
    left: Math.max(0, row.left - tableCrop.left),
    top: Math.max(0, row.top - tableCrop.top),
    width: row.width,
  }));
  const statsLeft =
    input.regions.scoreTableStatsLeft === null
      ? undefined
      : input.regions.scoreTableStatsLeft - tableCrop.left;
  const [endgameLines, headingLines, scoreDetailsRead] = await Promise.all([
    readEndgameScreenshot(
      new File([tableBuffer], 'game-result-endgame.png', { type: 'image/png' }),
      { ...input.options, rowRects, statsLeft },
      input.ops,
    ),
    readOcrTextLinesWithOps(headingBuffer, input.ops),
    input.regions.detailColumns.length > 0
      ? readScoreDetailsScreenshot(
          new File([input.imageBuffer], 'game-result-details.png', {
            type: 'image/png',
          }),
          input.ops,
          { columnRects: input.regions.detailColumns },
        )
      : Promise.resolve({ columns: [] }),
  ]);

  return {
    endgameLines: buildUniqueLines([
      ...headingLines.filter((line) => ENDGAME_HEADING_PATTERN.test(line)),
      ...endgameLines,
    ]),
    scoreDetailsColumns: scoreDetailsRead.columns,
  };
}

async function readRatioCrops(input: {
  imageBuffer: OcrImageBytes;
  options: ReadGameResultScreenshotOptions | undefined;
  ops: OcrOps;
  size: { height: number; width: number };
}): Promise<ReadGameResultScreenshotResult> {
  const { imageBuffer, options, ops, size } = input;
  const [
    focusedEndgameCropBuffer,
    expandedEndgameCropBuffer,
    headingStripBuffer,
  ] = await Promise.all([
    extractTopCropBuffer({
      config: FOCUSED_ENDGAME_CROP,
      height: size.height,
      imageBuffer,
      ops,
      width: size.width,
    }),
    extractTopCropBuffer({
      config: EXPANDED_ENDGAME_CROP,
      height: size.height,
      imageBuffer,
      ops,
      width: size.width,
    }),
    extractTopCropBuffer({
      config: HEADING_STRIP_CROP,
      height: size.height,
      imageBuffer,
      ops,
      width: size.width,
    }),
  ]);
  // Starts at 50% so the per-player column headers (name + efficiency line,
  // around 53-55% on combined-result captures) are included, not just the
  // card list below them.
  const scoreDetailsCropBuffer = await ops.transformImage(imageBuffer, {
    crop: {
      height: size.height - Math.floor(size.height * 0.5),
      left: 0,
      top: Math.floor(size.height * 0.5),
      width: Math.max(1, Math.floor(size.width * 0.42)),
    },
  });
  const [
    focusedEndgameLines,
    endgameGlobalLines,
    headingStripLines,
    scoreDetailsRead,
  ] = await Promise.all([
    readEndgameScreenshot(
      new File([focusedEndgameCropBuffer], 'game-result-endgame-focused.png', {
        type: 'image/png',
      }),
      options,
      ops,
    ),
    readOcrTextLinesWithOps(expandedEndgameCropBuffer, ops),
    readOcrTextLinesWithOps(headingStripBuffer, ops),
    readScoreDetailsScreenshot(
      new File([scoreDetailsCropBuffer], 'game-result-details.png', {
        type: 'image/png',
      }),
      ops,
    ),
  ]);
  const expandedEndgameLines = shouldRetryWithExpandedCrop({
    endgameLines: focusedEndgameLines,
    options,
  })
    ? await readEndgameScreenshot(
        new File(
          [expandedEndgameCropBuffer],
          'game-result-endgame-expanded.png',
          {
            type: 'image/png',
          },
        ),
        options,
        ops,
      )
    : [];
  const headingLines = [...headingStripLines, ...endgameGlobalLines].filter(
    (line) => ENDGAME_HEADING_PATTERN.test(line),
  );

  return {
    endgameLines: buildUniqueLines([
      ...headingLines,
      ...focusedEndgameLines,
      ...expandedEndgameLines,
    ]),
    scoreDetailsColumns: scoreDetailsRead.columns,
  };
}

export async function readGameResultScreenshot(
  file: File,
  options: ReadGameResultScreenshotOptions | undefined,
  ops: OcrOps,
): Promise<ReadGameResultScreenshotResult> {
  const imageBuffer = new Uint8Array(await file.arrayBuffer());
  const size = await ops.getImageSize(imageBuffer);

  if (!size) {
    return {
      endgameLines: await readEndgameScreenshot(file, options, ops),
      scoreDetailsColumns: [],
    };
  }

  const pixels = await ops.readPixels(imageBuffer);
  const regions = pixels ? locateGameResultRegions(pixels) : null;

  if (regions && regions.scoreTableRows.length > 0) {
    return readLocatedRegions({
      imageBuffer,
      options,
      ops,
      regions,
      size,
    });
  }

  return readRatioCrops({ imageBuffer, options, ops, size });
}
