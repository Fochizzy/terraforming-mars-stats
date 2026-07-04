import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE: z
    .string()
    .min(1)
    .default('tm-import-evidence'),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE:
      process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE,
  });
}
