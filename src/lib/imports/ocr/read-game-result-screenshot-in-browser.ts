import {
  readGameResultScreenshot,
  type ReadGameResultScreenshotOptions,
  type ReadGameResultScreenshotResult,
} from '../read-game-result-screenshot';
import { browserOcrOps } from './browser-ocr-ops';

/**
 * Runs the full game-result screenshot OCR in the browser. The deployed
 * Cloudflare Worker cannot run sharp or tesseract, so the web client extracts
 * the text lines before submitting and sends them with the form.
 */
export async function readGameResultScreenshotInBrowser(
  file: File,
  options?: ReadGameResultScreenshotOptions,
): Promise<ReadGameResultScreenshotResult> {
  return readGameResultScreenshot(file, options, browserOcrOps);
}
