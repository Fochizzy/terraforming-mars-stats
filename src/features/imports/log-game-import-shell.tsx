'use client';

import { useRouter } from 'next/navigation';
import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import type { CreateImportDraftInput } from '@/lib/imports/build-import-draft';
import type {
  ImportPlayerIdentityCandidate,
  ImportPlayerIdentityDraftInput,
} from '@/lib/player-identity/guest-identity';
import type { ImportedScoreRow } from '@/lib/imports/parse-terraforming-mars-endgame-ocr';
import type { ImportObjectiveCorrection } from '@/lib/imports/parse-terraforming-mars-log';
import type { ImportPlayedEntityCorrection } from '@/lib/imports/parse-terraforming-mars-played-entities';
import type { ImportObjectiveConfiguration } from '@/lib/imports/objective-configuration';
import { WebImportPage, type WebImportActionResult } from './web-import-page';

type LogGameImportShellProps = {
  groupName: string;
  playerCandidates: ImportPlayerIdentityCandidate[];
  referenceCatalog: ImportGameReferenceCatalog;
  onCreateImportDraft: (
    values: CreateImportDraftInput,
  ) => Promise<WebImportActionResult>;
};

export function LogGameImportShell({
  groupName,
  playerCandidates,
  referenceCatalog,
  onCreateImportDraft,
}: LogGameImportShellProps) {
  const router = useRouter();

  async function handleStartImport(values: {
    acknowledgeDuplicateSource: boolean;
    endgameScreenshot: File | null;
    exportedGameLog: string;
    generationCount: number;
    mapId: string;
    ocrConfidence: number | null;
    objectiveConfiguration: ImportObjectiveConfiguration;
    objectiveCorrections: ImportObjectiveCorrection[];
    playedOn: string;
    playerIdentities: ImportPlayerIdentityDraftInput[];
    playerCount: number;
    playedEntityCorrections: ImportPlayedEntityCorrection[];
    rawOcrText: string;
    scoreRows: ImportedScoreRow[];
  }): Promise<WebImportActionResult> {
    try {
      const result = await onCreateImportDraft({
        // Explicit duplicate-source confirmation travels only when the
        // importer checked it against the currently pasted text.
        acknowledgeDuplicateSource: values.acknowledgeDuplicateSource,
        endgameScreenshot: values.endgameScreenshot,
        endgameScreenshotName: values.endgameScreenshot?.name ?? null,
        exportedGameLog: values.exportedGameLog,
        generationCount: values.generationCount,
        mapId: values.mapId,
        ocrConfidence: values.ocrConfidence,
        // The importer's board-defined/randomized objective choice is a user
        // input the server cannot re-derive; forward it so server revalidation
        // and map detection use the same objective scope as the review UI.
        objectiveConfiguration: values.objectiveConfiguration,
        objectiveCorrections: values.objectiveCorrections,
        playedOn: values.playedOn,
        playerIdentities: values.playerIdentities,
        playerCount: values.playerCount,
        playedEntityCorrections: values.playedEntityCorrections,
        rawOcrText: values.rawOcrText,
        scoreRows: values.scoreRows,
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
      playerCandidates={playerCandidates}
      referenceCatalog={referenceCatalog}
      onStartImport={handleStartImport}
    />
  );
}
