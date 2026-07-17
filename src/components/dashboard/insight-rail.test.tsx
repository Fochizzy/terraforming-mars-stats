import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardInsightRail } from './insight-rail';

describe('DashboardInsightRail', () => {
  it('renders fixture-provided evidence, coverage, low sample, and missing state', () => {
    render(
      <DashboardInsightRail
        items={[
          {
            id: 'insight-a',
            title: 'Descriptive fixture finding',
            finding: 'Caller-provided text only.',
            evidence: 'Caller-provided evidence.',
            relatedItemId: 'row-a',
            coverage: { covered: 2, total: 4 },
            sample: { count: 2, lowSampleThreshold: 3, unit: 'rows' },
          },
          {
            id: 'insight-missing',
            title: 'Missing fixture finding',
            finding: 'No recorded value.',
            valueState: 'missing',
          },
        ]}
        selectedItemId={null}
      />,
    );

    expect(screen.getByText('Caller-provided evidence.')).toBeInTheDocument();
    expect(screen.getByText(/Low sample: n = 2 rows/)).toBeInTheDocument();
    expect(screen.getByText(/Coverage: 2 of 4 games/)).toBeInTheDocument();
    expect(screen.getByText('Fixture value not recorded')).toBeInTheDocument();
  });

  it('synchronizes a related insight through an accessible action', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    render(
      <DashboardInsightRail
        items={[
          {
            id: 'insight-a',
            title: 'Finding A',
            finding: 'Description A',
            relatedItemId: 'row-a',
          },
        ]}
        onFocusItem={onFocus}
        selectedItemId="row-a"
      />,
    );

    const article = screen.getByRole('article', { name: 'Finding A' });
    expect(article).toHaveAttribute('data-selected', 'true');
    const button = screen.getByRole('button', { name: 'Focus related evidence' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(onFocus).toHaveBeenCalledWith('row-a');
  });

  it('uses the shared empty state when no insights are supplied', () => {
    render(<DashboardInsightRail items={[]} selectedItemId={null} />);
    expect(screen.getByText('No fixture insights')).toBeInTheDocument();
  });
});
