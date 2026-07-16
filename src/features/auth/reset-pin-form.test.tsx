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

  it('updates the password when both pin entries match and redirects to the next path', async () => {
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

  it('rejects mismatched pin values before calling Supabase', async () => {
    const user = userEvent.setup();

    render(<ResetPinForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/new 6-digit pin/i), '123456');
    await user.type(screen.getByLabelText(/confirm 6-digit pin/i), '123457');
    await user.click(screen.getByRole('button', { name: /update pin/i }));

    expect(authMocks.updateUser).not.toHaveBeenCalled();
    expect(screen.getByText(/pin values must match\./i)).toBeInTheDocument();
  });
});
