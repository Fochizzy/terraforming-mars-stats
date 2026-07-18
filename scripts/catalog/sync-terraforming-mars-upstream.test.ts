import { describe, expect, it } from 'vitest';
import {
  buildUpstreamCardRows,
  buildUpstreamTileRows,
} from './sync-terraforming-mars-upstream';

describe('upstream catalog Supabase payloads', () => {
  it('preserves existing curated metadata while retaining the exact raw manifest', () => {
    const [row] = buildUpstreamCardRows({
      existingCards: [
        {
          card_name: 'Test Card',
          source_card_id: 'project:base:001',
          sync_metadata: { curatedEffectEvidence: { temperature: 1 } },
        },
      ],
      fetchedAt: '2026-07-18T12:00:00.000Z',
      manifest: [
        {
          metadata: { cardNumber: '001' },
          module: 'base',
          name: 'Test Card',
          type: 'event',
        },
      ],
    });

    expect(row.sync_metadata).toMatchObject({
      curatedEffectEvidence: { temperature: 1 },
      upstream: {
        fetchedAt: '2026-07-18T12:00:00.000Z',
        rawManifest: { name: 'Test Card' },
      },
    });
  });

  it('adopts one existing semantic identity instead of duplicating a renamed source record', () => {
    const [row] = buildUpstreamCardRows({
      existingCards: [
        {
          card_name: 'Anti-Desertification Techniques',
          source_card_id: 'prelude:prelude_2:X49',
          sync_metadata: { retained: true },
        },
      ],
      fetchedAt: '2026-07-18T12:00:00.000Z',
      manifest: [
        {
          metadata: { cardNumber: 'X49' },
          module: 'promo',
          name: 'Anti-desertification Techniques',
          type: 'prelude',
        },
      ],
    });

    expect(row).toMatchObject({
      expansion_code: 'promo',
      source_card_id: 'prelude:prelude_2:X49',
      sync_metadata: {
        retained: true,
        upstream: { canonicalSourceCardId: 'prelude:promo:X49' },
      },
    });
  });

  it('publishes every current tile definition with its board semantics', () => {
    const rows = buildUpstreamTileRows('2026-07-18T12:00:00.000Z');
    expect(rows).toHaveLength(45);
    expect(rows.find((row) => row.canonical_code === 'capital')).toMatchObject({
      board: 'mars',
      counts_as_city: true,
      source_tile_id: 3,
    });
    expect(rows.find((row) => row.canonical_code === 'moon_mine')).toMatchObject({
      board: 'moon',
      canonical_name: 'Mine',
      source_tile_id: 29,
    });
  });
});
