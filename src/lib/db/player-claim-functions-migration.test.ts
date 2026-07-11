import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getLatestMigrationContaining(signature: string) {
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

      return fileContents.includes(signature);
    });

  if (!migrationFileName) {
    throw new Error(`Expected a migration containing "${signature}".`);
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

function getLatestClaimPlayerProfileMigration() {
  return getLatestMigrationContaining(
    'create or replace function public.claim_player_profile(',
  );
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

describe('claim_player_profiles_by_name migration', () => {
  it('claims every exact name match and joins each group in one call', () => {
    const migration = getLatestMigrationContaining(
      'create or replace function public.claim_player_profiles_by_name(',
    );

    expect(migration).toContain(
      'normalize_claim_player_name(p.display_name) = v_normalized_full_name',
    );
    expect(migration).toContain('set linked_user_id = v_user_id');
    expect(migration).toContain(
      'on conflict on constraint group_members_group_id_user_id_key do nothing',
    );
  });
});
