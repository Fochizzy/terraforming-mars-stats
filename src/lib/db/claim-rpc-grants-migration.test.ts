import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getGrantMigration() {
  return readFileSync(
    path.resolve(
      process.cwd(),
      'supabase',
      'migrations',
      '20260720190000_grant_authenticated_claim_rpc_execute.sql',
    ),
    'utf8',
  );
}

describe('B-05 claim RPC grant migration', () => {
  it('grants authenticated EXECUTE on the exact list_claimable_player_profiles signature', () => {
    const migration = getGrantMigration();

    expect(migration).toContain(
      'grant execute on function public.list_claimable_player_profiles() to authenticated;',
    );
  });

  it('grants authenticated EXECUTE on the exact claim_player_profile(uuid) signature', () => {
    const migration = getGrantMigration();

    expect(migration).toContain(
      'grant execute on function public.claim_player_profile(uuid) to authenticated;',
    );
  });

  it('tightens claim_player_profiles_by_name to authenticated only, revoking public and anon', () => {
    const migration = getGrantMigration();

    expect(migration).toContain(
      'revoke all on function public.claim_player_profiles_by_name() from public;',
    );
    expect(migration).toContain(
      'revoke execute on function public.claim_player_profiles_by_name() from anon;',
    );
    expect(migration).toContain(
      'grant execute on function public.claim_player_profiles_by_name() to authenticated;',
    );
  });

  it('never grants any of the three functions to anon', () => {
    const migration = getGrantMigration();

    expect(migration).not.toMatch(
      /grant execute on function public\.(list_claimable_player_profiles|claim_player_profile|claim_player_profiles_by_name)\([^)]*\) to anon;/,
    );
  });

  it('does not touch table, RLS, or private-schema privileges', () => {
    const migration = getGrantMigration();

    expect(migration.toLowerCase()).not.toMatch(/\btable\b/);
    expect(migration.toLowerCase()).not.toContain('private.');
    expect(migration.toLowerCase()).not.toContain('row level security');
  });

  it('is additive only -- no drop, alter, or revoke of postgres/service_role', () => {
    const migration = getGrantMigration();

    expect(migration.toLowerCase()).not.toContain('drop ');
    expect(migration.toLowerCase()).not.toContain('alter ');
    expect(migration).not.toMatch(/from\s+(postgres|service_role)\s*;/i);
  });
});
