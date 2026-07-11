import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  HeadToHeadStats,
  SelectionStats,
} from '@/lib/db/selection-stats-repo';
import { SelectionStatsSection } from './selection-stats-section';

const emptyStats: SelectionStats = {
  awardFunding: [],
  baselineWinRate: 0,
  cards: [],
  corporations: [],
  corporationTags: [],
  pairs: [],
  preludes: [],
  tagWins: [],
  totalGames: 0,
};

const emptyHeadToHead: HeadToHeadStats = {
  corporationMatchups: [],
  pairs: [],
};

const corporationRow = {
  avg_animal_points: 0,
  avg_award_points: 3,
  avg_awards_won: 1,
  avg_card_points: 10,
  avg_cities_points: 4,
  avg_greenery_points: 8,
  avg_jovian_points: 0,
  avg_microbe_points: 0,
  avg_milestone_points: 5,
  avg_milestones_won: 1,
  avg_placement: 1.5,
  avg_points: 82,
  avg_tr_points: 30,
  corporation_name: 'Tharsis Republic',
  first_place_finishes: 2,
  plays: 4,
  second_place_finishes: 1,
  third_plus_finishes: 1,
  win_rate: 0.5,
};

describe('SelectionStatsSection', () => {
  it('does not show card win-correlation stats from card or promo-card payloads', () => {
    render(
      <SelectionStatsSection
        global={{
          ...emptyStats,
          cards: [
            {
              card_name: 'Promo Asteroid',
              plays: 4,
              win_rate_when_played: 0.75,
            },
          ],
          corporations: [corporationRow],
        }}
        headToHead={emptyHeadToHead}
        mergerImpact={[]}
        personal={{
          ...emptyStats,
          cards: [
            {
              card_name: 'Earth Catapult',
              plays: 3,
              win_rate_when_played: 0.67,
            },
          ],
          corporations: [corporationRow],
        }}
      />,
    );

    expect(
      screen.queryByText(/Card Win Correlation/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Promo Asteroid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Earth Catapult/i)).not.toBeInTheDocument();
  });

  it('shows log-derived Merger frequency and win-rate comparison by player', () => {
    render(
      <SelectionStatsSection
        global={emptyStats}
        headToHead={emptyHeadToHead}
        mergerImpact={[
          {
            imported_games: 5,
            merger_games: 2,
            merger_play_rate: 0.4,
            merger_win_rate: 0.5,
            merger_wins: 1,
            non_merger_games: 3,
            non_merger_win_rate: 0.3333,
            non_merger_wins: 1,
            player_id: 'player-1',
            player_name: 'Friday Mars',
            win_rate_delta: 0.1667,
          },
        ]}
        personal={emptyStats}
      />,
    );

    expect(screen.getByText(/Merger Impact/i)).toBeInTheDocument();
    expect(screen.getByText('Friday Mars')).toBeInTheDocument();
    expect(screen.getByText('2 (40%)')).toBeInTheDocument();
    expect(screen.getByText('50% (1 win)')).toBeInTheDocument();
    expect(screen.getByText('33% (1 win)')).toBeInTheDocument();
    expect(screen.getByText('+17%')).toBeInTheDocument();
  });
});
