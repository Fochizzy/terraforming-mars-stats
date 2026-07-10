import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getLatestParticipantDeleteMigration() {
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
        'create or replace function public.can_delete_game',
      );
    });

  if (!migrationFileName) {
    throw new Error('Expected a can_delete_game migration in supabase/migrations.');
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

describe('game participant delete policy migration', () => {
  const migration = getLatestParticipantDeleteMigration();

  it('allows linked game participants to delete their completed game', () => {
    expect(migration).toContain(
      'create or replace function public.is_linked_game_participant',
    );
    expect(migration).toContain('p.linked_user_id = auth.uid()');
    expect(migration).toContain('public.is_linked_game_participant(g.id)');
    expect(migration).toContain('on public.games for delete to authenticated');
    expect(migration).toContain('using (public.can_delete_game(id))');
  });

  it('uses the same participant-aware permission for import evidence cleanup', () => {
    expect(migration).toContain(
      'create policy "linked participants delete import evidence objects"',
    );
    expect(migration).toContain("bucket_id = 'tm-import-evidence'");
    expect(migration).toContain('public.can_delete_game(g.id)');
  });
});
