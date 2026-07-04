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
});
