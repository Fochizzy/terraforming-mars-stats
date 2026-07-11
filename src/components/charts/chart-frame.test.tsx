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

  it('renders an optional description caption under the title', () => {
    render(
      <ChartFrame
        description="Ranked by weighted score across finalized games."
        title="Weighted Leaderboard"
      >
        Chart content
      </ChartFrame>,
    );

    expect(
      screen.getByText(/ranked by weighted score across finalized games/i),
    ).toHaveClass('tm-panel-caption');
  });

  it('omits the caption when no description is provided', () => {
    const { container } = render(
      <ChartFrame title="Weighted Leaderboard">Chart content</ChartFrame>,
    );

    expect(container.querySelector('.tm-panel-caption')).toBeNull();
  });
});
