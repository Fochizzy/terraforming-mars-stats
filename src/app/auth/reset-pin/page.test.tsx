import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPinPage from './page';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const redirectMock = vi.hoisted(() => vi.fn(() => {
  throw new Error('NEXT_REDIRECT');
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('ResetPinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the reset-pin form when the recovery session is authenticated', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
            },
          },
          error: null,
        }),
      },
    } as never);

    render(
      await ResetPinPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    expect(
      screen.getByRole('heading', { name: /set your new pin/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update pin/i })).toBeInTheDocument();
  });

  it('redirects back to login when the recovery session is missing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
          error: null,
        }),
      },
    } as never);

    await expect(
      ResetPinPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/login?error=reset_session');
  });
});
