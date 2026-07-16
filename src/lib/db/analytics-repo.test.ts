import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileAnalytics } from './analytics-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('getProfileAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty linked-profile state when analytics rows are absent', async () => {
    const playersMaybeSingle = vi.fn().mockResolvedValue({
      data: { display_name: 'Friday Mars', id: 'player-1' },
      error: null,
    });
    const playersLimit = vi.fn().mockReturnValue({
      maybeSingle: playersMaybeSingle,
    });
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      limit: playersLimit,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: playersOrderByCreatedAt,
      }),
    });
    const playersSelect = vi.fn().mockReturnValue({
      eq: playersEqLinkedUserId,
    });

    const leaderboardEq = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const leaderboardSelect = vi.fn().mockReturnValue({
      eq: leaderboardEq,
    });
    const scoreAveragesMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const scoreAveragesPlayerEq = vi.fn().mockReturnValue({
      maybeSingle: scoreAveragesMaybeSingle,
    });
    const scoreAveragesGroupEq = vi.fn().mockReturnValue({
      eq: scoreAveragesPlayerEq,
    });
    const scoreAveragesSelect = vi.fn().mockReturnValue({
      eq: scoreAveragesGroupEq,
    });
    const headToHeadEq = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const headToHeadSelect = vi.fn().mockReturnValue({
      eq: headToHeadEq,
    });
    const styleAgreementGt = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const styleAgreementEq = vi.fn().mockReturnValue({
      gt: styleAgreementGt,
    });
    const styleAgreementSelect = vi.fn().mockReturnValue({
      eq: styleAgreementEq,
    });
    const coverageMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const coveragePlayerEq = vi.fn().mockReturnValue({
      maybeSingle: coverageMaybeSingle,
    });
    const coverageGroupEq = vi.fn().mockReturnValue({
      eq: coveragePlayerEq,
    });
    const coverageSelect = vi.fn().mockReturnValue({
      eq: coverageGroupEq,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return {
            select: playersSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'group_leaderboard') {
              return {
                select: leaderboardSelect,
              };
            }

            if (table === 'player_score_source_averages') {
              return {
                select: scoreAveragesSelect,
              };
            }

            if (table === 'head_to_head') {
              return {
                select: headToHeadSelect,
              };
            }

            if (table === 'style_agreement') {
              return {
                select: styleAgreementSelect,
              };
            }

            if (table === 'player_data_coverage') {
              return {
                select: coverageSelect,
              };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    await expect(getProfileAnalytics('group-1', 'user-1')).resolves.toEqual({
      coverage: null,
      headToHeadRows: [],
      performance: null,
      playerId: 'player-1',
      playerName: 'Friday Mars',
      scoreAverages: null,
      styleAgreement: null,
    });
  });
});
