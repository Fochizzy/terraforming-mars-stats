import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DataStateRenderer,
  EmptyState,
  ErrorState,
  LoadingState,
  LowSampleNotice,
  MissingDataNotice,
  PartialCoverageNotice,
  UnavailableState,
} from './data-states';

describe('LoadingState', () => {
  it('announces politely with visible text, not color alone', () => {
    render(<LoadingState label="Loading leaderboard" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading leaderboard…');
  });
});

describe('EmptyState', () => {
  it('renders default copy with optional description and action', () => {
    render(
      <EmptyState
        action={<a href="/log-game">Log a game</a>}
        description="Finalize a game to populate this section."
      />,
    );

    expect(screen.getByText('No data recorded yet')).toBeInTheDocument();
    expect(
      screen.getByText('Finalize a game to populate this section.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log a game' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('is an alert, programmatically distinct from empty data', () => {
    render(<ErrorState description="The analytics query failed." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Data could not be loaded');
    expect(alert).toHaveTextContent('The analytics query failed.');
    expect(alert).toHaveAttribute('data-state', 'error');
  });
});

describe('UnavailableState', () => {
  it('describes metrics that cannot exist for the subject', () => {
    render(
      <UnavailableState description="Card acquisition was not captured for historical games." />,
    );

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Card acquisition was not captured for historical games.',
      ),
    ).toBeInTheDocument();
  });
});

describe('MissingDataNotice', () => {
  it('marks missing values with text', () => {
    render(<MissingDataNotice />);

    const notice = screen.getByText('Not recorded');
    expect(notice).toHaveAttribute('data-state', 'missing');
  });
});

describe('LowSampleNotice', () => {
  it('renders nothing without an approved threshold', () => {
    const { container } = render(<LowSampleNotice sample={{ count: 2 }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the sample meets the threshold', () => {
    const { container } = render(
      <LowSampleNotice sample={{ count: 12, lowSampleThreshold: 10 }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the sample and the threshold in text', () => {
    render(<LowSampleNotice sample={{ count: 3, lowSampleThreshold: 10 }} />);

    const notice = screen.getByText(/Low sample/);
    expect(notice).toHaveTextContent('n = 3 games');
    expect(notice).toHaveTextContent('needs ≥ 10 games');
    expect(notice).toHaveAttribute('data-state', 'low-sample');
  });
});

describe('PartialCoverageNotice', () => {
  it('shows numerator, denominator, and percentage', () => {
    render(<PartialCoverageNotice coverage={{ covered: 12, total: 20 }} />);

    const notice = screen.getByText(/Coverage/);
    expect(notice).toHaveTextContent('12 of 20 games (60%)');
    expect(notice).toHaveAttribute('data-state', 'partial-coverage');
  });

  it('keeps explicit zero coverage visible', () => {
    render(<PartialCoverageNotice coverage={{ covered: 0, total: 6 }} />);

    expect(screen.getByText(/Coverage/)).toHaveTextContent('0 of 6 games (0%)');
  });

  it('reports an unavailable denominator instead of a bogus percentage', () => {
    render(<PartialCoverageNotice coverage={{ covered: 0, total: 0 }} />);

    const notice = screen.getByText(/Coverage/);
    expect(notice).toHaveTextContent('Coverage: unavailable');
    expect(notice).toHaveAttribute('data-state', 'coverage-unavailable');
    expect(notice).not.toHaveTextContent('%');
  });

  it('supports custom labels and units', () => {
    render(
      <PartialCoverageNotice
        coverage={{ covered: 2, total: 5 }}
        label="Style coverage"
        unit="players"
      />,
    );

    expect(screen.getByText(/Style coverage/)).toHaveTextContent(
      '2 of 5 players (40%)',
    );
  });
});

describe('DataStateRenderer', () => {
  it('renders children when ready or when no state is provided', () => {
    const { rerender } = render(
      <DataStateRenderer>
        <p>rows</p>
      </DataStateRenderer>,
    );
    expect(screen.getByText('rows')).toBeInTheDocument();

    rerender(
      <DataStateRenderer state={{ status: 'ready' }}>
        <p>rows</p>
      </DataStateRenderer>,
    );
    expect(screen.getByText('rows')).toBeInTheDocument();
  });

  it('swaps children for the matching shared state', () => {
    render(
      <DataStateRenderer state={{ status: 'unavailable' }}>
        <p>rows</p>
      </DataStateRenderer>,
    );

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByText('rows')).not.toBeInTheDocument();
  });
});
