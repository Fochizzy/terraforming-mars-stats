import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renders themed login copy and sign-in controls', async () => {
    render(await LoginPage({}));

    const heading = screen.getByRole('heading', { name: /join your group/i });
    const button = screen.getByRole('button', { name: /^sign in$/i });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('tm-display-title');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('tm-button-primary');
    expect(
      screen.getByText(/email and 6-digit pin/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset pin/i })).toBeInTheDocument();
  });
});
