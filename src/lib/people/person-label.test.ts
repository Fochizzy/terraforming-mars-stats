import { describe, expect, it } from 'vitest';
import { firstNameOf, personLabel } from './person-label';

describe('firstNameOf', () => {
  it('returns the first whitespace-delimited token', () => {
    expect(firstNameOf('Ada Lovelace')).toBe('Ada');
    expect(firstNameOf('  Grace   Hopper ')).toBe('Grace');
  });

  it('returns a single-word name unchanged', () => {
    expect(firstNameOf('Zoe')).toBe('Zoe');
  });

  it('returns empty string for missing names', () => {
    expect(firstNameOf('')).toBe('');
    expect(firstNameOf('   ')).toBe('');
    expect(firstNameOf(null)).toBe('');
    expect(firstNameOf(undefined)).toBe('');
  });
});

describe('personLabel', () => {
  it('prefers the username when present', () => {
    expect(personLabel({ username: 'astro_ada', displayName: 'Ada Lovelace' })).toBe(
      'astro_ada',
    );
  });

  it('trims a padded username', () => {
    expect(personLabel({ username: '  astro_ada  ', displayName: 'Ada' })).toBe(
      'astro_ada',
    );
  });

  it('falls back to the first name when there is no username', () => {
    expect(personLabel({ username: null, displayName: 'Grace Hopper' })).toBe(
      'Grace',
    );
    expect(personLabel({ username: '', displayName: 'Grace Hopper' })).toBe(
      'Grace',
    );
    expect(personLabel({ displayName: 'Grace Hopper' })).toBe('Grace');
  });

  it('returns empty string when neither is available', () => {
    expect(personLabel({})).toBe('');
    expect(personLabel({ username: '  ', displayName: '  ' })).toBe('');
  });
});
