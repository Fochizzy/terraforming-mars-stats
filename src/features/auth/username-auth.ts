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

export const pinSchema = z
  .string()
  .regex(/^\d{6}$/, 'PIN must be exactly 6 digits.');

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
