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
      'revoke execute on function public.list_claimable_player_profiles() from authenticated',
    );
    expect(migration).toContain(
      'revoke execute on function public.claim_player_profile(uuid) from authenticated',
    );
    expect(migration).toContain(
      'create or replace function public.get_ocr_domain_dictionary',
    );
    expect(migration).toContain(
      'revoke execute on function public.get_ocr_domain_dictionary(uuid) from anon',
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
