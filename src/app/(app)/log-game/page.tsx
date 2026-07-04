import { AppShell } from '@/components/layout/app-shell';
import { buildFinalizedGamePayload } from '@/features/games/finalize-game';
import { LogGameWizard } from '@/features/games/log-game/log-game-wizard';
import { ImportEvidenceSummary } from '@/features/imports/import-evidence-summary';
import { mergeDraftIntoInitialValues } from '@/features/games/log-game/use-log-game-draft';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import {
  finalizeGameLog,
  getDraftGameForm,
  saveDraftGame,
} from '@/lib/db/game-draft-repo';
import { getLatestGameLogImportSummary } from '@/lib/db/game-import-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import { listPlayers } from '@/lib/db/player-repo';
import {
  getLatestCatalogSnapshotId,
  listCards,
  listCorporations,
  listExpansions,
  listMapAwards,
  listMapMilestones,
  listMaps,
  listPreludes,
  listPromoSets,
  listStyles,
} from '@/lib/db/reference-repo';
import {
  logGameDraftSchema,
  type LogGameDraftInput,
} from '@/lib/validation/log-game';
import { revalidatePath } from 'next/cache';

export default async function LogGamePage({
  searchParams,
}: {
  searchParams?: Promise<{ gameId?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const context = await requireCurrentGroupContext();
  const [
    groupSettings,
    mapOptions,
    expansionOptions,
    promoSetOptions,
    playerOptions,
    corporationOptions,
    preludeOptions,
    milestoneOptions,
    awardOptions,
    styleOptions,
    cardOptions,
    latestCatalogSnapshotId,
  ] = await Promise.all([
    getGroupSettings(context.groupId),
    listMaps(),
    listExpansions(),
    listPromoSets(),
    listPlayers(context.groupId),
    listCorporations(),
    listPreludes(),
    listMapMilestones(),
    listMapAwards(),
    listStyles(),
    listCards(),
    getLatestCatalogSnapshotId(),
  ]);
  const draftGameId = Array.isArray(resolvedSearchParams.gameId)
    ? resolvedSearchParams.gameId[0]
    : resolvedSearchParams.gameId;
  const defaultInitialValues: LogGameDraftInput = {
    awardClaims: {},
    gameId: undefined,
    groupId: context.groupId,
    playedOn: new Date().toISOString().slice(0, 10),
    mapId: groupSettings.defaultMapId ?? mapOptions[0]?.id ?? '',
    milestoneClaims: {},
    notes: '',
    playerCount: Math.min(Math.max(playerOptions.length || 2, 1), 5),
    generationCount: 10,
    playerScores: {},
    playerSelections: {},
    playerStyles: {},
    expansionCodes: groupSettings.defaultExpansionCodes,
    promoSetSlugs: groupSettings.defaultPromoSetSlugs,
    selectedPlayerIds: playerOptions.slice(0, 2).map((player) => player.id),
  };
  const savedDraft = draftGameId
    ? await getDraftGameForm({
        gameId: draftGameId,
        groupId: context.groupId,
      })
    : null;
  const importSummary =
    savedDraft && draftGameId
      ? await getLatestGameLogImportSummary({
          gameId: draftGameId,
        })
      : null;
  const initialValues = mergeDraftIntoInitialValues(
    defaultInitialValues,
    savedDraft,
  );

  async function handleSaveDraft(values: LogGameDraftInput) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const parsed = logGameDraftSchema.parse({
      ...values,
      groupId: activeContext.groupId,
    });
    const draft = await saveDraftGame({
      form: parsed,
      userId: activeContext.userId,
    });
    revalidatePath('/log-game');

    return {
      status: 'success' as const,
      gameId: draft.gameId,
      message: `Draft ${draft.gameId.slice(0, 8)} saved to the cloud.`,
    };
  }

  async function handleFinalizeGame(values: LogGameDraftInput) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const parsed = logGameDraftSchema.parse({
      ...values,
      groupId: activeContext.groupId,
    });

    try {
      const finalizedPayload = buildFinalizedGamePayload({
        awardClaims: parsed.awardClaims,
        catalogSnapshotId: latestCatalogSnapshotId,
        expansionCodes: parsed.expansionCodes,
        gameId: parsed.gameId,
        mapAwardIds: awardOptions
          .filter((award) => award.mapId === parsed.mapId)
          .map((award) => award.awardId),
        mapMilestoneIds: milestoneOptions
          .filter((milestone) => milestone.mapId === parsed.mapId)
          .map((milestone) => milestone.milestoneId),
        milestoneClaims: parsed.milestoneClaims,
        notes: parsed.notes,
        playerCount: parsed.playerCount,
        playerScores: parsed.playerScores,
        playerSelections: parsed.playerSelections,
        playerStyles: parsed.playerStyles,
        selectedPlayerIds: parsed.selectedPlayerIds,
      });
      const finalized = await finalizeGameLog({
        form: parsed,
        finalizedPayload,
        userId: activeContext.userId,
      });

      revalidatePath('/group');
      revalidatePath('/insights');
      revalidatePath('/log-game');
      revalidatePath('/profile');

      return {
        status: 'success' as const,
        gameId: finalized.gameId,
        message: `Game ${finalized.gameId.slice(0, 8)} finalized.`,
      };
    } catch (error) {
      return {
        status: 'error' as const,
        gameId: parsed.gameId,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to finalize this game right now.',
      };
    }
  }

  return (
    <AppShell title="Log Game">
      {importSummary ? (
        <ImportEvidenceSummary importSummary={importSummary} />
      ) : null}
      <LogGameWizard
        awardOptions={awardOptions}
        cardOptions={cardOptions}
        corporationOptions={corporationOptions}
        expansionOptions={expansionOptions}
        initialValues={initialValues}
        mapOptions={mapOptions}
        milestoneOptions={milestoneOptions}
        onFinalizeGame={handleFinalizeGame}
        onSaveDraft={handleSaveDraft}
        playerOptions={playerOptions}
        preludeOptions={preludeOptions}
        promoSetOptions={promoSetOptions}
        styleOptions={styleOptions}
      />
    </AppShell>
  );
}
