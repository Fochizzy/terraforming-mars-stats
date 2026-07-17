import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders an h1 with eyebrow, description, and actions', () => {
    render(
      <PageHeader
        actions={<button type="button">Switch group</button>}
        description="How the whole meta is shifting."
        eyebrow="Terraforming Mars Stats"
        title="Global Insights"
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Global Insights' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Terraforming Mars Stats')).toBeInTheDocument();
    expect(
      screen.getByText('How the whole meta is shifting.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch group' }),
    ).toBeInTheDocument();
  });

  it('supports a lower heading level inside layouts that already own the h1', () => {
    render(<PageHeader headingLevel={2} title="Group Insights" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Group Insights' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
