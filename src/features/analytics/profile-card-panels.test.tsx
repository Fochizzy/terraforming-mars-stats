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

describe('ProfileCardPanels', () => {
  it('renders contextual key cards as compact, scannable result cards', () => {
    render(
      <ProfileCardPanels
        cardOutcomes={[]}
        keyCards={[keyCard]}
        lossCards={[]}
        playerName="Friday Mars"
      />,
    );

    expect(screen.getAllByText(/estimated lift/i).length).toBeGreaterThan(0);
    expect(screen.getByText('+49 pp')).toBeInTheDocument();
    expect(screen.getByText('Factorum + Polaris')).toBeInTheDocument();
    expect(screen.getByText('Fast Pace')).toBeInTheDocument();
    expect(screen.getByText('Low confidence')).toBeInTheDocument();
    expect(
      screen.getByText(
        /won 2 of 2 games · estimate adjusted for your recorded game context/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how estimated lift is calculated/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/it made the list because/i)).not.toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveClass('rounded-xl');
  });
});
