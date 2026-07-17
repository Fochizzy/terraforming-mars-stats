import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartContainer } from './chart-container';

describe('ChartContainer', () => {
  it('renders a named figure with reserved chart space', () => {
    render(
      <ChartContainer label="Score trend" minHeight={240}>
        <svg aria-hidden="true" data-testid="chart" />
      </ChartContainer>,
    );

    const figure = screen.getByRole('figure', { name: 'Score trend' });
    expect(figure).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    const body = screen.getByTestId('chart').parentElement;
    expect(body).toHaveStyle({ minHeight: '240px' });
  });

  it('renders caption and screen-reader summary', () => {
    render(
      <ChartContainer
        caption="Final scores across finalized games."
        label="Score trend"
        srSummary="Line chart of final score by game date."
      >
        <svg aria-hidden="true" />
      </ChartContainer>,
    );

    expect(
      screen.getByText('Final scores across finalized games.'),
    ).toBeInTheDocument();
    const summary = screen.getByText('Line chart of final score by game date.');
    expect(summary).toHaveClass('sr-only');
  });

  it('replaces the chart with shared states when data is not ready', () => {
    const { rerender } = render(
      <ChartContainer label="Score trend" state={{ status: 'loading' }}>
        <svg aria-hidden="true" data-testid="chart" />
      </ChartContainer>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();

    rerender(
      <ChartContainer label="Score trend" state={{ status: 'empty' }}>
        <svg aria-hidden="true" data-testid="chart" />
      </ChartContainer>,
    );
    expect(screen.getByText('No data recorded yet')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });

  it('makes an overflowing chart keyboard-scrollable on request', () => {
    render(
      <ChartContainer label="Wide timeline" scrollable>
        <svg aria-hidden="true" />
      </ChartContainer>,
    );

    const scrollRegion = screen.getByRole('region', {
      name: 'Wide timeline (scrollable)',
    });
    expect(scrollRegion).toHaveAttribute('tabindex', '0');
    expect(scrollRegion).toHaveClass('overflow-x-auto');
  });
});
