import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProfileCardStat } from '@/lib/db/analytics-repo';
import { ProfileCardPanels } from './profile-card-panels';

const keyCard: ProfileCardStat = {
  cardId: 'ants',
  cardName: 'Ants',
  contextLabel:
    'Factorum + Polaris · Balanced · Terraforming · Fast Pace · 2 players · Elysium',
  evidenceConfidence: 'Low',
  fullImageUrl: null,
  plays: 2,
  thumbnailUrl: null,
  victoryImpact: 0.49,
  winRate: 1,
  wins: 2,
};

const lossCard: ProfileCardStat = {
  cardId: 'towing-a-comet',
  cardName: 'Towing A Comet',
  contextLabel:
    'Inventrix · Balanced · Terraforming · Long Pace · 2 players · Hellas',
  evidenceConfidence: 'Medium',
  fullImageUrl: null,
  plays: 4,
  thumbnailUrl: null,
  victoryImpact: -0.21,
  winRate: 0,
  wins: 0,
};

describe('ProfileCardPanels', () => {
  it('renders contextual card results with the completed compact format', () => {
    render(
      <ProfileCardPanels
        cardOutcomes={[]}
        keyCards={[keyCard]}
        lossCards={[lossCard]}
        playerName="Friday Mars"
      />,
    );

    expect(
      screen.getByText('Cards Linked to Lower Win Rates'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Adjusted impact').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0);

    expect(screen.getByText('+49 pp')).toBeInTheDocument();
    expect(screen.getByText('−21 pp')).toBeInTheDocument();
    expect(screen.getByText('2 / 2 wins')).toBeInTheDocument();
    expect(screen.getByText('100% win rate · 2 games')).toBeInTheDocument();
    expect(screen.getByText('0 / 4 wins')).toBeInTheDocument();
    expect(screen.getByText('0% win rate · 4 games')).toBeInTheDocument();

    expect(screen.getByText('Factorum + Polaris')).toBeInTheDocument();
    expect(screen.getByText('Fast Pace')).toBeInTheDocument();
    expect(screen.getByText('Inventrix')).toBeInTheDocument();
    expect(screen.getByText('Long Pace')).toBeInTheDocument();
    expect(screen.getByText('Low confidence')).toBeInTheDocument();
    expect(screen.getByText('Medium confidence')).toBeInTheDocument();

    expect(screen.getAllByText('Corporation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Play style').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Scoring').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pace').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Players').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Map').length).toBeGreaterThan(0);

    expect(
      screen.getByText(
        /why it ranked: 2 wins in 2 comparable games; adjusted win rate was 49 percentage points higher/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /why it ranked: 0 wins in 4 comparable games; adjusted win rate was 21 percentage points lower/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how adjusted impact is calculated/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how loss correlation is calculated/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/it made the list because/i)).not.toBeInTheDocument();

    for (const row of screen.getAllByRole('listitem')) {
      expect(row).toHaveClass('rounded-xl', 'py-5');
    }
  });
});
