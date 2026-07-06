import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { buildImportDraftNotes } from './build-import-draft-notes';
import type { ParsedCardPointBreakdown, ParsedGameLog } from './parse-game-log';
import type { ParsedEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import type {
  MapAwardOption,
  MapMilestoneOption,
} from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';

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
  scoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  selectedPlayerIds: string[];
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
  const playerScores = Object.fromEntries(
    selectedPlayerIds.flatMap((playerId) => {
      const importedName = importedNameByPlayerId.get(playerId);
      const scoreCandidate = scoreCandidatesByPlayerId.get(playerId);
      const cardPointBreakdown =
        cardBreakdownsByPlayerId.get(playerId) ??
        (importedName
          ? input.parsedGameLog?.cardPointBreakdowns.find(
              (breakdown) =>
                normalizePlayerAlias(breakdown.playerName) ===
                normalizePlayerAlias(importedName),
            )
          : undefined);

      if (!scoreCandidate && !cardPointBreakdown) {
        return [];
      }

      return [
        [
          playerId,
          {
            awardPoints: scoreCandidate?.awardPoints,
            cardPointsAnimals:
              scoreCandidate?.cardPointsAnimals ??
              cardPointBreakdown?.cardPointsAnimals,
            cardPointsJovian:
              scoreCandidate?.cardPointsJovian ??
              cardPointBreakdown?.cardPointsJovian,
            cardPointsMicrobes:
              scoreCandidate?.cardPointsMicrobes ??
              cardPointBreakdown?.cardPointsMicrobes,
            cardPointsTotal: scoreCandidate?.cardPointsTotal,
            citiesPoints: scoreCandidate?.citiesPoints,
            finalMegacredits: scoreCandidate?.finalMegacredits,
            greeneryPoints: scoreCandidate?.greeneryPoints,
            milestonePoints: scoreCandidate?.milestonePoints,
            totalPoints: scoreCandidate?.totalPoints,
            trPoints: scoreCandidate?.trPoints,
          },
        ],
      ];
    }),
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
    playerSelections: {},
    playerStyles: {},
    promoSetSlugs: [...input.defaultPromoSetSlugs],
    selectedPlayerIds,
  };
}
