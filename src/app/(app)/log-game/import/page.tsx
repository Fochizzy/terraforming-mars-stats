import { AppShell } from '@/components/layout/app-shell';
import { LogGameImportShell } from '@/features/imports/log-game-import-shell';
import { saveDraftGame } from '@/lib/db/game-draft-repo';
import { saveGameLogImport } from '@/lib/db/game-import-repo';
import { correctAndSaveOcrText } from '@/lib/db/ocr-correction-repo';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import {
  buildImportDraft,
  type CreateImportDraftInput,
} from '@/lib/imports/build-import-draft';
import { listPlayers } from '@/lib/db/player-repo';
import { listMaps } from '@/lib/db/reference-repo';
import { pageMetadata } from '@/lib/navigation/route-metadata';
import { revalidatePath } from 'next/cache';

export const metadata = pageMetadata('/log-game/import');

export default async function LogGameImportPage() {
  const context = await requireCurrentGroupContext();
  const [groupSettings, mapOptions, playerOptions] = await Promise.all([
    getGroupSettings(context.groupId),
    listMaps(),
    listPlayers(context.groupId),
  ]);

  async function handleCreateImportDraft(values: CreateImportDraftInput) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const activeGroupSettings = await getGroupSettings(activeContext.groupId);
    const draftForm = buildImportDraft({
      defaultGuaranteedMergerOffer:
        activeGroupSettings.defaultGuaranteedMergerOffer,
      defaultExpansionCodes: activeGroupSettings.defaultExpansionCodes,
      defaultPromoSetSlugs: activeGroupSettings.defaultPromoSetSlugs,
      groupId: activeContext.groupId,
      importValues: values,
    });
    const draft = await saveDraftGame({
      form: draftForm,
      userId: activeContext.userId,
    });
    const gameLogImport = await saveGameLogImport({
      gameId: draft.gameId,
      rawLogText: values.exportedGameLog,
      screenshotFile: values.endgameScreenshot,
      userId: activeContext.userId,
    });

    let ocr:
      | {
          attemptId: string;
          needsReviewCount: number;
          status: 'needs_review' | 'ready_to_parse';
          unresolvedCount: number;
        }
      | null = null;
    let ocrWarning: string | null = null;

    if (values.rawOcrText?.trim()) {
      try {
        const result = await correctAndSaveOcrText({
          engineName: 'tesseract.js',
          engineVersion: '6.0.1',
          gameLogImportId: gameLogImport.id,
          meanConfidence: values.ocrConfidence ?? null,
          metadata: {
            execution_environment: 'browser',
            screenshot_name: values.endgameScreenshotName ?? null,
          },
          preprocessingVariant: 'original',
          rawOcrText: values.rawOcrText.trim(),
          regionType: 'full_image',
        });

        const needsReviewCount = result.needsReview.length;
        const unresolvedCount = result.unresolved.length;

        ocr = {
          attemptId: result.attemptId,
          needsReviewCount,
          status:
            needsReviewCount > 0 || unresolvedCount > 0
              ? 'needs_review'
              : 'ready_to_parse',
          unresolvedCount,
        };
      } catch (error) {
        console.error('OCR correction persistence failed', {
          error,
          gameLogImportId: gameLogImport.id,
        });
        ocrWarning =
          'The import was saved, but its recognized screenshot text could not be processed.';
      }
    } else if (values.endgameScreenshot) {
      ocrWarning =
        'The import was saved, but no readable screenshot text was available.';
    }

    revalidatePath('/log-game');

    return {
      status: 'success' as const,
      gameId: draft.gameId,
      gameLogImportId: gameLogImport.id,
      ocr,
      message:
        ocr?.status === 'needs_review'
          ? `Import draft ${draft.gameId.slice(0, 8)} saved. Some OCR results require review.`
          : ocrWarning ??
            `Import draft ${draft.gameId.slice(0, 8)} saved with evidence.`,
    };
  }

  return (
    <AppShell hasActiveGroup title="Web Import">
      <LogGameImportShell
        initialValues={{
          generationCount: 10,
          mapId: groupSettings.defaultMapId ?? mapOptions[0]?.id ?? '',
          playedOn: new Date().toISOString().slice(0, 10),
          playerCount: Math.min(Math.max(playerOptions.length || 2, 1), 5),
        }}
        mapOptions={mapOptions}
        onCreateImportDraft={handleCreateImportDraft}
      />
    </AppShell>
  );
}
