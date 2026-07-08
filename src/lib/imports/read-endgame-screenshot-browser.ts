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

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

function normalizeOcrLine(line: string) {
  return line.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
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

async function cropImageToBlob(input: {
  config: TopCropConfig;
  image: HTMLImageElement;
}) {
  const width = input.image.naturalWidth || input.image.width;
  const height = input.image.naturalHeight || input.image.height;
  const cropWidth = Math.max(1, Math.floor(width * input.config.widthRatio));
  const cropHeight = Math.max(1, Math.floor(height * input.config.heightRatio));
  const cropLeft = Math.floor(width * input.config.leftRatio);
  const cropTop = Math.floor(height * input.config.topRatio);
  const canvas = document.createElement('canvas');

  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to prepare the screenshot crop for OCR.');
  }

  context.drawImage(
    input.image,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return convertCanvasToBlob(canvas);
}

async function readOcrTextLinesFromBlob(blob: Blob) {
  const TesseractModule = await import('tesseract.js');
  const Tesseract = TesseractModule.default ?? TesseractModule;
  const result = await Tesseract.recognize(blob, 'eng');

  return result.data.text
    .split(/\r?\n/g)
    .map(normalizeOcrLine)
    .filter(Boolean);
}

export async function readGameResultEndgameLinesInBrowser(file: File) {
  const image = await loadImageElement(file);
  const [focusedCropBlob, expandedCropBlob] = await Promise.all([
    cropImageToBlob({
      config: FOCUSED_ENDGAME_CROP,
      image,
    }),
    cropImageToBlob({
      config: EXPANDED_ENDGAME_CROP,
      image,
    }),
  ]);
  const [focusedLines, expandedLines] = await Promise.all([
    readOcrTextLinesFromBlob(focusedCropBlob),
    readOcrTextLinesFromBlob(expandedCropBlob),
  ]);
  const headingLines = expandedLines.filter((line) =>
    ENDGAME_HEADING_PATTERN.test(line),
  );

  return buildUniqueLines([
    ...headingLines,
    ...focusedLines,
    ...expandedLines,
  ]);
}
