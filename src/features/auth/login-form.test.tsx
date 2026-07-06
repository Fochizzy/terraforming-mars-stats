import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthCallbackUrl,
  buildAuthCompletePath,
} from './build-auth-callback-url';
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
        session: { access_token: 'session-token' },
        user: { id: 'user-1' },
      },
      error: null,
    });
    authMocks.insert.mockResolvedValue({ error: null });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
        origin: 'https://terraforming-mars-stats.workers.dev',
      },
    });
  });

  it('signs in with username and pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'friday-mars@users.tmstats.local',
        password: '123456',
      }),
    );
    expect(window.location.assign).toHaveBeenCalledWith(
      buildAuthCompletePath('/profile'),
    );
  });

  it('creates an account with full name, username, and pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.click(
      screen.getByRole('button', { name: /use create account/i }),
    );
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: 'friday-mars@users.tmstats.local',
        options: {
          data: {
            full_name: 'Friday Mars',
          },
          emailRedirectTo: buildAuthCallbackUrl(
            'https://terraforming-mars-stats.workers.dev',
            '/profile',
          ),
        },
        password: '123456',
      }),
    );
    expect(authMocks.insert).not.toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith(
      buildAuthCompletePath('/profile'),
    );
  });

  it('waits for the Supabase email link when sign up does not create a session yet', async () => {
    const user = userEvent.setup();

    authMocks.signUp.mockResolvedValueOnce({
      data: {
        session: null,
        user: { id: 'user-1' },
      },
      error: null,
    });

    render(<LoginForm nextPath="/profile" />);

    await user.click(
      screen.getByRole('button', { name: /use create account/i }),
    );
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: 'friday-mars@users.tmstats.local',
        options: {
          data: {
            full_name: 'Friday Mars',
          },
          emailRedirectTo: buildAuthCallbackUrl(
            'https://terraforming-mars-stats.workers.dev',
            '/profile',
          ),
        },
        password: '123456',
      }),
    );

    expect(authMocks.insert).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /check your email for the Supabase sign-in link to finish creating this account\./i,
      ),
    ).toBeInTheDocument();
  });

  it('guides duplicate usernames back to sign in when create account hits an existing account error', async () => {
    const user = userEvent.setup();

    authMocks.signUp.mockResolvedValueOnce({
      data: {
        session: null,
        user: null,
      },
      error: {
        message: 'User already registered',
      },
    });

    render(<LoginForm nextPath="/profile" />);

    await user.click(
      screen.getByRole('button', { name: /use create account/i }),
    );
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /that username already has an account\. sign in with the existing 6-digit pin\./i,
        ),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it('guides hidden existing-user signup responses back to sign in', async () => {
    const user = userEvent.setup();

    authMocks.signUp.mockResolvedValueOnce({
      data: {
        session: null,
        user: {
          id: 'existing-user',
          identities: [],
        },
      },
      error: null,
    });

    render(<LoginForm nextPath="/profile" />);

    await user.click(
      screen.getByRole('button', { name: /use create account/i }),
    );
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /that username already has an account\. sign in with the existing 6-digit pin\./i,
        ),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });
});
