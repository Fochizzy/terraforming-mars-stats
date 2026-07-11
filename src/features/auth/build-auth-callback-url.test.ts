import { describe, expect, it } from 'vitest';
import {
  buildAuthCallbackUrl,
  buildAuthCompletePath,
  buildAuthResetPinPath,
} from './build-auth-callback-url';

describe('buildAuthCallbackUrl', () => {
  it('builds an auth-complete path from the requested next path', () => {
    expect(buildAuthCompletePath('/profile')).toBe('/auth/complete?next=%2Fprofile');
  });

  it('routes magic links through the auth callback with a next param', () => {
    expect(
      buildAuthCallbackUrl('https://tm-stats.com', '/log-game/import'),
    ).toBe(
      'https://tm-stats.com/auth/callback?next=%2Flog-game%2Fimport',
    );
  });

  it('falls back to /log-game/import-single when the requested next path is unsafe', () => {
    expect(
      buildAuthCallbackUrl('https://tm-stats.com', 'https://evil.test'),
    ).toBe(
      'https://tm-stats.com/auth/callback?next=%2Flog-game%2Fimport-single',
    );
  });

  it('builds a reset-pin path from the requested next path', () => {
    expect(buildAuthResetPinPath('/profile')).toBe('/auth/reset-pin?next=%2Fprofile');
  });
});
