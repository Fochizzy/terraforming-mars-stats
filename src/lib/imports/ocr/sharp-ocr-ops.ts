import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import type { OcrOps } from './ocr-ops';

const TESSERACT_SINGLE_LINE_PAGE_SEGMENTATION_MODE = 7;
const SINGLE_LINE_OCR_OPTIONS = {
  tessedit_pageseg_mode: TESSERACT_SINGLE_LINE_PAGE_SEGMENTATION_MODE,
} as unknown as Parameters<typeof Tesseract.recognize>[2];

export const sharpOcrOps: OcrOps = {
  async getImageSize(image) {
    const metadata = await sharp(Buffer.from(image)).metadata();

    if (!metadata.width || !metadata.height) {
      return null;
    }

    return {
      height: metadata.height,
      width: metadata.width,
    };
  },
  async recognizeText(image, options) {
    const result = options?.singleLine
      ? await Tesseract.recognize(
          Buffer.from(image),
          'eng',
          SINGLE_LINE_OCR_OPTIONS,
        )
      : await Tesseract.recognize(Buffer.from(image), 'eng');

    return result.data.text;
  },
  async transformImage(image, transform) {
    let pipeline = sharp(Buffer.from(image));

    if (transform.crop) {
      pipeline = pipeline.extract(transform.crop);
    }

    if (transform.resizeWidth) {
      pipeline = pipeline.resize({
        width: transform.resizeWidth,
        withoutEnlargement: false,
      });
    }

    if (transform.grayscale) {
      pipeline = pipeline.grayscale();
    }

    if (transform.normalize) {
      pipeline = pipeline.normalize();
    }

    if (transform.sharpen) {
      pipeline = pipeline.sharpen();
    }

    if (typeof transform.threshold === 'number') {
      pipeline = pipeline.threshold(transform.threshold);
    }

    return new Uint8Array(await pipeline.png().toBuffer());
  },
};
