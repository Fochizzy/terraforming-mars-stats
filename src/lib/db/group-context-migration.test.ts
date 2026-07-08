import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getLatestPlayedGroupSyncMigration() {
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
        'create or replace function public.sync_current_user_played_group_memberships',
      );
    });

  if (!migrationFileName) {
    throw new Error(
      'Expected a sync_current_user_played_group_memberships migration in supabase/migrations.',
    );
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

describe('sync_current_user_played_group_memberships migration', () => {
  it('joins the signed-in user to every group with a linked played profile', () => {
    const migration = getLatestPlayedGroupSyncMigration();

    expect(migration).toContain(
      'create or replace function public.sync_current_user_played_group_memberships',
    );
    expect(migration).toContain('p.linked_user_id = v_user_id');
    expect(migration).toContain(
      'on conflict on constraint group_members_group_id_user_id_key do nothing',
    );
    expect(migration).toContain('order by gm.created_at asc, g.name asc');
  });
});
