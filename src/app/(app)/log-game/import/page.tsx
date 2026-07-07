import { AppShell } from '@/components/layout/app-shell';
import { LogGameImportShell } from '@/features/imports/log-game-import-shell';
import {
  resolveOrCreateImportGroup,
} from '@/lib/db/import-group-repo';
import { saveDraftGame } from '@/lib/db/game-draft-repo';
import {
  saveGameLogEvents,
  saveGameLogImport,
} from '@/lib/db/game-import-repo';
import {
  listPlayerImportAliasesForGroup,
  savePlayerImportAlias,
} from '@/lib/db/player-import-alias-repo';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import { listImportResolutionPlayers } from '@/lib/db/import-player-resolution-repo';
import { createPlayerIfMissing } from '@/lib/db/player-repo';
import {
  describeUnknownError,
  serializeUnknownError,
} from '@/lib/errors/describe-unknown-error';
import { buildImportDraft } from '@/lib/imports/build-import-draft';
import { buildImportBoardSnapshot } from '@/lib/imports/build-import-board-snapshot';
import { buildBoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';
import { buildBoardScreenshotConfirmationRequests } from '@/lib/imports/build-board-screenshot-confirmation-requests';
import { buildConfirmedPlayerAliases } from '@/lib/imports/build-confirmed-player-aliases';
import { buildGameLogEventWrites } from '@/lib/imports/build-game-log-event-writes';
import { buildImportReviewModel } from '@/lib/imports/build-import-review-model';
import {
  isSupportedBoardMapId,
  type SupportedBoardMapId,
} from '@/lib/imports/board-space-maps';
import { extractGameLogParticipantNames } from '@/lib/imports/extract-game-log-participant-names';
import { parseCreateImportDraftFormData } from '@/lib/imports/import-draft-form-data';
import {
  parseEndgameScoreScreenshot,
  type ParsedEndgameScoreScreenshot,
} from '@/lib/imports/parse-endgame-score-screenshot';
import { parseGameLog } from '@/lib/imports/parse-game-log';
import { readBoardScreenshotSpaceConfirmationsSafely } from '@/lib/imports/read-board-screenshot-space-confirmations-safely';
import { resolveImportPlayerLinks } from '@/lib/imports/resolve-import-player-links';
import {
  scoreCuratedBoardImportItems,
  type CuratedBoardImportItem,
} from '@/lib/imports/score-curated-board-import-items';
import { scoreBoardAwareAwardItems } from '@/lib/imports/score-board-aware-award-items';
import {
  listCardScoringReferences,
  listCorporations,
  listCards,
  listMapAwards,
  listMapMilestones,
  listMaps,
  listPreludes,
  listStyles,
} from '@/lib/db/reference-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseImportPlayerScores } from '@/lib/imports/parse-import-player-scores';

const importScoreCandidateFields = [
  'awardPoints',
  'cardPointsAnimals',
  'cardPointsJovian',
  'cardPointsMicrobes',
  'cardPointsTotal',
  'citiesPoints',
  'finalMegacredits',
  'greeneryPoints',
  'milestonePoints',
  'totalPoints',
  'trPoints',
] as const;
const OCR_ENGINE_VERSION = 'tesseract.js-v7';

async function readEndgameScreenshotOnDemand(
  file: File,
  options?: {
    expectedPlayerCount?: number;
    expectedPlayerNames?: string[];
  },
) {
  const { readEndgameScreenshot } = await import(
    '@/lib/imports/read-endgame-screenshot'
  );

  return readEndgameScreenshot(file, options);
}

async function readBoardStateScreenshotOnDemand(file: File) {
  const { readBoardStateScreenshot } = await import(
    '@/lib/imports/card-scoring/read-board-state-screenshot'
  );

  return readBoardStateScreenshot(file);
}

async function readBoardScreenshotSpaceConfirmationsOnDemand(input: {
  mapId: SupportedBoardMapId;
  requests: Array<{ spaceId: string }>;
  screenshots: File[];
}) {
  const { readBoardScreenshotSpaceConfirmations } = await import(
    '@/lib/imports/read-board-screenshot-space-confirmations'
  );

  return readBoardScreenshotSpaceConfirmations(input);
}

async function calculateImportCardScoresOnDemand(
  input: Parameters<
    typeof import('@/lib/imports/card-scoring/calculate-import-card-scores').calculateImportCardScores
  >[0],
) {
  const { calculateImportCardScores } = await import(
    '@/lib/imports/card-scoring/calculate-import-card-scores'
  );

  return calculateImportCardScores(input);
}

function buildLogScoreCandidates(input: {
  playerNames: string[];
  rawLogText: string;
}) {
  if (input.playerNames.length === 0) {
    return [];
  }

  const parsedScores = parseImportPlayerScores({
    evidence: input.rawLogText,
    players: input.playerNames.map((playerName) => ({
      id: playerName,
      name: playerName,
    })),
  });

  return input.playerNames.flatMap((playerName) => {
    const score = parsedScores[playerName];

    if (!score) {
      return [];
    }

    const candidate = { playerName } as {
      playerName: string;
    } & Partial<typeof score>;

    for (const field of importScoreCandidateFields) {
      const value = score[field];

      if (typeof value === 'number') {
        candidate[field] = value;
      }
    }

    return Object.keys(candidate).length > 1 ? [candidate] : [];
  });
}

function isCuratedBoardCardItem(
  item: CuratedBoardImportItem,
): item is Extract<CuratedBoardImportItem, { itemType: 'card' }> {
  return item.itemType === 'card';
}

function buildEndgameScreenshotParse(
  parsedScreenshot: ParsedEndgameScoreScreenshot,
) {
  return {
    detectedLayout: parsedScreenshot.playerRows.length
      ? 'digital_endgame_results'
      : null,
    extractedFields: {
      playerRows: parsedScreenshot.playerRows,
    },
    ocrEngineVersion: OCR_ENGINE_VERSION,
    parseStatus: parsedScreenshot.playerRows.length
      ? 'parsed'
      : 'score_extraction_skipped',
  } as const;
}

async function readBoardScreenshotEvidence(boardScreenshots: File[]) {
  return Promise.all(
    boardScreenshots.map(async (file) => {
      try {
        const textLines = await readBoardStateScreenshotOnDemand(file);

        return {
          file,
          parse: {
            detectedLayout: 'board_state',
            extractedFields: { textLines },
            ocrEngineVersion: OCR_ENGINE_VERSION,
            parseStatus: textLines.length > 0 ? 'parsed' : 'saved_as_draft',
          },
          textLines,
        };
      } catch (error) {
        console.warn(
          'Board screenshot OCR failed',
          file.name,
          serializeUnknownError(error),
        );

        return {
          file,
          parse: {
            detectedLayout: 'board_state',
            extractedFields: { textLines: [] },
            ocrEngineVersion: OCR_ENGINE_VERSION,
            parseStatus: 'saved_as_draft',
          },
          textLines: [] as string[],
        };
      }
    }),
  );
}

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
      const detectedParticipantNames =
        values.participantNames.length > 0
          ? values.participantNames
          : extractGameLogParticipantNames(parsedGameLog);
      const boardSnapshot =
        isSupportedBoardMapId(values.mapId)
          ? buildImportBoardSnapshot({
              events: parsedGameLog.events,
              mapId: values.mapId,
            })
          : null;
      const screenshotReadOptions = {
        expectedPlayerCount: Math.max(
          values.playerCount,
          detectedParticipantNames.length,
        ),
        expectedPlayerNames: detectedParticipantNames,
      };
      let parsedScreenshot: ParsedEndgameScoreScreenshot = { playerRows: [] };

      if (values.endgameScreenshot) {
        try {
          parsedScreenshot = parseEndgameScoreScreenshot(
            await readEndgameScreenshotOnDemand(
              values.endgameScreenshot,
              screenshotReadOptions,
            ),
          );
        } catch (error) {
          console.warn(
            'Endgame screenshot OCR failed',
            serializeUnknownError(error),
          );
        }
      }
      const boardScreenshotEvidence = await readBoardScreenshotEvidence(
        values.boardScreenshots,
      );
      const boardStateTextLines = boardScreenshotEvidence.flatMap(
        (screenshot) => screenshot.textLines,
      );

      const activeContext = await getCurrentGroupContext();
      const importedNames = Array.from(
        new Set([
          ...detectedParticipantNames,
          ...parsedScreenshot.playerRows.map((row) => row.playerName),
        ]),
      );
      const logScoreCandidates = buildLogScoreCandidates({
        playerNames: importedNames,
        rawLogText: values.exportedGameLog,
      });

      if (importedNames.length === 0) {
        throw new Error(
          'Add participant names or import evidence that includes player names.',
        );
      }

      const cardReferences = await listCardScoringReferences();
      const initialBoardEvidenceContext =
        boardSnapshot == null
          ? undefined
          : buildBoardEvidenceContext({
              boardSnapshot,
            });
      const initialCardScoring = await calculateImportCardScoresOnDemand({
        boardEvidenceContext: initialBoardEvidenceContext,
        boardStateTextLines,
        cardReferences,
        events: parsedGameLog.events,
      });
      const initialAwardItems =
        initialBoardEvidenceContext == null
          ? []
          : scoreBoardAwareAwardItems({
              boardEvidenceContext: initialBoardEvidenceContext,
              events: parsedGameLog.events,
              mapId: initialBoardEvidenceContext.mapId,
              participantNames: detectedParticipantNames,
            });
      const boardScreenshotConfirmationRequests =
        buildBoardScreenshotConfirmationRequests({
          awardItems: initialAwardItems,
          cardScoring: initialCardScoring,
        });
      const boardScreenshotConfirmations =
        boardSnapshot != null &&
        values.boardScreenshots.length > 0 &&
        boardScreenshotConfirmationRequests.length > 0
          ? await readBoardScreenshotSpaceConfirmationsSafely({
              input: {
                mapId: boardSnapshot.mapId,
                requests: boardScreenshotConfirmationRequests,
                screenshots: values.boardScreenshots,
              },
              readConfirmations: readBoardScreenshotSpaceConfirmationsOnDemand,
            })
          : undefined;
      const finalBoardEvidenceContext =
        boardSnapshot == null
          ? undefined
          : buildBoardEvidenceContext({
              boardSnapshot,
              screenshotConfirmations: boardScreenshotConfirmations,
            });
      const cardScoring =
        finalBoardEvidenceContext == null
          ? initialCardScoring
          : await calculateImportCardScoresOnDemand({
              boardEvidenceContext: finalBoardEvidenceContext,
              boardStateTextLines,
              cardReferences,
              events: parsedGameLog.events,
            });
      const curatedBoardCardItems =
        boardSnapshot == null
          ? []
          : scoreCuratedBoardImportItems({
              boardSnapshot,
              events: parsedGameLog.events,
              mapId: boardSnapshot.mapId,
              participantNames: detectedParticipantNames,
              screenshotConfirmations: boardScreenshotConfirmations,
            }).filter(isCuratedBoardCardItem);
      const awardItems =
        finalBoardEvidenceContext == null
          ? []
          : scoreBoardAwareAwardItems({
              boardEvidenceContext: finalBoardEvidenceContext,
              events: parsedGameLog.events,
              mapId: finalBoardEvidenceContext.mapId,
              participantNames: detectedParticipantNames,
            });
      const curatedBoardItems = [...curatedBoardCardItems, ...awardItems];
      const playerLinks = activeContext
        ? resolveImportPlayerLinks(
            importedNames,
            await listImportResolutionPlayers(activeContext.groupId),
            await listPlayerImportAliasesForGroup(activeContext.groupId),
          )
        : { matches: [], unresolvedCount: 0 };

      return {
        status: 'success' as const,
        message: `Parsed ${parsedGameLog.events.length} log events and ${parsedScreenshot.playerRows.length} screenshot score rows.`,
        review: buildImportReviewModel({
          boardReviewItems: curatedBoardItems,
          cardScoring,
          logScoreCandidates,
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
      const parsedGameLog = parseGameLog(values.exportedGameLog);
      const detectedParticipantNames =
        values.participantNames.length > 0
          ? values.participantNames
          : extractGameLogParticipantNames(parsedGameLog);
      const boardSnapshot =
        isSupportedBoardMapId(values.mapId)
          ? buildImportBoardSnapshot({
              events: parsedGameLog.events,
              mapId: values.mapId,
            })
          : null;
      const screenshotReadOptions = {
        expectedPlayerCount: Math.max(
          values.playerCount,
          detectedParticipantNames.length,
        ),
        expectedPlayerNames: detectedParticipantNames,
      };
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
      let importGroup: {
        createdNewGroup: boolean;
        createdProfileNames: string[];
        groupId: string;
        groupName: string;
        selectedPlayerIds: string[];
      };

      const confirmedPlayerLinks = values.confirmedPlayerLinks ?? [];

      if (activeContext) {
        const currentGroupPlayers = await listImportResolutionPlayers(
          activeContext.groupId,
        );
        const playerById = new Map(
          currentGroupPlayers.map((player) => [player.id, player]),
        );
        const selectedPlayerIds = confirmedPlayerLinks.map((link) => link.playerId);

        if (selectedPlayerIds.length > 0) {
          const uniqueSelectedPlayerIds = new Set(selectedPlayerIds);

          if (uniqueSelectedPlayerIds.size !== selectedPlayerIds.length) {
            throw new Error(
              'Each imported player must map to a different roster player.',
            );
          }

          const missingPlayerId = selectedPlayerIds.find(
            (playerId) => !playerById.has(playerId),
          );

          if (missingPlayerId) {
            throw new Error('One confirmed player match is no longer available.');
          }
        }

        importGroup = {
          createdNewGroup: false,
          createdProfileNames: [],
          groupId: activeContext.groupId,
          groupName: activeContext.groupName,
          selectedPlayerIds:
            confirmedPlayerLinks.length > 0
              ? confirmedPlayerLinks.map((link) => link.playerId)
              : [],
        };
      } else {
        if (detectedParticipantNames.length === 0) {
          throw new Error(
            'Add participant names before creating a new group from this import.',
          );
        }

        try {
          importGroup = await resolveOrCreateImportGroup({
            importingUserId: activeUser.id,
            participantNames: detectedParticipantNames,
          });
        } catch (error) {
          throw error;
        }
      }

      const activeGroupSettings = await getGroupSettings(importGroup.groupId);
      const [
        awardOptions,
        cardScoringReferences,
        cards,
        corporationOptions,
        milestoneOptions,
        preludeOptions,
        styleOptions,
      ] = await Promise.all([
        listMapAwards(),
        listCardScoringReferences(),
        listCards(),
        listCorporations(),
        listMapMilestones(),
        listPreludes(),
        listStyles(),
      ]);
      let parsedScreenshot: ParsedEndgameScoreScreenshot = { playerRows: [] };

      if (values.endgameScreenshot) {
        try {
          parsedScreenshot = parseEndgameScoreScreenshot(
            await readEndgameScreenshotOnDemand(
              values.endgameScreenshot,
              screenshotReadOptions,
            ),
          );
        } catch (error) {
          console.warn(
            'Endgame screenshot OCR failed',
            serializeUnknownError(error),
          );
        }
      }
      const boardScreenshotEvidence = await readBoardScreenshotEvidence(
        values.boardScreenshots,
      );
      const boardStateTextLines = boardScreenshotEvidence.flatMap(
        (screenshot) => screenshot.textLines,
      );
      const initialBoardEvidenceContext =
        boardSnapshot == null
          ? undefined
          : buildBoardEvidenceContext({
              boardSnapshot,
            });
      const initialCardScoring = await calculateImportCardScoresOnDemand({
        boardEvidenceContext: initialBoardEvidenceContext,
        boardStateTextLines,
        cardReferences: cardScoringReferences,
        events: parsedGameLog.events,
      });
      const initialAwardItems =
        initialBoardEvidenceContext == null
          ? []
          : scoreBoardAwareAwardItems({
              boardEvidenceContext: initialBoardEvidenceContext,
              events: parsedGameLog.events,
              mapId: initialBoardEvidenceContext.mapId,
              participantNames: detectedParticipantNames,
            });
      const boardScreenshotConfirmationRequests =
        buildBoardScreenshotConfirmationRequests({
          awardItems: initialAwardItems,
          cardScoring: initialCardScoring,
        });
      const boardScreenshotConfirmations =
        boardSnapshot != null &&
        values.boardScreenshots.length > 0 &&
        boardScreenshotConfirmationRequests.length > 0
          ? await readBoardScreenshotSpaceConfirmationsSafely({
              input: {
                mapId: boardSnapshot.mapId,
                requests: boardScreenshotConfirmationRequests,
                screenshots: values.boardScreenshots,
              },
              readConfirmations: readBoardScreenshotSpaceConfirmationsOnDemand,
            })
          : undefined;
      const finalBoardEvidenceContext =
        boardSnapshot == null
          ? undefined
          : buildBoardEvidenceContext({
              boardSnapshot,
              screenshotConfirmations: boardScreenshotConfirmations,
            });
      const cardScoring =
        finalBoardEvidenceContext == null
          ? initialCardScoring
          : await calculateImportCardScoresOnDemand({
              boardEvidenceContext: finalBoardEvidenceContext,
              boardStateTextLines,
              cardReferences: cardScoringReferences,
              events: parsedGameLog.events,
            });
      const curatedBoardCardItems =
        boardSnapshot == null
          ? []
          : scoreCuratedBoardImportItems({
              boardSnapshot,
              events: parsedGameLog.events,
              mapId: boardSnapshot.mapId,
              participantNames: detectedParticipantNames,
              screenshotConfirmations: boardScreenshotConfirmations,
            }).filter(isCuratedBoardCardItem);
      const awardItems =
        finalBoardEvidenceContext == null
          ? []
          : scoreBoardAwareAwardItems({
              boardEvidenceContext: finalBoardEvidenceContext,
              events: parsedGameLog.events,
              mapId: finalBoardEvidenceContext.mapId,
              participantNames: detectedParticipantNames,
            });
      const curatedBoardItems = [...curatedBoardCardItems, ...awardItems];

      if (
        detectedParticipantNames.length === 0 &&
        parsedScreenshot.playerRows.length === 0
      ) {
        throw new Error(
          'Add participant names or import evidence that includes player names.',
        );
      }

      const draftForm = buildImportDraft({
        awardOptions,
        cardScoring,
        cardOptions: cards,
        corporationOptions,
        curatedBoardItems,
        defaultExpansionCodes: activeGroupSettings.defaultExpansionCodes,
        defaultPromoSetSlugs: activeGroupSettings.defaultPromoSetSlugs,
        groupId: importGroup.groupId,
        importValues: {
          ...values,
          participantNames: detectedParticipantNames,
        },
        milestoneOptions,
        parsedGameLog,
        playerSelections: confirmedPlayerLinks,
        preludeOptions,
        scoreCandidates: parsedScreenshot.playerRows,
        selectedPlayerIds: importGroup.selectedPlayerIds,
        styleOptions,
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
        screenshotParse: undefined,
        screenshotFile: values.endgameScreenshot,
        screenshots: [
          ...(values.endgameScreenshot
            ? [
                {
                  file: values.endgameScreenshot,
                  kind: 'endgame_score' as const,
                  parse: buildEndgameScreenshotParse(parsedScreenshot),
                },
              ]
            : []),
          ...boardScreenshotEvidence.map((screenshot) => ({
            file: screenshot.file,
            kind: 'board_state' as const,
            parse: screenshot.parse,
          })),
        ],
        userId: activeUser.id,
      });
      await saveGameLogEvents({
        events: buildGameLogEventWrites({
          cards,
          parsedGameLog,
        }),
        gameLogImportId: gameLogImport.id,
      });
      if (confirmedPlayerLinks.length > 0) {
        const aliasPlayers = await listImportResolutionPlayers(importGroup.groupId);
        const aliasesToSave = buildConfirmedPlayerAliases({
          confirmedPlayerLinks,
          participantNames: detectedParticipantNames,
          players: aliasPlayers,
          screenshotPlayerNames: parsedScreenshot.playerRows.map(
            (row) => row.playerName,
          ),
        });

        const aliasSaveResults = await Promise.allSettled(
          aliasesToSave.map((alias) =>
            savePlayerImportAlias({
              aliasText: alias.aliasText,
              groupId: importGroup.groupId,
              playerId: alias.playerId,
              sourceType: alias.sourceType,
            }),
          ),
        );
        const aliasFailures = aliasSaveResults.flatMap((result) =>
          result.status === 'rejected'
            ? [serializeUnknownError(result.reason)]
            : [],
        );

        if (aliasFailures.length > 0) {
          console.warn('Import alias save failed', aliasFailures);
        }
      }

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

  async function handleCreateImportPlayer(importedName: string) {
    'use server';

    try {
      const activeContext = await getCurrentGroupContext();

      if (!activeContext) {
        throw new Error(
          'Join a group before creating roster players from import review.',
        );
      }

      const displayName = importedName.trim();

      if (!displayName) {
        throw new Error('Choose an imported name before creating a player.');
      }

      const createdPlayer = await createPlayerIfMissing({
        displayName,
        groupId: activeContext.groupId,
        linkedUserId: null,
      });

      revalidatePath('/group');
      revalidatePath('/group/players');
      revalidatePath('/log-game');

      return {
        status: 'success' as const,
        message: 'Player added to the shared roster.',
        createdPlayer: {
          displayName: createdPlayer.display_name,
          id: createdPlayer.id,
        },
      };
    } catch (error) {
      console.error(
        'Web import player creation failed',
        serializeUnknownError(error),
      );

      return {
        status: 'error' as const,
        message: describeUnknownError(
          error,
          'Unable to create that roster player right now.',
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
        onCreateImportPlayer={handleCreateImportPlayer}
        onCreateImportDraft={handleCreateImportDraft}
      />
    </AppShell>
  );
}
