import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renders themed login copy and sign-in controls', async () => {
    render(await LoginPage({}));

    const heading = screen.getByRole('heading', { name: /join your group/i });
    const button = screen.getByRole('button', { name: /email me a sign-in link/i });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('tm-display-title');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('tm-button-primary');
  });
});
