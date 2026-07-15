import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthCallbackUrl,
  buildAuthCompletePath,
} from './build-auth-callback-url';
import { LoginForm } from './login-form';

const authMocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
    rpc: authMocks.rpc,
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
    authMocks.rpc.mockResolvedValue({ data: true, error: null });
    authMocks.fetch.mockImplementation(async (_url, init) => {
      const url = String(_url);
      const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? '{}'));
      const result =
        url === '/auth/request-pin-reset' && !body.username
          ? {
              ok: false,
              status: {
                message: 'Enter your username or email first.',
                state: 'error',
              },
            }
          : {
              ok: true,
              redirectPath: buildAuthCompletePath(body.nextPath ?? '/profile'),
              status: {
                message:
                  'If that username or email is registered, a recovery link has been sent.',
                state: 'success',
              },
            };

      return new Response(
        JSON.stringify(result),
        {
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    vi.stubGlobal('fetch', authMocks.fetch);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
        origin: 'https://tm-stats.com',
      },
    });
  });

  it('signs in with username and a six-digit pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/^username or email$/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(authMocks.fetch).toHaveBeenCalledWith(
        '/auth/username-login',
        expect.objectContaining({
          body: JSON.stringify({
            nextPath: '/profile',
            pin: '123456',
            username: 'Friday Mars',
          }),
          method: 'POST',
        }),
      ),
    );
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith(
      buildAuthCompletePath('/profile'),
    );
  });

  it('defaults sign in to the single-upload import route when no next path is provided', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^username or email$/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(authMocks.fetch).toHaveBeenCalledWith(
        '/auth/username-login',
        expect.objectContaining({
          body: JSON.stringify({
            nextPath: '/log-game/import-single',
            pin: '123456',
            username: 'Friday Mars',
          }),
          method: 'POST',
        }),
      ),
    );
    expect(window.location.assign).toHaveBeenCalledWith(
      buildAuthCompletePath('/log-game/import-single'),
    );
  });

  it('creates an account with full name, username, email, and pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.click(
      screen.getByRole('button', { name: /use create account/i }),
    );
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/^email$/i), 'Friday.Mars@Example.com');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: 'friday.mars@example.com',
        options: {
          data: {
            full_name: 'Friday Mars',
            username: 'friday-mars',
          },
          emailRedirectTo: buildAuthCallbackUrl(
            'https://tm-stats.com',
            '/profile',
          ),
        },
        password: '123456',
      }),
    );
    expect(window.location.assign).toHaveBeenCalledWith(
      buildAuthCompletePath('/profile'),
    );
  });

  it('keeps a new user on the username box when the chosen name is taken', async () => {
    const user = userEvent.setup();

    authMocks.rpc.mockResolvedValueOnce({ data: false, error: null });

    render(<LoginForm nextPath="/profile" />);

    await user.click(
      screen.getByRole('button', { name: /use create account/i }),
    );
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'revloki');
    await user.type(screen.getByLabelText(/^email$/i), 'friday@example.com');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /that username is already taken\. choose a different one\./i,
        ),
      ).toBeInTheDocument(),
    );

    expect(authMocks.signUp).not.toHaveBeenCalled();
    const usernameInput = screen.getByLabelText(/username/i);
    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput).toHaveFocus();
    expect(window.location.assign).not.toHaveBeenCalled();
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
    await user.type(screen.getByLabelText(/^email$/i), 'friday@example.com');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: 'friday@example.com',
        options: {
          data: {
            full_name: 'Friday Mars',
            username: 'friday-mars',
          },
          emailRedirectTo: buildAuthCallbackUrl(
            'https://tm-stats.com',
            '/profile',
          ),
        },
        password: '123456',
      }),
    );

    expect(window.location.assign).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /check your email for the sign-in link to finish creating this account\./i,
      ),
    ).toBeInTheDocument();
  });

  it('guides duplicate email signups back to sign in when create account hits an existing account error', async () => {
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
    await user.type(screen.getByLabelText(/^email$/i), 'friday@example.com');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /that email already has an account\. sign in or reset your pin\./i,
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
    await user.type(screen.getByLabelText(/^email$/i), 'friday@example.com');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /that email already has an account\. sign in or reset your pin\./i,
        ),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it('requests a pin reset with the typed username or email and shows the generic success message', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/^username or email$/i), 'Friday Mars');
    await user.click(screen.getByRole('button', { name: /reset pin/i }));

    await waitFor(() =>
      expect(authMocks.fetch).toHaveBeenCalledWith(
        '/auth/request-pin-reset',
        expect.objectContaining({
          body: JSON.stringify({
            nextPath: '/profile',
            username: 'Friday Mars',
          }),
          method: 'POST',
        }),
      ),
    );

    expect(
      screen.getByText(
        /if that username or email is registered, a recovery link has been sent\./i,
      ),
    ).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('asks for a username or email before requesting a pin reset', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.click(screen.getByRole('button', { name: /reset pin/i }));

    expect(authMocks.fetch).toHaveBeenCalledWith(
      '/auth/request-pin-reset',
      expect.objectContaining({
        body: JSON.stringify({
          nextPath: '/profile',
          username: '',
        }),
        method: 'POST',
      }),
    );
    expect(screen.getByText(/enter your username or email first\./i)).toBeInTheDocument();
  });
});
