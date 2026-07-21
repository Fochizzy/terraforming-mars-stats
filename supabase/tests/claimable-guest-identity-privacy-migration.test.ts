import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql',
  ),
  'utf8',
);

describe('claimable guest identity and privacy migration', () => {
  it('stores username and personal-name evidence structurally and privately', () => {
    expect(migration).toContain('create table public.player_private_identities');
    expect(migration).toContain("identity_mode in ('username', 'personal_name')");
    expect(migration).toContain('guest_username text');
    expect(migration).toContain('guest_first_name text');
    expect(migration).toContain('guest_last_name text');
    expect(migration).toContain('normalized_guest_username text');
    expect(migration).toContain('normalized_personal_name text');
    expect(migration).toContain(
      "(identity_mode = 'username' and guest_username is not null)",
    );
    expect(migration).toContain(
      "(identity_mode = 'personal_name' and guest_first_name is not null and guest_last_name is not null)",
    );
    expect(migration).toContain(
      'alter table public.player_private_identities enable row level security',
    );
    expect(migration).toContain('public.is_group_member(group_id)');
    expect(migration).toContain('p.linked_user_id is null');
  });

  it('prevents normalized username duplicates without conflating personal names', () => {
    expect(migration).toContain(
      'create unique index player_private_identities_group_username_idx',
    );
    expect(migration).toContain(
      'on public.player_private_identities (group_id, normalized_guest_username)',
    );
    expect(migration).toContain(
      'create index player_private_identities_group_personal_name_idx',
    );
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('v_display_name := format(');
    expect(migration).not.toContain(
      'drop index if exists public.players_group_id_normalized_display_name_idx',
    );
    expect(migration).toContain(
      "raise exception 'Multiple guest identities match. Select one explicitly.'",
    );
    expect(migration).toContain(
      "raise exception 'An existing guest identity matches. Confirm that player before continuing.'",
    );
    expect(migration).toContain(
      "raise exception 'A legacy guest identity matches. Confirm that player before continuing.'",
    );
  });

  it('preserves stable player IDs and an explicit guest reuse or creation decision', () => {
    expect(migration).toContain(
      'create or replace function public.resolve_import_guest_identity',
    );
    expect(migration).toContain('p_selected_player_id uuid default null');
    expect(migration).toContain('p_create_new boolean default false');
    expect(migration).toContain("'existing_unlinked_guest'::text");
    expect(migration).toContain("'newly_created_unlinked_guest'::text");
    expect(migration).toContain(
      'insert into public.player_import_aliases',
    );
    expect(migration).not.toContain('insert into auth.users');
  });

  it('centralizes claimed-player presentation on username with a neutral fallback', () => {
    expect(migration).toContain(
      'create or replace function private.resolve_public_player_name',
    );
    expect(migration).toContain("nullif(btrim(up.username), '')");
    expect(migration).toContain("coalesce(nullif(btrim(up.username), ''), 'Player')");
    expect(migration).not.toMatch(
      /linked_user_id is not null[\s\S]{0,300}(full_name|first_name|last_name)/,
    );
    expect(migration).toContain(
      'create or replace function public.get_public_player_names',
    );
    expect(migration).toContain('with (security_invoker = true)');
    expect(migration).toContain(
      'coalesce(private.resolve_public_player_name(p.id)',
    );
  });

  it('removes direct personal-name exposure from analytics, RPCs, and aliases', () => {
    expect(migration).toContain(
      'create or replace view analytics.player_game_results',
    );
    expect(migration).toContain(
      'create or replace function private.get_final_terraforming_action_stats',
    );
    expect(migration).toContain(
      'create policy "authenticated read non-player domain aliases"',
    );
    expect(migration).toContain("using (entity_type <> 'player')");
    expect(migration).toContain(
      'create or replace function public.get_ocr_domain_dictionary',
    );
    expect(migration).toContain(
      'revoke execute on function public.get_ocr_domain_dictionary(uuid) from anon',
    );
  });

  it('never revokes execute on the saved-player claim RPCs', () => {
    // Inverted deliberately. This file used to revoke EXECUTE on both functions
    // from public, anon and authenticated, and these assertions used to REQUIRE
    // that. Production restored the grant afterwards (ledger 20260720221937
    // grant_authenticated_claim_rpc_execute, carried here as repo file
    // 20260720190000), so replaying the revoke leaves the claim RPCs unreachable
    // for every signed-in caller and diverges the clean-baseline replay from
    // production. Ledger 20260721201734 harden_claim_rpc_privacy narrowed what
    // these functions disclose and accept, never who may call them, so it does
    // not make a revoke safe. Pinned so the block cannot silently return.
    for (const target of [
      'public.list_claimable_player_profiles()',
      'public.claim_player_profile(uuid)',
    ]) {
      for (const grantee of ['public', 'anon', 'authenticated']) {
        expect(
          migration,
          `20260718050924 must not revoke execute on ${target} from ${grantee}`,
        ).not.toContain(
          `revoke execute on function ${target} from ${grantee}`,
        );
      }
    }
    // The grant those RPCs actually depend on lives in its own migration.
    expect(migration).not.toContain(
      'grant execute on function public.list_claimable_player_profiles()',
    );
  });

  it('stays deliberately non-idempotent so an accidental replay aborts', () => {
    // The duplicate-object errors are this file's safeguard: its content is
    // already applied to production (ledger 20260718181600) under a different
    // version, so a `supabase db push` would try to run it again. Un-guarded it
    // aborts on 42P07; guarded it would SUCCEED, having already created the
    // Data-API-exposed public.player_private_identities table that migration
    // 20260718212339 moved into the private schema.
    for (const statement of [
      'create unique index player_import_aliases_legacy_unique_idx',
      'create unique index player_import_aliases_username_unique_idx',
      'create unique index player_import_aliases_personal_name_unique_idx',
      'create policy "authenticated read non-player domain aliases"',
    ]) {
      expect(migration, `${statement} must remain unguarded`).toContain(
        statement,
      );
    }
    expect(migration).not.toContain('create unique index if not exists');
    expect(migration).not.toContain('create index if not exists');
    expect(migration).not.toContain('create table if not exists');
    expect(migration).not.toContain('create policy if not exists');
    expect(migration).not.toContain(
      'drop policy if exists "authenticated read non-player domain aliases"',
    );
  });

  it('guards restored security-definer correction writes with game authorization', () => {
    expect(migration).toContain(
      'create or replace function public.confirm_game_log_ocr_correction',
    );
    expect(migration).toContain('and public.can_edit_game(gli.game_id)');
    expect(migration).toContain(
      'revoke execute on function public.confirm_game_log_ocr_correction(uuid, uuid, text, boolean) from anon',
    );
  });
});
