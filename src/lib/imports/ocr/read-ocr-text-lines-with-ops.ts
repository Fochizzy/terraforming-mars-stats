import type { OcrImageBytes, OcrOps } from './ocr-ops';

export function normalizeOcrTextLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .map((line) => line.replace(/^[^A-Za-z0-9]+/, '').trim())
    .filter(Boolean);
}

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

export type ReadOcrTextLinesOptions = {
  /**
   * Width the image is upscaled to before recognition. Narrow crops need a
   * smaller target than the default, which would otherwise enlarge an 80px
   * column more than twentyfold.
   */
  resizeWidth?: number;
};

const DEFAULT_RESIZE_WIDTH = 1800;
const DEFAULT_BOTTOM_RESIZE_WIDTH = 2200;

async function buildOcrPassImages(
  image: OcrImageBytes,
  ops: OcrOps,
  options?: ReadOcrTextLinesOptions,
) {
  const size = await ops.getImageSize(image);
  const resizeWidth = options?.resizeWidth ?? DEFAULT_RESIZE_WIDTH;
  const basePasses = await Promise.all([
    ops.transformImage(image, {
      grayscale: true,
      normalize: true,
      resizeWidth,
      sharpen: true,
    }),
    ops.transformImage(image, {
      grayscale: true,
      normalize: true,
      resizeWidth,
      sharpen: true,
      threshold: 150,
    }),
  ]);

  if (!size) {
    return basePasses;
  }

  const bottomTop = Math.floor(size.height * 0.45);
  const bottomHeight = Math.max(1, size.height - bottomTop);
  const bottomPass = await ops.transformImage(image, {
    crop: {
      height: bottomHeight,
      left: 0,
      top: bottomTop,
      width: size.width,
    },
    grayscale: true,
    normalize: true,
    resizeWidth: options?.resizeWidth
      ? Math.round(options.resizeWidth * 1.2)
      : DEFAULT_BOTTOM_RESIZE_WIDTH,
    sharpen: true,
  });

  return [...basePasses, bottomPass];
}

export async function readOcrTextLinesWithOps(
  image: OcrImageBytes,
  ops: OcrOps,
  options?: ReadOcrTextLinesOptions,
) {
  const passImages = await buildOcrPassImages(image, ops, options);
  const texts = await Promise.all(
    passImages.map(async (passImage) =>
      normalizeOcrTextLines(await ops.recognizeText(passImage)),
    ),
  );

  return buildUniqueLines(texts.flat());
}
