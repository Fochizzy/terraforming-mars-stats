import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartFrame } from './chart-frame';

function getByTextContent(pattern: RegExp) {
  return screen.getByText((_content, element) => {
    if (!element || !pattern.test(element.textContent ?? '')) {
      return false;
    }

    return Array.from(element.children).every(
      (child) => !pattern.test(child.textContent ?? ''),
    );
  });
}

describe('ChartFrame', () => {
  it('renders themed chart chrome around section content', () => {
    render(
      <ChartFrame title="Weighted Leaderboard">
        <div>Chart content</div>
      </ChartFrame>,
    );

    expect(
      screen.getByRole('heading', {
        name: /weighted leaderboard/i,
      }),
    ).toHaveClass('tm-panel-title');

    expect(screen.getByText(/chart content/i)).toBeInTheDocument();
  });

  it('renders an optional description caption under the title', () => {
    render(
      <ChartFrame
        title="Weighted Leaderboard"
        description="Ranked by weighted score across finalized games."
      >
        <div>Chart content</div>
      </ChartFrame>,
    );

    expect(
      getByTextContent(/ranked by weighted score across finalized games/i),
    ).toHaveClass('tm-panel-caption');
  });

  it('omits the caption when no description is provided', () => {
    const { container } = render(
      <ChartFrame title="Weighted Leaderboard">
        <div>Chart content</div>
      </ChartFrame>,
    );

    expect(container.querySelector('.tm-panel-caption')).toBeNull();
  });
});