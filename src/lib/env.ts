import { z } from 'zod';

function normalizeEnvString(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.replace(/^\uFEFF/, '').trim();

  return normalized.length > 0 ? normalized : undefined;
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE: z
    .string()
    .min(1)
    .default('tm-import-evidence'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
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
      normalizeEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
      bundledPublicEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      normalizeEnvString(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
      bundledPublicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE:
      normalizeEnvString(process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE),
    SUPABASE_SERVICE_ROLE_KEY: normalizeEnvString(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  });
}
