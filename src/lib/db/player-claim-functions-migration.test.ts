import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getLatestClaimPlayerProfileMigration() {
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

      return fileContents.includes(
        'create or replace function public.claim_player_profile',
      );
    });

  if (!migrationFileName) {
    throw new Error('Expected a claim_player_profile migration in supabase/migrations.');
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

describe('claim_player_profile migration', () => {
  it('uses the named group-members unique constraint in its conflict target', () => {
    const migration = getLatestClaimPlayerProfileMigration();

    expect(migration).toContain(
      'on conflict on constraint group_members_group_id_user_id_key do nothing',
    );
    expect(migration).not.toContain('on conflict (group_id, user_id) do nothing');
  });
});
