'use client';

import { useRouter } from 'next/navigation';
import { describeUnknownError } from '@/lib/errors/describe-unknown-error';
import {
  saveImportReviewJumpState,
  type ImportReviewJumpTarget,
} from '@/lib/imports/import-review-jump-state';
import type { MapOption } from '@/lib/db/reference-repo';
import {
  WebImportPage,
  type WebImportActionResult,
} from './web-import-page';

type LogGameImportShellProps = {
  initialValues: {
    generationCount: number;
    mapId: string;
    playedOn: string;
    playerCount: number;
  };
  mapOptions: MapOption[];
  onAnalyzeImportEvidence: (
    formData: FormData,
  ) => Promise<WebImportActionResult>;
  onCreateImportDraft: (formData: FormData) => Promise<WebImportActionResult>;
};

export function LogGameImportShell({
  initialValues,
  mapOptions,
  onAnalyzeImportEvidence,
  onCreateImportDraft,
}: LogGameImportShellProps) {
  const router = useRouter();

  async function handleAnalyzeImport(
    formData: FormData,
  ): Promise<WebImportActionResult> {
    try {
      const result = await onAnalyzeImportEvidence(formData);

      return {
        ...result,
        message: result.message ?? 'Import evidence analyzed.',
      };
    } catch (error) {
      return {
        status: 'error',
        message: describeUnknownError(
          error,
          'Unable to analyze this import evidence right now.',
        ),
      };
    }
  }

  async function handleStartImport(
    formData: FormData,
    jumpTarget?: ImportReviewJumpTarget | null,
  ): Promise<WebImportActionResult> {
    try {
      const result = await onCreateImportDraft(formData);

      if (result.status === 'success' && result.gameId) {
        if (jumpTarget) {
          saveImportReviewJumpState({
            gameId: result.gameId,
            ...jumpTarget,
          });
        }

        router.push(`/log-game?gameId=${result.gameId}`);
      }

      return {
        ...result,
        message: result.message ?? 'Import draft and evidence saved.',
      };
    } catch (error) {
      return {
        status: 'error',
        message: describeUnknownError(
          error,
          'Unable to save this import draft right now.',
        ),
      };
    }
  }

  return (
    <WebImportPage
      initialValues={initialValues}
      mapOptions={mapOptions}
      onAnalyzeImportEvidence={handleAnalyzeImport}
      onConfirmImportReview={handleStartImport}
    />
  );
}
