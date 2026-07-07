'use server';

import {
  previewImportGroupResolution,
  resolveOrCreateImportGroup,
} from '@/lib/db/import-group-repo';
import { saveDraftGame } from '@/lib/db/game-draft-repo';
import {
  saveGameLogEvents,
  saveGameLogImport,
} from '@/lib/db/game-import-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import {
  describeUnknownError,
  serializeUnknownError,
} from '@/lib/errors/describe-unknown-error';
import { buildImportBoardSnapshot } from '@/lib/imports/build-import-board-snapshot';
import { buildImportDraft } from '@/lib/imports/build-import-draft';
import { buildGameLogEventWrites } from '@/lib/imports/build-game-log-event-writes';
import {
  buildImportReviewModel,
  type ImportReviewModel,
} from '@/lib/imports/build-import-review-model';
import {
  isSupportedBoardMapId,
  type SupportedBoardMapId,
} from '@/lib/imports/board-space-maps';
import { calculateImportCardScores } from '@/lib/imports/card-scoring/calculate-import-card-scores';
import { extractGameLogParticipantNames } from '@/lib/imports/extract-game-log-participant-names';
import { parseCreateImportDraftFormData } from '@/lib/imports/import-draft-form-data';
import {
  type ParsedEndgameScoreScreenshot,
} from '@/lib/imports/parse-endgame-score-screenshot';
import { parseGameLog } from '@/lib/imports/parse-game-log';
import { parseImportPlayerScores } from '@/lib/imports/parse-import-player-scores';
import {
  scoreCuratedBoardImportItems,
  type CuratedBoardImportItem,
} from '@/lib/imports/score-curated-board-import-items';
import {
  listCardScoringReferences,
  listCards,
  listCorporations,
  listMapAwards,
  listMapMilestones,
  listPreludes,
  listStyles,
} from '@/lib/db/reference-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type WebImportActionResult = {
  gameId?: string;
  message?: string;
  review?: ImportReviewModel;
  status: 'error' | 'idle' | 'success';
};

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

function buildBoardScreenshotConfirmationRequests(
  items: CuratedBoardImportItem[],
) {
  const requests = new Map<string, { spaceId: string }>();

  for (const item of items) {
    if (
      item.itemType !== 'card' ||
      item.cardName !== 'Commercial District' ||
      !item.requestedSpaceIds?.length
    ) {
      continue;
    }

    for (const spaceId of item.requestedSpaceIds) {
      if (requests.has(spaceId)) {
        continue;
      }

      requests.set(spaceId, {
        spaceId,
      });
    }
  }

  return [...requests.values()];
}

async function readBoardScreenshotEvidence(boardScreenshots: File[]) {
  return Promise.all(
    boardScreenshots.map(async (file) => {
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
    }),
  );
}

async function readBoardScreenshotConfirmationsSafely(input: {
  mapId: SupportedBoardMapId;
  requests: Array<{ spaceId: string }>;
  screenshots: File[];
}) {
  if (input.requests.length === 0 || input.screenshots.length === 0) {
    return undefined;
  }

  return undefined;
}

export async function analyzeImportEvidenceAction(
  formData: FormData,
): Promise<WebImportActionResult> {
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
    const initialCuratedBoardItems =
      boardSnapshot == null
        ? []
        : scoreCuratedBoardImportItems({
            boardSnapshot,
            events: parsedGameLog.events,
            mapId: boardSnapshot.mapId,
            participantNames: detectedParticipantNames,
          });
    const boardScreenshotConfirmationRequests =
      buildBoardScreenshotConfirmationRequests(initialCuratedBoardItems);
    const boardScreenshotConfirmations =
      boardSnapshot != null &&
      values.boardScreenshots.length > 0 &&
      boardScreenshotConfirmationRequests.length > 0
        ? await readBoardScreenshotConfirmationsSafely({
            mapId: boardSnapshot.mapId,
            requests: boardScreenshotConfirmationRequests,
            screenshots: values.boardScreenshots,
          })
        : undefined;
    const curatedBoardItems =
      boardSnapshot == null
        ? []
        : scoreCuratedBoardImportItems({
            boardSnapshot,
            events: parsedGameLog.events,
            mapId: boardSnapshot.mapId,
            participantNames: detectedParticipantNames,
            screenshotConfirmations: boardScreenshotConfirmations,
          });
    const parsedScreenshot: ParsedEndgameScoreScreenshot = { playerRows: [] };

    if (values.endgameScreenshot) {
      console.warn('Endgame screenshot OCR skipped in worker runtime');
    }

    const boardScreenshotEvidence = await readBoardScreenshotEvidence(
      values.boardScreenshots,
    );
    const boardStateTextLines = boardScreenshotEvidence.flatMap(
      (screenshot) => screenshot.textLines,
    );

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

    const importPreview = await previewImportGroupResolution({
      participantNames: importedNames,
    });
    const cardScoring = await calculateImportCardScores({
      boardStateTextLines,
      cardReferences: await listCardScoringReferences(),
      events: parsedGameLog.events,
    });

    return {
      status: 'success',
      message: `Parsed ${parsedGameLog.events.length} log events and ${parsedScreenshot.playerRows.length} screenshot score rows.`,
      review: buildImportReviewModel({
        boardReviewItems: curatedBoardItems,
        cardScoring,
        groupResolution: {
          action: importPreview.createdNewGroup ? 'create' : 'reuse',
          groupName: importPreview.groupName,
          participantCount: importedNames.length,
          summary: importPreview.createdNewGroup
            ? `This import will create ${importPreview.groupName} because no existing group has this exact roster.`
            : `This import will reuse ${importPreview.groupName} because its roster exactly matches an existing group.`,
        },
        logScoreCandidates,
        logParse: parsedGameLog,
        playerLinks: { matches: [], unresolvedCount: 0 },
        screenshotParse: parsedScreenshot,
      }),
    };
  } catch (error) {
    console.error('Web import analysis failed', serializeUnknownError(error));

    return {
      status: 'error',
      message: describeUnknownError(
        error,
        'Unable to analyze this import evidence right now.',
      ),
    };
  }
}

