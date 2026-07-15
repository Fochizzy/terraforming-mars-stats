import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardWinStat } from '@/lib/db/selection-stats-repo';
import {
  GlobalLossCardsSection,
  GLOBAL_LOSS_CARD_LIMIT,
} from './global-loss-cards-section';

function card(
  cardName: string,
  plays: number,
  winRate: number,
): CardWinStat {
  return {
    card_name: cardName,
    plays,
    win_rate_when_played: winRate,
  };
}

const lossCards = [
  card('Solar Wind Power', 20, 0.15),
  card('Development Center', 19, 0.16),
  card('GHG Factories', 14, 0.14),
  card('Towing A Comet', 18, 0.17),
  card('Field-Capped City', 22, 0.18),
  card('Small Asteroid', 5, 0.35),
];

describe('GlobalLossCardsSection', () => {
  it('renders ranked, compact loss-card results with methodology and impact bars', () => {
    render(
      <GlobalLossCardsSection
        baselineWinRate={0.36}
        cardMetaByName={new Map()}
        cards={lossCards}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /cards most correlated with losses/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/rankings combine win-rate difference and sample/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/how this is calculated/i)).toBeInTheDocument();
    expect(
      screen.getByText(/only cards with at least 5 recorded plays are ranked/i),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Rank 1')).toBeInTheDocument();
    expect(screen.getByLabelText(`Rank ${GLOBAL_LOSS_CARD_LIMIT}`)).toBeInTheDocument();
    expect(screen.getByText('−14 pts')).toBeInTheDocument();
    expect(
      screen.getByText('21 pts below baseline · 67% confidence · 20 plays'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/solar wind power negative impact severity/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/play-count confidence is/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Small Asteroid')).not.toBeInTheDocument();
  });

  it('uses a contained view-all control and expands the remaining cards', () => {
    render(
      <GlobalLossCardsSection
        baselineWinRate={0.36}
        cardMetaByName={new Map()}
        cards={lossCards}
      />,
    );

    const viewAll = screen.getByRole('button', {
      name: /view all 1 negative card/i,
    });

    expect(viewAll).toHaveClass('max-w-sm');
    fireEvent.click(viewAll);

    expect(screen.getByText('Small Asteroid')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show top 5/i }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
});
