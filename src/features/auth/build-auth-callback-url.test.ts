import { describe, expect, it } from 'vitest';
import { buildAuthCallbackUrl } from './build-auth-callback-url';

describe('buildAuthCallbackUrl', () => {
  it('routes magic links through the auth callback with a next param', () => {
    expect(
      buildAuthCallbackUrl('https://terraforming-mars-stats.workers.dev', '/profile'),
    ).toBe(
      'https://terraforming-mars-stats.workers.dev/auth/callback?next=%2Fprofile',
    );
  });

  it('falls back to /profile when the requested next path is unsafe', () => {
    expect(
      buildAuthCallbackUrl('https://terraforming-mars-stats.workers.dev', 'https://evil.test'),
    ).toBe(
      'https://terraforming-mars-stats.workers.dev/auth/callback?next=%2Fprofile',
    );
  });
});
