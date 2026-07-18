import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260718185155_add_venus_colonies_import_facts.sql',
  ),
  'utf8',
);

describe('Venus Next and Colonies import facts migration', () => {
  it('stores explicit game-level detection state without collapsing missing values', () => {
    expect(migration).toContain('create table public.game_expansion_facts');
    expect(migration).toContain('venus_next_state text not null');
    expect(migration).toContain('colonies_state text not null');
    expect(migration).toContain("'confirmed_absent'");
    expect(migration).toContain("'incomplete_evidence'");
    expect(migration).toContain(
      "'historical_parser_verified_owner_confirmed_absent'",
    );
    expect(migration).toContain('final_venus_scale smallint');
    expect(migration).toContain('final_venus_scale is null');
    expect(migration).toContain('mod(final_venus_scale, 2) = 0');
    expect(migration).not.toContain('final_venus_scale smallint not null');
  });

  it('extends canonical event rows with typed identities and deterministic deduplication', () => {
    expect(migration).toContain('add column player_id uuid references public.players(id)');
    expect(migration).toContain('add column colony_id text');
    expect(migration).toContain('add column event_identity text');
    expect(migration).toContain('add column parameter_steps smallint');
    expect(migration).toContain('add column source_entity text');
    expect(migration).toContain('add column parser_version text');
    expect(migration).toContain('add column event_provenance text');
    expect(migration).toContain(
      'create unique index game_log_events_import_event_identity_unique',
    );
    expect(migration).toContain(
      'on public.game_log_events (game_log_import_id, event_identity)',
    );
  });

  it('keeps the replacement RPC atomic and preserves the new typed fields', () => {
    expect(migration).toContain(
      'create or replace function public.replace_game_log_events',
    );
    expect(migration).toContain('security invoker');
    expect(migration).toContain("nullif(event_item ->> 'player_id', '')::uuid");
    expect(migration).toContain("nullif(event_item ->> 'colony_id', '')");
    expect(migration).toContain('event_identity = excluded.event_identity');
    expect(migration).toContain('parameter_steps = excluded.parameter_steps');
    expect(migration).toContain('event_provenance = excluded.event_provenance');
  });

  it('enforces source association and RLS on the new exposed table', () => {
    expect(migration).toContain(
      'foreign key (game_id, source_game_log_import_id)',
    );
    expect(migration).toContain(
      'on delete set null (source_game_log_import_id)',
    );
    expect(migration).toContain(
      'alter table public.game_expansion_facts enable row level security',
    );
    expect(migration).toContain('using (public.can_read_game(game_id))');
    expect(migration).toContain('using (public.can_edit_game(game_id))');
    expect(migration).toContain('with check (public.can_edit_game(game_id))');
    expect(migration).toContain(
      'revoke all on table public.game_expansion_facts from anon',
    );
  });
});
