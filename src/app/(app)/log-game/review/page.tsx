import { AppShell } from '@/components/layout/app-shell';
import { buildFinalizedGamePayload } from '@/features/games/finalize-game';
import { LogGameWizard } from '@/features/games/log-game/log-game-wizard';
import { SavedGamesPicker } from '@/features/games/log-game/saved-games-picker';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { ImportEvidenceSummary } from '@/features/imports/import-evidence-summary';
import { mergeDraftIntoInitialValues } from '@/features/games/log-game/use-log-game-draft';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import {
  finalizeGameLog,
  deleteDraftGame,
  getSavedGameForm,
  listSavedGames,
  saveDraftGame,
} from '@/lib/db/game-draft-repo';
import { getLatestGameLogImportSummary } from '@/lib/db/game-import-repo';
import { listImportResolutionPlayers } from '@/lib/db/import-player-resolution-repo';
import { resolveLogGamePlayerReferences } from '@/lib/db/log-game-player-resolution';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import {
  getLatestCatalogSnapshotId,
  listCards,
  listCorporations,
  listMapAwards,
  listMapMilestones,
  listMaps,
  listPreludes,
  listStyles,
} from '@/lib/db/reference-repo';
import {
  logGameDraftSchema,
  type LogGameDraftInput,
} from '@/lib/validation/log-game';
import { revalidatePath } from 'next/cache';
import { normalizeSelectedExpansionCodes } from '@/features/games/log-game/reference-filters';

export default async function LogGameReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ gameId?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const context = await requireGroupContextOrRedirect();
  const draftGameId = Array.isArray(resolvedSearchParams.gameId)
    ? resolvedSearchParams.gameId[0]
    : resolvedSearchParams.gameId;
  const [
    groupSettings,
    mapOptions,
    playerOptions,
  ] = await Promise.all([
    getGroupSettings(context.groupId),
    listMaps(),
    listImportResolutionPlayers(context.groupId),
  ]);

  if (!draftGameId) {
    const savedGames = await listSavedGames({
      groupId: context.groupId,
      limit: 12,
    });

    async function handleDeleteDraft(formData: FormData) {
      'use server';

      const activeContext = await requireCurrentGroupContext();
      const gameId = String(formData.get('gameId') ?? '').trim();

      if (!gameId) {
        throw new Error('Missing draft id.');
      }

      await deleteDraftGame({
        gameId,
        groupId: activeContext.groupId,
      });
      revalidatePath('/log-game/review');
    }

    return (
      <AppShell
        headerActions={
          <GroupSwitcher
            currentGroupId={context.groupId}
            returnPath="/log-game/review"
          />
        }
        title="Log Game Review"
        wide
      >
        <SavedGamesPicker
          deleteDraftAction={handleDeleteDraft}
          games={savedGames}
        />
      </AppShell>
    );
  }

  const [savedGame, corporationOptions, preludeOptions, milestoneOptions, awardOptions, styleOptions, cardOptions, latestCatalogSnapshotId] =
    await Promise.all([
      getSavedGameForm({
        gameId: draftGameId,
        groupId: context.groupId,
      }),
      listCorporations(),
      listPreludes(),
      listMapMilestones(),
      listMapAwards(),
      listStyles(),
      listCards(),
      getLatestCatalogSnapshotId(),
    ]);
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
    expansionCodes: normalizeSelectedExpansionCodes(
      groupSettings.defaultExpansionCodes,
    ),
    promoSetSlugs: groupSettings.defaultPromoSetSlugs,
    selectedPlayerIds: playerOptions.slice(0, 2).map((player) => player.id),
  };
  const importSummary =
    savedGame
      ? await getLatestGameLogImportSummary({
          gameId: draftGameId,
        })
      : null;
  const initialValues = mergeDraftIntoInitialValues(
    defaultInitialValues,
    savedGame ? { ...savedGame.form, gameId: draftGameId } : null,
  );

  async function handleSaveDraft(values: LogGameDraftInput) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const parsed = logGameDraftSchema.parse({
      ...values,
      groupId: activeContext.groupId,
    });
    const resolved = await resolveLogGamePlayerReferences(parsed);
    const draft = await saveDraftGame({
      form: resolved,
      userId: activeContext.userId,
    });
    revalidatePath('/log-game/review');
    revalidatePath('/group/players');

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
      const resolved = await resolveLogGamePlayerReferences(parsed);
      const finalizedPayload = buildFinalizedGamePayload({
        awardClaims: resolved.awardClaims,
        catalogSnapshotId: latestCatalogSnapshotId,
        gameId: resolved.gameId,
        mapAwardIds: awardOptions
          .filter((award) => award.mapId === resolved.mapId)
          .map((award) => award.awardId),
        mapMilestoneIds: milestoneOptions
          .filter((milestone) => milestone.mapId === resolved.mapId)
          .map((milestone) => milestone.milestoneId),
        milestoneClaims: resolved.milestoneClaims,
        notes: resolved.notes,
        playerCount: resolved.playerCount,
        playerScores: resolved.playerScores,
        playerSelections: resolved.playerSelections,
        playerStyles: resolved.playerStyles,
        selectedPlayerIds: resolved.selectedPlayerIds,
      });
      const finalized = await finalizeGameLog({
        form: resolved,
        finalizedPayload,
        userId: activeContext.userId,
      });

      revalidatePath('/group');
      revalidatePath('/group/players');
      revalidatePath('/insights');
      revalidatePath('/log-game/review');
      revalidatePath('/profile');

      return {
        status: 'success' as const,
        gameId: finalized.gameId,
        message:
          savedGame?.status === 'finalized'
            ? `Finalized game ${finalized.gameId.slice(0, 8)} updated.`
            : `Game ${finalized.gameId.slice(0, 8)} finalized.`,
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
    <AppShell
      headerActions={
        <GroupSwitcher
          currentGroupId={context.groupId}
          returnPath="/log-game/review"
        />
      }
      title="Log Game Review"
      wide
    >
      {importSummary ? (
        <ImportEvidenceSummary importSummary={importSummary} />
      ) : null}
      <LogGameWizard
        awardOptions={awardOptions}
        cardOptions={cardOptions}
        corporationOptions={corporationOptions}
        initialStatus={savedGame?.status ?? 'draft'}
        initialValues={initialValues}
        mapOptions={mapOptions}
        milestoneOptions={milestoneOptions}
        onFinalizeGame={handleFinalizeGame}
        onSaveDraft={handleSaveDraft}
        playerOptions={playerOptions.map((player) => ({
          id: player.id,
          display_name: player.displayName,
          linked_full_name: player.linkedFullName,
          linked_username: player.linkedUsername,
        }))}
        preludeOptions={preludeOptions}
        styleOptions={styleOptions}
      />
    </AppShell>
  );
}
