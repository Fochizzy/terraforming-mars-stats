import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardPageShell } from './dashboard-page-shell';
import { PageHeader } from './page-header';

describe('DashboardPageShell', () => {
  it('renders header, toolbar, and sections in order', () => {
    render(
      <DashboardPageShell
        header={<PageHeader headingLevel={2} title="Group Insights" />}
        toolbar={<div>toolbar controls</div>}
      >
        <section aria-label="First section">one</section>
      </DashboardPageShell>,
    );

    expect(
      screen.getByRole('heading', { name: 'Group Insights' }),
    ).toBeInTheDocument();
    expect(screen.getByText('toolbar controls')).toBeInTheDocument();
    expect(screen.getByLabelText('First section')).toBeInTheDocument();
  });

  it('stays unwrapped by default and gains the standard container on request', () => {
    const { container, rerender } = render(
      <DashboardPageShell>content</DashboardPageShell>,
    );
    expect(container.querySelector('.max-w-\\[1600px\\]')).toBeNull();

    rerender(<DashboardPageShell withContainer>content</DashboardPageShell>);
    expect(container.querySelector('.max-w-\\[1600px\\]')).not.toBeNull();
  });
});
