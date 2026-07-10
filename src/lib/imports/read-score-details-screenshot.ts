import type { OcrImageCrop, OcrOps } from './ocr/ocr-ops';
import { readOcrTextLinesWithOps } from './ocr/read-ocr-text-lines-with-ops';

export type ReadScoreDetailsScreenshotOptions = {
  /**
   * One rect per player column, in the coordinates of the passed image. Without
   * them the image is split down the middle, which only holds for a two-player
   * capture cropped to the details block.
   */
  columnRects?: OcrImageCrop[];
};

export type ReadScoreDetailsScreenshotResult = {
  columns: Array<{
    textLines: string[];
  }>;
};

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

function buildEvenColumnRects(size: {
  height: number;
  width: number;
}): OcrImageCrop[] {
  const splitLeft = Math.floor(size.width / 2);

  return [
    { height: size.height, left: 0, top: 0, width: splitLeft },
    {
      height: size.height,
      left: splitLeft,
      top: 0,
      width: size.width - splitLeft,
    },
  ];
}

export async function readScoreDetailsScreenshot(
  file: File,
  ops: OcrOps,
  options?: ReadScoreDetailsScreenshotOptions,
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

  const columnRects = options?.columnRects?.length
    ? options.columnRects
    : buildEvenColumnRects(size);
  const columns = await Promise.all(
    columnRects.map(async (crop) => ({
      textLines: buildUniqueLines(
        await readOcrTextLinesWithOps(
          await ops.transformImage(imageBuffer, { crop }),
          ops,
          { resizeWidth: buildColumnResizeWidth(crop.width) },
        ),
      ),
    })),
  );

  return { columns };
}

const MIN_COLUMN_RESIZE_WIDTH = 900;
const MAX_COLUMN_RESIZE_WIDTH = 1800;
const COLUMN_UPSCALE = 6;

function buildColumnResizeWidth(width: number) {
  return Math.min(
    MAX_COLUMN_RESIZE_WIDTH,
    Math.max(MIN_COLUMN_RESIZE_WIDTH, width * COLUMN_UPSCALE),
  );
}
