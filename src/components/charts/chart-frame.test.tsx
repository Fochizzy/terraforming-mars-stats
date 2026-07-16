import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders head-to-head rows with favored player and absolute margin', () => {
    render(
      <ChartFrame title="Head-to-Head Lens">
        <div className="grid gap-3">
          <article>
            <div>
              <h3>fochizzy vs revolki</h3>
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

    // Negative margin (-12.83): second player (revolki) is favored
    expect(screen.getByText(/revolki edge/i)).toBeInTheDocument();
    // Positive margin (+4.54): first player (lurker) is favored
    expect(screen.getByText(/lurker edge/i)).toBeInTheDocument();
    // Margin is displayed as absolute value with +
    expect(screen.getByText('+12.83 pts')).toBeInTheDocument();
    expect(screen.getByText('+4.54 pts')).toBeInTheDocument();
    // First-player record perspective is labeled
    expect(screen.getAllByText(/fochizzy's record/i).length).toBeGreaterThan(0);
    // Summary stats row exists
    expect(screen.getByText(/matchups/i)).toBeInTheDocument();
    expect(screen.getAllByText(/shared games/i).length).toBeGreaterThan(0);
  });

  it('renders "Even" for a zero-margin matchup', () => {
    render(
      <ChartFrame title="Head-to-Head Lens">
        <div className="grid gap-3">
          <article>
            <div>
              <h3>alpha vs beta</h3>
              <p>0 pts</p>
            </div>
            <p>5-5-0 over 10 games</p>
          </article>
        </div>
      </ChartFrame>,
    );

    expect(screen.getByText(/even/i)).toBeInTheDocument();
    // No raw "0" pts displayed as signed value
    expect(screen.queryByText(/\+0/)).not.toBeInTheDocument();
  });

  it('sorts rows by largest edge when sort button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ChartFrame title="Head-to-Head Lens">
        <div className="grid gap-3">
          <article>
            <div>
              <h3>alice vs bob</h3>
              <p>2 pts</p>
            </div>
            <p>5-5-0 over 10 games</p>
          </article>
          <article>
            <div>
              <h3>carol vs dave</h3>
              <p>20 pts</p>
            </div>
            <p>8-2-0 over 10 games</p>
          </article>
        </div>
      </ChartFrame>,
    );

    await user.click(screen.getByRole('button', { name: /largest edge/i }));

    // Edge badges only — not the button itself
    const badges = screen.getAllByText(/\bedge\b/i).filter(
      (el) => el.tagName.toLowerCase() === 'span',
    );
    // carol should appear first (largest margin 20)
    expect(badges[0].textContent).toMatch(/carol/i);
  });
});
