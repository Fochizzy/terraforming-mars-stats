import { z } from 'zod';

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeUsername(input: string) {
  return collapseWhitespace(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must include at least one letter.')
  .regex(/\d/, 'Password must include at least one number.');

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits.');

export const signupFullNameSchema = z
  .string()
  .transform(collapseWhitespace)
  .refine((value) => value.split(' ').filter(Boolean).length >= 2, {
    message: 'Enter a full name in First Name Last Name format.',
  });

export const signupUsernameSchema = z
  .string()
  .transform(normalizeUsername)
  .refine((value) => value.length >= 3, {
    message: 'Username must contain at least 3 letters or numbers.',
  })
  .refine((value) => value.length <= 32, {
    message: 'Username must be 32 characters or fewer.',
  });

export function buildSyntheticAuthEmail(username: string) {
  return `${normalizeUsername(username)}@users.tmstats.local`;
}

export function resolveSignInEmail(identifier: string) {
  const trimmedIdentifier = identifier.trim();

  if (trimmedIdentifier.includes('@')) {
    return emailSchema.parse(trimmedIdentifier);
  }

  const normalizedUsername = signupUsernameSchema.parse(trimmedIdentifier);
  return buildSyntheticAuthEmail(normalizedUsername);
}
