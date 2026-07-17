import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalyticsPanel } from './analytics-panel';
import { PartialCoverageNotice } from './data-states';

describe('AnalyticsPanel', () => {
  it('renders a named section with heading, description, and children', () => {
    render(
      <AnalyticsPanel
        description="Ranked average VP by source."
        title="Score Sources"
      >
        <p>panel body</p>
      </AnalyticsPanel>,
    );

    const section = screen.getByRole('region', { name: 'Score Sources' });
    expect(section).toHaveClass('tm-panel');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Score Sources' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ranked average VP by source.')).toBeInTheDocument();
    expect(screen.getByText('panel body')).toBeInTheDocument();
  });

  it('keeps the header visible while loading and announces the loading state', () => {
    render(
      <AnalyticsPanel state={{ status: 'loading' }} title="Head-to-Head">
        <p>should not render</p>
      </AnalyticsPanel>,
    );

    expect(
      screen.getByRole('heading', { name: 'Head-to-Head' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('should not render')).not.toBeInTheDocument();
  });

  it('renders an explicit empty state instead of children', () => {
    render(
      <AnalyticsPanel
        state={{
          status: 'empty',
          title: 'No finalized games yet',
          description: 'Finalize a game to unlock this section.',
        }}
        title="Lineups"
      >
        <p>rows</p>
      </AnalyticsPanel>,
    );

    expect(screen.getByText('No finalized games yet')).toBeInTheDocument();
    expect(
      screen.getByText('Finalize a game to unlock this section.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('rows')).not.toBeInTheDocument();
  });

  it('announces query errors distinctly from empty data', () => {
    render(
      <AnalyticsPanel state={{ status: 'error' }} title="Final Actions">
        <p>rows</p>
      </AnalyticsPanel>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Data could not be loaded',
    );
    expect(screen.queryByText('rows')).not.toBeInTheDocument();
  });

  it('renders an unavailable state for uncapturable metrics', () => {
    render(
      <AnalyticsPanel
        state={{
          status: 'unavailable',
          description: 'Not captured for historical games.',
        }}
        title="Cards Seen"
      />,
    );

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(
      screen.getByText('Not captured for historical games.'),
    ).toBeInTheDocument();
  });

  it('renders badges, actions, and footer slots', () => {
    render(
      <AnalyticsPanel
        actions={<button type="button">Expand</button>}
        badges={<PartialCoverageNotice coverage={{ covered: 3, total: 4 }} />}
        footer={<p>Denominator: finalized games only.</p>}
        title="Styles"
      >
        body
      </AnalyticsPanel>,
    );

    expect(screen.getByText(/3 of 4 games \(75%\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(
      screen.getByText('Denominator: finalized games only.'),
    ).toBeInTheDocument();
  });

  it('supports custom heading levels for nested composition', () => {
    render(
      <AnalyticsPanel headingLevel={3} title="Sub-panel">
        body
      </AnalyticsPanel>,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Sub-panel' }),
    ).toBeInTheDocument();
  });
});
