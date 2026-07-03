import { describe, expect, it } from 'vitest';
import { normalizeCardRecord } from './catalog-record';

describe('normalizeCardRecord', () => {
  it('maps upstream fields into the local reference shape', () => {
    const record = normalizeCardRecord({
      cardNumber: 'P39',
      name: 'Merger',
      type: 'Event',
      expansion: 'Promo',
      imageUrl: 'https://example.com/card.png',
    });

    expect(record.card_number).toBe('P39');
    expect(record.card_name).toBe('Merger');
    expect(record.card_type).toBe('Event');
  });
});
