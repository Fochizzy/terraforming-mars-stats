import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PartialCoverageNotice } from './data-states';
import { SectionHeader } from './section-header';

describe('SectionHeader', () => {
  it('renders an h2 with description by default', () => {
    render(
      <SectionHeader
        description="Average finishing position by player."
        title="Placement"
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Placement' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Average finishing position by player.'),
    ).toBeInTheDocument();
  });

  it('renders coverage badges beside the title and supports custom levels', () => {
    render(
      <SectionHeader
        badges={<PartialCoverageNotice coverage={{ covered: 4, total: 9 }} />}
        headingLevel={3}
        title="Styles"
      />,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Styles' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 of 9 games \(44%\)/)).toBeInTheDocument();
  });
});
