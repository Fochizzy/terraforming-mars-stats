import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type {
  ImportedPlayerResolution,
  ImportPlayerIdentityDraftInput,
} from '@/lib/player-identity/guest-identity';
import type { ImportedScoreRow } from './parse-terraforming-mars-endgame-ocr';
import type {
  ImportObjectiveCorrection,
  ImportObjectiveEvidence,
} from './parse-terraforming-mars-log';
import type {
  ImportPlayedEntityCorrection,
  ImportPlayedEntityEvidence,
} from './parse-terraforming-mars-played-entities';
import type {
  ParsedScreenshotAwardPlacement,
  ParsedScreenshotMilestoneClaim,
} from './parse-score-details-screenshot';
import { buildPlayerNameMatchKeys } from './build-player-name-match-keys';
import { normalizePlayerAlias } from './normalize-player-alias';
import { buildImportDraftNotes } from './build-import-draft-notes';
import type { ImportObjectiveConfiguration } from './objective-configuration';

export type ImportDraftValues = {
  /**
   * Explicit importer confirmation that a detected duplicate source should
   * still be imported as a separate record. Never defaulted on; the action
   * records the acknowledgment and the matched game ids as evidence.
   */
  acknowledgeDuplicateSource?: boolean;
  endgameScreenshotName?: string | null;
  /** Exact original submitted text — never trimmed or normalized. */
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  ocrConfidence?: number | null;
  objectiveEvidence?: ImportObjectiveEvidence[];
  objectiveCorrections?: ImportObjectiveCorrection[];
  objectiveConfiguration?: ImportObjectiveConfiguration;
  parsedPromoSetSlugs?: string[];
  playedEntityEvidence?: ImportPlayedEntityEvidence[];
  playedEntityCorrections?: ImportPlayedEntityCorrection[];
  playedOn: string;
  playerIdentities: ImportPlayerIdentityDraftInput[];
  playerCount: number;
  rawOcrText?: string;
  resultAwardPlacements?: ParsedScreenshotAwardPlacement[];
  resultMilestoneClaims?: ParsedScreenshotMilestoneClaim[];
  scoreRows?: ImportedScoreRow[];
};

export type CreateImportDraftInput = ImportDraftValues & {
  endgameScreenshot: File | null;
};

