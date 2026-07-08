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

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
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

  const endgameCropBuffer = await sharp(imageBuffer)
    .extract({
      height: Math.max(1, Math.floor(metadata.height * 0.1)),
      left: Math.floor(metadata.width * 0.024),
      top: Math.floor(metadata.height * 0.009),
      width: Math.max(1, Math.floor(metadata.width * 0.56)),
    })
    .png()
    .toBuffer();
  const scoreDetailsCropBuffer = await sharp(imageBuffer)
    .extract({
      height: metadata.height - Math.floor(metadata.height * 0.6),
      left: 0,
      top: Math.floor(metadata.height * 0.6),
      width: Math.max(1, Math.floor(metadata.width * 0.42)),
    })
    .png()
    .toBuffer();
  const [endgameLines, endgameGlobalLines, scoreDetailsRead] = await Promise.all([
    readEndgameScreenshot(
      new File([endgameCropBuffer], 'game-result-endgame.png', {
        type: 'image/png',
      }),
      options,
    ),
    readOcrTextLinesFromBuffer(endgameCropBuffer),
    readScoreDetailsScreenshot(
      new File([scoreDetailsCropBuffer], 'game-result-details.png', {
        type: 'image/png',
      }),
    ),
  ]);
  const headingLines = endgameGlobalLines.filter((line) =>
    /^victory points?\s+breakdown after\s+\d+\s+generations?$/i.test(line),
  );

  return {
    endgameLines: buildUniqueLines([...headingLines, ...endgameLines]),
    scoreDetailsColumns: scoreDetailsRead.columns,
  };
}
