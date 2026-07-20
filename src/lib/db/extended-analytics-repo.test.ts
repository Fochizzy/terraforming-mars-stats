import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getExtendedGroupAnalytics,
  getOverallExtendedAnalytics,
} from './extended-analytics-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/db/player-label-resolution', () => ({
  resolvePlayerLabelsInRows: vi.fn(async (_supabase: unknown, rows: unknown[]) => rows),
}));

type ViewResult = { data?: unknown[]; error?: Error };

/**
 * A minimal stand-in for the Supabase client shape `listView` relies on:
 * `supabase.schema('analytics').from(view).select('*').eq/in('group_id', ...)`.
 * `viewResults` controls the outcome per analytics view name; anything not
 * listed resolves to a genuinely-empty, error-free result.
 */
function buildFakeSupabase(viewResults: Record<string, ViewResult>) {
  const resolveView = (view: string) => {
    const result = viewResults[view];
    if (!result) {
      return { data: [], error: null };
    }
    if (result.error) {
      return { data: null, error: result.error };
    }
    return { data: result.data ?? [], error: null };
  };

  const analyticsClient = {
    from: (view: string) => ({
      select: () => ({
        eq: async () => resolveView(view),
        in: async () => resolveView(view),
      }),
    }),
  };

  return {
    schema: () => analyticsClient,
  };
}

const rawTagRow = {
  corporation_id: null,
  corporation_name: 'Tharsis Republic',
  game_id: 'game-1',
  group_id: 'group-1',
  is_winner: true,
  played_on: '2026-06-01',
  player_id: 'player-1',
  player_name: 'Alice',
  tag_code: 'science',
  tag_count: 3,
  total_points: 62,
};

const rawCardRow = {
  card_id: 'card-1',
  card_name: 'Mars University',
  full_image_url: null,
  game_id: 'game-1',
  group_id: 'group-1',
  is_winner: true,
  played_on: '2026-06-01',
  player_id: 'player-1',
  player_name: 'Alice',
  thumbnail_url: null,
};

describe('getExtendedGroupAnalytics', () => {
  afterEach(() => {
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  it('preserves data from views that succeed even when a sibling view times out', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      buildFakeSupabase({
        game_tile_placements: {
          error: Object.assign(new Error('canceling statement due to statement timeout'), {
            code: '57014',
          }),
        },
        player_card_outcomes: { data: [rawCardRow] },
        player_tag_outcomes: { data: [rawTagRow] },
      }) as never,
    );

    const result = await getExtendedGroupAnalytics('group-1');

    // The failing view degrades to empty and is recorded as unavailable...
    expect(result.tilePlacementRows).toEqual([]);
    expect(result.unavailableSections).toContain('tilePlacementRows');

    // ...but sibling views that succeeded keep their real data and are NOT
    // marked unavailable. This is the core fix: one slow query must not blank
    // out unrelated sections via Promise.all all-or-nothing rejection.
    expect(result.tagOutcomeRows).toHaveLength(1);
    expect(result.tagOutcomeRows[0]?.tagCode).toBe('science');
    expect(result.cardOutcomeRows).toHaveLength(1);
    expect(result.cardOutcomeRows[0]?.cardName).toBe('Mars University');
    expect(result.unavailableSections).not.toContain('tagOutcomeRows');
    expect(result.unavailableSections).not.toContain('cardOutcomeRows');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('game_tile_placements'),
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it('leaves unavailableSections empty when every view genuinely returns zero rows', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(buildFakeSupabase({}) as never);

    const result = await getExtendedGroupAnalytics('group-1');

    expect(result.tilePlacementRows).toEqual([]);
    expect(result.tagOutcomeRows).toEqual([]);
    expect(result.cardOutcomeRows).toEqual([]);
    // Genuinely-empty must be distinguishable from failed: nothing here failed.
    expect(result.unavailableSections).toEqual([]);
  });

  it('records every field whose view fails, not just the first one', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      buildFakeSupabase({
        group_award_outcomes: { error: new Error('permission denied') },
        group_milestone_economics: { error: new Error('canceling statement due to statement timeout') },
      }) as never,
    );

    const result = await getExtendedGroupAnalytics('group-1');

    expect(result.unavailableSections).toEqual(
      expect.arrayContaining(['awardOutcomeRows', 'milestoneEconomicsRows']),
    );
    expect(result.awardOutcomeRows).toEqual([]);
    expect(result.milestoneEconomicsRows).toEqual([]);
  });
});

describe('getOverallExtendedAnalytics', () => {
  afterEach(() => {
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  const lookup = (playerId: string, fallbackName: string | null) => ({
    canonicalId: playerId,
    displayName: fallbackName ?? 'Unknown',
  });

  it('preserves data across multiple groups from views that succeed even when a sibling view times out', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      buildFakeSupabase({
        game_tile_placements: {
          error: Object.assign(new Error('canceling statement due to statement timeout'), {
            code: '57014',
          }),
        },
        player_card_outcomes: { data: [rawCardRow] },
        player_tag_outcomes: { data: [rawTagRow] },
      }) as never,
    );

    const result = await getOverallExtendedAnalytics(['group-1', 'group-2'], lookup, 10);

    expect(result.tilePlacementRows).toEqual([]);
    expect(result.unavailableSections).toContain('tilePlacementRows');
    expect(result.tagOutcomeRows).toHaveLength(1);
    expect(result.cardOutcomeRows).toHaveLength(1);
    expect(result.unavailableSections).not.toContain('tagOutcomeRows');
    expect(result.unavailableSections).not.toContain('cardOutcomeRows');
  });

  it('returns the fully-empty fixture without querying when there are no groups', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(buildFakeSupabase({}) as never);

    const result = await getOverallExtendedAnalytics([], lookup, 0);

    expect(result.unavailableSections).toEqual([]);
    expect(result.tagOutcomeRows).toEqual([]);
  });
});
