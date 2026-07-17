import type { MergerOfferRuleSnapshot } from '@/lib/merger/merger-rule-snapshot';

export const MERGER_OFFER_SOURCES = [
  'guaranteed-variant',
  'random-offer',
  'other-approved',
  'unknown',
] as const;

export type MergerOfferSource = (typeof MERGER_OFFER_SOURCES)[number];

export type MergerImportCoverage =
  | 'no-import'
  | 'incomplete'
  | 'sufficient-no-merger'
  | 'merger-play-resolved'
  | 'merger-play-unresolved';

export type MergerSelectionReconciliationCategory =
  | 'manual-and-log-agree'
  | 'log-selection-manual-missing'
  | 'manual-selection-log-missing'
  | 'log-actor-unresolved'
  | 'duplicate-or-ambiguous-merger-identity'
  | 'no-imported-log'
  | 'imported-log-incomplete'
  | 'sufficient-log-no-merger-play'
  | 'explicit-conflict-requiring-review';

export type MergerPreludePlayerGameObservation = {
  gameId: string;
  gamePlayerId: string;
  /** A finalized `game_player_preludes` selection. */
  manualSelection: boolean;
  /** Only high-confidence actor-resolved import evidence is selection-ready. */
  resolvedHighConfidenceLogSelection: boolean;
  /** True when the catalog mapping contains more than one unresolved candidate. */
  duplicateOrAmbiguousMergerIdentity?: boolean;
  /** True when a Merger event exists but cannot be attached to a player. */
  logActorUnresolved?: boolean;
  logCoverage: MergerImportCoverage;
  rule: MergerOfferRuleSnapshot;
};

export type MergerAvailabilityRate = {
  denominator: number;
  numerator: number;
  value: number | null;
  status:
    | 'ready'
    | 'empty-eligible-sample'
    | 'partial-unknown-availability'
    | 'unavailable-zero-denominator';
};

export type MergerPreludeAvailabilitySummary = {
  eligiblePlayerGames: number;
  knownAvailablePlayerGames: number;
  knownGuaranteedOfferPlayerGames: number;
  unknownRulePlayerGames: number;
  selectedPlayerGames: number;
  offerSourceCounts: Readonly<Record<MergerOfferSource, number>>;
  usageRate: MergerAvailabilityRate;
  availabilityRate: MergerAvailabilityRate;
  selectionRateGivenAvailability: MergerAvailabilityRate;
  randomOfferSelectionRate: MergerAvailabilityRate;
  reconciliation: readonly MergerSelectionReconciliationCategory[];
};

function rate(numerator: number, denominator: number): MergerAvailabilityRate {
  if (denominator === 0) {
    return {
      numerator,
      denominator,
      value: null,
      status:
        numerator === 0 ? 'empty-eligible-sample' : 'unavailable-zero-denominator',
    };
  }

  return {
    numerator,
    denominator,
    value: numerator / denominator,
    status: 'ready',
  };
}

function unavailableZeroDenominatorRate(numerator: number): MergerAvailabilityRate {
  return {
    numerator,
    denominator: 0,
    value: null,
    status: 'unavailable-zero-denominator',
  };
}

export function reconcileMergerSelection(
  observation: MergerPreludePlayerGameObservation,
): MergerSelectionReconciliationCategory {
  if (observation.duplicateOrAmbiguousMergerIdentity) {
    return 'duplicate-or-ambiguous-merger-identity';
  }
  if (observation.logActorUnresolved) {
    return 'log-actor-unresolved';
  }
  if (observation.manualSelection && observation.resolvedHighConfidenceLogSelection) {
    return 'manual-and-log-agree';
  }
  if (observation.resolvedHighConfidenceLogSelection) {
    return 'log-selection-manual-missing';
  }
  if (observation.manualSelection) {
    return observation.logCoverage === 'sufficient-no-merger'
      ? 'explicit-conflict-requiring-review'
      : 'manual-selection-log-missing';
  }
  if (observation.logCoverage === 'no-import') return 'no-imported-log';
  if (observation.logCoverage === 'incomplete') return 'imported-log-incomplete';
  if (observation.logCoverage === 'sufficient-no-merger') {
    return 'sufficient-log-no-merger-play';
  }
  return 'log-actor-unresolved';
}

/**
 * The calculation intentionally knows guaranteed availability only from the
 * saved game rule. It never manufactures random offers for other Preludes.
 */
export function calculateMergerPreludeAvailability(
  observations: readonly MergerPreludePlayerGameObservation[],
): MergerPreludeAvailabilitySummary {
  const offerSourceCounts: Record<MergerOfferSource, number> = {
    'guaranteed-variant': 0,
    'random-offer': 0,
    'other-approved': 0,
    unknown: 0,
  };
  let knownAvailablePlayerGames = 0;
  let knownGuaranteedOfferPlayerGames = 0;
  let unknownRulePlayerGames = 0;
  let selectedPlayerGames = 0;

  observations.forEach((observation) => {
    const selected =
      observation.manualSelection || observation.resolvedHighConfidenceLogSelection;
    if (selected) selectedPlayerGames += 1;

    if (observation.rule.guaranteedMergerOffer === true) {
      knownAvailablePlayerGames += 1;
      knownGuaranteedOfferPlayerGames += 1;
      offerSourceCounts['guaranteed-variant'] += 1;
      return;
    }

    if (observation.rule.guaranteedMergerOffer === false) {
      return;
    }

    // Selection proves that this player saw Merger, but not which offer route
    // produced it. Preserve that source uncertainty instead of calling it random.
    if (selected) {
      knownAvailablePlayerGames += 1;
      offerSourceCounts.unknown += 1;
      return;
    }

    unknownRulePlayerGames += 1;
  });

  const availabilityRate = unknownRulePlayerGames > 0
    ? {
        numerator: knownAvailablePlayerGames,
        denominator: observations.length,
        value: null,
        status: 'partial-unknown-availability' as const,
      }
    : rate(knownAvailablePlayerGames, observations.length);

  return {
    eligiblePlayerGames: observations.length,
    knownAvailablePlayerGames,
    knownGuaranteedOfferPlayerGames,
    unknownRulePlayerGames,
    selectedPlayerGames,
    offerSourceCounts,
    usageRate: rate(selectedPlayerGames, observations.length),
    availabilityRate,
    selectionRateGivenAvailability: rate(
      selectedPlayerGames,
      knownAvailablePlayerGames,
    ),
    randomOfferSelectionRate: unavailableZeroDenominatorRate(0),
    reconciliation: observations.map(reconcileMergerSelection),
  };
}
