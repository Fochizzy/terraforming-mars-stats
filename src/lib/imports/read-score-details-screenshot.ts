import type { OcrOps } from './ocr/ocr-ops';
import { readOcrTextLinesWithOps } from './ocr/read-ocr-text-lines-with-ops';

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
  ops: OcrOps,
): Promise<ReadScoreDetailsScreenshotResult> {
  const imageBuffer = new Uint8Array(await file.arrayBuffer());
  const size = await ops.getImageSize(imageBuffer);

  if (!size) {
    return {
      columns: [
        {
          textLines: await readOcrTextLinesWithOps(imageBuffer, ops),
        },
      ],
    };
  }

  const splitLeft = Math.floor(size.width / 2);
  const columnBuffers = await Promise.all([
    ops.transformImage(imageBuffer, {
      crop: {
        height: size.height,
        left: 0,
        top: 0,
        width: splitLeft,
      },
    }),
    ops.transformImage(imageBuffer, {
      crop: {
        height: size.height,
        left: splitLeft,
        top: 0,
        width: size.width - splitLeft,
      },
    }),
  ]);
  const columns = await Promise.all(
    columnBuffers.map(async (buffer) => ({
      textLines: buildUniqueLines(await readOcrTextLinesWithOps(buffer, ops)),
    })),
  );

  return { columns };
}
