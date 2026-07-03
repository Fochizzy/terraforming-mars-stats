import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the Terraforming Mars stats CTA', () => {
    render(HomePage());

    expect(
      screen.getByRole('heading', { name: /terraforming mars stats/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /sign in to your group/i }),
    ).toBeInTheDocument();
  });
});
