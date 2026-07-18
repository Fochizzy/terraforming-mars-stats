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
      screen.getByText(/username or email and 6-digit pin/i),
    ).toBeInTheDocument();
  });

  it('resolves the Mars landscape background through the asset registry with a solid-color fallback', async () => {
    const { container } = render(await LoginPage({}));

    const main = container.querySelector('main');
    expect(main).toHaveStyle({ backgroundColor: '#080b10' });
    expect(main?.style.backgroundImage).toContain('/auth-page-mars-landscape.webp');
  });
});
