import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportCardScoringPanel } from './import-card-scoring-panel';

vi.mock('@/features/catalog/card-stats-actions', () => ({
  getCardWinStats: vi.fn().mockResolvedValue({
    globalGames: 0,
    globalWins: 0,
    personalGames: 0,
    personalWins: 0,
  }),
}));

describe('ImportCardScoringPanel', () => {
  it('shows a manual-fill button only for board-aware pending cards', async () => {
    const user = userEvent.setup();
    const onSelectManualReviewJumpTarget = vi.fn();

    render(
      <ImportCardScoringPanel
        onSelectManualReviewJumpTarget={onSelectManualReviewJumpTarget}
        selectedManualReviewJumpTarget={null}
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
                cardName: 'Commercial District',
                imageUrl: 'https://example.com/commercial-district.png',
                reason:
                  'The city placement from Commercial District could not be linked safely from the imported log.',
                reviewKind: 'board_evidence',
              },
              {
                cardId: 'card-3',
                cardName: 'Research Outpost',
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
    expect(
      screen.getByRole('button', { name: /show statistics for pets/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /show statistics for commercial district/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /show statistics for research outpost/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 VP\./i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /fill manually commercial district for friday mars/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /fill manually research outpost for friday mars/i,
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /fill manually commercial district for friday mars/i,
      }),
    );

    expect(onSelectManualReviewJumpTarget).toHaveBeenCalledWith({
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });
  });
});
