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
  findDuplicateGameLogImport,
  saveGameLogEvents,
  saveGameLogImport,
  saveGameLogTagSummaries,
} from '@/lib/db/game-import-repo';
import {
  listImportResolutionPlayers,
  listImportResolutionPlayersForCurrentUser,
  matchImportPlayerNames,
} from '@/lib/db/import-player-resolution-repo';
import {
  listPlayerImportAliasesForGroup,
  savePlayerImportAlias,
} from '@/lib/db/player-import-alias-repo';
import { createPlayerIfMissing, updatePlayerIdentity } from '@/lib/db/player-repo';
import {
  listCardScoringReferences,
  listCardTagReferences,
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
import { collectCuratedBoardImportItems } from '@/lib/imports/collect-curated-board-items';
import { inferBoardMapFromImportEvidence } from '@/lib/imports/infer-supported-board-map';
import { buildGameLogEventWrites } from '@/lib/imports/build-game-log-event-writes';
import { buildImportReviewModel } from '@/lib/imports/build-import-review-model';
import { derivePlayerTagSummaries } from '@/lib/imports/derive-player-tag-summaries';
import { extractGameLogParticipantNames } from '@/lib/imports/extract-game-log-participant-names';
import {
  parseCreateImportDraftFormData,
  type ParsedCreateImportDraftFormData,
  type ScreenshotOcrPayload,
} from '@/lib/imports/import-draft-form-data';
import {
  parseEndgameScoreScreenshot,
  type ParsedEndgameScoreScreenshot,
} from '@/lib/imports/parse-endgame-score-screenshot';
import { parseGameLog } from '@/lib/imports/parse-game-log';
import {
  parseImportPlayerScores,
} from '@/lib/imports/parse-import-player-scores';
import type { GameResultGlobalParameters } from '@/lib/imports/read-game-result-screenshot';
import {
  parseScoreDetailsScreenshot,
  type ParsedScoreDetailsScreenshot,
} from '@/lib/imports/parse-score-details-screenshot';
import { applyServerPlayerMatches } from '@/lib/imports/apply-server-player-matches';
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
const PDF_READER_VERSION = 'pdf-text-layer-v1';

async function readGameResultEvidenceOnDemand(
  file: File,
  options?: {
    expectedPlayerCount?: number;
    expectedPlayerNames?: string[];
  },
) {
  const { readGameResultEvidence } = await import(
    '@/lib/imports/read-game-result-evidence'
  );

  return readGameResultEvidence({
    file,
    options,
    resolveOcrOps: async () =>
      (await import('@/lib/imports/ocr/sharp-ocr-ops')).sharpOcrOps,
  });
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

function buildMapEvidenceSources(values: ParsedCreateImportDraftFormData) {
  return {
    logLines: values.exportedGameLog.split(/\r?\n/),
    screenshotLines: [
      ...(values.screenshotOcr?.endgameLines ?? []),
      ...(values.screenshotOcr?.scoreDetailsColumns.flatMap(
        (column) => column.textLines,
      ) ?? []),
    ],
  };
}

function describeBoardMapName(mapOptions: MapOption[], mapCode: string) {
  return (
    findSelectedMapOption({ mapOptions, submittedMapId: mapCode })?.name ??
    mapCode
  );
}

function resolveImportMapSelection(input: {
  evidenceSources: ReturnType<typeof buildMapEvidenceSources>;
  fallbackMapId: string | null;
  mapOptions: MapOption[];
  submittedMapId: string;
}) {
  const selectedMapOption = findSelectedMapOption(input);

  if (selectedMapOption) {
    return {
      draftMapId: selectedMapOption.id,
      mapName: selectedMapOption.name,
      source: 'submitted' as const,
    };
  }

  if (input.submittedMapId.trim()) {
    return {
      draftMapId: input.submittedMapId.trim(),
      mapName: null,
      source: 'submitted' as const,
    };
  }

  const inference = inferBoardMapFromImportEvidence(input.evidenceSources);

  if (inference.kind === 'conflict') {
    throw new Error(
      `The exported log looks like a ${describeBoardMapName(
        input.mapOptions,
        inference.logMapId,
      )} game, but the game result screenshot looks like ${describeBoardMapName(
        input.mapOptions,
        inference.screenshotMapId,
      )}. Double-check that the log and screenshot come from the same game.`,
    );
  }

  const inferredMapOption =
    inference.kind === 'detected'
      ? findSelectedMapOption({
          mapOptions: input.mapOptions,
          submittedMapId: inference.mapId,
        })
      : null;

  if (inferredMapOption) {
    return {
      draftMapId: inferredMapOption.id,
      mapName: inferredMapOption.name,
      source: 'detected' as const,
    };
  }

  const fallbackMapOption = input.fallbackMapId
    ? findSelectedMapOption({
        mapOptions: input.mapOptions,
        submittedMapId: input.fallbackMapId,
      })
    : null;

  if (fallbackMapOption) {
    return {
      draftMapId: fallbackMapOption.id,
      mapName: fallbackMapOption.name,
      source: 'group_default' as const,
    };
  }

  throw new Error(
    'We could not detect the map from this log yet. Include the milestone and award lines in the exported log, or set a default map in your group settings.',
  );
}

function describeResolvedMapMessage(
  selection: ReturnType<typeof resolveImportMapSelection>,
) {
  if (selection.source === 'detected' && selection.mapName) {
    return `Detected the ${selection.mapName} map from the import evidence.`;
  }

  if (selection.source === 'group_default' && selection.mapName) {
    return `We could not detect the map from the log, so your group default (${selection.mapName}) was used.`;
  }

  return '';
}

function buildMapScoreReferences(input: {
  awardOptions: Awaited<ReturnType<typeof listMapAwards>>;
  mapId: string;
  milestoneOptions: Awaited<ReturnType<typeof listMapMilestones>>;
}) {
  return {
    awardReferences: input.awardOptions
      .filter((option) => option.mapId === input.mapId)
      .map((option) => ({ id: option.awardId, name: option.awardName })),
    milestoneReferences: input.milestoneOptions
      .filter((option) => option.mapId === input.mapId)
      .map((option) => ({
        id: option.milestoneId,
        name: option.milestoneName,
      })),
  };
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
  globalParameters: GameResultGlobalParameters[];
  parsedScoreDetails: ParsedScoreDetailsScreenshot;
  parsedScreenshot: ParsedEndgameScoreScreenshot;
}) {
  const hasScoreRows = input.parsedScreenshot.playerRows.length > 0;
  const hasScoreDetails = input.parsedScoreDetails.cardScoring.length > 0;
  // Only the PDF reader recovers the global parameter table, and it reads a
  // text layer rather than pixels.
  const readFromPdf = input.globalParameters.length > 0;

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
      globalParameters: input.globalParameters,
      playerRows: input.parsedScreenshot.playerRows,
    },
    ocrEngineVersion: readFromPdf ? PDF_READER_VERSION : OCR_ENGINE_VERSION,
    parseStatus: hasScoreRows || hasScoreDetails ? 'parsed' : 'score_extraction_skipped',
  } as const;
}

