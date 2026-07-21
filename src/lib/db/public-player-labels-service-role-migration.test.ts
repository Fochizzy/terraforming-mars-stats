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

function getPublicPlayerNamesMigration() {
  return getLatestMigrationContaining(
    'create or replace function public.get_public_player_names(',
  );
}

describe('get_public_player_names service-role migration', () => {
  it('is a hardened SECURITY DEFINER with a fixed empty search path', () => {
    const migration = getPublicPlayerNamesMigration();

    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path to ''");
    expect(migration).toContain(
      'alter function public.get_public_player_names(uuid[]) owner to postgres',
    );
  });

  it('bounds and null-guards its uuid-array input by total element count', () => {
    const migration = getPublicPlayerNamesMigration();

    // array_length(arr, 1) only measures one dimension: a multidimensional
    // uuid[] can exceed 2000 total elements while its first dimension stays
    // at or below 2000, silently bypassing a dimensional bound. cardinality()
    // counts every element regardless of shape and must be used instead.
    expect(migration).toContain(
      "if coalesce(cardinality(p_player_ids), 0) > 2000 then",
    );
    expect(migration).not.toContain('array_length(p_player_ids');
    expect(migration).toContain("any(coalesce(p_player_ids, '{}'::uuid[]))");
  });

  it('locks EXECUTE to authenticated and service_role only', () => {
    const migration = getPublicPlayerNamesMigration();

    expect(migration).toContain(
      'revoke all on function public.get_public_player_names(uuid[]) from public',
    );
    expect(migration).toContain(
      'revoke all on function public.get_public_player_names(uuid[]) from anon',
    );
    expect(migration).toContain(
      'grant execute on function public.get_public_player_names(uuid[]) to authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.get_public_player_names(uuid[]) to service_role',
    );
  });

  it('preserves authenticated visibility by mirroring the players RLS predicate', () => {
    const migration = getPublicPlayerNamesMigration();

    expect(migration).toContain("auth.role() = 'service_role'");
    expect(migration).toContain('public.can_read_player(p.id)');
    expect(migration).toContain('public.is_group_member(p.group_id)');
  });

  it('returns only the approved public columns through the private resolver', () => {
    const migration = getPublicPlayerNamesMigration();

    expect(migration).toContain(
      'returns table(player_id uuid, public_name text, is_linked boolean)',
    );
    expect(migration).toContain('private.resolve_public_player_name(p.id)');
    // The label always comes from the resolver; the raw roster column that can
    // hold a guest's personal name must never be selected as output.
    expect(migration).not.toContain('p.display_name');
    expect(migration).not.toContain('full_name');
  });

  it('grants service_role no general private-schema access', () => {
    const migration = getPublicPlayerNamesMigration();

    expect(migration).not.toContain('grant usage on schema private');
    expect(migration).not.toContain(
      'grant execute on function private.resolve_public_player_name',
    );
  });
});
