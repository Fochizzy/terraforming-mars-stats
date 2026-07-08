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

async function buildOcrPassImages(image: OcrImageBytes, ops: OcrOps) {
  const size = await ops.getImageSize(image);
  const basePasses = await Promise.all([
    ops.transformImage(image, {
      grayscale: true,
      normalize: true,
      resizeWidth: 1800,
      sharpen: true,
    }),
    ops.transformImage(image, {
      grayscale: true,
      normalize: true,
      resizeWidth: 1800,
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
    resizeWidth: 2200,
    sharpen: true,
  });

  return [...basePasses, bottomPass];
}

export async function readOcrTextLinesWithOps(
  image: OcrImageBytes,
  ops: OcrOps,
) {
  const passImages = await buildOcrPassImages(image, ops);
  const texts = await Promise.all(
    passImages.map(async (passImage) =>
      normalizeOcrTextLines(await ops.recognizeText(passImage)),
    ),
  );

  return buildUniqueLines(texts.flat());
}
