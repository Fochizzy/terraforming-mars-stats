import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  CorporationSelectionStat,
  PreludeSelectionStat,
  SelectionPairStat,
} from '@/lib/db/selection-stats-repo';
import { CorporationPreludePairings } from './corporation-prelude-pairings';

const baseSelectionStat = {
  avg_animal_points: 0,
  avg_award_points: 3,
  avg_awards_won: 1,
  avg_card_points: 20,
  avg_cities_points: 4,
  avg_greenery_points: 6,
  avg_jovian_points: 0,
  avg_microbe_points: 0,
  avg_milestone_points: 5,
  avg_milestones_won: 1,
  avg_placement: 2,
  avg_points: 70,
  avg_tr_points: 40,
  first_place_finishes: 1,
  plays: 3,
  second_place_finishes: 1,
  third_plus_finishes: 1,
  win_rate: 1 / 3,
};

const corporationRows: CorporationSelectionStat[] = [
  {
    ...baseSelectionStat,
    corporation_name: 'Aerotech',
  },
  {
    ...baseSelectionStat,
    avg_card_points: 26,
    avg_points: 75.8,
    avg_tr_points: 31,
    corporation_name: 'Tych(o) Magnetics',
    plays: 5,
    win_rate: 0.2,
  },
];

const preludeRows: PreludeSelectionStat[] = [
  {
    ...baseSelectionStat,
    avg_card_points: 22,
    avg_cities_points: 5,
    avg_greenery_points: 7,
    avg_tr_points: 30,
    plays: 1,
    prelude_name: 'Donation',
    win_rate: 0,
  },
  {
    ...baseSelectionStat,
    avg_card_points: 23,
    avg_points: 75.8,
    avg_tr_points: 35,
    plays: 5,
    prelude_name: 'Merger',
    win_rate: 0.2,
  },
];

const pairRows: SelectionPairStat[] = [
  {
    avg_points: 75.8,
    corporation_name: 'Tych(o) Magnetics',
    plays: 5,
    prelude_name: 'Merger',
    win_rate: 0.2,
  },
  {
    avg_points: 56,
    corporation_name: 'Aerotech',
    plays: 1,
    prelude_name: 'Donation',
    win_rate: 0,
  },
];

describe('CorporationPreludePairings', () => {
  it('renders structured rankings, responsive controls, and scannable pairing insights', () => {
    render(
      <CorporationPreludePairings
        baselineWinRate={0.36}
        corporationRows={corporationRows}
        preludeRows={preludeRows}
        rows={pairRows}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Corporation + Prelude Pairings' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Top pairings' })).toBeInTheDocument();
    expect(screen.getByText('Ranked by plays')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Compare a pairing' }),
    ).toBeInTheDocument();

    expect(screen.getByText(/low confidence · 1 game/i)).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Won 0 of 1 recorded game, 36 percentage points below your 36% baseline, while averaging 56 VP.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Scoring profile')).toBeInTheDocument();
    expect(screen.getByText(/Terraforming-led/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Scoring channel breakdown' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Objectives: 8 average points'),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole('heading', { name: 'Corporation + Prelude Pairings' })
        .closest('section'),
    ).toHaveClass('overflow-x-clip');

    fireEvent.change(screen.getByLabelText('Corporation'), {
      target: { value: 'Tych(o) Magnetics' },
    });

    expect(screen.getByLabelText('Prelude')).toHaveValue('Merger');
    expect(screen.getByText(/medium confidence · 5 games/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Won 1 of 5 recorded games, 16 percentage points below your 36% baseline, while averaging 75.8 VP.',
      ),
    ).toBeInTheDocument();
  });
});
