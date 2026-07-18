import { AppShell } from '@/components/layout/app-shell';
import { buildFinalizedGamePayload } from '@/features/games/finalize-game';
import { LogGameWizard } from '@/features/games/log-game/log-game-wizard';
import { SavedGamesPicker } from '@/features/games/log-game/saved-games-picker';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { ImportEvidenceSummary } from '@/features/imports/import-evidence-summary';
import { mergeDraftIntoInitialValues } from '@/features/games/log-game/use-log-game-draft';
import {
  listCurrentUserGroups,
  requireCurrentGroupContext,
  type CurrentUserGroup,
} from '@/lib/db/group-context-repo';
import {
  finalizeGameLog,
  deleteSavedGame,
  getSavedGameForm,
  listSavedGames,
  reopenSavedGame,
  saveDraftGame,
} from '@/lib/db/game-draft-repo';
import { getLatestGameLogImportSummary } from '@/lib/db/game-import-repo';
import { reconcileImportGroupAfterFinalize } from '@/lib/db/import-group-repo';
import { listImportResolutionPlayers } from '@/lib/db/import-player-resolution-repo';
import { resolveLogGamePlayerReferences } from '@/lib/db/log-game-player-resolution';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import {
  getLatestCatalogSnapshotId,
  listCorporations,
  listMapAwards,
  listMapMilestones,
  listMaps,
  listPreludes,
} from '@/lib/db/reference-repo';
import { serializeUnknownError } from '@/lib/errors/describe-unknown-error';
import {
  logGameDraftSchema,
  type LogGameDraftInput,
} from '@/lib/validation/log-game';
import { revalidatePath } from 'next/cache';

const ALL_GROUPS_FILTER_VALUE = 'all';

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getKnownGroupId(
  value: string | string[] | undefined,
  groups: CurrentUserGroup[],
) {
  const groupId = getFirstSearchParam(value);

  if (!groupId || groupId === ALL_GROUPS_FILTER_VALUE) {
    return null;
  }

  return groups.some((group) => group.groupId === groupId) ? groupId : null;
}

function readRequiredFormValue(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? '').trim();

  if (!value) {
    throw new Error(`Missing ${label}.`);
  }

  return value;
}

async function requireCurrentUserAccessToGroup(groupId: string) {
  const context = await requireCurrentGroupContext();
  const groups = await listCurrentUserGroups();

  if (!groups.some((group) => group.groupId === groupId)) {
    throw new Error('Saved game not found or you do not have permission to edit it.');
  }

  return { groupId, userId: context.userId };
}

function SavedGamesGroupFilter({
  groups,
  selectedGroupId,
}: {
  groups: CurrentUserGroup[];
  selectedGroupId: string | null;
}) {
  if (groups.length < 2) {
    return null;
  }

  return (
    <form action="/log-game/review" className="flex items-center gap-2" method="get">
      <label className="sr-only" htmlFor="saved-games-group-filter">
        Saved Games Group
      </label>
      <select
        className="tm-input min-w-44"
        defaultValue={selectedGroupId ?? ALL_GROUPS_FILTER_VALUE}
        id="saved-games-group-filter"
        name="groupId"
      >
        <option value={ALL_GROUPS_FILTER_VALUE}>All Groups</option>
        {groups.map((group) => (
          <option key={group.groupId} value={group.groupId}>
            {group.groupName}
          </option>
        ))}
      </select>
      <button className="tm-button-secondary px-4 py-2 text-xs" type="submit">
        Show
      </button>
    </form>
  );
}

