import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { middleware } from './middleware';

const middlewareMocks = vi.hoisted(() => ({
  updateSupabaseSession: vi.fn(),
}));

vi.mock('@/lib/supabase/middleware', () => ({
  updateSupabaseSession: middlewareMocks.updateSupabaseSession,
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    middlewareMocks.updateSupabaseSession.mockResolvedValue(NextResponse.next());
  });

  it('redirects the legacy web import route to the single-upload route before auth handling', async () => {
    const request = new NextRequest(
      'https://tm-stats.com/log-game/import?source=manual',
    );

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://tm-stats.com/log-game/import-single?source=manual',
    );
    expect(middlewareMocks.updateSupabaseSession).not.toHaveBeenCalled();
  });
});
