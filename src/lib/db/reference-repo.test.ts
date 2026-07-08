import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listCardLookupRecords, listPromoSets } from './reference-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('listPromoSets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only fandom-backed promo releases with release years', async () => {
    const finalRows = [
      {
        id: 'promo-1',
        slug: '2019-turmoil-promos',
        display_name: 'Turmoil Promos',
        edition_label: 'Turmoil',
        promo_year: 2019,
      },
      {
        id: 'promo-2',
        slug: '2022-seasonal-promos',
        display_name: 'Seasonal Promos',
        edition_label: 'Seasonal promo',
        promo_year: 2022,
      },
    ];

    const query = {
      not: vi.fn(),
      order: vi.fn(),
      select: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.not.mockReturnValue(query);
    query.order
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data: finalRows,
        error: null,
      });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    } as never);

    await expect(listPromoSets()).resolves.toEqual([
      {
        id: 'promo-1',
        slug: '2019-turmoil-promos',
        displayName: 'Turmoil Promos',
        editionLabel: 'Turmoil',
        promoYear: 2019,
      },
      {
        id: 'promo-2',
        slug: '2022-seasonal-promos',
        displayName: 'Seasonal Promos',
        editionLabel: 'Seasonal promo',
        promoYear: 2022,
      },
    ]);

    expect(query.not).toHaveBeenCalledWith('promo_year', 'is', null);
  });
});

describe('listCardLookupRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps searchable card rows with image paths, promo slugs, and gameplay tags', async () => {
    const cardsQuery = {
      order: vi.fn(),
      select: vi.fn(),
    };
    const promoSetsQuery = {
      in: vi.fn(),
      select: vi.fn(),
    };

    cardsQuery.select.mockReturnValue(cardsQuery);
    cardsQuery.order.mockResolvedValueOnce({
      data: [
        {
          card_name: 'Merger',
          card_number: 'P39',
          card_type: 'Prelude',
          expansion_code: 'promo',
          full_image_path: 'https://example.com/merger.png',
          gameplay_tags: ['wild'],
          id: 'card-1',
          image_url: 'https://example.com/merger-source.png',
          promo_set_id: 'promo-1',
          printed_victory_points: 2,
          required_expansion_codes: ['prelude'],
          thumbnail_path: 'https://example.com/merger-thumb.png',
          victory_points_kind: 'static',
        },
      ],
      error: null,
    });
    promoSetsQuery.select.mockReturnValue(promoSetsQuery);
    promoSetsQuery.in.mockResolvedValueOnce({
      data: [{ id: 'promo-1', slug: 'big-box-promos' }],
      error: null,
    });

    vi.mocked(createSupabaseServerClient)
      .mockResolvedValueOnce({
        from: vi.fn().mockReturnValue(cardsQuery),
      } as never)
      .mockResolvedValueOnce({
        from: vi.fn().mockReturnValue(promoSetsQuery),
      } as never);

    await expect(listCardLookupRecords()).resolves.toEqual([
      {
        cardName: 'Merger',
        cardNumber: 'P39',
        cardType: 'Prelude',
        expansionCode: 'promo',
        fullImageUrl: 'https://example.com/merger.png',
        id: 'card-1',
        promoSetSlug: 'big-box-promos',
        printedVictoryPoints: 2,
        requiredExpansionCodes: ['prelude'],
        sourceTags: ['wild'],
        thumbnailUrl: 'https://example.com/merger-thumb.png',
        victoryPointsKind: 'static',
      },
    ]);

    expect(cardsQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('gameplay_tags'),
    );
    expect(cardsQuery.order).toHaveBeenCalledWith('card_name');
  });
});
