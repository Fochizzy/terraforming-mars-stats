import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPinForm } from './reset-pin-form';

const authMocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      updateUser: authMocks.updateUser,
    },
  }),
}));

describe('ResetPinForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.updateUser.mockResolvedValue({ error: null });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
      },
    });
  });

  it('updates the new six-digit pin and redirects on success', async () => {
    const user = userEvent.setup();

    render(<ResetPinForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/new 6-digit pin/i), '123456');
    await user.type(screen.getByLabelText(/confirm 6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /update pin/i }));

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

    await user.type(screen.getByLabelText(/new 6-digit pin/i), '123456');
    await user.type(screen.getByLabelText(/confirm 6-digit pin/i), '123456');
    await user.click(screen.getByRole('button', { name: /update pin/i }));

    expect(
      await screen.findByText(/could not update your pin right now\./i),
    ).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
