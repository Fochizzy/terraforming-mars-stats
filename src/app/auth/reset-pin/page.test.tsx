import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResetPinPage from './page';

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      updateUser: vi.fn(),
    },
  }),
}));

describe('ResetPinPage (legacy /auth/reset-pin route)', () => {
  it('renders the reset-PIN form and resolves the Mars landscape background with a fallback color', async () => {
    const { container } = render(await ResetPinPage({}));

    expect(
      screen.getByRole('heading', { name: /set a new pin/i }),
    ).toBeInTheDocument();

    const main = container.querySelector('main');
    expect(main).toHaveStyle({ backgroundColor: '#080b10' });
    expect(main?.style.backgroundImage).toContain('/auth-page-mars-landscape.webp');
  });
});
