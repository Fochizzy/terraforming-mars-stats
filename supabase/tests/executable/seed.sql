-- Minimal prerequisites for the executable constraint + alias tests.
insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 't@example.com'),
  ('99999999-9999-4999-8999-999999999999', 'outsider@example.com');

insert into public.groups (id, name)
values ('22222222-2222-4222-8222-222222222222', 'Test Group');

-- The first user is a group member (an editor for can_edit_game); the second
-- deliberately is not, to exercise the negative authorization paths.
insert into public.group_members (group_id, user_id, role)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'editor'
);

insert into public.games (
  id, group_id, played_on, player_count, generation_count,
  created_by_user_id, updated_by_user_id
) values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  current_date, 2, 10,
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
);

insert into public.game_log_imports (id, game_id, created_by_user_id, raw_log_text)
values (
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'raw log'
);

insert into public.players (id, group_id, display_name)
values (
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  'Guest 55555555'
);

-- The exact canonical objective rows the alias migration guards on.
insert into public.awards (id, code, name) values
  ('02d084b4-3856-444d-80cb-71b6fc800ef7', 'a_engineer', 'A. Engineer'),
  ('21fc9222-6539-4aaa-974e-11a95d42755e', 'a_manufacturer', 'A. Manufacturer'),
  ('05455a73-ab74-4d08-81e9-c8f8cb9229e0', 'a_zoologist', 'A. Zoologist'),
  ('ccb8a36c-c4fb-4cb6-a989-313880892879', 't_politician', 'T. Politician');

insert into public.milestones (id, code, name) values
  ('36eff4af-3a88-4fea-80cd-20f2180baf3c', 't_collector', 'T. Collector'),
  ('b60dc45b-f0c9-4107-a0be-7292fbeb58ed', 'v_electrician', 'V. Electrician'),
  ('4ef30867-fd6d-4560-bf48-6ed740d69916', 'v_spacefarer', 'V. Spacefarer');

-- A pre-existing unrelated alias, to prove rollback does not touch it.
insert into public.domain_text_aliases (
  entity_type, entity_id, alias_text, normalized_alias_text, source, occurrence_count
) values (
  'award', '02d084b4-3856-444d-80cb-71b6fc800ef7', 'Unrelated Existing Alias',
  public.normalize_ocr_domain_text('Unrelated Existing Alias'), 'confirmed_ocr', 3
);
