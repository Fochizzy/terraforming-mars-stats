import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CoverageBadge } from './coverage-badge';

describe('CoverageBadge', () => {
  it('renders the entered-data percentage', () => {
    render(<CoverageBadge label="Jovian data" value={0.75} />);

    const badge = screen.getByText(/jovian data/i).closest('span');

    expect(screen.getByText(/jovian data/i)).toBeInTheDocument();
    expect(screen.getByText(/75%/i)).toBeInTheDocument();
    expect(badge).toHaveClass('tm-coverage-badge');
  });
});
