import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import { completeAuthSession } from '@/features/auth/complete-auth-session';

vi.mock('@/features/auth/complete-auth-session', () => ({
  completeAuthSession: vi.fn(),
}));

describe('auth complete route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to the path chosen by auth completion', async () => {
    vi.mocked(completeAuthSession).mockResolvedValue({
      redirectPath: '/claim-player?next=%2Fprofile',
    });

    const response = await GET(
      new Request('https://tm-stats.com/auth/complete?next=%2Fprofile'),
    );

    expect(completeAuthSession).toHaveBeenCalledWith({
      nextPath: '/profile',
    });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://tm-stats.com/claim-player?next=%2Fprofile',
    );
  });
});
