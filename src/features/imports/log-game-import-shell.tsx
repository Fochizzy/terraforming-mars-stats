'use client';

import { useRouter } from 'next/navigation';
import type { MapOption } from '@/lib/db/reference-repo';
import type { CreateImportDraftInput } from '@/lib/imports/build-import-draft';
import { WebImportPage, type WebImportActionResult } from './web-import-page';

type LogGameImportShellProps = {
  groupName: string;
  initialValues: {
    generationCount: number;
    mapId: string;
    playedOn: string;
    playerCount: number;
  };
  mapOptions: MapOption[];
  onCreateImportDraft: (
    values: CreateImportDraftInput,
  ) => Promise<WebImportActionResult>;
};

export function LogGameImportShell({
  groupName,
  initialValues,
  mapOptions,
  onCreateImportDraft,
}: LogGameImportShellProps) {
  const router = useRouter();

  async function handleStartImport(values: {
    endgameScreenshot: File | null;
    exportedGameLog: string;
    generationCount: number;
    mapId: string;
    ocrConfidence: number | null;
    playedOn: string;
    playerCount: number;
    rawOcrText: string;
  }): Promise<WebImportActionResult> {
    try {
      const result = await onCreateImportDraft({
        endgameScreenshot: values.endgameScreenshot,
        endgameScreenshotName: values.endgameScreenshot?.name ?? null,
        exportedGameLog: values.exportedGameLog,
        generationCount: values.generationCount,
        mapId: values.mapId,
        ocrConfidence: values.ocrConfidence,
        playedOn: values.playedOn,
        playerCount: values.playerCount,
        rawOcrText: values.rawOcrText,
      });

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
        message:
          error instanceof Error
            ? error.message
            : 'Unable to save this import draft right now.',
      };
    }
  }

  return (
    <WebImportPage
      groupName={groupName}
      initialValues={initialValues}
      mapOptions={mapOptions}
      onStartImport={handleStartImport}
    />
  );
}
