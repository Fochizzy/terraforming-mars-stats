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
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'content-type': input.mimeType,
      },
      body: input.bytes,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new Error(
        `OCR request failed (${response.status}): ${responseText}`,
      );
    }

    const result = (await response.json()) as OcrApiResponse;
    const rawText = result.text?.trim();

    if (!rawText) {
      throw new Error('OCR provider returned no text');
    }

    return {
      engineName: 'http-ocr',
      engineVersion: result.version ?? null,
      meanConfidence: normalizeConfidence(result.confidence),
      rawText,
    };
  }
}

function normalizeConfidence(
  confidence: number | undefined,
): number | null {
  if (confidence === undefined || !Number.isFinite(confidence)) {
    return null;
  }

  const normalized = confidence > 1 ? confidence / 100 : confidence;
  return Math.min(Math.max(normalized, 0), 1);
}
