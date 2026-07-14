import { describe, expect, it } from 'vitest';
import { isProtectedPath } from './route-guards';

describe('isProtectedPath', () => {
  it('protects app routes and leaves auth routes public', () => {
    expect(isProtectedPath('/claim-player')).toBe(true);
    expect(isProtectedPath('/profile')).toBe(true);
    expect(isProtectedPath('/group')).toBe(true);
    expect(isProtectedPath('/log-game')).toBe(true);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/import-instructions')).toBe(false);
    expect(isProtectedPath('/')).toBe(false);
  });
});
