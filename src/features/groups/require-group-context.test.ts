import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

const groupContextMocks = vi.hoisted(() => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: groupContextMocks.getCurrentGroupContext,
}));

import { requireGroupContextOrRedirect } from './require-group-context';

describe('requireGroupContextOrRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to the claim page when the signed-in user is not in a group', async () => {
    groupContextMocks.getCurrentGroupContext.mockResolvedValue(null);

    await requireGroupContextOrRedirect();

    expect(navigationMocks.redirect).toHaveBeenCalledWith('/claim-player');
  });
});
