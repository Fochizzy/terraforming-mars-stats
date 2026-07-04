import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

const authMocks = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
    from: vi.fn(() => ({
      insert: authMocks.insert,
    })),
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
      error: null,
    });
    authMocks.insert.mockResolvedValue({ error: null });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
      },
    });
  });

  it('signs in with username and pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'friday-mars@users.tmstats.local',
        password: '1234',
      }),
    );
    expect(window.location.assign).toHaveBeenCalledWith('/profile');
  });

  it('creates an account with full name, username, and pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.click(
      screen.getByRole('button', { name: /use create account/i }),
    );
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: 'friday-mars@users.tmstats.local',
        options: {
          data: {
            full_name: 'Friday Mars',
          },
        },
        password: '1234',
      }),
    );
    expect(authMocks.insert).toHaveBeenCalledWith({
      full_name: 'Friday Mars',
      user_id: 'user-1',
      username: 'friday-mars',
    });
    expect(window.location.assign).toHaveBeenCalledWith('/profile');
  });
});
