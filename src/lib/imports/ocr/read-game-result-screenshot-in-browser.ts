import { readGameResultEvidence } from '../read-game-result-evidence';
import type {
  ReadGameResultScreenshotOptions,
  ReadGameResultScreenshotResult,
} from '../read-game-result-screenshot';
import { browserOcrOps } from './browser-ocr-ops';

/**
 * Reads the uploaded game result in the browser. The deployed Cloudflare Worker
 * cannot run sharp or tesseract, so the web client extracts the text lines
 * before submitting and sends them with the form. A printed PDF is read from its
 * text layer instead, which needs no OCR at all.
 */
export async function readGameResultScreenshotInBrowser(
  file: File,
  options?: ReadGameResultScreenshotOptions,
): Promise<ReadGameResultScreenshotResult> {
  return readGameResultEvidence({
    file,
    options,
    resolveOcrOps: async () => browserOcrOps,
  });
}
