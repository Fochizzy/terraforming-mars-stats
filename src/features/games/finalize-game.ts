import { inferPrimaryStyle } from '@/features/styles/infer-style';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { rankPlayers } from './tie-utils';

type ReviewIssue = {
  code:
    | 'player_count_mismatch'
    | 'missing_corporation'
    | 'missing_preludes'
    | 'missing_score_fields'
    | 'invalid_map_milestone'
    | 'missing_milestone_winner'
    | 'milestone_points_mismatch'
    | 'invalid_map_award'
    | 'missing_award_funder'
    | 'missing_award_first_place'
    | 'award_points_mismatch'
    | 'invalid_card_breakdown';
  message: string;
  severity: 'error' | 'warning';
};

export type GameReview = {
  coverage: {
    playersWithCardBreakdown: number;
    playersWithDeclaredStyle: number;
    playersWithKeyCards: number;
    playersWithOptionalSubscores: number;
  };
  issues: ReviewIssue[];
};

type ReviewGameInput = Partial<
  Pick<
    LogGameDraftInput,
    | 'awardClaims'
    | 'expansionCodes'
    | 'gameId'
    | 'milestoneClaims'
    | 'notes'
    | 'playerCount'
    | 'playerScores'
    | 'playerSelections'
    | 'playerStyles'
  >
> & {
  mapAwardIds: string[];
  mapMilestoneIds: string[];
  selectedPlayerIds: string[];
};

type FinalizedGameInput = ReviewGameInput & {
  catalogSnapshotId: string | null;
};

export type FinalizedGamePayload = {
  awards: Array<{
    awardId: string;
    fundedByPlayerId: string;
    place: 1 | 2;
    winnerPlayerId: string;
  }>;
  declaredStyles: Array<{
    isPrimary: boolean;
    playerId: string;
    styleCode: string;
  }>;
  gameUpdate: {
    catalog_snapshot_id: string | null;
    status: 'finalized';
  };
  inferredStyles: Array<{
    confidence: number;
    isPrimary: boolean;
    playerId: string;
    styleCode: string;
  }>;
  keyCards: Array<{
    cardId: string;
    playerId: string;
  }>;
  milestones: Array<{
    milestoneId: string;
    winnerPlayerId: string;
  }>;
  players: Array<{
    awardPoints: number;
    cardPointsAnimals: number | null;
    cardPointsJovian: number | null;
    cardPointsMicrobes: number | null;
    cardPointsTotal: number;
    citiesPoints: number;
    corporationId: string | null;
    finalMegacredits: number;
    greeneryPoints: number;
    isWinner: boolean;
    milestonePoints: number;
    otherCardPoints: number | null;
    placement: number;
    playerId: string;
    totalPoints: number;
    trPoints: number;
  }>;
  preludes: Array<{
    playerId: string;
    preludeId: string;
  }>;
  review: GameReview;
  revision: {
    note: string;
    snapshot: Record<string, unknown>;
  };
};

const REQUIRED_SCORE_FIELDS = [
  'citiesPoints',
  'greeneryPoints',
  'cardPointsTotal',
  'trPoints',
  'milestonePoints',
  'awardPoints',
  'totalPoints',
  'finalMegacredits',
] as const;

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getPlayerSelection(input: ReviewGameInput, playerId: string) {
  const selection = input.playerSelections?.[playerId];

  return {
    corporationId:
      selection && typeof selection.corporationId === 'string'
        ? selection.corporationId.trim()
        : '',
    preludeIds: normalizeStringArray(selection?.preludeIds),
  };
}

function getPlayerStyle(input: ReviewGameInput, playerId: string) {
  const style = input.playerStyles?.[playerId];

  return {
    primaryStyleCode:
      style && typeof style.primaryStyleCode === 'string'
        ? style.primaryStyleCode.trim()
        : '',
    modifierStyleCodes: normalizeStringArray(style?.modifierStyleCodes),
    keyCardIds: normalizeStringArray(style?.keyCardIds),
  };
}

function buildExpectedMilestonePoints(input: ReviewGameInput) {
  const pointsByPlayerId = new Map<string, number>();

  for (const [milestoneId, claim] of Object.entries(input.milestoneClaims ?? {})) {
    if (
      !claim.claimed ||
      !hasValue(claim.winnerPlayerId) ||
      !input.mapMilestoneIds.includes(milestoneId)
    ) {
      continue;
    }

    pointsByPlayerId.set(
      claim.winnerPlayerId,
      (pointsByPlayerId.get(claim.winnerPlayerId) ?? 0) + 5,
    );
  }

  return pointsByPlayerId;
}