export async function createImportDraftAction(
  formData: FormData,
): Promise<WebImportActionResult> {
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
    const initialCuratedBoardItems =
      boardSnapshot == null
        ? []
        : scoreCuratedBoardImportItems({
            boardSnapshot,
            events: parsedGameLog.events,
            mapId: boardSnapshot.mapId,
            participantNames: detectedParticipantNames,
          });
    const boardScreenshotConfirmationRequests =
      buildBoardScreenshotConfirmationRequests(initialCuratedBoardItems);
    const boardScreenshotConfirmations =
      boardSnapshot != null &&
      values.boardScreenshots.length > 0 &&
      boardScreenshotConfirmationRequests.length > 0
        ? await readBoardScreenshotConfirmationsSafely({
            mapId: boardSnapshot.mapId,
            requests: boardScreenshotConfirmationRequests,
            screenshots: values.boardScreenshots,
          })
        : undefined;
    const curatedBoardItems =
      boardSnapshot == null
        ? []
        : scoreCuratedBoardImportItems({
            boardSnapshot,
            events: parsedGameLog.events,
            mapId: boardSnapshot.mapId,
            participantNames: detectedParticipantNames,
            screenshotConfirmations: boardScreenshotConfirmations,
          });
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

    const parsedScreenshot: ParsedEndgameScoreScreenshot = { playerRows: [] };

    if (values.endgameScreenshot) {
      console.warn('Endgame screenshot OCR skipped in worker runtime');
    }

    const cardScoringReferences = await listCardScoringReferences();
    const boardScreenshotEvidence = await readBoardScreenshotEvidence(
      values.boardScreenshots,
    );
    const boardStateTextLines = boardScreenshotEvidence.flatMap(
      (screenshot) => screenshot.textLines,
    );
    const cardScoring = await calculateImportCardScores({
      boardStateTextLines,
      cardReferences: cardScoringReferences,
      events: parsedGameLog.events,
    });

    if (
      detectedParticipantNames.length === 0 &&
      parsedScreenshot.playerRows.length === 0
    ) {
      throw new Error(
        'Add participant names or import evidence that includes player names.',
      );
    }

    const importedNames = Array.from(
      new Set([
        ...detectedParticipantNames,
        ...parsedScreenshot.playerRows.map((row) => row.playerName),
      ]),
    );
    const importGroup = await resolveOrCreateImportGroup({
      importingUserId: activeUser.id,
      participantNames: importedNames,
    });
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
        participantNames: importedNames,
      },
      milestoneOptions,
      parsedGameLog,
      playerSelections: [],
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

    revalidatePath('/group');
    revalidatePath('/group/players');
    revalidatePath('/group/settings');
    revalidatePath('/insights');
    revalidatePath('/log-game');
    revalidatePath('/profile');

    return {
      status: 'success',
      gameId: draft.gameId,
      message: importGroup.createdNewGroup
        ? `Created ${importGroup.groupName} and saved import draft ${draft.gameId.slice(0, 8)}. Parsed ${parsedGameLog.events.length} log events and ${parsedScreenshot.playerRows.length} screenshot score rows.`
        : `Matched ${importGroup.groupName} and saved import draft ${draft.gameId.slice(0, 8)}. Parsed ${parsedGameLog.events.length} log events and ${parsedScreenshot.playerRows.length} screenshot score rows.`,
    };
  } catch (error) {
    console.error('Web import draft save failed', serializeUnknownError(error));

    return {
      status: 'error',
      message: describeUnknownError(
        error,
        'Unable to save this import draft right now.',
      ),
    };
  }
}
