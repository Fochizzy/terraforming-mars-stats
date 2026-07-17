import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
} from '@/lib/metrics/metric-value';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  it('renders label, observed value, and unit', () => {
    render(<KpiCard label="Average Score" unit="pts" value={observedMetric(87)} />);

    expect(screen.getByRole('article', { name: 'Average Score' })).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('pts')).toBeInTheDocument();
  });

  it('renders an explicit zero as 0, not as a missing state', () => {
    render(<KpiCard label="Awards Funded" value={observedMetric(0)} />);

    const value = screen.getByText('0');
    expect(value.closest('[data-state]')).toHaveAttribute('data-state', 'observed');
    expect(screen.queryByText('Not recorded')).not.toBeInTheDocument();
  });

  it('renders a missing observation without inventing a number or unit', () => {
    render(<KpiCard label="Cards Purchased" unit="cards" value={missingMetric()} />);

    const value = screen.getByText('Not recorded');
    expect(value.closest('[data-state]')).toHaveAttribute('data-state', 'missing');
    expect(screen.queryByText('cards')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders unavailable metrics distinctly from empty and zero', () => {
    render(<KpiCard label="Purchase Conversion" value={unavailableMetric('Cards Seen missing')} />);

    const value = screen.getByText('Unavailable');
    expect(value.closest('[data-state]')).toHaveAttribute('data-state', 'unavailable');
  });

  it('marks partial values as lower bounds', () => {
    render(<KpiCard label="Events Captured" value={partialMetric(12)} />);

    expect(screen.getByText(/≥ 12/)).toBeInTheDocument();
  });

  it('formats large values with grouping', () => {
    render(<KpiCard label="Total MC" value={observedMetric(1234567)} />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('shows the sample size whenever provided', () => {
    render(
      <KpiCard
        label="Win Rate"
        sample={{ count: 14 }}
        value={observedMetric(52)}
      />,
    );

    expect(screen.getByText('n = 14 games')).toBeInTheDocument();
    expect(screen.queryByText(/Low sample/)).not.toBeInTheDocument();
  });

  it('flags a low sample only when an approved threshold is supplied', () => {
    const { rerender } = render(
      <KpiCard
        label="Win Rate"
        sample={{ count: 3, lowSampleThreshold: 10 }}
        value={observedMetric(66.7)}
      />,
    );
    expect(screen.getByText(/Low sample/)).toBeInTheDocument();

    rerender(
      <KpiCard label="Win Rate" sample={{ count: 3 }} value={observedMetric(66.7)} />,
    );
    expect(screen.queryByText(/Low sample/)).not.toBeInTheDocument();
  });

  it('accepts preformatted text for non-numeric KPIs', () => {
    render(<KpiCard label="Best Lane" value="Jovian" />);

    expect(screen.getByText('Jovian')).toBeInTheDocument();
  });

  it('exposes the metric definition through an accessible info control', () => {
    render(
      <KpiCard
        info="Wins divided by eligible finalized games."
        label="Win Rate"
        value={observedMetric(52)}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'About Win Rate' }),
    ).toHaveAccessibleDescription('Wins divided by eligible finalized games.');
  });
});
