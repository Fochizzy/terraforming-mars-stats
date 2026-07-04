import { describe, expect, it } from 'vitest';
import { normalizeCardRecord } from './catalog-record';

describe('normalizeCardRecord', () => {
  it('maps upstream fields into the local reference shape', () => {
    const record = normalizeCardRecord({
      cardNumber: 'P39',
      name: 'Merger',
      type: 'Event',
      expansion: 'Promo',
      expansionName: 'Promo',
      imageUrl: 'https://example.com/card.png',
      sourceAttribution: 'https://tm.hadronikle.com/',
      sourceCardId: 'promo:P39',
    });

    expect(record.source_card_id).toBe('promo:P39');
    expect(record.card_number).toBe('P39');
    expect(record.card_name).toBe('Merger');
    expect(record.card_type).toBe('Event');
    expect(record.expansion_code).toBe('Promo');
    expect(record.expansion_name).toBe('Promo');
    expect(record.image_url).toBe('https://example.com/card.png');
    expect(record.source_attribution).toBe('https://tm.hadronikle.com/');
    expect(record.sync_metadata).toEqual({
      expansion: 'Promo',
      name: 'Merger',
      number: 'P39',
      type: 'Event',
    });
  });
});
