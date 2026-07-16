import { AppShell } from '@/components/layout/app-shell';
import { buildFinalizedGamePayload } from '@/features/games/finalize-game';
import { LogGameWizard } from '@/features/games/log-game/log-game-wizard';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { ImportEvidenceSummary } from '@/features/imports/import-evidence-summary';
import { mergeDraftIntoInitialValues } from '@/features/games/log-game/use-log-game-draft';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import {
  finalizeGameLog,
  getDraftGameForm,
  saveDraftGame,
} from '@/lib/db/game-draft-repo';
import { getLatestGameLogImportSummary } from '@/lib/db/game-import-repo';
import { resolveLogGamePlayerReferences } from '@/lib/db/log-game-player-resolution';
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
import { redirect } from 'next/navigation';
import { normalizeSelectedExpansionCodes } from '@/features/games/log-game/reference-filters';
import {
  ensureLogGameGroupContext,
  LOG_GAME_PLACEHOLDER_GROUP_ID,
} from '@/lib/db/log-game-group-context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const noGroupNavItems = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
  { href: '/log-game/import', label: 'Web Import' },
] as const;

export default async function LogGamePage({
  searchParams,
}: {
  searchParams?: Promise<{ gameId?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login?next=/log-game');
  }

  const context = await getCurrentGroupContext();
  const [
    mapOptions,
    expansionOptions,
    promoSetOptions,
    corporationOptions,
    preludeOptions,
    milestoneOptions,
    awardOptions,
    styleOptions,
    cardOptions,
    latestCatalogSnapshotId,
  ] = await Promise.all([
    listMaps(),
    listExpansions(),
    listPromoSets(),
    listCorporations(),
    listPreludes(),
    listMapMilestones(),
    listMapAwards(),
    listStyles(),
    listCards(),
    getLatestCatalogSnapshotId(),
  ]);
  const [groupSettings, playerOptions] = context
    ? await Promise.all([
        getGroupSettings(context.groupId),
        listPlayers(context.groupId),
      ])
    : [null, []];
  const draftGameId = Array.isArray(resolvedSearchParams.gameId)
    ? resolvedSearchParams.gameId[0]
    : resolvedSearchParams.gameId;
  const effectiveGroupId = context?.groupId ?? LOG_GAME_PLACEHOLDER_GROUP_ID;
  const defaultInitialValues: LogGameDraftInput = {
    awardClaims: {},
    gameId: undefined,
    groupId: effectiveGroupId,
    playedOn: new Date().toISOString().slice(0, 10),
    mapId: groupSettings?.defaultMapId ?? mapOptions[0]?.id ?? '',
    milestoneClaims: {},
    notes: '',
    playerCount: Math.min(Math.max(playerOptions.length || 2, 1), 5),
    generationCount: 10,
    playerScores: {},
    playerSelections: {},
    playerStyles: {},
    expansionCodes: normalizeSelectedExpansionCodes(
      groupSettings?.defaultExpansionCodes ?? [],
    ),
    promoSetSlugs: groupSettings?.defaultPromoSetSlugs ?? [],
    selectedPlayerIds: playerOptions.slice(0, 2).map((player) => player.id),
  };
  const savedDraft = draftGameId && context
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

    const activeContext = await ensureLogGameGroupContext();
    const parsed = logGameDraftSchema.parse({
      ...values,
      groupId: activeContext.groupId,
    });
    const resolved = await resolveLogGamePlayerReferences(parsed);
    const draft = await saveDraftGame({
      form: resolved,
      userId: activeContext.userId,
    });
    revalidatePath('/log-game');
    revalidatePath('/group');
    revalidatePath('/group/players');
    revalidatePath('/profile');

    return {
      status: 'success' as const,
      gameId: draft.gameId,
      message: `Draft ${draft.gameId.slice(0, 8)} saved to the cloud.`,
    };
  }

  async function handleFinalizeGame(values: LogGameDraftInput) {
    'use server';

    const activeContext = await ensureLogGameGroupContext();
    const parsed = logGameDraftSchema.parse({
      ...values,
      groupId: activeContext.groupId,
    });

    try {
      const resolved = await resolveLogGamePlayerReferences(parsed);
      const finalizedPayload = buildFinalizedGamePayload({
        awardClaims: resolved.awardClaims,
        catalogSnapshotId: latestCatalogSnapshotId,
        expansionCodes: resolved.expansionCodes,
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
    <AppShell
      headerActions={
        context ? (
          <GroupSwitcher currentGroupId={context.groupId} returnPath="/log-game" />
        ) : undefined
      }
      navItems={context ? undefined : noGroupNavItems}
      title="Log Game"
      wide
    >
      {!context ? (
        <section className="tm-panel mb-6">
          <p className="text-sm text-stone-300">
            We&apos;ll create your first group automatically when you save your
            first game.
          </p>
        </section>
      ) : null}
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
