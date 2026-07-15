import { correctAndSaveOcrText } from '@/lib/db/ocr-correction-repo';
import type { OcrProvider } from './ocr-provider';

export type ProcessImportScreenshotResult = {
  attemptId: string;
  correctedText: string;
  needsReviewCount: number;
  status: 'needs_review' | 'ready_to_parse';
  unresolvedCount: number;
};

export async function processImportScreenshot(input: {
  file: File;
  gameLogImportId: string;
  ocrProvider: OcrProvider;
}): Promise<ProcessImportScreenshotResult> {
  const bytes = await input.file.arrayBuffer();
  const recognition = await input.ocrProvider.recognize({
    bytes,
    mimeType: input.file.type || 'application/octet-stream',
  });

  const correction = await correctAndSaveOcrText({
    engineName: recognition.engineName,
    engineVersion: recognition.engineVersion,
    gameLogImportId: input.gameLogImportId,
    meanConfidence: recognition.meanConfidence,
    preprocessingVariant: 'original',
    rawOcrText: recognition.rawText,
    regionType: 'full_image',
  });

  const needsReviewCount = correction.needsReview.length;
  const unresolvedCount = correction.unresolved.length;

  return {
    attemptId: correction.attemptId,
    correctedText: correction.correctedText,
    needsReviewCount,
    status:
      needsReviewCount > 0 || unresolvedCount > 0
        ? 'needs_review'
        : 'ready_to_parse',
    unresolvedCount,
  };
}
