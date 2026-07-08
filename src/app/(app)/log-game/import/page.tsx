import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { LogGameImportShell } from '@/features/imports/log-game-import-shell';
import { saveDraftGame } from '@/lib/db/game-draft-repo';
import {
  getCurrentGroupContext,
} from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import {
  resolveOrCreateImportGroup,
} from '@/lib/db/import-group-repo';
import {
  saveGameLogEvents,
  saveGameLogImport,
} from '@/lib/db/game-import-repo';
import { listImportResolutionPlayers } from '@/lib/db/import-player-resolution-repo';
import {
  listPlayerImportAliasesForGroup,
  savePlayerImportAlias,
} from '@/lib/db/player-import-alias-repo';
import { createPlayerIfMissing } from '@/lib/db/player-repo';
import {
  listCardScoringReferences,
  listCards,
  listCorporations,
  listMapAwards,
  listMapMilestones,
  listMaps,
  listPreludes,
  listStyles,
  type MapOption,
} from '@/lib/db/reference-repo';
import {
  describeUnknownError,
  serializeUnknownError,
} from '@/lib/errors/describe-unknown-error';
import { buildConfirmedPlayerAliases } from '@/lib/imports/build-confirmed-player-aliases';
import { buildImportDraft } from '@/lib/imports/build-import-draft';
import { buildGameLogEventWrites } from '@/lib/imports/build-game-log-event-writes';
import { buildImportReviewModel } from '@/lib/imports/build-import-review-model';
import { extractGameLogParticipantNames } from '@/lib/imports/extract-game-log-participant-names';
import { inferImportMapFromLog } from '@/lib/imports/infer-import-map-from-log';
import { parseCreateImportDraftFormData } from '@/lib/imports/import-draft-form-data';
import {
  parseEndgameScoreScreenshot,
  type ParsedEndgameScoreScreenshot,
} from '@/lib/imports/parse-endgame-score-screenshot';
import { parseGameLog } from '@/lib/imports/parse-game-log';
import {
  parseImportPlayerScores,
} from '@/lib/imports/parse-import-player-scores';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import {
  parseScoreDetailsScreenshot,
  type ParsedScoreDetailsScreenshot,
} from '@/lib/imports/parse-score-details-screenshot';
import { resolveImportPlayerLinks } from '@/lib/imports/resolve-import-player-links';
import { isUnauthenticatedAuthError } from '@/lib/supabase/auth-errors';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