function buildExpectedPointTotalsByPlayerName(input: {
  field: 'awardPoints' | 'cardPointsTotal' | 'milestonePoints';
  logScoreCandidates: Array<
    { playerName: string } & Partial<
      Record<'awardPoints' | 'cardPointsTotal' | 'milestonePoints', number>
    >
  >;
  screenshotScoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
}) {
  const totalsByPlayerName: Record<string, number> = {};

  for (const candidate of input.logScoreCandidates) {
    const value = candidate[input.field];

    if (typeof value === 'number') {
      totalsByPlayerName[candidate.playerName] = value;
    }
  }

  for (const candidate of input.screenshotScoreCandidates) {
    const value = candidate[input.field];

    if (typeof value === 'number') {
      totalsByPlayerName[candidate.playerName] = value;
    }
  }

  return totalsByPlayerName;
}

function buildUniquePlayerNames(names: string[]) {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

/**
 * The score details list every card that scored for a player, including their
 * corporation and prelude. Those are catalogued separately from project cards,
 * so they are folded in here or their points are silently dropped and the card
 * total no longer reconciles against the score table.
 */
function buildScoreDetailCardReferences(input: {
  cardReferences: Awaited<ReturnType<typeof listCardScoringReferences>>;
  corporationOptions: Array<{ id: string; name: string }>;
  preludeOptions: Array<{ id: string; name: string }>;
}) {
  return [
    ...input.cardReferences,
    ...[...input.corporationOptions, ...input.preludeOptions].map((option) => ({
      cardName: option.name,
      id: option.id,
      // Corporation and prelude points are never bucketed by resource category.
      sourceTags: [] as string[],
    })),
  ];
}

async function parseGameResultEvidence(input: {
  awardReferences: Array<{ id: string; name: string }>;
  // Corporations score endgame victory points but live outside the project-card
  // catalog, so this accepts any name-bearing reference rather than only cards.
  cardReferences: Array<{ cardName: string; id: string; sourceTags?: string[] }>;
  expectedPlayerCount: number;
  expectedPlayerNames: string[];
  file: File | null;
  milestoneReferences: Array<{ id: string; name: string }>;
  parsedGameLog: ReturnType<typeof parseGameLog>;
  rawLogText: string;
  screenshotOcr: ScreenshotOcrPayload | null;
}) {
  let parsedScreenshot: ParsedEndgameScoreScreenshot = {
    generationCount: null,
    playerRows: [],
  };
  let parsedScoreDetails: ParsedScoreDetailsScreenshot = {
    awardPlacements: [],
    cardScoring: [],
    detectedPlayerNames: [],
    efficiencies: [],
    milestoneClaims: [],
  };
  let globalParameters: GameResultGlobalParameters[] = [];
  // An unreadable game result leaves every score field blank, which looks the
  // same as attaching nothing at all. The reason travels to the review panel.
  let readError: string | null = null;

  try {
    const screenshotRead =
      input.screenshotOcr ??
      (input.file
        ? await readGameResultEvidenceOnDemand(input.file, {
            expectedPlayerCount: input.expectedPlayerCount,
            expectedPlayerNames: input.expectedPlayerNames,
          })
        : null);

    if (screenshotRead) {
      globalParameters = screenshotRead.globalParameters ?? [];
      parsedScreenshot = parseEndgameScoreScreenshot(
        screenshotRead.endgameLines,
        {
          generationCount: screenshotRead.generationCount,
          layout: screenshotRead.endgameLayout,
        },
      );
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
          awardReferences: input.awardReferences,
          cardReferences: input.cardReferences,
          events: input.parsedGameLog.events,
          expectedAwardPointsByPlayerName:
            buildExpectedPointTotalsByPlayerName({
              field: 'awardPoints',
              logScoreCandidates: initialLogScoreCandidates,
              screenshotScoreCandidates: parsedScreenshot.playerRows,
            }),
          expectedCardPointTotalsByPlayerName:
            buildExpectedPointTotalsByPlayerName({
              field: 'cardPointsTotal',
              logScoreCandidates: initialLogScoreCandidates,
              screenshotScoreCandidates: parsedScreenshot.playerRows,
            }),
          expectedMilestonePointsByPlayerName:
            buildExpectedPointTotalsByPlayerName({
              field: 'milestonePoints',
              logScoreCandidates: initialLogScoreCandidates,
              screenshotScoreCandidates: parsedScreenshot.playerRows,
            }),
          expectedPlayerNames: initialImportedNames,
          milestoneReferences: input.milestoneReferences,
          ocrColumns: screenshotRead.scoreDetailsColumns,
        });
      }
    }
  } catch (error) {
    console.warn(
      'Game result screenshot OCR failed',
      serializeUnknownError(error),
    );

    readError = describeUnknownError(
      error,
      'The uploaded game result could not be read.',
    );
  }

  // The evidence names the players as the game did ("Izzy"), while the
  // participants field carries roster names ("Izzy Hodnett"). Unioning the two
  // lists imports one row per spelling, and confirmation then rejects the draft
  // because both rows resolve to the same roster player. The evidence wins when
  // it names anyone; the participants field only supplies names when it cannot.
  const evidencePlayerNames = buildUniquePlayerNames([
    ...parsedScreenshot.playerRows.map((row) => row.playerName),
    ...parsedScoreDetails.detectedPlayerNames,
  ]);
  const importedNames =
    evidencePlayerNames.length > 0
      ? evidencePlayerNames
      : buildUniquePlayerNames(input.expectedPlayerNames);

  return {
    globalParameters,
    importedNames,
    logScoreCandidates: buildLogScoreCandidates({
      playerNames: importedNames,
      rawLogText: input.rawLogText,
    }),
    parsedScoreDetails,
    parsedScreenshot,
    readError,
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
  const groupSettings = context
    ? await getGroupSettings(context.groupId)
    : null;

  async function handleAnalyzeImportEvidence(formData: FormData) {
    'use server';

    try {
      const analyzeSupabase = await createSupabaseServerClient();
      const {
        data: { user: analyzeUser },
        error: analyzeUserError,
      } = await analyzeSupabase.auth.getUser();

      if (analyzeUserError && !isUnauthenticatedAuthError(analyzeUserError)) {
        throw analyzeUserError;
      }

      // The reference reads below are RLS-gated to `authenticated`, so a lapsed
      // session returns empty rows instead of an error and is indistinguishable
      // from an empty catalog.
      if (!analyzeUser) {
        throw new Error('Sign in again before analyzing this import.');
      }

      const [analyzeContext, analyzeMapOptions] = await Promise.all([
        getCurrentGroupContext(),
        listMaps(),
      ]);
      const analyzeGroupSettings = analyzeContext
        ? await getGroupSettings(analyzeContext.groupId)
        : null;
      const values = parseCreateImportDraftFormData(formData);
      const parsedGameLog = parseGameLog(values.exportedGameLog);
      const detectedParticipantNames =
        values.participantNames.length > 0
          ? values.participantNames
          : extractGameLogParticipantNames(parsedGameLog);
      const analyzeMapSelection = resolveImportMapSelection({
        evidenceSources: buildMapEvidenceSources(values),
        fallbackMapId: analyzeGroupSettings?.defaultMapId ?? null,
        mapOptions: analyzeMapOptions,
        submittedMapId: values.mapId,
      });
      const [
        cardReferences,
        cardTagReferences,
        analyzeAwardOptions,
        analyzeMilestoneOptions,
        analyzeCorporationOptions,
        analyzePreludeOptions,
      ] = await Promise.all([
        listCardScoringReferences(),
        listCardTagReferences(),
        listMapAwards(),
        listMapMilestones(),
        listCorporations(),
        listPreludes(),
      ]);

      if (cardTagReferences.length === 0) {
        throw new Error(
          'The card catalog could not be loaded, so played cards cannot be matched. Sign in again or reload before retrying this import.',
        );
      }

      const tagSummaries = derivePlayerTagSummaries({
        cardReferences: cardTagReferences,
        events: parsedGameLog.events,
      });
      const screenshotEvidence = await parseGameResultEvidence({
        ...buildMapScoreReferences({
          awardOptions: analyzeAwardOptions,
          mapId: analyzeMapSelection.draftMapId,
          milestoneOptions: analyzeMilestoneOptions,
        }),
        cardReferences: buildScoreDetailCardReferences({
          cardReferences,
          corporationOptions: analyzeCorporationOptions,
          preludeOptions: analyzePreludeOptions,
        }),
        expectedPlayerCount: Math.max(
          values.playerCount,
          detectedParticipantNames.length,
        ),
        expectedPlayerNames: detectedParticipantNames,
        file: values.endgameScreenshot,
        parsedGameLog,
        rawLogText: values.exportedGameLog,
        screenshotOcr: values.screenshotOcr,
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

      let playerLinks: ReturnType<typeof resolveImportPlayerLinks> = {
        matches: [],
        unresolvedCount: 0,
      };

      if (analyzeContext) {
        const resolved = resolveImportPlayerLinks(
          screenshotEvidence.importedNames,
          await listImportResolutionPlayersForCurrentUser(),
          await listPlayerImportAliasesForGroup(analyzeContext.groupId),
        );
        // The client can only match on the public label now, so the
        // security-definer matcher — which still reads full names, usernames
        // and saved aliases — has the final say on who each name is.
        const matches = applyServerPlayerMatches(
          resolved.matches,
          await matchImportPlayerNames(
            analyzeContext.groupId,
            screenshotEvidence.importedNames,
          ),
        );

        playerLinks = {
          matches,
          unresolvedCount: matches.filter((match) => match.requiresConfirmation)
            .length,
        };
      }

      return {
        status: 'success' as const,
        message: [
          describeResolvedMapMessage(analyzeMapSelection),
          buildImportSuccessMessage({
            logEventCount: parsedGameLog.events.length,
            logScoreRowCount: screenshotEvidence.logScoreCandidates.length,
            screenshotScoreRowCount:
              screenshotEvidence.parsedScreenshot.playerRows.length,
          }),
        ]
          .filter(Boolean)
          .join(' '),
        review: buildImportReviewModel({
          boardReviewItems: collectCuratedBoardImportItems({
            events: parsedGameLog.events,
            mapId: analyzeMapSelection.draftMapId,
            participantNames: detectedParticipantNames,
          }),
          cardScoring: screenshotEvidence.parsedScoreDetails.cardScoring,
          evidenceReadError: screenshotEvidence.readError,
          logScoreCandidates: screenshotEvidence.logScoreCandidates,
          logParse: parsedGameLog,
          playerLinks,
          screenshotParse: screenshotEvidence.parsedScreenshot,
          screenshotScoreDetails: {
            awardPlacements:
              screenshotEvidence.parsedScoreDetails.awardPlacements,
            efficiencies: screenshotEvidence.parsedScoreDetails.efficiencies,
            milestoneClaims:
              screenshotEvidence.parsedScoreDetails.milestoneClaims,
          },
          tagSummaries,
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

      if (activeUserError && !isUnauthenticatedAuthError(activeUserError)) {
        throw activeUserError;
      }

      if (!activeUser) {
        throw new Error('Sign in again before saving this import.');
      }

      const resolvedMapSelection = resolveImportMapSelection({
        evidenceSources: buildMapEvidenceSources(values),
        fallbackMapId: groupSettings?.defaultMapId ?? null,
        mapOptions,
        submittedMapId: values.mapId,
      });
      const [
        cardScoringReferences,
        cardTagReferences,
        awardOptions,
        cards,
        corporationOptions,
        milestoneOptions,
        preludeOptions,
        styleOptions,
      ] = await Promise.all([
        listCardScoringReferences(),
        listCardTagReferences(),
        listMapAwards(),
        listCards(),
        listCorporations(),
        listMapMilestones(),
        listPreludes(),
        listStyles(),
      ]);

      if (cardTagReferences.length === 0) {
        throw new Error(
          'The card catalog could not be loaded, so played cards cannot be matched. Sign in again or reload before retrying this import.',
        );
      }

      const tagSummaries = derivePlayerTagSummaries({
        cardReferences: cardTagReferences,
        events: parsedGameLog.events,
      });
      const screenshotEvidence = await parseGameResultEvidence({
        ...buildMapScoreReferences({
          awardOptions,
          mapId: resolvedMapSelection.draftMapId,
          milestoneOptions,
        }),
        cardReferences: buildScoreDetailCardReferences({
          cardReferences: cardScoringReferences,
          corporationOptions,
          preludeOptions,
        }),
        expectedPlayerCount: Math.max(
          values.playerCount,
          detectedParticipantNames.length,
        ),
        expectedPlayerNames: detectedParticipantNames,
        file: values.endgameScreenshot,
        parsedGameLog,
        rawLogText: values.exportedGameLog,
        screenshotOcr: values.screenshotOcr,
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

      // Route the import to the group whose roster exactly matches these
      // participants, creating it when none exists — never the active group.
      // Reviewers confirm each imported name against the active group's
      // roster, so prefer the confirmed player's canonical display name: that
      // keeps a short nickname in the log (e.g. "Izzy") pointed at the linked
      // profile ("Izzy Hodnett") instead of spinning up a mislabeled group.
      const canonicalNameByImported = new Map<string, string>();

      if (activeContext && confirmedPlayerLinks.length > 0) {
        // The review dropdown offers people from every group the user plays in,
        // so a confirmed selection can reference a player outside the active
        // group. Resolve display names from that same cross-group pool.
        const selectablePlayers = await listImportResolutionPlayersForCurrentUser();
        const displayNameById = new Map(
          selectablePlayers.map((player) => [player.id, player.displayName]),
        );
        const selectedPlayerIds = confirmedPlayerLinks.map(
          (link) => link.playerId,
        );
        const uniqueSelectedPlayerIds = new Set(selectedPlayerIds);

        if (uniqueSelectedPlayerIds.size !== selectedPlayerIds.length) {
          throw new Error(
            'Each imported player must map to a different roster player.',
          );
        }

        for (const link of confirmedPlayerLinks) {
          const displayName = displayNameById.get(link.playerId);

          if (!displayName) {
            throw new Error('One confirmed player match is no longer available.');
          }

          canonicalNameByImported.set(link.importedName, displayName);
        }
      }

      const rosterNames = resolvedParticipantNames.map(
        (name) => canonicalNameByImported.get(name) ?? name,
      );
      // Route on the confirmed player ids, not these labels. Since identity
      // went private the label is a public stand-in ("lurker", "Guest 8F2A…")
      // that matches no roster row, so name-only routing would create a
      // duplicate roster rather than reuse the person the reviewer picked.
      const playerIdByImportedName = new Map(
        confirmedPlayerLinks.map((link) => [link.importedName, link.playerId]),
      );
      const rosterPlayerIds = resolvedParticipantNames.map(
        (name) => playerIdByImportedName.get(name) ?? null,
      );
      const importGroup = await resolveOrCreateImportGroup({
        importingUserId: activeUser.id,
        participantNames: rosterNames,
        participantPlayerIds: rosterPlayerIds,
      });
      // Re-point the confirmed links onto the routed group's roster players so
      // the draft and any saved aliases reference the right group.
      const rosterPlayerLinks = resolvedParticipantNames.map(
        (importedName, index) => ({
          importedName,
          playerId: importGroup.selectedPlayerIds[index]!,
        }),
      );

      const activeGroupSettings = await getGroupSettings(importGroup.groupId);
      const resolvedGenerationCount = resolveImportGenerationCount({
        parsedGameLog,
        parsedScreenshot: screenshotEvidence.parsedScreenshot,
        submittedGenerationCount: values.generationCount,
      });
      const draftForm = buildImportDraft({
        awardOptions,
        cardScoring: screenshotEvidence.parsedScoreDetails.cardScoring,
        cardOptions: cards,
        corporationOptions,
        curatedBoardItems: collectCuratedBoardImportItems({
          events: parsedGameLog.events,
          mapId: resolvedMapSelection.draftMapId,
          participantNames: resolvedParticipantNames,
        }),
        defaultPromoSetSlugs: activeGroupSettings.defaultPromoSetSlugs,
        groupId: importGroup.groupId,
        importValues: {
          ...values,
          generationCount: resolvedGenerationCount,
          mapId: resolvedMapSelection.draftMapId,
          participantNames: resolvedParticipantNames,
        },
        milestoneOptions,
        parsedGameLog,
        playerSelections: rosterPlayerLinks,
        preludeOptions,
        scoreCandidates: screenshotEvidence.parsedScreenshot.playerRows,
        screenshotScoreDetails: {
          awardPlacements: screenshotEvidence.parsedScoreDetails.awardPlacements,
          milestoneClaims: screenshotEvidence.parsedScoreDetails.milestoneClaims,
        },
        selectedPlayerIds: importGroup.selectedPlayerIds,
        styleOptions,
      });
      // Block re-importing a game whose exported log already exists in this
      // group's history so the same game can't be uploaded twice.
      const isDuplicateUpload = await findDuplicateGameLogImport({
        groupId: importGroup.groupId,
        rawLogText: values.exportedGameLog,
      });

      if (isDuplicateUpload) {
        throw new Error('Cannot Upload a Game Twice');
      }

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
                  globalParameters: screenshotEvidence.globalParameters,
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
      await saveGameLogTagSummaries({
        gameLogImportId: gameLogImport.id,
        tagSummaries,
      });

      if (rosterPlayerLinks.length > 0) {
        const aliasPlayers = await listImportResolutionPlayers(importGroup.groupId);
        const aliasesToSave = buildConfirmedPlayerAliases({
          confirmedPlayerLinks: rosterPlayerLinks,
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

        // Persist the username + full name typed in review onto the routed
        // group's roster players. Keyed by imported name so a created player or
        // a matched one both land their identity on the right row. Best-effort:
        // a failure here must not sink an otherwise-valid import.
        const identityByImportedName = new Map(
          (values.playerIdentities ?? []).map((identity) => [
            identity.importedName,
            identity,
          ]),
        );
        const identitySaveResults = await Promise.allSettled(
          rosterPlayerLinks.flatMap((link) => {
            const identity = identityByImportedName.get(link.importedName);

            if (!identity) {
              return [];
            }

            return [
              updatePlayerIdentity({
                fullName: identity.fullName,
                groupId: importGroup.groupId,
                playerId: link.playerId,
                username: identity.username,
              }),
            ];
          }),
        );
        const identityFailures = identitySaveResults.flatMap((result) =>
          result.status === 'rejected'
            ? [serializeUnknownError(result.reason)]
            : [],
        );

        if (identityFailures.length > 0) {
          console.warn('Import player identity save failed', identityFailures);
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
        groupId: importGroup.groupId,
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

  async function handleCreateImportPlayer(
    importedName: string,
    username?: string,
    fullName?: string,
  ) {
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

      const resolvedUsername = username?.trim() || displayName;
      const resolvedFullName = fullName?.trim() || null;
      const createdPlayer = await createPlayerIfMissing({
        displayName,
        fullName: resolvedFullName,
        groupId: activeContext.groupId,
        linkedUserId: null,
        username: resolvedUsername,
      });

      revalidatePath('/group');
      revalidatePath('/group/players');
      revalidatePath('/log-game');

      return {
        status: 'success' as const,
        message: 'Player added to the shared roster.',
        createdPlayer: {
          displayName: createdPlayer.display_name,
          // The roster row no longer reads these columns back, so the values
          // just submitted for this player are what review carries forward.
          fullName: resolvedFullName,
          id: createdPlayer.id,
          username: resolvedUsername,
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
          : [{ href: '/log-game', label: 'Web Import' }]
      }
      title="Web Import"
      wide
    >
      <LogGameImportShell
        initialValues={{
          playedOn: new Date().toISOString().slice(0, 10),
        }}
        onAnalyzeImportEvidence={handleAnalyzeImportEvidence}
        onCreateImportDraft={handleCreateImportDraft}
        onCreateImportPlayer={handleCreateImportPlayer}
      />
    </AppShell>
  );
}
