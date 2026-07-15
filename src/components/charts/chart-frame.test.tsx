import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartFrame } from './chart-frame';

describe('ChartFrame', () => {
  it('renders themed chart chrome around section content', () => {
    render(<ChartFrame title="Weighted Leaderboard">Chart content</ChartFrame>);

    const heading = screen.getByRole('heading', {
      level: 2,
      name: /weighted leaderboard/i,
    });
    const panel = heading.closest('section');

    expect(heading).toHaveClass('tm-panel-title');
    expect(panel).toHaveClass('tm-panel');
    expect(screen.getByText(/chart content/i)).toBeInTheDocument();
  });

  it('renders head-to-head rows as compact semantic comparison columns', () => {
    render(
      <ChartFrame title="Head-to-Head Lens">
        <div className="grid gap-3">
          <article>
            <div>
              <h3>fochizzy vs revloki</h3>
              <p>-12.83 pts</p>
            </div>
            <p>10-20-0 over 30 games</p>
          </article>
          <article>
            <div>
              <h3>lurker vs fochizzy</h3>
              <p>4.54 pts</p>
            </div>
            <p>15-11-0 over 26 games</p>
          </article>
        </div>
      </ChartFrame>,
    );

    expect(screen.getByText(/first player's perspective/i)).toBeInTheDocument();
    expect(screen.getByText('10 W')).toBeInTheDocument();
    expect(screen.getByText('20 L')).toBeInTheDocument();
    expect(screen.getByText('-12.83 pts')).toHaveClass('text-rose-300');
    expect(screen.getByText('+4.54 pts')).toHaveClass('text-emerald-300');
    expect(
      screen.getByRole('img', { name: /fochizzy average margin/i }),
    ).toBeInTheDocument();
  });
});
