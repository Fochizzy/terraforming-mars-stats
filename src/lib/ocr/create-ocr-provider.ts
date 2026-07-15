import { HttpOcrProvider } from './http-ocr-provider';

export function createOcrProvider() {
  const endpoint = process.env.OCR_API_ENDPOINT;
  const apiKey = process.env.OCR_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error('OCR_API_ENDPOINT and OCR_API_KEY are not configured');
  }

  return new HttpOcrProvider({
    apiKey,
    endpoint,
  });
}
