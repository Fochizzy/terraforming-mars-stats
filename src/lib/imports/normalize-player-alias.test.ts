import { describe, expect, it } from 'vitest';
import { normalizePlayerAlias } from './normalize-player-alias';

describe('normalizePlayerAlias', () => {
  it('normalizes imported player names for alias matching', () => {
    expect(normalizePlayerAlias('  Dr. Friday-Mars!!  ')).toBe('dr friday mars');
  });
});
