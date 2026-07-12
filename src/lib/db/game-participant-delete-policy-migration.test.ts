import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function findLatestMigrationContaining(marker: string) {
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

      return fileContents.includes(marker);
    });

  if (!migrationFileName) {
    throw new Error(`Expected a migration containing "${marker}" in supabase/migrations.`);
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

describe('game participant delete policy migration', () => {
  const deletePolicyMigration = findLatestMigrationContaining(
    'on public.games for delete to authenticated',
  );

  it('allows linked game participants to delete their completed game', () => {
    expect(deletePolicyMigration).toContain(
      'create or replace function public.is_linked_game_participant',
    );
    expect(deletePolicyMigration).toContain('p.linked_user_id = auth.uid()');
    expect(deletePolicyMigration).toContain(
      'public.is_linked_game_participant(g.id)',
    );
    expect(deletePolicyMigration).toContain(
      'on public.games for delete to authenticated',
    );
    expect(deletePolicyMigration).toContain('using (public.can_delete_game(id))');
  });

  it('uses the same participant-aware permission for import evidence cleanup', () => {
    expect(deletePolicyMigration).toContain(
      'create policy "linked participants delete import evidence objects"',
    );
    expect(deletePolicyMigration).toContain("bucket_id = 'tm-import-evidence'");
    expect(deletePolicyMigration).toContain('public.can_delete_game(g.id)');
  });
});

describe('game creator delete policy migration', () => {
  const canDeleteMigration = findLatestMigrationContaining(
    'create or replace function public.can_delete_game',
  );

  it('lets a game creator read and delete their own game regardless of membership', () => {
    // A draft stranded in a group the creator no longer belongs to (and with no
    // game_players yet) was previously undeletable, so deleteSavedGame() removed
    // 0 rows and the games record stayed in Supabase.
    expect(canDeleteMigration).toContain(
      'create or replace function public.can_delete_game',
    );
    expect(canDeleteMigration).toContain(
      'create or replace function public.can_read_game',
    );
    expect(canDeleteMigration).toContain('g.created_by_user_id = auth.uid()');
  });
});
