-- Deterministic fixtures for the executable capture-v2 integration tests.
-- Committed once by the runner; each test_*.sql wraps its own mutations in a
-- transaction that rolls back, so this seed is stable across test files.

insert into auth.users (id) values
  ('22222222-2222-2222-2222-222222222221'),  -- editor of group 1
  ('22222222-2222-2222-2222-222222222222')   -- non-member
on conflict do nothing;

insert into public.groups (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Group One'),
  ('11111111-1111-1111-1111-111111111112', 'Group Two')
on conflict do nothing;

insert into public.group_members (group_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'editor')
on conflict do nothing;

insert into public.players (id, group_id, display_name) values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Ada'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Bruno'),
  ('33333333-3333-3333-3333-33333333333a', '11111111-1111-1111-1111-111111111112', 'Outsider')
on conflict do nothing;

insert into public.maps (id, code) values
  ('99999999-9999-9999-9999-999999999991', 'tharsis')
on conflict do nothing;

insert into public.games (id, group_id, map_id, status, created_at) values
  ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991', 'finalized', now()),
  ('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', null, 'finalized', now() - interval '30 days'),
  ('66666666-6666-6666-6666-66666666666a', '11111111-1111-1111-1111-111111111112', null, 'finalized', now())
on conflict do nothing;

insert into public.game_players (id, game_id, player_id) values
  ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331'),
  ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333332'),
  ('77777777-7777-7777-7777-77777777777a', '66666666-6666-6666-6666-66666666666a', '33333333-3333-3333-3333-33333333333a')
on conflict do nothing;

insert into public.game_log_imports (id, game_id, raw_log_text) values
  ('88888888-8888-8888-8888-888888888881', '66666666-6666-6666-6666-666666666661', 'Generation 1'),
  ('88888888-8888-8888-8888-888888888882', '66666666-6666-6666-6666-666666666662', 'Generation 1')
on conflict do nothing;

-- A historical owner-confirmed absence row that must never be rewritten.
insert into public.game_expansion_facts (
  game_id, venus_next_state, colonies_state, detection_provenance,
  backfill_version, backfilled_at, final_venus_scale
) values (
  '66666666-6666-6666-6666-666666666662',
  'historical_parser_verified_owner_confirmed_absent',
  'historical_parser_verified_owner_confirmed_absent',
  '{"backfill":"phase-04-step-03b-owner-confirmed-absence-v1"}'::jsonb,
  'phase-04-step-03b-owner-confirmed-absence-v1',
  now() - interval '30 days',
  null
)
on conflict (game_id) do nothing;
