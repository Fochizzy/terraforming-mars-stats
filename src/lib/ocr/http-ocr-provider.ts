import type {
  OcrProvider,
  OcrRecognitionResult,
} from './ocr-provider';

type OcrApiResponse = {
  confidence?: number;
  text?: string;
  version?: string;
};

export class HttpOcrProvider implements OcrProvider {
  constructor(
    private readonly config: {
      apiKey: string;
      endpoint: string;
    },
  ) {}

  async recognize(input: {
    bytes: ArrayBuffer;
    mimeType: string;
  }): Promise<OcrRecognitionResult> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',