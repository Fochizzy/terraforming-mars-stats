import { describe, expect, it } from 'vitest';
import {
  buildSyntheticAuthEmail,
  normalizeUsername,
  pinSchema,
  signupFullNameSchema,
} from './username-auth';

describe('username auth helpers', () => {
  it('normalizes usernames to lowercase slugs', () => {
    expect(normalizeUsername('  Friday.Mars  ')).toBe('friday-mars');
  });

  it('builds deterministic synthetic auth emails', () => {
    expect(buildSyntheticAuthEmail('Friday Mars')).toBe(
      'friday-mars@users.tmstats.local',
    );
  });

  it('rejects non four-digit PIN values', () => {
    expect(() => pinSchema.parse('12a4')).toThrow(/4 digits/i);
  });

  it('requires first and last name for signup', () => {
    expect(() => signupFullNameSchema.parse('Friday')).toThrow(/full name/i);
  });
});
