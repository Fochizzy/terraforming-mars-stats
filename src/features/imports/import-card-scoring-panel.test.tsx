import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImportCardScoringPanel } from './import-card-scoring-panel';

describe('ImportCardScoringPanel', () => {
  it('shows calculated and pending card scoring by player', () => {
    render(
      <ImportCardScoringPanel
        summaries={[
          {
            autoScoredCards: [
              {
                cardId: 'card-1',
                cardName: 'Pets',
                category: 'animals',
                evidenceSummary: '3 animal => 3 VP',
                humanSummary: '1 VP per animal on this card',
                points: 3,
                sourceType: 'curated',
              },
            ],
            pendingCards: [
              {
                cardId: 'card-2',
                cardName: 'Mystery Science Score',
                reason: 'OCR found VP text but the rule still needs review.',
              },
            ],
            playerName: 'Friday Mars',
            totals: {
              animals: 3,
              complete: false,
              jovian: 0,
              microbes: 0,
              other: 0,
              total: 3,
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/calculated card scoring/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Friday Mars: 3 calculated card points/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pets: 3 VP\./i)).toBeInTheDocument();
    expect(screen.getByText(/Review Mystery Science Score/i)).toBeInTheDocument();
  });
});
