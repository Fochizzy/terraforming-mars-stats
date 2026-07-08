import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getLatestReplaceGameLogEventsMigration() {
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

      return fileContents.includes('create or replace function public.replace_game_log_events');
    });

  if (!migrationFileName) {
    throw new Error('Expected a replace_game_log_events migration in supabase/migrations.');
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

describe('replace_game_log_events migration', () => {
  it('uses the named unique constraint in its conflict target', () => {
    const migration = getLatestReplaceGameLogEventsMigration();

    expect(migration).toContain(
      'on conflict on constraint game_log_events_import_order_unique do update',
    );
  });
});
