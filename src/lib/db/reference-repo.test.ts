import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listCardLookupRecords } from './reference-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('listCardLookupRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads all catalog records with stable IDs and resolves promo metadata in one batch', async () => {
    const cardsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'card-1',
            card_number: '009',
            card_name: 'Asteroid',
            card_type: 'Event',
            expansion_code: 'base',
            promo_set_id: null,
            required_expansion_codes: ['base'],
            image_url: 'https://assets.example.test/asteroid.png',
            thumbnail_path: null,
            full_image_path: 'https://assets.example.test/asteroid-full.png',
            gameplay_tags: ['space', 5],
            printed_victory_points: null,
            victory_points_kind: 'not-a-contract-value',
          },
          {
            id: 'card-2',
            card_number: 'P39',
            card_name: 'Merger',
            card_type: 'Prelude',
            expansion_code: 'prelude',
            promo_set_id: 'promo-1',
            required_expansion_codes: null,
            image_url: null,
            thumbnail_path: 'https://assets.example.test/merger-thumb.png',
            full_image_path: null,
            gameplay_tags: ['corporation'],
            printed_victory_points: 2,
            victory_points_kind: 'dynamic',
          },
        ],
        error: null,
      }),
    };
    const promoSetsQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'promo-1', slug: 'big-box' }],
        error: null,
      }),
    };
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'cards') return cardsQuery;
        if (table === 'promo_sets') return promoSetsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);

    await expect(listCardLookupRecords()).resolves.toEqual([
      {
        id: 'card-1',
        cardNumber: '009',
        cardName: 'Asteroid',
        cardType: 'Event',
        expansionCode: 'base',
        promoSetSlug: null,
        requiredExpansionCodes: ['base'],
        thumbnailUrl: 'https://assets.example.test/asteroid-full.png',
        fullImageUrl: 'https://assets.example.test/asteroid-full.png',
        sourceTags: ['space'],
        printedVictoryPoints: null,
        victoryPointsKind: 'none',
      },
      {
        id: 'card-2',
        cardNumber: 'P39',
        cardName: 'Merger',
        cardType: 'Prelude',
        expansionCode: 'prelude',
        promoSetSlug: 'big-box',
        requiredExpansionCodes: [],
        thumbnailUrl: 'https://assets.example.test/merger-thumb.png',
        fullImageUrl: null,
        sourceTags: ['corporation'],
        printedVictoryPoints: 2,
        victoryPointsKind: 'dynamic',
      },
    ]);

    expect(cardsQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('gameplay_tags'),
    );
    expect(cardsQuery.order).toHaveBeenCalledWith('card_name');
    expect(promoSetsQuery.in).toHaveBeenCalledWith('id', ['promo-1']);
  });

  it('does not request promo sets when there are no promo cards', async () => {
    const cardsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const client = { from: vi.fn(() => cardsQuery) };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);

    await expect(listCardLookupRecords()).resolves.toEqual([]);
    expect(client.from).toHaveBeenCalledTimes(1);
  });
});
