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
      gameplayTags: ['event'],
      imageUrl: 'https://example.com/card.png',
      printedVictoryPoints: 1,
      sourceCardId: 'promo:P39',
      victoryPointsKind: 'static',
    });

    expect(record.source_card_id).toBe('promo:P39');
    expect(record.card_number).toBe('P39');
    expect(record.card_name).toBe('Merger');
    expect(record.card_type).toBe('Event');
    expect(record.expansion_code).toBe('Promo');
    expect(record.expansion_name).toBe('Promo');
    expect(record.gameplay_tags).toEqual(['event']);
    expect(record.image_url).toBe('https://example.com/card.png');
    expect(record.printed_victory_points).toBe(1);
    expect(record.source_attribution).toBe(
      'https://terraforming-mars.herokuapp.com/cards#bio~trbgpcseCmalt',
    );
    expect(record.sync_metadata).toEqual({
      expansion: 'Promo',
      name: 'Merger',
      number: 'P39',
      type: 'Event',
    });
    expect(record.victory_points_kind).toBe('static');
  });
});
