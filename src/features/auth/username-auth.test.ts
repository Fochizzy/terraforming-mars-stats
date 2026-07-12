import { describe, expect, it } from 'vitest';
import {
  authEmailSchema,
  normalizeAuthEmail,
  normalizeUsername,
  pinSchema,
  signupFullNameSchema,
  usernameHandleSchema,
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

  it('requires both a first and last name for signup', () => {
    expect(() => signupFullNameSchema.parse('James')).toThrow(
      /first and last name/i,
    );
    expect(() => signupFullNameSchema.parse('Revloki')).toThrow(
      /first and last name/i,
    );
    // A second token with no letters is not a last name.
    expect(() => signupFullNameSchema.parse('James .')).toThrow(
      /first and last name/i,
    );
  });

  it('accepts a first and last name for signup', () => {
    expect(signupFullNameSchema.parse('  James   Hodnett  ')).toBe(
      'James Hodnett',
    );
  });

  it('accepts a single-word username handle and preserves its casing', () => {
    expect(usernameHandleSchema.parse('  Revloki  ')).toBe('Revloki');
  });

  it('rejects a username handle with no letters or numbers', () => {
    expect(() => usernameHandleSchema.parse('!!!')).toThrow(
      /letters or numbers/i,
    );
  });
});
