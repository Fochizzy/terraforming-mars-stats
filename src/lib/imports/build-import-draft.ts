import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { buildImportDraftNotes } from './build-import-draft-notes';
import type { ParsedCardPointBreakdown, ParsedGameLog } from './parse-game-log';
import type { ParsedEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import type {
  CardOption,
  CorporationOption,
  MapAwardOption,
  MapMilestoneOption,
  PreludeOption,
  StyleOption,
} from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';
import { parseImportPlayerScores } from './parse-import-player-scores';
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

export type CreateImportDraftInput = ImportDraftValues & {
  confirmedPlayerLinks?: Array<{
    importedName: string;
    playerId: string;
  }>;
  endgameScreenshot: File | null;
};

export function buildImportDraft(input: {
  awardOptions?: MapAwardOption[];
  cardScoring?: ImportPlayerCardScoringSummary[];
  cardOptions?: CardOption[];
  corporationOptions?: CorporationOption[];
  curatedBoardItems?: CuratedBoardImportItem[];
  defaultExpansionCodes: string[];
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
      const completeCalculatedCardPointsTotal =
        cardScoringSummary?.totals.complete
          ? cardScoringSummary.totals.total + (provedCuratedBoardCardPoints ?? 0)
          : undefined;
      const mergedScore = {
        awardPoints:
          logScore.awardPoints ??
          scoreCandidate?.awardPoints ??
          expectedAwardPointsByPlayerId.get(playerId),
        cardPointsAnimals:
          logScore.cardPointsAnimals ??
          cardPointBreakdown?.cardPointsAnimals ??
          scoreCandidate?.cardPointsAnimals ??
          (hasCalculatedCategory('animals')
            ? cardScoringSummary?.totals.animals
            : undefined),
        cardPointsJovian:
          logScore.cardPointsJovian ??
          cardPointBreakdown?.cardPointsJovian ??
          scoreCandidate?.cardPointsJovian ??
          (hasCalculatedCategory('jovian')
            ? cardScoringSummary?.totals.jovian
            : undefined),
        cardPointsMicrobes:
          logScore.cardPointsMicrobes ??
          cardPointBreakdown?.cardPointsMicrobes ??
          scoreCandidate?.cardPointsMicrobes ??
          (hasCalculatedCategory('microbes')
            ? cardScoringSummary?.totals.microbes
            : undefined),
        cardPointsTotal:
          logScore.cardPointsTotal ??
          scoreCandidate?.cardPointsTotal ??
          completeCalculatedCardPointsTotal ??
          provedCuratedBoardCardPoints,
        citiesPoints: logScore.citiesPoints ?? scoreCandidate?.citiesPoints,
        finalMegacredits:
          logScore.finalMegacredits ?? scoreCandidate?.finalMegacredits,
        greeneryPoints: logScore.greeneryPoints ?? scoreCandidate?.greeneryPoints,
        milestonePoints:
          logScore.milestonePoints ??
          scoreCandidate?.milestonePoints ??
          expectedMilestonePointsByPlayerId.get(playerId),
        totalPoints: logScore.totalPoints ?? scoreCandidate?.totalPoints,
        trPoints: logScore.trPoints ?? scoreCandidate?.trPoints,
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
    expansionCodes: [...input.defaultExpansionCodes],
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
