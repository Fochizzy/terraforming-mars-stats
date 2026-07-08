import { describe, expect, it } from 'vitest';
import {
  authEmailSchema,
  normalizeAuthEmail,
  normalizeUsername,
  pinSchema,
  signupFullNameSchema,
} from './username-auth';

describe('username auth helpers', () => {
  it('normalizes usernames to lowercase slugs', () => {
    expect(normalizeUsername('  Friday.Mars  ')).toBe('friday-mars');
  });

  it('normalizes auth emails to trimmed lowercase values', () => {
    expect(normalizeAuthEmail('  Friday.Mars@Example.COM  ')).toBe(
      'friday.mars@example.com',
    );
  });

  it('validates real email addresses for auth', () => {
    expect(authEmailSchema.parse('  Friday.Mars@Example.COM  ')).toBe(
      'friday.mars@example.com',
    );
    expect(() => authEmailSchema.parse('friday-mars')).toThrow(/email/i);
  });

  it('rejects non six-digit PIN values', () => {
    expect(() => pinSchema.parse('12a456')).toThrow(/6 digits/i);
    expect(() => pinSchema.parse('1234')).toThrow(/6 digits/i);
  });

  it('requires first and last name for signup', () => {
    expect(() => signupFullNameSchema.parse('Friday')).toThrow(/full name/i);
  });
});
