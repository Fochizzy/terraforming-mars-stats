import { describe, expect, it } from 'vitest';
import {
  discoverWebpackChunkUrls,
  extractCardManifestFromBundle,
  normalizeUpstreamCard,
  type UpstreamCardManifestRecord,
} from './terraforming-mars-upstream';

function manifest(size = 100): UpstreamCardManifestRecord[] {
  return Array.from({ length: size }, (_, index) => ({
    metadata: { cardNumber: String(index + 1).padStart(3, '0') },
    module: 'base',
    name: `Card ${index + 1}`,
    tags: ['space'],
    type: 'automated',
  }));
}

describe('Terraforming Mars upstream catalog parser', () => {
  it('discovers numeric webpack dependencies without a hard-coded chunk id', () => {
    expect(
      discoverWebpackChunkUrls(
        'Promise.all([A.e(96),A.e(756),A.e(96)])',
        'https://terraforming-mars.herokuapp.com/cards',
      ),
    ).toEqual([
      'https://terraforming-mars.herokuapp.com/chunks/96.js',
      'https://terraforming-mars.herokuapp.com/chunks/756.js',
    ]);
  });

  it('extracts a validated generated manifest without evaluating JavaScript', () => {
    const json = JSON.stringify(manifest()).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    expect(extractCardManifestFromBundle(`x=JSON.parse('${json}')`)).toHaveLength(100);
    expect(extractCardManifestFromBundle("x=JSON.parse('[1,2,3]')")).toBeNull();
  });

  it('stores exact raw data and normalizes stable lookup fields', () => {
    const raw: UpstreamCardManifestRecord = {
      compatibility: ['venus'],
      metadata: { cardNumber: '153', renderData: { is: 'root' } },
      module: 'corpera',
      name: 'Adaptation Technology',
      tags: ['science'],
      type: 'active',
      victoryPoints: 1,
    };
    expect(normalizeUpstreamCard(raw)).toMatchObject({
      card_number: '153',
      card_type: 'Active',
      expansion_code: 'corporate_era',
      gameplay_tags: ['science'],
      printed_victory_points: 1,
      required_expansion_codes: ['venus_next'],
      source_card_id: 'project:corporate_era:153',
      sync_metadata: { upstream: { rawManifest: raw } },
      victory_points_kind: 'static',
    });
  });

  it('uses a stable name key for unnumbered entries and keeps dynamic VP nonnumeric', () => {
    expect(
      normalizeUpstreamCard({
        module: 'base',
        name: 'Sell Patents',
        type: 'standard_project',
        victoryPoints: { per: 'tag' },
      }),
    ).toMatchObject({
      card_number: '',
      printed_victory_points: null,
      source_card_id: 'standard_project:base:sell-patents',
      victory_points_kind: 'dynamic',
    });
  });

  it('keeps distinct standard actions that share an upstream number', () => {
    const convertPlants = normalizeUpstreamCard({
      metadata: { cardNumber: 'SA2' }, module: 'base', name: 'Convert Plants', type: 'standard_action',
    });
    const convertHeat = normalizeUpstreamCard({
      metadata: { cardNumber: 'SA2' }, module: 'base', name: 'Convert Heat', type: 'standard_action',
    });
    expect(convertPlants.source_card_id).toBe(
      'standard_action:base:SA2:convert-plants',
    );
    expect(convertHeat.source_card_id).toBe(
      'standard_action:base:SA2:convert-heat',
    );
  });
});
