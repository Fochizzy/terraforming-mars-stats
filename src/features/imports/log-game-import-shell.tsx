'use client';

import { useRouter } from 'next/navigation';
import { describeUnknownError } from '@/lib/errors/describe-unknown-error';
import type { MapOption } from '@/lib/db/reference-repo';
import {
  WebImportPage,
  type WebImportActionResult,
  type WebImportCreatePlayerResult,
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
  onCreateImportPlayer?: (
    importedName: string,
  ) => Promise<WebImportCreatePlayerResult>;
  onCreateImportDraft: (formData: FormData) => Promise<WebImportActionResult>;
};

export function LogGameImportShell({
  initialValues,
  mapOptions,
  onAnalyzeImportEvidence,
  onCreateImportPlayer,
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

  async function handleStartImport(formData: FormData): Promise<WebImportActionResult> {
    try {
      const result = await onCreateImportDraft(formData);

      if (result.status === 'success' && result.gameId) {
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

  async function handleCreateImportPlayer(
    importedName: string,
  ): Promise<WebImportCreatePlayerResult> {
    if (!onCreateImportPlayer) {
      return {
        status: 'error',
        message: 'Unable to create that roster player right now.',
      };
    }

    try {
      const result = await onCreateImportPlayer(importedName);

      return {
        ...result,
        message: result.message ?? 'Player added to the shared roster.',
      };
    } catch (error) {
      return {
        status: 'error',
        message: describeUnknownError(
          error,
          'Unable to create that roster player right now.',
        ),
      };
    }
  }

  return (
    <WebImportPage
      initialValues={initialValues}
      mapOptions={mapOptions}
      onAnalyzeImportEvidence={handleAnalyzeImport}
      onCreateImportPlayer={onCreateImportPlayer ? handleCreateImportPlayer : undefined}
      onConfirmImportReview={handleStartImport}
    />
  );
}
