import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServerClient } from '@supabase/ssr';
import { updateSupabaseSession } from './middleware';

const nextState = vi.hoisted(() => ({
  lastResponse: null as
    | null
    | {
        cookies: {
          set: ReturnType<typeof vi.fn>;
        };
        request: unknown;
      },
}));

vi.mock('next/server', () => ({
  NextResponse: {
    next: ({ request }: { request: unknown }) => {
      const response = {
        cookies: {
          set: vi.fn(),
        },
        request,
      };

      nextState.lastResponse = response;
      return response;
    },
  },
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

describe('updateSupabaseSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextState.lastResponse = null;
  });

  it('treats a missing auth session as anonymous when getUser throws', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue({ name: 'AuthSessionMissingError' }),
      },
    } as never);

    const request = {
      cookies: {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      },
    } as never;

    await expect(updateSupabaseSession(request)).resolves.toBe(nextState.lastResponse);
  });
});
