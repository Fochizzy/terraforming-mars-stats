import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the Terraforming Mars stats CTA', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', {
      name: /terraforming mars stats/i,
    });
    const signInLink = screen.getByRole('link', {
      name: /sign in to your group/i,
    });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('tm-display-title');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveClass('tm-button-primary');
  });
});
