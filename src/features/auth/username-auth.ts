import { z } from 'zod';

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeAuthEmail(input: string) {
  return input.trim().toLowerCase();
}

export function normalizeUsername(input: string) {
  return collapseWhitespace(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const authEmailSchema = z
  .string()
  .transform(normalizeAuthEmail)
  .refine(
    (value) => z.email().safeParse(value).success,
    'Enter a valid email address.',
  );

export const pinSchema = z
  .string()
  .regex(/^\d{6}$/, 'PIN must be exactly 6 digits.');

export const signInPinSchema = pinSchema;

export const signupFullNameSchema = z
  .string()
  .transform(collapseWhitespace)
  .refine(
    (value) =>
      value.split(' ').filter((part) => /\p{L}/u.test(part)).length >= 2,
    {
      message: 'Enter both a first and last name (e.g. James Hodnett).',
    },
  );
