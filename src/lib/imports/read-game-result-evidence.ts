import type { OcrOps } from './ocr/ocr-ops';
import { isPdfBytes } from './pdf/extract-pdf-text';
import { readGameResultPdf } from './read-game-result-pdf';
import {
  readGameResultScreenshot,
  type ReadGameResultScreenshotOptions,
  type ReadGameResultScreenshotResult,
} from './read-game-result-screenshot';

/**
 * Reads an uploaded game result into extracted text, from either a printed PDF
 * (exact text layer, no OCR) or a screenshot. `resolveOcrOps` is only awaited
 * for screenshots so PDF imports never load sharp or tesseract.
 */
export async function readGameResultEvidence(input: {
  file: File;
  options?: ReadGameResultScreenshotOptions;
  resolveOcrOps: () => Promise<OcrOps>;
}): Promise<ReadGameResultScreenshotResult> {
  const bytes = new Uint8Array(await input.file.arrayBuffer());

  if (isPdfBytes(bytes)) {
    return readGameResultPdf(bytes);
  }

  return readGameResultScreenshot(
    input.file,
    input.options,
    await input.resolveOcrOps(),
  );
}
