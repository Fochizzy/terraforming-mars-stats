import { z } from 'zod';

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

const personalNameComponentSchema = z
  .string()
  .transform(collapseWhitespace)
  .refine((value) => /\p{L}/u.test(value), {
    message: 'Enter a name using letters.',
  });

/**
 * Explicit first-and-last-name guest identity input. Both components are
 * required and validated separately, so a single unlabeled value can never
 * ambiguously mean either a username or a personal name (guest-identity
 * privacy contract). The values are private matching inputs for the guarded
 * guest RPC — they are never written to a public display field.
 */
export const guestPersonalNameSchema = z.object({
  firstName: personalNameComponentSchema,
  lastName: personalNameComponentSchema,
});

export type GuestPersonalNameInput = z.output<typeof guestPersonalNameSchema>;
