import sharp from 'sharp';
import { readOcrTextLinesFromBuffer } from './card-scoring/read-ocr-text-lines';

export type ReadScoreDetailsScreenshotResult = {
  columns: Array<{
    textLines: string[];
  }>;
};

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

export async function readScoreDetailsScreenshot(
  file: File,
): Promise<ReadScoreDetailsScreenshotResult> {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    return {
      columns: [
        {
          textLines: await readOcrTextLinesFromBuffer(imageBuffer),
        },
      ],
    };
  }

  const splitLeft = Math.floor(metadata.width / 2);
  const columnBuffers = await Promise.all([
    sharp(imageBuffer)
      .extract({
        height: metadata.height,
        left: 0,
        top: 0,
        width: splitLeft,
      })
      .png()
      .toBuffer(),
    sharp(imageBuffer)
      .extract({
        height: metadata.height,
        left: splitLeft,
        top: 0,
        width: metadata.width - splitLeft,
      })
      .png()
      .toBuffer(),
  ]);
  const columns = await Promise.all(
    columnBuffers.map(async (buffer) => ({
      textLines: buildUniqueLines(await readOcrTextLinesFromBuffer(buffer)),
    })),
  );

  return { columns };
}