function buildExpectedAwardPoints(input: ReviewGameInput) {
  const pointsByPlayerId = new Map<string, number>();

  for (const [awardId, claim] of Object.entries(input.awardClaims ?? {})) {
    if (!claim.funded || !input.mapAwardIds.includes(awardId)) {
      continue;
    }

    const firstPlaceWinnerIds = [
      ...new Set(normalizeStringArray(claim.firstPlaceWinnerPlayerIds)),
    ];
    const secondPlaceWinnerIds = [
      ...new Set(normalizeStringArray(claim.secondPlaceWinnerPlayerIds)),
    ].filter((playerId) => !firstPlaceWinnerIds.includes(playerId));

    for (const playerId of firstPlaceWinnerIds) {
      pointsByPlayerId.set(playerId, (pointsByPlayerId.get(playerId) ?? 0) + 5);
    }

    for (const playerId of secondPlaceWinnerIds) {
      pointsByPlayerId.set(playerId, (pointsByPlayerId.get(playerId) ?? 0) + 2);
    }
  }

  return pointsByPlayerId;
}

function computeOtherCardPoints(score: LogGameDraftInput['playerScores'][string]) {
  if (
    !isValidNumber(score.cardPointsTotal) ||
    !isValidNumber(score.cardPointsMicrobes) ||
    !isValidNumber(score.cardPointsAnimals) ||
    !isValidNumber(score.cardPointsJovian)
  ) {
    return null;
  }

  return (
    score.cardPointsTotal -
    score.cardPointsMicrobes -
    score.cardPointsAnimals -
    score.cardPointsJovian
  );
}

function buildPlayerSelectionRows(input: ReviewGameInput) {
  return input.selectedPlayerIds.map((playerId) => ({
    playerId,
    selection: getPlayerSelection(input, playerId),
    score: input.playerScores?.[playerId] ?? {},
    style: getPlayerStyle(input, playerId),
  }));
}

