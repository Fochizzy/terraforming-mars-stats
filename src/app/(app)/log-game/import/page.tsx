import { AppShell } from '@/components/layout/app-shell';
import { LogGameImportShell } from '@/features/imports/log-game-import-shell';
import {
  resolveOrCreateImportGroup,
  selectCurrentGroupPlayerIds,
} from '@/lib/db/import-group-repo';
import { saveDraftGame } from '@/lib/db/game-draft-repo';
import {
  saveGameLogEvents,
  saveGameLogImport,
} from '@/lib/db/game-import-repo';
import { listPlayerImportAliasesForGroup } from '@/lib/db/player-import-alias-repo';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import {
  describeUnknownError,
  serializeUnknownError,
} from '@/lib/errors/describe-unknown-error';
import { listPlayers } from '@/lib/db/player-repo';
import { buildImportDraft } from '@/lib/imports/build-import-draft';
import { buildGameLogEventWrites } from '@/lib/imports/build-game-log-event-writes';
import { buildImportReviewModel } from '@/lib/imports/build-import-review-model';
import { parseCreateImportDraftFormData } from '@/lib/imports/import-draft-form-data';
import {
  parseEndgameScoreScreenshot,
  type ParsedEndgameScoreScreenshot,
} from '@/lib/imports/parse-endgame-score-screenshot';
import { parseGameLog } from '@/lib/imports/parse-game-log';
import { readEndgameScreenshot } from '@/lib/imports/read-endgame-screenshot';
import { resolveImportPlayerLinks } from '@/lib/imports/resolve-import-player-links';
import {
  listCards,
  listMapAwards,
  listMapMilestones,
  listMaps,
} from '@/lib/db/reference-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export default async function LogGameImportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== 'AuthSessionMissingError') {
    throw userError;
  }

  if (!user) {
    redirect('/login?next=/log-game/import');
  }

  const [context, mapOptions] = await Promise.all([
    getCurrentGroupContext(),
    listMaps(),
  ]);
  const groupSettings = context
    ? await getGroupSettings(context.groupId)
    : null;

  async function handleAnalyzeImportEvidence(formData: FormData) {
    'use server';

    try {
      const values = parseCreateImportDraftFormData(formData);
      const parsedGameLog = parseGameLog(values.exportedGameLog);
      let parsedScreenshot: ParsedEndgameScoreScreenshot = { playerRows: [] };

      if (values.endgameScreenshot) {
        try {
          parsedScreenshot = parseEndgameScoreScreenshot(
            await readEndgameScreenshot(values.endgameScreenshot),
          );
        } catch (error) {
          console.warn(
            'Endgame screenshot OCR failed',
            serializeUnknownError(error),
          );
        }
      }

      const activeContext = await getCurrentGroupContext();
      const importedNames = Array.from(
        new Set([
          ...values.participantNames,
          ...parsedScreenshot.playerRows.map((row) => row.playerName),
        ]),
      );
      const [currentGroupPlayers, playerAliases] = activeContext
        ? await Promise.all([
            listPlayers(activeContext.groupId),
            listPlayerImportAliasesForGroup(activeContext.groupId),
          ])
        : [[], []];
      const playerLinks = resolveImportPlayerLinks(
        importedNames,
        currentGroupPlayers.map((player) => ({
          displayName: player.display_name,
          id: player.id,
        })),
        playerAliases,
      );

      return {
        status: 'success' as const,
        message: `Parsed ${parsedGameLog.events.length} log events and ${parsedScreenshot.playerRows.length} screenshot score rows.`,
        review: buildImportReviewModel({
          logParse: parsedGameLog,
          playerLinks,
          screenshotParse: parsedScreenshot,
        }),
      };
    } catch (error) {
      console.error('Web import analysis failed', serializeUnknownError(error));

      return {
        status: 'error' as const,
        message: describeUnknownError(
          error,
          'Unable to analyze this import evidence right now.',
        ),
      };
    }
  }

  async function handleCreateImportDraft(formData: FormData) {
    'use server';

    try {
      const values = parseCreateImportDraftFormData(formData);
      const activeSupabase = await createSupabaseServerClient();
      const {
        data: { user: activeUser },
        error: activeUserError,
      } = await activeSupabase.auth.getUser();

      if (activeUserError) {
        throw activeUserError;
      }

      if (!activeUser) {
        throw new Error('Sign in again before saving this import.');
      }

      const activeContext = await getCurrentGroupContext();
      let importGroup;

      try {
        importGroup = await resolveOrCreateImportGroup({
          importingUserId: activeUser.id,
          participantNames: values.participantNames,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ) {
          if (!activeContext) {
            throw new Error(
              'Web import group matching is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY to enable imports for users without a current group.',
            );
          }

          const currentGroupPlayers = await listPlayers(activeContext.groupId);

          importGroup = {
            createdNewGroup: false,
            createdProfileNames: [] as string[],
            groupId: activeContext.groupId,
            groupName: activeContext.groupName,
            selectedPlayerIds: selectCurrentGroupPlayerIds(
              values.participantNames,
              currentGroupPlayers,
            ),
          };
        } else {
          throw error;
        }
      }

      const activeGroupSettings = await getGroupSettings(importGroup.groupId);
      const parsedGameLog = parseGameLog(values.exportedGameLog);
      const [awardOptions, cards, milestoneOptions] = await Promise.all([
        listMapAwards(),
        listCards(),
        listMapMilestones(),
      ]);
      let parsedScreenshot: ParsedEndgameScoreScreenshot = { playerRows: [] };

      if (values.endgameScreenshot) {
        try {
          parsedScreenshot = parseEndgameScoreScreenshot(
            await readEndgameScreenshot(values.endgameScreenshot),
          );
        } catch (error) {
          console.warn(
            'Endgame screenshot OCR failed',
            serializeUnknownError(error),
          );
        }
      }
      const draftForm = buildImportDraft({
        awardOptions,
        defaultExpansionCodes: activeGroupSettings.defaultExpansionCodes,
        defaultPromoSetSlugs: activeGroupSettings.defaultPromoSetSlugs,
        groupId: importGroup.groupId,
        importValues: values,
        milestoneOptions,
        parsedGameLog,
        playerSelections: values.participantNames.flatMap(
          (importedName, index) => {
            const playerId = importGroup.selectedPlayerIds[index];
            return playerId ? [{ importedName, playerId }] : [];
          },
        ),
        scoreCandidates: parsedScreenshot.playerRows,
        selectedPlayerIds: importGroup.selectedPlayerIds,
      });
      const draft = await saveDraftGame({
        form: draftForm,
        userId: activeUser.id,
      });
      const gameLogImport = await saveGameLogImport({
        gameId: draft.gameId,
        logParseSummary: {
          contextLineCount: parsedGameLog.contextLineCount,
          drawInfoLineCount: parsedGameLog.drawInfoLineCount,
          ignoredLineCount: parsedGameLog.ignoredLineCount,
          parsedEventCount: parsedGameLog.events.length,
        },
        rawLogText: values.exportedGameLog,
        screenshotParse: values.endgameScreenshot
          ? {
              detectedLayout: parsedScreenshot.playerRows.length
                ? 'digital_endgame_results'
                : null,
              extractedFields: {
                playerRows: parsedScreenshot.playerRows,
              },
              ocrEngineVersion: 'tesseract.js-v7',
              parseStatus: parsedScreenshot.playerRows.length
                ? 'parsed'
                : 'saved_as_draft',
            }
          : undefined,
        screenshotFile: values.endgameScreenshot,
        userId: activeUser.id,
      });
      await saveGameLogEvents({
        events: buildGameLogEventWrites({
          cards,
          parsedGameLog,
        }),
        gameLogImportId: gameLogImport.id,
      });

      revalidatePath('/group');
      revalidatePath('/group/players');
      revalidatePath('/group/settings');
      revalidatePath('/insights');
      revalidatePath('/log-game');
      revalidatePath('/profile');

      return {
        status: 'success' as const,
        gameId: draft.gameId,
        message: importGroup.createdNewGroup
          ? `Created ${importGroup.groupName} and saved import draft ${draft.gameId.slice(0, 8)}. Parsed ${parsedGameLog.events.length} log events and ${parsedScreenshot.playerRows.length} screenshot score rows.`
          : `Matched ${importGroup.groupName} and saved import draft ${draft.gameId.slice(0, 8)}. Parsed ${parsedGameLog.events.length} log events and ${parsedScreenshot.playerRows.length} screenshot score rows.`,
      };
    } catch (error) {
      console.error('Web import draft save failed', serializeUnknownError(error));

      return {
        status: 'error' as const,
        message: describeUnknownError(
          error,
          'Unable to save this import draft right now.',
        ),
      };
    }
  }

  return (
    <AppShell
      navItems={
        context
          ? undefined
          : [{ href: '/log-game/import', label: 'Web Import' }]
      }
      title="Web Import"
      wide
    >
      <LogGameImportShell
        initialValues={{
          generationCount: 10,
          mapId: groupSettings?.defaultMapId ?? mapOptions[0]?.id ?? '',
          playedOn: new Date().toISOString().slice(0, 10),
          playerCount: 4,
        }}
        mapOptions={mapOptions}
        onAnalyzeImportEvidence={handleAnalyzeImportEvidence}
        onCreateImportDraft={handleCreateImportDraft}
      />
    </AppShell>
  );
}
