import { describe, expect, it } from 'vitest';
import {
  inheritedMergerOfferRuleSnapshot,
  resolveEditedMergerOfferRuleSnapshot,
  resolveNewMergerOfferRuleSnapshot,
  unknownMergerOfferRuleSnapshot,
} from './merger-rule-snapshot';

describe('Merger offer rule snapshots', () => {
  it('copies an enabled group default only when a new game is created', () => {
    expect(
      resolveNewMergerOfferRuleSnapshot({
        groupDefaultGuaranteedMergerOffer: true,
        requested: inheritedMergerOfferRuleSnapshot(false),
      }),
    ).toEqual({ guaranteedMergerOffer: true, source: 'group_default' });
  });

  it('preserves an inherited disabled group default for a new game', () => {
    expect(
      resolveNewMergerOfferRuleSnapshot({
        groupDefaultGuaranteedMergerOffer: false,
        requested: inheritedMergerOfferRuleSnapshot(false),
      }),
    ).toEqual({ guaranteedMergerOffer: false, source: 'group_default' });
  });

  it('keeps a saved game snapshot when the group default changes later', () => {
    expect(
      resolveEditedMergerOfferRuleSnapshot({
        existing: { guaranteedMergerOffer: true, source: 'group_default' },
        requested: { guaranteedMergerOffer: true, source: 'group_default' },
      }),
    ).toEqual({ guaranteedMergerOffer: true, source: 'group_default' });
  });

  it('records an intentional editor override without allowing form provenance spoofing', () => {
    expect(
      resolveEditedMergerOfferRuleSnapshot({
        existing: { guaranteedMergerOffer: true, source: 'group_default' },
        requested: { guaranteedMergerOffer: false, source: 'historical_policy' },
      }),
    ).toEqual({ guaranteedMergerOffer: false, source: 'manual_override' });
  });

  it('retains unknown legacy state instead of converting it to off', () => {
    expect(unknownMergerOfferRuleSnapshot()).toEqual({
      guaranteedMergerOffer: null,
      source: 'unknown',
    });
  });
});
