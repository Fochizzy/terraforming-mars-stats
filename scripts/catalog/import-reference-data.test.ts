import { describe, expect, it } from 'vitest';
import { buildCatalogImportPayload } from './import-reference-data';

describe('buildCatalogImportPayload', () => {
  it('normalizes raw cards into the full cards-table payload and appends overrides', async () => {
    const payload = await buildCatalogImportPayload(
      [
        {
          cardNumber: 'P39',
          expansion: 'promo',
          expansionName: 'Promo',
          imageUrl: 'https://example.com/merger.png',
          name: 'Merger',
          type: 'Event',
        },
      ],
      [
        {
          card_name: 'Corporate Archives',
          card_number: 'X01',
          card_type: 'Automated',
          expansion_code: 'promo',
          expansion_name: 'Promo',
          image_url: 'https://example.com/corporate-archives.png',
          source_attribution: 'manual override',
          source_card_id: 'promo:X01',
          sync_metadata: { override: true },
        },
      ],
    );

    expect(payload).toHaveLength(2);
    expect(payload[0]).toEqual({
      source_card_id: 'promo:P39',
      card_number: 'P39',
      card_name: 'Merger',
      card_type: 'Event',
      expansion_code: 'promo',
      expansion_name: 'Promo',
      image_url: 'https://example.com/merger.png',
      source_attribution: 'https://tm.hadronikle.com/',
      sync_metadata: {
        expansion: 'promo',
        name: 'Merger',
        number: 'P39',
        type: 'Event',
      },
    });
    expect(payload[1]?.source_card_id).toBe('promo:X01');
    expect(payload[1]?.sync_metadata).toEqual({ override: true });
  });
});