export default async function LogGameReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    gameId?: string | string[] | undefined;
    groupId?: string | string[] | undefined;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const context = await requireGroupContextOrRedirect();
  const groups = await listCurrentUserGroups();
  const selectedGroupId = getKnownGroupId(resolvedSearchParams.groupId, groups);
  const draftGameId = getFirstSearchParam(resolvedSearchParams.gameId);

  if (!draftGameId) {
    const savedGames = await listSavedGames({
      groupIds: selectedGroupId
        ? [selectedGroupId]
        : groups.map((group) => group.groupId),
      limit: 12,
    });

    async function handleDeleteGame(formData: FormData) {
      'use server';

      const gameId = readRequiredFormValue(formData, 'gameId', 'game id');
      const groupId = readRequiredFormValue(formData, 'groupId', 'group id');
      await requireCurrentUserAccessToGroup(groupId);

      await deleteSavedGame({
        gameId,
        groupId,
      });
      revalidatePath('/group');
      revalidatePath('/group/players');
      revalidatePath('/insights');
      revalidatePath('/log-game/review');
      revalidatePath('/profile');
    }

    async function handleReopenGame(formData: FormData) {
      'use server';

      const gameId = readRequiredFormValue(formData, 'gameId', 'game id');
      const groupId = readRequiredFormValue(formData, 'groupId', 'group id');
      const activeContext = await requireCurrentUserAccessToGroup(groupId);

      await reopenSavedGame({
        gameId,
        groupId,
        userId: activeContext.userId,
      });
      revalidatePath('/group');
      revalidatePath('/group/players');
      revalidatePath('/insights');
      revalidatePath('/log-game/review');
      revalidatePath('/profile');
    }

    return (
      <AppShell title="Log Game Review" wide>
        <div className="mb-4">
          <SavedGamesGroupFilter
            groups={groups}
            selectedGroupId={selectedGroupId}
          />
        </div>
        <SavedGamesPicker
          deleteGameAction={handleDeleteGame}
          emptyScopeLabel={selectedGroupId ? 'in this group' : 'in any group'}
          games={savedGames}
          groups={groups}
          reopenGameAction={handleReopenGame}
          showGroupNames={!selectedGroupId}
        />
      </AppShell>
    );
  }

  const reviewGroupId = selectedGroupId ?? context.groupId;
  const [
    savedGame,
    groupSettings,
    mapOptions,
    playerOptions,
    corporationOptions,
    preludeOptions,
    milestoneOptions,
    awardOptions,
    latestCatalogSnapshotId,
  ] = await Promise.all([
    getSavedGameForm({
      gameId: draftGameId,
      groupId: reviewGroupId,
    }),
    getGroupSettings(reviewGroupId),
    listMaps(),
    listImportResolutionPlayers(reviewGroupId),
    listCorporations(),
    listPreludes(),
    listMapMilestones(),
    listMapAwards(),
    getLatestCatalogSnapshotId(),
  ]);
  const defaultInitialValues: LogGameDraftInput = {
    awardClaims: {},
    gameId: undefined,
    groupId: reviewGroupId,
    playedOn: new Date().toISOString().slice(0, 10),
    mapId: groupSettings.defaultMapId ?? mapOptions[0]?.id ?? '',
    milestoneClaims: {},
    notes: '',
    playerCount: Math.min(Math.max(playerOptions.length || 2, 1), 5),
    generationCount: 10,
    playerScores: {},
    playerSelections: {},
    playerStyles: {},
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

    const parsed = logGameDraftSchema.parse(values);
    const activeContext = await requireCurrentUserAccessToGroup(parsed.groupId);
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

    const parsed = logGameDraftSchema.parse(values);
    const activeContext = await requireCurrentUserAccessToGroup(parsed.groupId);

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

      let reconciledGroupName: string | null = null;

      try {
        const reconciliation = await reconcileImportGroupAfterFinalize({
          gameId: finalized.gameId,
          groupId: parsed.groupId,
        });
        reconciledGroupName = reconciliation.updatedGroupName;
      } catch (reconcileError) {
        console.warn(
          'Import group reconciliation failed',
          serializeUnknownError(reconcileError),
        );
      }

      revalidatePath('/group');
      revalidatePath('/group/players');
      revalidatePath('/group/settings');
      revalidatePath('/insights');
      revalidatePath('/log-game/review');
      revalidatePath('/profile');

      const finalizeMessage =
        savedGame?.status === 'finalized'
          ? `Finalized game ${finalized.gameId.slice(0, 8)} updated.`
          : `Game ${finalized.gameId.slice(0, 8)} finalized.`;

      return {
        status: 'success' as const,
        gameId: finalized.gameId,
        message: reconciledGroupName
          ? `${finalizeMessage} Group renamed to ${reconciledGroupName}.`
          : finalizeMessage,
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
    <AppShell title="Log Game Review" wide>
      {importSummary ? (
        <ImportEvidenceSummary importSummary={importSummary} />
      ) : null}
      <LogGameWizard
        awardOptions={awardOptions}
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
          linked_username: player.linkedUsername,
        }))}
        preludeOptions={preludeOptions}
      />
    </AppShell>
  );
}
