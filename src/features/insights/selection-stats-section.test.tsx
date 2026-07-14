import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  HeadToHeadStats,
  SelectionDialogData,
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

const preludeRow = {
  avg_animal_points: 0,
  avg_award_points: 2,
  avg_awards_won: 1,
  avg_card_points: 8,
  avg_cities_points: 3,
  avg_greenery_points: 7,
  avg_jovian_points: 0,
  avg_microbe_points: 0,
  avg_milestone_points: 4,
  avg_milestones_won: 1,
  avg_placement: 1.75,
  avg_points: 78,
  avg_tr_points: 29,
  first_place_finishes: 2,
  plays: 4,
  prelude_name: 'Corporate Archives',
  second_place_finishes: 1,
  third_plus_finishes: 1,
  win_rate: 0.5,
};

const dialogData: SelectionDialogData = {
  cardMetaByName: new Map([
    [
      'Tharsis Republic',
      { fullImageUrl: null, id: 'corp-tharsis-republic', thumbnailUrl: null },
    ],
    [
      'Corporate Archives',
      { fullImageUrl: null, id: 'prelude-corporate-archives', thumbnailUrl: null },
    ],
  ]),
  corporationWinRates: new Map(),
  preludeWinRates: new Map(),
};

describe('SelectionStatsSection', () => {
  function expectTrendSentence(container: HTMLElement, text: string) {
    expect(
      within(container).getByText(
        (_content, element) =>
          element?.textContent?.replace(/\s+/g, ' ').trim() === text,
      ),
    ).toBeInTheDocument();
  }

  it('does not show card win-correlation stats from card or promo-card payloads', () => {
    render(
      <SelectionStatsSection
        finalTerraformingActions={[]}
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

  it('left-aligns wrapped corporation and prelude names in stat tables', () => {
    render(
      <SelectionStatsSection
        dialogData={dialogData}
        finalTerraformingActions={[]}
        global={{
          ...emptyStats,
          corporations: [corporationRow],
          preludes: [preludeRow],
          totalGames: 4,
        }}
        headToHead={emptyHeadToHead}
        mergerImpact={[]}
        personal={{
          ...emptyStats,
          corporations: [corporationRow],
          preludes: [preludeRow],
          totalGames: 4,
        }}
      />,
    );

    for (const button of screen.getAllByRole('button', {
      name: /show statistics for tharsis republic/i,
    })) {
      expect(button).toHaveClass('text-left');
    }

    for (const button of screen.getAllByRole('button', {
      name: /show statistics for corporate archives/i,
    })) {
      expect(button).toHaveClass('text-left');
    }
  });

  it('shows log-derived Merger frequency and win-rate comparison by player', () => {
    render(
      <SelectionStatsSection
        finalTerraformingActions={[]}
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

  it('shows final terraforming action frequency and win-rate comparison by player', () => {
    render(
      <SelectionStatsSection
        finalTerraformingActions={[
          {
            final_action_games: 3,
            final_action_rate: 0.6,
            final_action_win_rate: 0.6667,
            final_action_wins: 2,
            imported_games: 5,
            most_common_action_count: 2,
            most_common_action_type: 'oxygen',
            overall_win_rate: 0.4,
            overall_wins: 2,
            player_id: 'player-1',
            player_name: 'Friday Mars',
            win_rate_delta: 0.2667,
          },
        ]}
        global={emptyStats}
        headToHead={emptyHeadToHead}
        mergerImpact={[]}
        personal={emptyStats}
      />,
    );

    expect(screen.getByText(/Final Terraforming Action/i)).toBeInTheDocument();
    expect(screen.getByText('Friday Mars')).toBeInTheDocument();
    expect(screen.getByText('3 (60%)')).toBeInTheDocument();
    expect(screen.getByText('67% (2 wins)')).toBeInTheDocument();
    expect(screen.getByText('40% (2 wins)')).toBeInTheDocument();
    expect(screen.getByText('+27%')).toBeInTheDocument();
    expect(screen.getByText('Oxygen (2)')).toBeInTheDocument();
  });

  it('adds sentence-form global tag trends from the most-sampled tag data', () => {
    render(
      <SelectionStatsSection
        finalTerraformingActions={[]}
        global={{
          ...emptyStats,
          tagWins: [
            {
              avg_tags_in_losses: 1.38,
              avg_tags_in_wins: 3.24,
              samples: 18,
              tag_code: 'science',
            },
            {
              avg_tags_in_losses: 2.01,
              avg_tags_in_wins: 2,
              samples: 12,
              tag_code: 'building',
            },
            {
              avg_tags_in_losses: 2.5,
              avg_tags_in_wins: 1,
              samples: 10,
              tag_code: 'space',
            },
            {
              avg_tags_in_losses: 1.2,
              avg_tags_in_wins: null,
              samples: 8,
              tag_code: 'earth',
            },
            {
              avg_tags_in_losses: 0,
              avg_tags_in_wins: 5,
              samples: 2,
              tag_code: 'plant',
            },
          ],
        }}
        headToHead={emptyHeadToHead}
        mergerImpact={[]}
        personal={emptyStats}
      />,
    );

    const trendHeading = screen.getByRole('heading', {
      name: /most prevalent tag trends/i,
    });
    const trendList = trendHeading.nextElementSibling as HTMLElement;

    expect(within(trendList).getAllByRole('listitem')).toHaveLength(4);
    expectTrendSentence(
      trendList,
      'science appears more often in wins: winners average 3.2 tags versus 1.4 tags in losses across 18 samples.',
    );
    expectTrendSentence(
      trendList,
      'building is roughly even: wins average 2 tags versus 2 tags in losses across 12 samples.',
    );
    expectTrendSentence(
      trendList,
      'space appears less often in wins: winners average 1 tag versus 2.5 tags in losses across 10 samples.',
    );
    expectTrendSentence(
      trendList,
      'earth has only losing-result evidence so far: losses average 1.2 tags across 8 samples.',
    );
    expect(within(trendList).queryByText(/plant/i)).not.toBeInTheDocument();
  });

  it('adds sentence-form global value summaries for top corporations and preludes', () => {
    render(
      <SelectionStatsSection
        finalTerraformingActions={[]}
        global={{
          ...emptyStats,
          corporations: [
            {
              ...corporationRow,
              avg_placement: 1.44,
              avg_points: 92.44,
              corporation_name: 'Saturn Systems',
              plays: 8,
              win_rate: 0.625,
            },
            {
              ...corporationRow,
              avg_placement: 1.8,
              avg_points: 88.2,
              corporation_name: 'Point Luna',
              plays: 5,
              win_rate: 0.4,
            },
            {
              ...corporationRow,
              avg_points: 81.7,
              corporation_name: 'Beginner Corporation',
              plays: 12,
            },
          ],
          preludes: [
            {
              ...preludeRow,
              avg_placement: 1.2,
              avg_points: 90,
              plays: 4,
              prelude_name: 'Galilean Mining',
              win_rate: 0.75,
            },
            {
              ...preludeRow,
              avg_placement: 1.67,
              avg_points: 87.6,
              plays: 6,
              prelude_name: 'Business Empire',
              win_rate: 0.5,
            },
            {
              ...preludeRow,
              avg_points: 75,
              plays: 20,
              prelude_name: 'Experimental Forest',
            },
          ],
          totalGames: 20,
        }}
        headToHead={emptyHeadToHead}
        mergerImpact={[]}
        personal={emptyStats}
      />,
    );

    const summaryHeading = screen.getByRole('heading', {
      name: /global value summary/i,
    });
    const summaryList = summaryHeading.nextElementSibling as HTMLElement;

    expect(within(summaryList).getAllByRole('listitem')).toHaveLength(4);
    expectTrendSentence(
      summaryList,
      'Saturn Systems ranks among the top corporations by average VP, averaging 92.4 VP with a 63% win rate and 1.4 average placement across 8 plays.',
    );
    expectTrendSentence(
      summaryList,
      'Point Luna ranks among the top corporations by average VP, averaging 88.2 VP with a 40% win rate and 1.8 average placement across 5 plays.',
    );
    expectTrendSentence(
      summaryList,
      'Galilean Mining ranks among the top preludes by average VP, averaging 90 VP with a 75% win rate and 1.2 average placement across 4 plays.',
    );
    expectTrendSentence(
      summaryList,
      'Business Empire ranks among the top preludes by average VP, averaging 87.6 VP with a 50% win rate and 1.7 average placement across 6 plays.',
    );
    expect(
      within(summaryList).queryByText(/Beginner Corporation/i),
    ).not.toBeInTheDocument();
    expect(
      within(summaryList).queryByText(/Experimental Forest/i),
    ).not.toBeInTheDocument();
  });
});
