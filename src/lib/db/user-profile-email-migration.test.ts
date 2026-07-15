import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getLatestUserProfileEmailMigration() {
  const migrationsDirectory = path.resolve(process.cwd(), 'supabase', 'migrations');
  const migrationFileName = readdirSync(migrationsDirectory)
    .filter((entry) => entry.endsWith('.sql'))
    .sort()
    .reverse()
    .find((entry) => {
      const fileContents = readFileSync(
        path.join(migrationsDirectory, entry),
        'utf8',
      );

      return fileContents.includes('add column if not exists email');
    });

  if (!migrationFileName) {
    throw new Error('Expected a migration that adds user_profiles.email.');
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

describe('user profile email migration', () => {
  it('stores auth email addresses for username login and PIN recovery lookup', () => {
    const migration = getLatestUserProfileEmailMigration();

    expect(migration).toContain('alter table public.user_profiles');
    expect(migration).toContain('add column if not exists email text');
    expect(migration).toContain('from auth.users au');
    expect(migration).toContain('up.user_id = au.id');
  });
});
