import sharp from 'sharp';
import { readOcrTextLinesFromBuffer } from './card-scoring/read-ocr-text-lines';
import { readEndgameScreenshot } from './read-endgame-screenshot';
import { readScoreDetailsScreenshot } from './read-score-details-screenshot';

export type ReadGameResultScreenshotOptions = {
  expectedPlayerCount?: number;
  expectedPlayerNames?: string[];
};

export type ReadGameResultScreenshotResult = {
  endgameLines: string[];
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
  /^victory points?\s+breakdown after\s+\d+\s+generations?$/i;
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
const HEADING_ENDGAME_CROP: TopCropConfig = {
  heightRatio: 0.08,
  leftRatio: 0,
  topRatio: 0,
  widthRatio: 0.72,
};

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

function extractTopCropBuffer(input: {
  config: TopCropConfig;
  height: number;
  imageBuffer: Buffer;
  width: number;
}) {
  return sharp(input.imageBuffer)
    .extract({
      height: Math.max(1, Math.floor(input.height * input.config.heightRatio)),
      left: Math.floor(input.width * input.config.leftRatio),
      top: Math.floor(input.height * input.config.topRatio),
      width: Math.max(1, Math.floor(input.width * input.config.widthRatio)),
    })
    .png()
    .toBuffer();
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

export async function readGameResultScreenshot(
  file: File,
  options?: ReadGameResultScreenshotOptions,
): Promise<ReadGameResultScreenshotResult> {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    return {
      endgameLines: await readEndgameScreenshot(file, options),
      scoreDetailsColumns: [],
    };
  }

  const focusedEndgameCropBuffer = await extractTopCropBuffer({
    config: FOCUSED_ENDGAME_CROP,
    height: metadata.height,
    imageBuffer,
    width: metadata.width,
  });
  const expandedEndgameCropBuffer = await extractTopCropBuffer({
    config: EXPANDED_ENDGAME_CROP,
    height: metadata.height,
    imageBuffer,
    width: metadata.width,
  });
  const headingEndgameCropBuffer = await extractTopCropBuffer({
    config: HEADING_ENDGAME_CROP,
    height: metadata.height,
    imageBuffer,
    width: metadata.width,
  });
  const scoreDetailsCropBuffer = await sharp(imageBuffer)
    .extract({
      height: metadata.height - Math.floor(metadata.height * 0.6),
      left: 0,
      top: Math.floor(metadata.height * 0.6),
      width: Math.max(1, Math.floor(metadata.width * 0.42)),
    })
    .png()
    .toBuffer();
  const [
    focusedEndgameLines,
    endgameGlobalLines,
    endgameHeadingLines,
    scoreDetailsRead,
  ] =
    await Promise.all([
      readEndgameScreenshot(
        new File([focusedEndgameCropBuffer], 'game-result-endgame-focused.png', {
          type: 'image/png',
        }),
        options,
      ),
      readOcrTextLinesFromBuffer(expandedEndgameCropBuffer),
      readOcrTextLinesFromBuffer(headingEndgameCropBuffer),
      readScoreDetailsScreenshot(
        new File([scoreDetailsCropBuffer], 'game-result-details.png', {
          type: 'image/png',
        }),
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
      )
    : [];
  const headingLines = [...endgameGlobalLines, ...endgameHeadingLines].filter(
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
