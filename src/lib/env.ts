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

const bundledPublicEnv = {
  // Cloudflare Worker vars are available at runtime, but the client bundle needs
  // build-time values for browser-side Supabase initialization.
  NEXT_PUBLIC_SUPABASE_URL: 'https://qjtwgrjjwnqafbvkkfex.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    'sb_publishable_bOcMTVbweIlEwP5aQZIjKQ_1LbYrmHG',
} as const;

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      bundledPublicEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      bundledPublicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE:
      process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE,
  });
}
