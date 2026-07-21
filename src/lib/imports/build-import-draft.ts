import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { buildImportDraftNotes } from './build-import-draft-notes';
import type { ParsedCardPointBreakdown, ParsedGameLog } from './parse-game-log';
import type { ParsedEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import type {
  ParsedScreenshotAwardPlacement,
  ParsedScreenshotMilestoneClaim,
} from './parse-score-details-screenshot';
import type {
  CardOption,
  CorporationOption,
  MapAwardOption,
  MapMilestoneOption,
  PreludeOption,
  StyleOption,
} from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';
import {
  extractStructuredLogScores,
  parseImportPlayerScores,
} from './parse-import-player-scores';
import { parseImportPlayerSelections } from './parse-import-player-selections';
import { parseImportPlayerStyles } from './parse-import-player-styles';
import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
import type { CuratedBoardImportItem } from './score-curated-board-import-items';

export type ImportDraftValues = {
  endgameScreenshotName?: string | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  participantNames: string[];
  playedOn: string;
  playerCount: number;
};

export type CreateImportDraftInput = Omit<ImportDraftValues, 'generationCount'> & {
  confirmedPlayerLinks?: Array<{
    importedName: string;
    playerId: string;
  }>;
  endgameScreenshot: File | null;
  generationCount: number | null;
  scoreDetailsScreenshot?: File | null;
};

function hasFiniteScoreValue(value: unknown): value is number {
  // Every merged score field (VP categories, TR, milestones, awards, final
  // megacredits) is physically non-negative, so a negative reading is OCR or
  // parse noise: drop it so the merge falls back to better evidence.
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function mergeCrossCheckedScoreValue(input: {
  authoritativeValue?: number;
  calculatedValue?: number;
  fallbackValue?: number;
  logValue?: number;
  screenshotValue?: number;
}) {
  // A complete calculated card breakdown (see the provenance note on
  // buildCardScoringCrossChecks in build-import-review-model.ts — it is
  // largely a differently-read region of the same uploaded evidence, not an
  // independent external source) is exactly the evidence the review UI
  // compares against the screenshot's card-point fields. Whenever the UI
  // would flag that comparison as a conflict, the draft must actually blank
  // the field: this check runs before every other source below — including
  // the engine-authoritative log block — so nothing can silently accept a
  // value the UI is telling the user to manually review.
  if (
    hasFiniteScoreValue(input.calculatedValue) &&
    hasFiniteScoreValue(input.screenshotValue) &&
    input.calculatedValue !== input.screenshotValue
  ) {
    return undefined;
  }

  // The exported log's machine-written final-scores block is written by the
  // game engine itself, so it wins outright over screenshot OCR readings.
  if (hasFiniteScoreValue(input.authoritativeValue)) {
    return input.authoritativeValue;
  }

  if (
    hasFiniteScoreValue(input.logValue) &&
    hasFiniteScoreValue(input.screenshotValue)
  ) {
    return input.logValue === input.screenshotValue ? input.logValue : undefined;
  }

  if (hasFiniteScoreValue(input.logValue)) {
    return input.logValue;
  }

  if (hasFiniteScoreValue(input.screenshotValue)) {
    return input.screenshotValue;
  }

  return hasFiniteScoreValue(input.fallbackValue)
    ? input.fallbackValue
    : undefined;
}

export function buildImportDraft(input: {
  awardOptions?: MapAwardOption[];
  cardScoring?: ImportPlayerCardScoringSummary[];
  cardOptions?: CardOption[];
  corporationOptions?: CorporationOption[];
  curatedBoardItems?: CuratedBoardImportItem[];
  defaultPromoSetSlugs: string[];
  groupId: string;
  importValues: ImportDraftValues;
  milestoneOptions?: MapMilestoneOption[];
  parsedGameLog?: {
    cardPointBreakdowns: ParsedCardPointBreakdown[];
    events?: ParsedGameLog['events'];
  };
  playerSelections?: Array<{ importedName: string; playerId: string }>;
  preludeOptions?: PreludeOption[];
  scoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  screenshotScoreDetails?: {
    awardPlacements: ParsedScreenshotAwardPlacement[];
    milestoneClaims: ParsedScreenshotMilestoneClaim[];
  };
  selectedPlayerIds: string[];
  styleOptions?: StyleOption[];
}): LogGameDraftInput {
  const fallbackPlayerSelections = input.importValues.participantNames.flatMap(
    (participantName, index) => {
      const playerId = input.selectedPlayerIds[index];
      return playerId ? [{ importedName: participantName, playerId }] : [];
    },
  );
  const playerSelections =
    input.playerSelections && input.playerSelections.length > 0
      ? input.playerSelections
      : fallbackPlayerSelections;
  const selectedPlayerIds = playerSelections.length
    ? playerSelections.map((selection) => selection.playerId)
    : input.selectedPlayerIds;
  const playerIdByImportedName = new Map([
    ...input.importValues.participantNames.flatMap((participantName, index) => {
      const playerId = input.selectedPlayerIds[index];
      return playerId
        ? [[normalizePlayerAlias(participantName), playerId] as const]
        : [];
    }),
    ...playerSelections.map(
      (selection) =>
        [
          normalizePlayerAlias(selection.importedName),
          selection.playerId,
        ] as const,
    ),
  ]);
  const importedNameByPlayerId = new Map(
    playerSelections.map((selection) => [
      selection.playerId,
      selection.importedName,
    ]),
  );
  const importedPlayers = playerSelections.map((selection) => ({
    id: selection.playerId,
    name: selection.importedName,
  }));
  const logScoresByPlayerId =
    importedPlayers.length > 0
      ? parseImportPlayerScores({
          evidence: input.importValues.exportedGameLog,
          players: importedPlayers,
        })
      : {};
  const structuredLogScoresByPlayerId =
    importedPlayers.length > 0
      ? extractStructuredLogScores({
          evidence: input.importValues.exportedGameLog,
          players: importedPlayers,
        })
      : {};
  const cardBreakdownsByPlayerId = new Map(
    input.importValues.participantNames.flatMap((participantName, index) => {
      const playerId = input.selectedPlayerIds[index];
      const cardPointBreakdown = input.parsedGameLog?.cardPointBreakdowns.find(
        (breakdown) =>
          normalizePlayerAlias(breakdown.playerName) ===
          normalizePlayerAlias(participantName),
      );

      return playerId && cardPointBreakdown
        ? [[playerId, cardPointBreakdown] as const]
        : [];
    }),
  );
  const scoreCandidatesByPlayerId = new Map(
    (input.scoreCandidates ?? []).flatMap((candidate) => {
      const playerId = playerIdByImportedName.get(
        normalizePlayerAlias(candidate.playerName),
      );

      return playerId ? [[playerId, candidate] as const] : [];
    }),
  );
  const playerSelectionsPrefill =
    playerSelections.length > 0 &&
    input.corporationOptions &&
    input.preludeOptions
      ? parseImportPlayerSelections({
          corporationOptions: input.corporationOptions,
          participants: playerSelections,
          preludeOptions: input.preludeOptions,
          rawLogText: input.importValues.exportedGameLog,
        })
      : {};
  const playerStylesPrefill =
    playerSelections.length > 0 && input.parsedGameLog?.events
      ? parseImportPlayerStyles({
          cardOptions: input.cardOptions ?? [],
          events: input.parsedGameLog.events,
          participants: playerSelections,
          styleOptions: input.styleOptions,
        })
      : {};
  const cardScoringByPlayerId = new Map(
    (input.cardScoring ?? []).flatMap((summary) => {
      const playerId = playerIdByImportedName.get(
        normalizePlayerAlias(summary.playerName),
      );

      return playerId ? [[playerId, summary] as const] : [];
    }),
  );
  const milestoneIdByName = new Map(
    (input.milestoneOptions ?? [])
      .filter((milestone) => milestone.mapId === input.importValues.mapId)
      .map((milestone) => [
        normalizePlayerAlias(milestone.milestoneName),
        milestone.milestoneId,
      ]),
  );
  const awardIdByName = new Map(
    (input.awardOptions ?? [])
      .filter((award) => award.mapId === input.importValues.mapId)
      .map((award) => [normalizePlayerAlias(award.awardName), award.awardId]),
  );
  const milestoneClaims: LogGameDraftInput['milestoneClaims'] = {};
  const awardClaims: LogGameDraftInput['awardClaims'] = {};

  for (const event of input.parsedGameLog?.events ?? []) {
    if (event.eventType === 'milestone_claimed' && event.actor && event.milestone) {
      const milestoneId = milestoneIdByName.get(
        normalizePlayerAlias(event.milestone),
      );
      const playerId = playerIdByImportedName.get(
        normalizePlayerAlias(event.actor),
      );

      if (milestoneId && playerId) {
        milestoneClaims[milestoneId] = {
          claimed: true,
          winnerPlayerId: playerId,
        };
      }
    }

    if (event.eventType === 'award_funded' && event.actor && event.award) {
      const awardId = awardIdByName.get(normalizePlayerAlias(event.award));
      const playerId = playerIdByImportedName.get(
        normalizePlayerAlias(event.actor),
      );

      if (awardId && playerId) {
        awardClaims[awardId] = {
          firstPlaceWinnerPlayerIds:
            awardClaims[awardId]?.firstPlaceWinnerPlayerIds ?? [],
          funded: true,
          fundedByPlayerId: playerId,
          secondPlaceWinnerPlayerIds:
            awardClaims[awardId]?.secondPlaceWinnerPlayerIds ?? [],
        };
      }
    }

    if (
      event.eventType === 'award_result' &&
      event.actor &&
      event.award &&
      event.placement
    ) {
      const awardId = awardIdByName.get(normalizePlayerAlias(event.award));
      const playerId = playerIdByImportedName.get(
        normalizePlayerAlias(event.actor),
      );

      if (!awardId || !playerId) {
        continue;
      }

      const existingClaim = awardClaims[awardId] ?? {
        firstPlaceWinnerPlayerIds: [],
        funded: false,
        fundedByPlayerId: '',
        secondPlaceWinnerPlayerIds: [],
      };

      awardClaims[awardId] = {
        ...existingClaim,
        firstPlaceWinnerPlayerIds:
          event.placement === 'first'
            ? [...existingClaim.firstPlaceWinnerPlayerIds, playerId]
            : existingClaim.firstPlaceWinnerPlayerIds,
        secondPlaceWinnerPlayerIds:
          event.placement === 'second'
            ? [...existingClaim.secondPlaceWinnerPlayerIds, playerId]
            : existingClaim.secondPlaceWinnerPlayerIds,
      };
    }
  }

  for (const item of input.curatedBoardItems ?? []) {
    if (item.itemType !== 'award' || item.status !== 'proved') {
      continue;
    }

    const awardId = awardIdByName.get(normalizePlayerAlias(item.awardName));
    const fundedByPlayerId = playerIdByImportedName.get(
      normalizePlayerAlias(item.fundedByPlayerName),
    );
    const firstPlaceWinnerPlayerIds = (item.firstPlacePlayerNames ?? []).flatMap(
      (playerName) => {
        const playerId = playerIdByImportedName.get(
          normalizePlayerAlias(playerName),
        );
        return playerId ? [playerId] : [];
      },
    );
    const secondPlaceWinnerPlayerIds = (item.secondPlacePlayerNames ?? []).flatMap(
      (playerName) => {
        const playerId = playerIdByImportedName.get(
          normalizePlayerAlias(playerName),
        );
        return playerId ? [playerId] : [];
      },
    );

    if (
      !awardId ||
      !fundedByPlayerId ||
      firstPlaceWinnerPlayerIds.length !==
        (item.firstPlacePlayerNames?.length ?? 0) ||
      secondPlaceWinnerPlayerIds.length !==
        (item.secondPlacePlayerNames?.length ?? 0)
    ) {
      continue;
    }

    const existingClaim = awardClaims[awardId] ?? {
      firstPlaceWinnerPlayerIds: [],
      funded: false,
      fundedByPlayerId: '',
      secondPlaceWinnerPlayerIds: [],
    };

    awardClaims[awardId] = {
      firstPlaceWinnerPlayerIds:
        existingClaim.firstPlaceWinnerPlayerIds.length > 0
          ? existingClaim.firstPlaceWinnerPlayerIds
          : firstPlaceWinnerPlayerIds,
      funded: existingClaim.funded || true,
      fundedByPlayerId: existingClaim.fundedByPlayerId || fundedByPlayerId,
      secondPlaceWinnerPlayerIds:
        existingClaim.secondPlaceWinnerPlayerIds.length > 0
          ? existingClaim.secondPlaceWinnerPlayerIds
          : secondPlaceWinnerPlayerIds,
    };
  }

  // Screenshot score-details evidence fills whatever the log did not already
  // establish (award placements in particular are absent from exported logs).
  for (const claim of input.screenshotScoreDetails?.milestoneClaims ?? []) {
    const milestoneId =
      claim.matchedMilestoneId ??
      milestoneIdByName.get(normalizePlayerAlias(claim.milestoneName));
    const playerId = playerIdByImportedName.get(
      normalizePlayerAlias(claim.playerName),
    );

    if (!milestoneId || !playerId || milestoneClaims[milestoneId]) {
      continue;
    }

    milestoneClaims[milestoneId] = {
      claimed: true,
      winnerPlayerId: playerId,
    };
  }

  for (const placement of input.screenshotScoreDetails?.awardPlacements ?? []) {
    const awardId =
      placement.matchedAwardId ??
      awardIdByName.get(normalizePlayerAlias(placement.awardName));
    const playerId = playerIdByImportedName.get(
      normalizePlayerAlias(placement.playerName),
    );

    if (!awardId || !playerId) {
      continue;
    }

    const existingClaim = awardClaims[awardId] ?? {
      firstPlaceWinnerPlayerIds: [],
      funded: false,
      fundedByPlayerId: '',
      secondPlaceWinnerPlayerIds: [],
    };
    const fundedByPlayerId = placement.fundedByPlayerName
      ? playerIdByImportedName.get(
          normalizePlayerAlias(placement.fundedByPlayerName),
        ) ?? ''
      : '';

    awardClaims[awardId] = {
      firstPlaceWinnerPlayerIds:
        placement.placement === 1 &&
        !existingClaim.firstPlaceWinnerPlayerIds.includes(playerId)
          ? [...existingClaim.firstPlaceWinnerPlayerIds, playerId]
          : existingClaim.firstPlaceWinnerPlayerIds,
      funded: existingClaim.funded || Boolean(fundedByPlayerId),
      fundedByPlayerId: existingClaim.fundedByPlayerId || fundedByPlayerId,
      secondPlaceWinnerPlayerIds:
        placement.placement === 2 &&
        !existingClaim.secondPlaceWinnerPlayerIds.includes(playerId)
          ? [...existingClaim.secondPlaceWinnerPlayerIds, playerId]
          : existingClaim.secondPlaceWinnerPlayerIds,
    };
  }

  const expectedMilestonePointsByPlayerId = new Map<string, number>();

  for (const claim of Object.values(milestoneClaims)) {
    if (!claim.claimed || !claim.winnerPlayerId) {
      continue;
    }

    expectedMilestonePointsByPlayerId.set(
      claim.winnerPlayerId,
      (expectedMilestonePointsByPlayerId.get(claim.winnerPlayerId) ?? 0) + 5,
    );
  }

  const expectedAwardPointsByPlayerId = new Map<string, number>();

  for (const claim of Object.values(awardClaims)) {
    if (!claim.funded) {
      continue;
    }

    for (const playerId of claim.firstPlaceWinnerPlayerIds) {
      expectedAwardPointsByPlayerId.set(
        playerId,
        (expectedAwardPointsByPlayerId.get(playerId) ?? 0) + 5,
      );
    }

    for (const playerId of claim.secondPlaceWinnerPlayerIds) {
      if (claim.firstPlaceWinnerPlayerIds.includes(playerId)) {
        continue;
      }

      expectedAwardPointsByPlayerId.set(
        playerId,
        (expectedAwardPointsByPlayerId.get(playerId) ?? 0) + 2,
      );
    }
  }

  const expectedCuratedBoardCardPointsByPlayerId = new Map<string, number>();

  for (const item of input.curatedBoardItems ?? []) {
    if (
      item.itemType !== 'card' ||
      item.status !== 'proved' ||
      typeof item.points !== 'number'
    ) {
      continue;
    }

    const playerId = playerIdByImportedName.get(
      normalizePlayerAlias(item.playerName),
    );

    if (!playerId) {
      continue;
    }

    expectedCuratedBoardCardPointsByPlayerId.set(
      playerId,
      (expectedCuratedBoardCardPointsByPlayerId.get(playerId) ?? 0) + item.points,
    );
  }

  const playerScores = Object.fromEntries(
    selectedPlayerIds.flatMap((playerId) => {
      const importedName = importedNameByPlayerId.get(playerId);
      const scoreCandidate = scoreCandidatesByPlayerId.get(playerId);
      const cardScoringSummary = cardScoringByPlayerId.get(playerId);
      const logScore = logScoresByPlayerId[playerId] ?? {};
      const structuredLogScore = structuredLogScoresByPlayerId[playerId] ?? {};
      const cardPointBreakdown =
        cardBreakdownsByPlayerId.get(playerId) ??
        (importedName
          ? input.parsedGameLog?.cardPointBreakdowns.find(
              (breakdown) =>
                normalizePlayerAlias(breakdown.playerName) ===
                normalizePlayerAlias(importedName),
            )
          : undefined);
      const hasCalculatedCategory = (
        category: 'animals' | 'jovian' | 'microbes',
      ) =>
        cardScoringSummary?.autoScoredCards.some(
          (card) => card.category === category,
        ) ?? false;
      const provedCuratedBoardCardPoints =
        expectedCuratedBoardCardPointsByPlayerId.get(playerId);
      // Pending cards could resolve into any category, so only a *complete*
      // calculation is trustworthy enough to gate a conflict check on.
      const completeCalculatedCardPointsTotal =
        cardScoringSummary?.totals.complete
          ? cardScoringSummary.totals.total
          : undefined;
      const completeCalculatedCardPointsAnimals =
        cardScoringSummary?.totals.complete
          ? cardScoringSummary.totals.animals
          : undefined;
      const completeCalculatedCardPointsJovian =
        cardScoringSummary?.totals.complete
          ? cardScoringSummary.totals.jovian
          : undefined;
      const completeCalculatedCardPointsMicrobes =
        cardScoringSummary?.totals.complete
          ? cardScoringSummary.totals.microbes
          : undefined;
      const cardPointsAnimals =
        mergeCrossCheckedScoreValue({
          calculatedValue: completeCalculatedCardPointsAnimals,
          fallbackValue:
            cardPointBreakdown?.cardPointsAnimals ??
            (hasCalculatedCategory('animals')
              ? cardScoringSummary?.totals.animals
              : undefined),
          logValue: logScore.cardPointsAnimals,
          screenshotValue: scoreCandidate?.cardPointsAnimals,
        });
      const cardPointsJovian =
        mergeCrossCheckedScoreValue({
          calculatedValue: completeCalculatedCardPointsJovian,
          fallbackValue:
            cardPointBreakdown?.cardPointsJovian ??
            (hasCalculatedCategory('jovian')
              ? cardScoringSummary?.totals.jovian
              : undefined),
          logValue: logScore.cardPointsJovian,
          screenshotValue: scoreCandidate?.cardPointsJovian,
        });
      const cardPointsMicrobes =
        mergeCrossCheckedScoreValue({
          calculatedValue: completeCalculatedCardPointsMicrobes,
          fallbackValue:
            cardPointBreakdown?.cardPointsMicrobes ??
            (hasCalculatedCategory('microbes')
              ? cardScoringSummary?.totals.microbes
              : undefined),
          logValue: logScore.cardPointsMicrobes,
          screenshotValue: scoreCandidate?.cardPointsMicrobes,
        });
      const hasPartialCardCategoryBreakdown =
        typeof cardPointsAnimals === 'number' ||
        typeof cardPointsJovian === 'number' ||
        typeof cardPointsMicrobes === 'number';
      const allowBoardOnlyCardPointsTotalFallback =
        cardScoringSummary == null &&
        !hasPartialCardCategoryBreakdown;
      const mergedScore = {
        awardPoints: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.awardPoints,
          fallbackValue: expectedAwardPointsByPlayerId.get(playerId),
          logValue: logScore.awardPoints,
          screenshotValue: scoreCandidate?.awardPoints,
        }),
        cardPointsAnimals,
        cardPointsJovian,
        cardPointsMicrobes,
        cardPointsTotal: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.cardPointsTotal,
          calculatedValue: completeCalculatedCardPointsTotal,
          fallbackValue:
            completeCalculatedCardPointsTotal ??
            (allowBoardOnlyCardPointsTotalFallback
              ? provedCuratedBoardCardPoints
              : undefined),
          logValue: logScore.cardPointsTotal,
          screenshotValue: scoreCandidate?.cardPointsTotal,
        }),
        citiesPoints: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.citiesPoints,
          logValue: logScore.citiesPoints,
          screenshotValue: scoreCandidate?.citiesPoints,
        }),
        finalMegacredits: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.finalMegacredits,
          logValue: logScore.finalMegacredits,
          screenshotValue: scoreCandidate?.finalMegacredits,
        }),
        greeneryPoints: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.greeneryPoints,
          logValue: logScore.greeneryPoints,
          screenshotValue: scoreCandidate?.greeneryPoints,
        }),
        milestonePoints: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.milestonePoints,
          fallbackValue: expectedMilestonePointsByPlayerId.get(playerId),
          logValue: logScore.milestonePoints,
          screenshotValue: scoreCandidate?.milestonePoints,
        }),
        totalPoints: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.totalPoints,
          logValue: logScore.totalPoints,
          screenshotValue: scoreCandidate?.totalPoints,
        }),
        trPoints: mergeCrossCheckedScoreValue({
          authoritativeValue: structuredLogScore.trPoints,
          logValue: logScore.trPoints,
          screenshotValue: scoreCandidate?.trPoints,
        }),
      };

      if (
        Object.values(mergedScore).every((value) => typeof value === 'undefined')
      ) {
        return [];
      }

      return [[playerId, mergedScore] as const];
    }),
  );

  return {
    awardClaims,
    gameId: undefined,
    generationCount: input.importValues.generationCount,
    groupId: input.groupId,
    mapId: input.importValues.mapId,
    milestoneClaims,
    notes: buildImportDraftNotes({
      endgameScreenshotName: input.importValues.endgameScreenshotName,
      exportedGameLog: input.importValues.exportedGameLog,
    }),
    playedOn: input.importValues.playedOn,
    playerCount: selectedPlayerIds.length || input.importValues.playerCount,
    playerScores,
    playerSelections: playerSelectionsPrefill,
    playerStyles: playerStylesPrefill,
    promoSetSlugs: [...input.defaultPromoSetSlugs],
    selectedPlayerIds,
  };
}
