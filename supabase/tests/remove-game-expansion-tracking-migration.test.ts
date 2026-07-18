import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260718041532_remove_game_expansion_tracking.sql',
  ),
  'utf8',
);

describe('game expansion tracking removal migration', () => {
  it('removes the gameplay dimension without using cascade', () => {
    expect(migration).toContain('drop table if exists public.game_expansions;');
    expect(migration).toContain(
      'drop table if exists public.group_default_expansions;',
    );
    expect(migration).toContain('drop table if exists public.expansions;');
    expect(migration).not.toMatch(/drop table[^;]+cascade/i);
  });

  it('removes expansion-dependent interactions before dropping the tables', () => {
    const viewReplacement = migration.indexOf(
      'create or replace view analytics.group_interactions',
    );
    const firstDrop = migration.indexOf(
      'drop table if exists public.game_expansions',
    );

    expect(viewReplacement).toBeGreaterThanOrEqual(0);
    expect(firstDrop).toBeGreaterThan(viewReplacement);
    expect(migration).toContain("'corporation_prelude_pair'::text");
    expect(migration).not.toContain("'map_expansion_mix'::text");
  });

  it('preserves production multi-corporation pairings when that table exists', () => {
    expect(migration).toContain(
      "to_regclass('public.game_player_corporations') is null",
    );
    expect(migration).toContain('from public.game_player_corporations gpc');
    expect(migration).toContain(
      'analytics.game_player_corporation_selections',
    );
  });
});
