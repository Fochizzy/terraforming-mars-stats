import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260714160000_canonicalize_usernames_and_elo.sql',
);
const migration = readFileSync(migrationPath, 'utf8').toLowerCase();
const eloFunction = migration.slice(
  migration.indexOf('create or replace function public.get_elo_leaderboard'),
  migration.indexOf(
    'revoke all on function public.get_elo_leaderboard',
  ),
);

describe('canonical username Elo migration', () => {
  it('rates one identity per username and safely adopts a legacy row label', () => {
    expect(eloFunction).toContain('identity_key text primary key');
    expect(eloFunction).toContain('username_by_legacy_name');
    expect(eloFunction).toContain(
      'having count(distinct lower(canonical_username)) = 1',
    );
    expect(eloFunction).toContain("'username:' || lower(coalesce(");
  });

  it('does not use the private full-name field to calculate or label Elo', () => {
    expect(eloFunction).not.toContain('full_name');
  });
});
