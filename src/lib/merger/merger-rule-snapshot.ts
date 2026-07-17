export const MERGER_OFFER_RULE_SOURCES = [
  'group_default',
  'manual_override',
  'historical_policy',
  'import_metadata',
  'unknown',
] as const;

export type MergerOfferRuleSource = (typeof MERGER_OFFER_RULE_SOURCES)[number];

/**
 * `guaranteedMergerOffer` is deliberately nullable. A legacy record that did
 * not capture setup rules is unknown, not a game where the variant was off.
 */
export type MergerOfferRuleSnapshot = {
  guaranteedMergerOffer: boolean | null;
  source: MergerOfferRuleSource;
};

export function inheritedMergerOfferRuleSnapshot(
  groupDefaultGuaranteedMergerOffer: boolean,
): MergerOfferRuleSnapshot {
  return {
    guaranteedMergerOffer: groupDefaultGuaranteedMergerOffer,
    source: 'group_default',
  };
}

export function unknownMergerOfferRuleSnapshot(): MergerOfferRuleSnapshot {
  return {
    guaranteedMergerOffer: null,
    source: 'unknown',
  };
}

/**
 * A submitted draft is allowed to express only the normal inherited setting
 * or an editor's explicit override. Historical/import provenance is assigned
 * by controlled migration/import paths, never trusted from a form post.
 */
export function resolveNewMergerOfferRuleSnapshot(input: {
  groupDefaultGuaranteedMergerOffer: boolean;
  requested: MergerOfferRuleSnapshot;
}): MergerOfferRuleSnapshot {
  if (input.requested.source !== 'manual_override') {
    return inheritedMergerOfferRuleSnapshot(input.groupDefaultGuaranteedMergerOffer);
  }

  return {
    guaranteedMergerOffer: input.requested.guaranteedMergerOffer,
    source:
      input.requested.guaranteedMergerOffer === null
        ? 'unknown'
        : 'manual_override',
  };
}

/**
 * Once a game has a saved snapshot, changing today's group default must never
 * reinterpret it. An editor can still make an intentional, auditable override.
 */
export function resolveEditedMergerOfferRuleSnapshot(input: {
  existing: MergerOfferRuleSnapshot;
  requested: MergerOfferRuleSnapshot;
}): MergerOfferRuleSnapshot {
  if (
    input.requested.guaranteedMergerOffer ===
      input.existing.guaranteedMergerOffer &&
    input.requested.source !== 'manual_override'
  ) {
    return input.existing;
  }

  return {
    guaranteedMergerOffer: input.requested.guaranteedMergerOffer,
    source:
      input.requested.guaranteedMergerOffer === null
        ? 'unknown'
        : 'manual_override',
  };
}

export function isMergerOfferRuleSource(
  value: unknown,
): value is MergerOfferRuleSource {
  return (
    typeof value === 'string' &&
    (MERGER_OFFER_RULE_SOURCES as readonly string[]).includes(value)
  );
}