async function readGameResultScreenshotOnDemand(
  file: File,
  options?: {
    expectedPlayerCount?: number;
    expectedPlayerNames?: string[];
  },
) {
  const { readGameResultScreenshot } = await import(
    '@/lib/imports/read-game-result-screenshot'
  );

  return readGameResultScreenshot(file, options);
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

function formatCountLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildImportSuccessMessage(input: {
  logEventCount: number;
  logScoreRowCount: number;
  screenshotScoreRowCount: number;
}) {
  const logEventLabel = formatCountLabel(input.logEventCount, 'log event');
  const screenshotScoreRowLabel = formatCountLabel(
    input.screenshotScoreRowCount,
    'screenshot score row',
  );

  if (input.logScoreRowCount === 0) {
    return `Parsed ${logEventLabel} and ${screenshotScoreRowLabel}.`;
  }

  const logScoreRowLabel = formatCountLabel(
    input.logScoreRowCount,
    'log score row',
  );
  const fallbackMessage =
    input.screenshotScoreRowCount === 0
      ? " We'll use the log score breakdown where available."
      : '';

  return `Parsed ${logEventLabel}, ${logScoreRowLabel}, and ${screenshotScoreRowLabel}.${fallbackMessage}`;
}

function getGenerationCountFromGameLog(
  parsedGameLog: ReturnType<typeof parseGameLog>,
) {
  const detectedGenerations = parsedGameLog.events.flatMap((event) =>
    event.eventType === 'generation_started' ? [event.generation] : [],
  );

  return detectedGenerations.length > 0
    ? Math.max(...detectedGenerations)
    : null;
}

function findSelectedMapOption(input: {
  mapOptions: MapOption[];
  submittedMapId: string;
}) {
  const submittedMapId = input.submittedMapId.trim();

  if (!submittedMapId) {
    return null;
  }

  return (
    input.mapOptions.find(
      (option) =>
        option.id === submittedMapId || option.code === submittedMapId,
    ) ?? null
  );
}

function resolveImportMapSelection(input: {
  inferredMapId?: string | null;
  mapOptions: MapOption[];
  preferInferredMap?: boolean;
  submittedMapId: string;
}) {
  const inferredMapOption = input.inferredMapId
    ? findSelectedMapOption({
        mapOptions: input.mapOptions,
        submittedMapId: input.inferredMapId,
      })
    : null;

  if (input.preferInferredMap && inferredMapOption) {
    return {
      draftMapId: inferredMapOption.id,
    };
  }

  const selectedMapOption = findSelectedMapOption(input);

  if (selectedMapOption) {
    return {
      draftMapId: selectedMapOption.id,
    };
  }

  if (inferredMapOption) {
    return {
      draftMapId: inferredMapOption.id,
    };
  }

  if (input.submittedMapId.trim()) {
    return {
      draftMapId: input.submittedMapId.trim(),
    };
  }

  throw new Error('Choose the map at the top before continuing.');
}

function resolveImportPlayerCount(input: {
  detectedParticipantNames: string[];
  screenshotPlayerRows: ParsedEndgameScoreScreenshot['playerRows'];
  submittedPlayerCount: number | null;
}) {
  const resolvedPlayerCount = Math.max(
    input.submittedPlayerCount ?? 0,
    input.detectedParticipantNames.length,
    input.screenshotPlayerRows.length,
  );

  if (resolvedPlayerCount > 0) {
    return resolvedPlayerCount;
  }

  throw new Error(
    'Choose the player count before continuing when the log or screenshot cannot infer it.',
  );
}

function resolveImportGenerationCount(input: {
  parsedGameLog: ReturnType<typeof parseGameLog>;
  parsedScreenshot: ParsedEndgameScoreScreenshot;
  submittedGenerationCount: number | null;
}) {
  return (
    input.parsedScreenshot.generationCount ??
    getGenerationCountFromGameLog(input.parsedGameLog) ??
    input.submittedGenerationCount ??
    (() => {
      throw new Error(
        'We could not infer the generations played from this evidence yet. Upload the combined game result screenshot or include generation markers in the exported log.',
      );
    })()
  );
}

function buildGameResultScreenshotParse(input: {
  parsedScoreDetails: ParsedScoreDetailsScreenshot;
  parsedScreenshot: ParsedEndgameScoreScreenshot;
}) {
  const hasScoreRows = input.parsedScreenshot.playerRows.length > 0;
  const hasScoreDetails = input.parsedScoreDetails.cardScoring.length > 0;

  return {
    detectedLayout: hasScoreDetails
      ? 'combined_game_result'
      : hasScoreRows
        ? 'digital_endgame_results'
        : null,
    extractedFields: {
      cardScoring: input.parsedScoreDetails.cardScoring,
      detectedScoreDetailsPlayerNames:
        input.parsedScoreDetails.detectedPlayerNames,
      generationCount: input.parsedScreenshot.generationCount,
      playerRows: input.parsedScreenshot.playerRows,
    },
    ocrEngineVersion: OCR_ENGINE_VERSION,
    parseStatus: hasScoreRows || hasScoreDetails ? 'parsed' : 'score_extraction_skipped',
  } as const;
}

function buildExpectedCardPointTotalsByPlayerName(input: {
  logScoreCandidates: Array<{ cardPointsTotal?: number; playerName: string }>;
  screenshotScoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
}) {
  const totalsByPlayerName: Record<string, number> = {};

  for (const candidate of input.logScoreCandidates) {
    if (typeof candidate.cardPointsTotal === 'number') {
      totalsByPlayerName[candidate.playerName] = candidate.cardPointsTotal;
    }
  }

  for (const candidate of input.screenshotScoreCandidates) {
    if (typeof candidate.cardPointsTotal === 'number') {
      totalsByPlayerName[candidate.playerName] = candidate.cardPointsTotal;
    }
  }

  return totalsByPlayerName;
}

function buildUniquePlayerNames(names: string[]) {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

function mergeParsedScreenshotEvidence(input: {
  clientParsedScreenshot: ParsedEndgameScoreScreenshot;
  expectedPlayerNames: string[];
  serverParsedScreenshot: ParsedEndgameScoreScreenshot;
}) {
  const serverPlayerRows = input.serverParsedScreenshot.playerRows;
  const expectedPlayerKeys = new Set(
    input.expectedPlayerNames.map(normalizePlayerAlias).filter(Boolean),
  );
  const clientPlayerRows =
    expectedPlayerKeys.size > 0
      ? input.clientParsedScreenshot.playerRows.filter((row) =>
          expectedPlayerKeys.has(normalizePlayerAlias(row.playerName)),
        )
      : input.clientParsedScreenshot.playerRows;

  return {
    generationCount:
      input.serverParsedScreenshot.generationCount ??
      input.clientParsedScreenshot.generationCount ??
      null,
    playerRows:
      clientPlayerRows.length > serverPlayerRows.length
        ? clientPlayerRows
        : serverPlayerRows.length > 0
          ? serverPlayerRows
          : clientPlayerRows,
  };
}

async function parseGameResultEvidence(input: {
  cardReferences: Awaited<ReturnType<typeof listCardScoringReferences>>;
  clientEndgameLines: string[];
  expectedPlayerCount: number;
  expectedPlayerNames: string[];
  file: File | null;
  parsedGameLog: ReturnType<typeof parseGameLog>;
  rawLogText: string;
}) {
  let parsedScreenshot: ParsedEndgameScoreScreenshot = {
    generationCount: null,
    playerRows: [],
  };
  let parsedScoreDetails: ParsedScoreDetailsScreenshot = {
    cardScoring: [],
    detectedPlayerNames: [],
  };

  if (input.file) {
    try {
      const screenshotRead = await readGameResultScreenshotOnDemand(input.file, {
        expectedPlayerCount: input.expectedPlayerCount,
        expectedPlayerNames: input.expectedPlayerNames,
      });

      parsedScreenshot = parseEndgameScoreScreenshot(screenshotRead.endgameLines);
      const initialImportedNames = buildUniquePlayerNames([
        ...input.expectedPlayerNames,
        ...parsedScreenshot.playerRows.map((row) => row.playerName),
      ]);
      const initialLogScoreCandidates = buildLogScoreCandidates({
        playerNames: initialImportedNames,
        rawLogText: input.rawLogText,
      });

      if (
        initialImportedNames.length > 0 &&
        screenshotRead.scoreDetailsColumns.length > 0
      ) {
        parsedScoreDetails = parseScoreDetailsScreenshot({
          cardReferences: input.cardReferences,
          events: input.parsedGameLog.events,
          expectedCardPointTotalsByPlayerName:
            buildExpectedCardPointTotalsByPlayerName({
              logScoreCandidates: initialLogScoreCandidates,
              screenshotScoreCandidates: parsedScreenshot.playerRows,
            }),
          expectedPlayerNames: initialImportedNames,
          ocrColumns: screenshotRead.scoreDetailsColumns,
        });
      }
    } catch (error) {
      console.warn(
        'Game result screenshot OCR failed',
        serializeUnknownError(error),
      );
    }
  }

  const clientParsedScreenshot =
    input.clientEndgameLines.length > 0
      ? parseEndgameScoreScreenshot(input.clientEndgameLines)
      : {
          generationCount: null,
          playerRows: [],
        };

  parsedScreenshot = mergeParsedScreenshotEvidence({
    clientParsedScreenshot,
    expectedPlayerNames: input.expectedPlayerNames,
    serverParsedScreenshot: parsedScreenshot,
  });

  const importedNames = buildUniquePlayerNames([
    ...input.expectedPlayerNames,
    ...parsedScreenshot.playerRows.map((row) => row.playerName),
    ...parsedScoreDetails.detectedPlayerNames,
  ]);

  return {
    importedNames,
    logScoreCandidates: buildLogScoreCandidates({
      playerNames: importedNames,
      rawLogText: input.rawLogText,
    }),
    parsedScoreDetails,
    parsedScreenshot,
  };
}

export default async function LogGameImportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && !isUnauthenticatedAuthError(userError)) {
    throw userError;
  }

  if (!user) {
    redirect('/login?next=/log-game/import');
  }

  const [context, mapOptions] = await Promise.all([
    getCurrentGroupContext(),
    listMaps(),
  ]);

  async function handleAnalyzeImportEvidence(formData: FormData) {
    'use server';

    try {
      const values = parseCreateImportDraftFormData(formData);
      const parsedGameLog = parseGameLog(values.exportedGameLog);
      const detectedParticipantNames =
        values.participantNames.length > 0
          ? values.participantNames
          : extractGameLogParticipantNames(parsedGameLog);
      const [awardOptions, cardReferences, milestoneOptions] = await Promise.all([
        listMapAwards(),
        listCardScoringReferences(),
        listMapMilestones(),
      ]);
      const inferredMap = inferImportMapFromLog({
        awardOptions,
        mapOptions,
        milestoneOptions,
        parsedGameLog,
      });
      const screenshotEvidence = await parseGameResultEvidence({
        cardReferences,
        clientEndgameLines: values.clientEndgameLines,
        expectedPlayerCount: Math.max(
          values.playerCount ?? 0,
          detectedParticipantNames.length,
        ),
        expectedPlayerNames: detectedParticipantNames,
        file: values.endgameScreenshot,
        parsedGameLog,
        rawLogText: values.exportedGameLog,
      });

      resolveImportGenerationCount({
        parsedGameLog,
        parsedScreenshot: screenshotEvidence.parsedScreenshot,
        submittedGenerationCount: values.generationCount,
      });

      if (screenshotEvidence.importedNames.length === 0) {
        throw new Error(
          'Add participant names or import evidence that includes player names.',
        );
      }

      const activeContext = await getCurrentGroupContext();
      const playerLinks = activeContext
        ? resolveImportPlayerLinks(
            screenshotEvidence.importedNames,
            await listImportResolutionPlayers(activeContext.groupId),
            await listPlayerImportAliasesForGroup(activeContext.groupId),
          )
        : { matches: [], unresolvedCount: 0 };

      return {
        detectedMapId: inferredMap?.mapId,
        status: 'success' as const,
        message: buildImportSuccessMessage({
          logEventCount: parsedGameLog.events.length,
          logScoreRowCount: screenshotEvidence.logScoreCandidates.length,
          screenshotScoreRowCount:
            screenshotEvidence.parsedScreenshot.playerRows.length,
        }),
        review: buildImportReviewModel({
          cardScoring: screenshotEvidence.parsedScoreDetails.cardScoring,
          logScoreCandidates: screenshotEvidence.logScoreCandidates,
          logParse: parsedGameLog,
          playerLinks,
          screenshotParse: screenshotEvidence.parsedScreenshot,
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

      const cardScoringReferences = await listCardScoringReferences();
      const screenshotEvidence = await parseGameResultEvidence({
        cardReferences: cardScoringReferences,
        clientEndgameLines: values.clientEndgameLines,
        expectedPlayerCount: Math.max(
          values.playerCount ?? 0,
          detectedParticipantNames.length,
        ),
        expectedPlayerNames: detectedParticipantNames,
        file: values.endgameScreenshot,
        parsedGameLog,
        rawLogText: values.exportedGameLog,
      });
      const resolvedParticipantNames =
        detectedParticipantNames.length > 0
          ? detectedParticipantNames
          : screenshotEvidence.importedNames;

      if (resolvedParticipantNames.length === 0) {
        throw new Error(
          'Add participant names or import evidence that includes player names.',
        );
      }

      const activeContext = await getCurrentGroupContext();
      const confirmedPlayerLinks = values.confirmedPlayerLinks ?? [];
      let importGroup: {
        createdNewGroup: boolean;
        createdProfileNames: string[];
        groupId: string;
        groupName: string;
        selectedPlayerIds: string[];
      };

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
        importGroup = await resolveOrCreateImportGroup({
          importingUserId: activeUser.id,
          participantNames: resolvedParticipantNames,
        });
      }

      const activeGroupSettings = await getGroupSettings(importGroup.groupId);
      const [
        awardOptions,
        cards,
        corporationOptions,
        milestoneOptions,
        preludeOptions,
        styleOptions,
      ] = await Promise.all([
        listMapAwards(),
        listCards(),
        listCorporations(),
        listMapMilestones(),
        listPreludes(),
        listStyles(),
      ]);
      const inferredMap = inferImportMapFromLog({
        awardOptions,
        mapOptions,
        milestoneOptions,
        parsedGameLog,
      });
      const resolvedMapSelection = resolveImportMapSelection({
        inferredMapId: inferredMap?.mapId,
        mapOptions,
        submittedMapId: values.mapId,
      });
      const resolvedGenerationCount = resolveImportGenerationCount({
        parsedGameLog,
        parsedScreenshot: screenshotEvidence.parsedScreenshot,
        submittedGenerationCount: values.generationCount,
      });
      const resolvedPlayerCount = resolveImportPlayerCount({
        detectedParticipantNames: resolvedParticipantNames,
        screenshotPlayerRows: screenshotEvidence.parsedScreenshot.playerRows,
        submittedPlayerCount: values.playerCount,
      });
      const draftForm = buildImportDraft({
        awardOptions,
        cardScoring: screenshotEvidence.parsedScoreDetails.cardScoring,
        cardOptions: cards,
        corporationOptions,
        curatedBoardItems: [],
        defaultExpansionCodes: activeGroupSettings.defaultExpansionCodes,
        defaultPromoSetSlugs: activeGroupSettings.defaultPromoSetSlugs,
        groupId: importGroup.groupId,
        importValues: {
          ...values,
          generationCount: resolvedGenerationCount,
          mapId: resolvedMapSelection.draftMapId,
          participantNames: resolvedParticipantNames,
          playerCount: resolvedPlayerCount,
        },
        milestoneOptions,
        parsedGameLog,
        playerSelections: confirmedPlayerLinks,
        preludeOptions,
        scoreCandidates: screenshotEvidence.parsedScreenshot.playerRows,
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
        screenshots: values.endgameScreenshot
          ? [
              {
                file: values.endgameScreenshot,
                kind: 'endgame_score' as const,
                parse: buildGameResultScreenshotParse({
                  parsedScoreDetails: screenshotEvidence.parsedScoreDetails,
                  parsedScreenshot: screenshotEvidence.parsedScreenshot,
                }),
              },
            ]
          : [],
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
          participantNames: resolvedParticipantNames,
          players: aliasPlayers,
          screenshotPlayerNames: screenshotEvidence.parsedScreenshot.playerRows.map(
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
          ? `Created ${importGroup.groupName} and saved import draft ${draft.gameId.slice(0, 8)}. ${buildImportSuccessMessage({
              logEventCount: parsedGameLog.events.length,
              logScoreRowCount: screenshotEvidence.logScoreCandidates.length,
              screenshotScoreRowCount:
                screenshotEvidence.parsedScreenshot.playerRows.length,
            })}`
          : `Matched ${importGroup.groupName} and saved import draft ${draft.gameId.slice(0, 8)}. ${buildImportSuccessMessage({
              logEventCount: parsedGameLog.events.length,
              logScoreRowCount: screenshotEvidence.logScoreCandidates.length,
              screenshotScoreRowCount:
                screenshotEvidence.parsedScreenshot.playerRows.length,
            })}`,
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
      headerActions={
        context ? (
          <Link className="tm-button-secondary px-4 py-2 text-xs" href="/log-game/review">
            Review Saved Games
          </Link>
        ) : undefined
      }
      navItems={
        context
          ? undefined
          : [{ href: '/log-game', label: 'Web Import' }]
      }
      title="Web Import"
      wide
    >
      <LogGameImportShell
        initialValues={{
          generationCount: 10,
          mapId: '',
          playedOn: new Date().toISOString().slice(0, 10),
          playerCount: null,
        }}
        mapOptions={mapOptions}
        onAnalyzeImportEvidence={handleAnalyzeImportEvidence}
        onCreateImportDraft={handleCreateImportDraft}
        onCreateImportPlayer={handleCreateImportPlayer}
      />
    </AppShell>
  );
}
