import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPinForm } from './forgot-pin-form';

describe('ForgotPinForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            status: {
              message:
                'If that username or email is registered, a recovery link has been sent.',
              state: 'success',
            },
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests a PIN reset through the server endpoint using the username or email', async () => {
    const user = userEvent.setup();

    render(<ForgotPinForm />);

    await user.type(screen.getByLabelText(/^username or email$/i), 'Friday Mars');
    await user.click(screen.getByRole('button', { name: /send pin reset link/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
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
  });
});
