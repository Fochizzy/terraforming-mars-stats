import type { OcrImageBytes, OcrImageTransform, OcrOps } from './ocr-ops';

type BrowserCanvas = HTMLCanvasElement | OffscreenCanvas;
type BrowserCanvasContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;
type TesseractModule = typeof import('tesseract.js');
type TesseractWorker = Awaited<
  ReturnType<TesseractModule['createWorker']>
>;

// The Node pipeline's single-line hint is passed through Tesseract.recognize
// options where tesseract.js does not apply it as an engine parameter, so the
// browser worker intentionally leaves the page segmentation mode at its
// default too — forcing PSM 7 here degrades rows whose text needs
// auto-inversion (light row backgrounds).
let defaultWorkerPromise: Promise<TesseractWorker> | null = null;

async function createRecognizeWorker() {
  const { createWorker } = await import('tesseract.js');

  return createWorker('eng');
}

function getRecognizeWorker() {
  defaultWorkerPromise ??= createRecognizeWorker();

  return defaultWorkerPromise;
}

function createCanvas(width: number, height: number): BrowserCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

function getCanvasContext(canvas: BrowserCanvas): BrowserCanvasContext {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create a 2D canvas context for screenshot OCR.');
  }

  return context as BrowserCanvasContext;
}

function applyGrayscale(imageData: ImageData) {
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = Math.round(
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114,
    );

    pixels[index] = luminance;
    pixels[index + 1] = luminance;
    pixels[index + 2] = luminance;
  }
}

function applyNormalize(imageData: ImageData) {
  const pixels = imageData.data;
  let minimum = 255;
  let maximum = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const value = pixels[index];

    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }

  if (maximum <= minimum) {
    return;
  }

  const range = maximum - minimum;

  for (let index = 0; index < pixels.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[index + channel] = Math.round(
        ((pixels[index + channel] - minimum) * 255) / range,
      );
    }
  }
}

function applySharpen(imageData: ImageData) {
  const { data: source, height, width } = imageData;
  const output = new Uint8ClampedArray(source);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const center = (y * width + x) * 4 + channel;
        const sharpened =
          source[center] * 5 -
          source[center - 4] -
          source[center + 4] -
          source[center - width * 4] -
          source[center + width * 4];

        output[center] = Math.max(0, Math.min(255, sharpened));
      }
    }
  }

  imageData.data.set(output);
}

function applyThreshold(imageData: ImageData, threshold: number) {
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const value = pixels[index] >= threshold ? 255 : 0;

    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
  }
}

async function canvasToPngBytes(canvas: BrowserCanvas) {
  const blob =
    canvas instanceof OffscreenCanvas
      ? await canvas.convertToBlob({ type: 'image/png' })
      : await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((canvasBlob) => {
            if (canvasBlob) {
              resolve(canvasBlob);
            } else {
              reject(new Error('Unable to encode the screenshot OCR canvas.'));
            }
          }, 'image/png');
        });

  return new Uint8Array(await blob.arrayBuffer());
}

async function renderTransformedCanvas(
  image: OcrImageBytes,
  transform: OcrImageTransform,
) {
  const bitmap = await createImageBitmap(new Blob([image]));

  try {
    const crop = transform.crop ?? {
      height: bitmap.height,
      left: 0,
      top: 0,
      width: bitmap.width,
    };
    const scale = transform.resizeWidth ? transform.resizeWidth / crop.width : 1;
    const width = Math.max(1, Math.round(crop.width * scale));
    const height = Math.max(1, Math.round(crop.height * scale));
    const canvas = createCanvas(width, height);
    const context = getCanvasContext(canvas);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      crop.left,
      crop.top,
      crop.width,
      crop.height,
      0,
      0,
      width,
      height,
    );

    if (
      transform.grayscale ||
      transform.normalize ||
      transform.sharpen ||
      typeof transform.threshold === 'number'
    ) {
      const imageData = context.getImageData(0, 0, width, height);

      if (transform.grayscale) {
        applyGrayscale(imageData);
      }

      if (transform.normalize) {
        applyNormalize(imageData);
      }

      if (transform.sharpen) {
        applySharpen(imageData);
      }

      if (typeof transform.threshold === 'number') {
        applyThreshold(imageData, transform.threshold);
      }

      context.putImageData(imageData, 0, 0);
    }

    return canvas;
  } finally {
    bitmap.close();
  }
}

export const browserOcrOps: OcrOps = {
  async getImageSize(image) {
    const bitmap = await createImageBitmap(new Blob([image]));
    const size = {
      height: bitmap.height,
      width: bitmap.width,
    };

    bitmap.close();

    return size.width && size.height ? size : null;
  },
  async recognizeText(image) {
    const worker = await getRecognizeWorker();
    const result = await worker.recognize(
      new Blob([image], { type: 'image/png' }) as unknown as File,
    );

    return result.data.text;
  },
  async transformImage(image, transform) {
    return canvasToPngBytes(await renderTransformedCanvas(image, transform));
  },
};
