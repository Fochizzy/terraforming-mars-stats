import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPinForm } from './reset-pin-form';

const authMocks = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  getSession: vi.fn(),
  setSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: authMocks.createSupabaseBrowserClient,
}));

describe('ResetPinForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createSupabaseBrowserClient.mockReturnValue({
      auth: {
        getSession: authMocks.getSession,
        setSession: authMocks.setSession,
        updateUser: authMocks.updateUser,
      },
    });

    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'existing-access-token',
        },
      },
      error: null,
    });

    authMocks.setSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'recovery-access-token',
        },
      },
      error: null,
    });

    authMocks.updateUser.mockResolvedValue({ error: null });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
        hash: '',
        pathname: '/auth/reset-pin',
        search: '?next=%2Fprofile',
      },
    });

    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        replaceState: vi.fn(),
      },
    });
  });

  it('establishes the recovery session from the URL fragment', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
        hash:
          '#access_token=recovery-access-token&refresh_token=recovery-refresh-token&type=recovery',
        pathname: '/auth/reset-pin',
        search: '?next=%2Fprofile',
      },
    });

    render(<ResetPinForm nextPath="/profile" />);

    expect(authMocks.createSupabaseBrowserClient).toHaveBeenCalledWith({
      detectSessionInUrl: false,
    });

    await waitFor(() =>
      expect(authMocks.setSession).toHaveBeenCalledWith({
        access_token: 'recovery-access-token',
        refresh_token: 'recovery-refresh-token',
      }),
    );

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/auth/reset-pin?next=%2Fprofile',
    );
  });

  it('updates the new six-digit pin and redirects on success', async () => {
    const user = userEvent.setup();

    render(<ResetPinForm nextPath="/profile" />);

    const updateButton = await screen.findByRole('button', {
      name: /update pin/i,
    });

    await waitFor(() => expect(updateButton).toBeEnabled());

    await user.type(screen.getByLabelText(/new 6-digit pin/i), '123456');
    await user.type(screen.getByLabelText(/confirm 6-digit pin/i), '123456');
    await user.click(updateButton);

    await waitFor(() =>
      expect(authMocks.updateUser).toHaveBeenCalledWith({
        password: '123456',
      }),
    );

    expect(window.location.assign).toHaveBeenCalledWith('/profile');
  });

  it('shows the returned error when Supabase rejects the new pin', async () => {
    const user = userEvent.setup();

    authMocks.updateUser.mockResolvedValueOnce({
      error: {
        message: 'Could not update your PIN right now.',
      },
    });

    render(<ResetPinForm nextPath="/profile" />);

    const updateButton = await screen.findByRole('button', {
      name: /update pin/i,
    });

    await waitFor(() => expect(updateButton).toBeEnabled());

    await user.type(screen.getByLabelText(/new 6-digit pin/i), '123456');
    await user.type(screen.getByLabelText(/confirm 6-digit pin/i), '123456');
    await user.click(updateButton);

    expect(
      await screen.findByText(/could not update your pin right now\./i),
    ).toBeInTheDocument();

    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
