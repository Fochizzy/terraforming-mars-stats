import { describe, expect, it } from 'vitest';
import { isProtectedPath } from './route-guards';

describe('isProtectedPath', () => {
  it('protects app routes and leaves auth routes public', () => {
    expect(isProtectedPath('/profile')).toBe(true);
    expect(isProtectedPath('/group')).toBe(true);
    expect(isProtectedPath('/log-game')).toBe(true);
    expect(isProtectedPath('/cards')).toBe(true);
    expect(isProtectedPath('/cards/example-card')).toBe(true);
    expect(isProtectedPath('/glossary')).toBe(true);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/')).toBe(false);
  });
});
