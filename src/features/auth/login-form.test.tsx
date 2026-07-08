import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthCallbackUrl,
  buildAuthCompletePath,
  buildAuthResetPinPath,
} from './build-auth-callback-url';
import { LoginForm } from './login-form';

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  select: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
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
    authMocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
        origin: 'https://terraforming-mars-stats.workers.dev',
      },
    });
  });

  it('signs in with email and pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/^email$/i), 'Friday.Mars@Example.com');
    await user.type(screen.getByLabelText(/6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'friday.mars@example.com',
        password: '123456',
      }),
    );
    expect(window.location.assign).toHaveBeenCalledWith(
      buildAuthCompletePath('/profile'),
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
            'https://terraforming-mars-stats.workers.dev',
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
            'https://terraforming-mars-stats.workers.dev',
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

  it('requests a pin reset with the typed email and shows the generic success message', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/^email$/i), 'Friday.Mars@Example.com');
    await user.click(screen.getByRole('button', { name: /reset pin/i }));

    await waitFor(() =>
      expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
        'friday.mars@example.com',
        {
          redirectTo: buildAuthCallbackUrl(
            'https://terraforming-mars-stats.workers.dev',
            buildAuthResetPinPath('/profile'),
          ),
        },
      ),
    );

    expect(
      screen.getByText(
        /if that email is registered, a recovery link has been sent\./i,
      ),
    ).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('asks for an email before requesting a pin reset', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.click(screen.getByRole('button', { name: /reset pin/i }));

    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(screen.getByText(/enter your email first\./i)).toBeInTheDocument();
  });
});