export function buildGameReview(input: ReviewGameInput): GameReview {
  const issues: ReviewIssue[] = [];
  const expectedMilestonePoints = buildExpectedMilestonePoints(input);
  const expectedAwardPoints = buildExpectedAwardPoints(input);
  const expectedPlayerCount = input.playerCount ?? input.selectedPlayerIds.length;

  if (input.selectedPlayerIds.length !== expectedPlayerCount) {
    issues.push({
      code: 'player_count_mismatch',
      message: 'Selected players do not match the chosen player count.',
      severity: 'error',
    });
  }

  for (const { playerId, score, selection, style } of buildPlayerSelectionRows(input)) {
    if (!hasValue(selection.corporationId)) {
      issues.push({
        code: 'missing_corporation',
        message: `Choose a corporation for ${playerId}.`,
        severity: 'error',
      });
    }

    if (
      (input.expansionCodes ?? []).includes('prelude') &&
      selection.preludeIds.length === 0
    ) {
      issues.push({
        code: 'missing_preludes',
        message: `Choose at least one prelude for ${playerId}.`,
        severity: 'error',
      });
    }

    const missingScoreFields = REQUIRED_SCORE_FIELDS.filter(
      (field) => !isValidNumber(score[field]),
    );

    if (missingScoreFields.length > 0) {
      issues.push({
        code: 'missing_score_fields',
        message: `Finish the required score fields for ${playerId}.`,
        severity: 'error',
      });
    }

    if (
      isValidNumber(score.cardPointsTotal) &&
      [
        score.cardPointsMicrobes,
        score.cardPointsAnimals,
        score.cardPointsJovian,
      ].some((value) => isValidNumber(value))
    ) {
      const enteredBreakdownTotal =
        (score.cardPointsMicrobes ?? 0) +
        (score.cardPointsAnimals ?? 0) +
        (score.cardPointsJovian ?? 0);

      if (enteredBreakdownTotal > score.cardPointsTotal) {
        issues.push({
          code: 'invalid_card_breakdown',
          message: `Card-point subtotals exceed the total card points for ${playerId}.`,
          severity: 'error',
        });
      }
    }

    if (
      isValidNumber(score.milestonePoints) &&
      score.milestonePoints !== (expectedMilestonePoints.get(playerId) ?? 0)
    ) {
      issues.push({
        code: 'milestone_points_mismatch',
        message: `Milestone points do not match claimed milestone rows for ${playerId}.`,
        severity: 'error',
      });
    }

    if (
      isValidNumber(score.awardPoints) &&
      score.awardPoints !== (expectedAwardPoints.get(playerId) ?? 0)
    ) {
      issues.push({
        code: 'award_points_mismatch',
        message: `Award points do not match funded award rows for ${playerId}.`,
        severity: 'error',
      });
    }

    if (
      style.modifierStyleCodes.length > 2
    ) {
      issues.push({
        code: 'missing_score_fields',
        message: `Only two style modifiers are supported for ${playerId}.`,
        severity: 'warning',
      });
    }
  }

  for (const [milestoneId, claim] of Object.entries(input.milestoneClaims ?? {})) {
    if (!claim.claimed) {
      continue;
    }

    if (!input.mapMilestoneIds.includes(milestoneId)) {
      issues.push({
        code: 'invalid_map_milestone',
        message: 'A claimed milestone is not valid for the selected map.',
        severity: 'error',
      });
    }

    if (!hasValue(claim.winnerPlayerId)) {
      issues.push({
        code: 'missing_milestone_winner',
        message: 'Choose a winner for every claimed milestone.',
        severity: 'error',
      });
    }
  }

  for (const [awardId, claim] of Object.entries(input.awardClaims ?? {})) {
    if (!claim.funded) {
      continue;
    }

    if (!input.mapAwardIds.includes(awardId)) {
      issues.push({
        code: 'invalid_map_award',
        message: 'A funded award is not valid for the selected map.',
        severity: 'error',
      });
    }

    if (!hasValue(claim.fundedByPlayerId)) {
      issues.push({
        code: 'missing_award_funder',
        message: 'Choose who funded every funded award.',
        severity: 'error',
      });
    }

    if (normalizeStringArray(claim.firstPlaceWinnerPlayerIds).length === 0) {
      issues.push({
        code: 'missing_award_first_place',
        message: 'Choose at least one first-place finisher for every funded award.',
        severity: 'error',
      });
    }
  }

  return {
    coverage: {
      playersWithCardBreakdown: input.selectedPlayerIds.filter((playerId) => {
        const score = input.playerScores?.[playerId] ?? {};
        return (
          isValidNumber(score.cardPointsMicrobes) &&
          isValidNumber(score.cardPointsAnimals) &&
          isValidNumber(score.cardPointsJovian)
        );
      }).length,
      playersWithDeclaredStyle: input.selectedPlayerIds.filter((playerId) => {
        const style = getPlayerStyle(input, playerId);
        return (
          hasValue(style.primaryStyleCode) ||
          style.modifierStyleCodes.length > 0
        );
      }).length,
      playersWithKeyCards: input.selectedPlayerIds.filter((playerId) => {
        const style = getPlayerStyle(input, playerId);
        return style.keyCardIds.length > 0;
      }).length,
      playersWithOptionalSubscores: input.selectedPlayerIds.filter((playerId) => {
        const score = input.playerScores?.[playerId] ?? {};
        return [
          score.cardPointsMicrobes,
          score.cardPointsAnimals,
          score.cardPointsJovian,
        ].some((value) => isValidNumber(value));
      }).length,
    },
    issues,
  };
}

function requireScoreField(
  score: LogGameDraftInput['playerScores'][string],
  field: (typeof REQUIRED_SCORE_FIELDS)[number],
) {
  const value = score[field];

  if (!isValidNumber(value)) {
    throw new Error(`Missing required score field: ${field}.`);
  }

  return value;
}

