import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPromoSets } from './reference-repo';

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
