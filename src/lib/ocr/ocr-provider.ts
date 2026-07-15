export type OcrRecognitionResult = {
  engineName: string;
  engineVersion: string | null;
  meanConfidence: number | null;
  rawText: string;
};

export interface OcrProvider {
  recognize(input: {
    bytes: ArrayBuffer;
    mimeType: string;
  }): Promise<OcrRecognitionResult>;
}
