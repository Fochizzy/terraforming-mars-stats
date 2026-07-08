import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // React Native-only sources consumed by the Expo app, not the Next.js web app.
    'native-app/**',
    'src/features/auth/native-auth-screen.tsx',
    'src/lib/supabase/native.ts',
  ]),
]);

export default eslintConfig;