export function buildImportDraft(input: {
  defaultGuaranteedMergerOffer: boolean;
  defaultPromoSetSlugs: string[];
  groupId: string;
  importValues: ImportDraftValues;
  playerResolutions?: ImportedPlayerResolution[];
}): LogGameDraftInput {
  const playerResolutions = input.playerResolutions ?? [];
  const selectedPlayerIdByImportedName = new Map<string, string>();
  const playerResolutionBySourceText = new Map(
    playerResolutions.map((resolution) => [
      resolution.sourcePlayerText,
      resolution,
    ]),
  );
  for (const match of buildPlayerNameMatchKeys(
    playerResolutions.map((resolution) => resolution.sourcePlayerText),
  )) {
    const resolution = playerResolutionBySourceText.get(match.playerName);
    if (!resolution) {
      continue;
    }
    for (const key of match.keys) {
      selectedPlayerIdByImportedName.set(key, resolution.selectedPlayerId);
    }
  }
  const resolvePlayerId = (playerName: string) =>
    selectedPlayerIdByImportedName.get(normalizePlayerAlias(playerName));
  const playerScores = Object.fromEntries(
    (input.importValues.scoreRows ?? []).flatMap((scoreRow) => {
      const playerId = resolvePlayerId(scoreRow.normalizedPlayerName);
      if (!playerId) {
        return [];
      }

      return [
        [
          playerId,
          {
            awardPoints: scoreRow.awardPoints ?? undefined,
            cardPointsAnimals: scoreRow.cardPointsAnimals ?? undefined,
            cardPointsJovian: scoreRow.cardPointsJovian ?? undefined,
            cardPointsMicrobes: scoreRow.cardPointsMicrobes ?? undefined,
            cardPointsTotal: scoreRow.cardPointsTotal ?? undefined,
            citiesPoints: scoreRow.citiesPoints ?? undefined,
            finalMegacredits: scoreRow.finalMegacredits ?? undefined,
            greeneryPoints: scoreRow.greeneryPoints ?? undefined,
            milestonePoints: scoreRow.milestonePoints ?? undefined,
            totalPoints: scoreRow.totalPoints ?? undefined,
            trPoints: scoreRow.trPoints ?? undefined,
          },
        ],
      ];
    }),
  );
  const milestoneClaims = Object.fromEntries(
    (input.importValues.objectiveEvidence ?? []).flatMap((evidence) => {
      if (evidence.type !== 'milestone' || !evidence.canonicalId) {
        return [];
      }
      const playerId = resolvePlayerId(evidence.normalizedPlayerValue);
      return playerId
        ? [[evidence.canonicalId, { claimed: true, winnerPlayerId: playerId }]]
        : [];
    }),
  );
  const awardClaims: LogGameDraftInput['awardClaims'] = {};
  for (const evidence of input.importValues.objectiveEvidence ?? []) {
    if (evidence.type !== 'award' || !evidence.canonicalId) {
      continue;
    }
    const fundedByPlayerId = resolvePlayerId(evidence.normalizedPlayerValue);
    awardClaims[evidence.canonicalId] = {
      firstPlaceWinnerPlayerIds:
        awardClaims[evidence.canonicalId]?.firstPlaceWinnerPlayerIds ?? [],
      funded: true,
      fundedByPlayerId:
        fundedByPlayerId ??
        awardClaims[evidence.canonicalId]?.fundedByPlayerId ??
        '',
      secondPlaceWinnerPlayerIds:
        awardClaims[evidence.canonicalId]?.secondPlaceWinnerPlayerIds ?? [],
    };
  }
  for (const placement of input.importValues.resultAwardPlacements ?? []) {
    if (!placement.matchedAwardId) {
      continue;
    }
    const current = awardClaims[placement.matchedAwardId] ?? {
      firstPlaceWinnerPlayerIds: [],
      funded: true,
      fundedByPlayerId: '',
      secondPlaceWinnerPlayerIds: [],
    };
    const winnerPlayerId = resolvePlayerId(placement.playerName);
    const fundedByPlayerId = placement.fundedByPlayerName
      ? resolvePlayerId(placement.fundedByPlayerName)
      : undefined;
    const winnerIds =
      placement.placement === 1
        ? current.firstPlaceWinnerPlayerIds
        : current.secondPlaceWinnerPlayerIds;
    if (winnerPlayerId && !winnerIds.includes(winnerPlayerId)) {
      winnerIds.push(winnerPlayerId);
    }
    awardClaims[placement.matchedAwardId] = {
      ...current,
      funded: true,
      fundedByPlayerId: fundedByPlayerId ?? current.fundedByPlayerId,
    };
  }
  const playerSelections = new Map<
    string,
    { corporationId: string; preludeIds: string[] }
  >();
  for (const evidence of input.importValues.playedEntityEvidence ?? []) {
    if (!evidence.canonicalId || !evidence.entityType) {
      continue;
    }
    const playerId = resolvePlayerId(evidence.normalizedPlayerValue);
    if (!playerId) {
      continue;
    }
    const selection = playerSelections.get(playerId) ?? {
      corporationId: '',
      preludeIds: [],
    };
    if (evidence.entityType === 'corporation') {
      selection.corporationId = evidence.canonicalId;
    } else if (
      evidence.entityType === 'prelude' &&
      !selection.preludeIds.includes(evidence.canonicalId)
    ) {
      selection.preludeIds.push(evidence.canonicalId);
    }
    playerSelections.set(playerId, selection);
  }

  return {
    awardClaims,
    gameId: undefined,
    generationCount: input.importValues.generationCount,
    guaranteedMergerOffer: input.defaultGuaranteedMergerOffer,
    groupId: input.groupId,
    importedPlayerResolutions: playerResolutions,
    mapId: input.importValues.mapId,
    mergerOfferRuleSource: 'group_default',
    objectiveConfiguration: input.importValues.objectiveConfiguration ?? 'unknown',
    milestoneClaims,
    notes: buildImportDraftNotes({
      endgameScreenshotName: input.importValues.endgameScreenshotName,
      exportedGameLog: input.importValues.exportedGameLog,
    }),
    playedOn: input.importValues.playedOn,
    playerCount: input.importValues.playerCount,
    playerScores,
    playerSelections: Object.fromEntries(playerSelections),
    playerStyles: {},
    promoSetSlugs: [
      ...new Set([
        ...input.defaultPromoSetSlugs,
        ...(input.importValues.parsedPromoSetSlugs ?? []),
      ]),
    ],
    selectedPlayerIds: playerResolutions.map(
      (resolution) => resolution.selectedPlayerId,
    ),
  };
}