export function buildFinalizedGamePayload(
  input: FinalizedGameInput,
): FinalizedGamePayload {
  const review = buildGameReview(input);
  const blockingIssues = review.issues.filter((issue) => issue.severity === 'error');

  if (blockingIssues.length > 0) {
    throw new Error(blockingIssues[0].message);
  }

  const rankedPlayers = rankPlayers(
    input.selectedPlayerIds.map((playerId) => {
      const score = input.playerScores?.[playerId] ?? {};

      return {
        playerId,
        totalPoints: requireScoreField(score, 'totalPoints'),
        finalMegacredits: requireScoreField(score, 'finalMegacredits'),
      };
    }),
  );

  const rankingByPlayerId = new Map(
    rankedPlayers.map((player) => [player.playerId, player]),
  );

  const players = input.selectedPlayerIds.map((playerId) => {
    const score = input.playerScores?.[playerId] ?? {};
    const ranking = rankingByPlayerId.get(playerId);
    const selection = getPlayerSelection(input, playerId);

    if (!ranking) {
      throw new Error(`Missing ranking for ${playerId}.`);
    }

    return {
      playerId,
      corporationId: hasValue(selection.corporationId)
        ? selection.corporationId
        : null,
      placement: ranking.placement,
      isWinner: ranking.isWinner,
      totalPoints: requireScoreField(score, 'totalPoints'),
      finalMegacredits: requireScoreField(score, 'finalMegacredits'),
      citiesPoints: requireScoreField(score, 'citiesPoints'),
      greeneryPoints: requireScoreField(score, 'greeneryPoints'),
      cardPointsTotal: requireScoreField(score, 'cardPointsTotal'),
      cardPointsMicrobes: score.cardPointsMicrobes ?? null,
      cardPointsAnimals: score.cardPointsAnimals ?? null,
      cardPointsJovian: score.cardPointsJovian ?? null,
      trPoints: requireScoreField(score, 'trPoints'),
      milestonePoints: requireScoreField(score, 'milestonePoints'),
      awardPoints: requireScoreField(score, 'awardPoints'),
      otherCardPoints: computeOtherCardPoints(score),
    };
  });

  const preludes = input.selectedPlayerIds.flatMap((playerId) =>
    getPlayerSelection(input, playerId).preludeIds.map((preludeId) => ({
      playerId,
      preludeId,
    })),
  );

  const milestones = Object.entries(input.milestoneClaims ?? {})
    .filter(
      ([milestoneId, claim]) =>
        claim.claimed &&
        hasValue(claim.winnerPlayerId) &&
        input.mapMilestoneIds.includes(milestoneId),
    )
    .map(([milestoneId, claim]) => ({
      milestoneId,
      winnerPlayerId: claim.winnerPlayerId,
    }));

  const awards = Object.entries(input.awardClaims ?? {}).flatMap(([awardId, claim]) => {
    if (!claim.funded || !hasValue(claim.fundedByPlayerId)) {
      return [];
    }

    const firstPlaceWinnerIds = normalizeStringArray(claim.firstPlaceWinnerPlayerIds);
    const secondPlaceWinnerIds = normalizeStringArray(claim.secondPlaceWinnerPlayerIds).filter(
      (winnerPlayerId) => !firstPlaceWinnerIds.includes(winnerPlayerId),
    );
    const firstPlaceRows = firstPlaceWinnerIds.map((winnerPlayerId) => ({
      awardId,
      fundedByPlayerId: claim.fundedByPlayerId,
      place: 1 as const,
      winnerPlayerId,
    }));

    const secondPlaceRows = secondPlaceWinnerIds
      .map((winnerPlayerId) => ({
        awardId,
        fundedByPlayerId: claim.fundedByPlayerId,
        place: 2 as const,
        winnerPlayerId,
      }));

    return [...firstPlaceRows, ...secondPlaceRows];
  });

  const declaredStyles = input.selectedPlayerIds.flatMap((playerId) => {
    const style = getPlayerStyle(input, playerId);
    const rows: FinalizedGamePayload['declaredStyles'] = [];

    if (hasValue(style.primaryStyleCode)) {
      rows.push({
        playerId,
        styleCode: style.primaryStyleCode,
        isPrimary: true,
      });
    }

    for (const modifierStyleCode of style.modifierStyleCodes) {
      rows.push({
        playerId,
        styleCode: modifierStyleCode,
        isPrimary: false,
      });
    }

    return rows;
  });

  const inferredStyles = input.selectedPlayerIds.map((playerId) => {
    const score = input.playerScores?.[playerId] ?? {};
    const inferred = inferPrimaryStyle({
      totalPoints: requireScoreField(score, 'totalPoints'),
      trPoints: requireScoreField(score, 'trPoints'),
      cardPointsTotal: requireScoreField(score, 'cardPointsTotal'),
      cardPointsJovian: score.cardPointsJovian ?? null,
      greeneryPoints: requireScoreField(score, 'greeneryPoints'),
      citiesPoints: requireScoreField(score, 'citiesPoints'),
    });

    return {
      playerId,
      styleCode: inferred.primary,
      confidence: inferred.confidence,
      isPrimary: true,
    };
  });

  const keyCards = input.selectedPlayerIds.flatMap((playerId) =>
    getPlayerStyle(input, playerId).keyCardIds.map((cardId) => ({
      playerId,
      cardId,
    })),
  );

  return {
    gameUpdate: {
      status: 'finalized',
      catalog_snapshot_id: input.catalogSnapshotId,
    },
    players,
    preludes,
    milestones,
    awards,
    declaredStyles,
    inferredStyles,
    keyCards,
    review,
    revision: {
      note: 'Finalize game results',
      snapshot: {
        awardClaims: input.awardClaims,
        awards,
        catalogSnapshotId: input.catalogSnapshotId,
        gameId: input.gameId ?? null,
        milestoneClaims: input.milestoneClaims,
        milestones,
        notes: input.notes,
        players,
        playerSelections: input.playerSelections,
        playerStyles: input.playerStyles,
        preludes,
        selectedPlayerIds: input.selectedPlayerIds,
      },
    },
  };
}
