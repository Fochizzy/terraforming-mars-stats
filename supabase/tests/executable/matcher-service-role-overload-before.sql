-- BEFORE half of the service-role matcher overload proof
-- (20260723130000_add_service_role_import_name_matcher_overload.sql).
--
-- Runs immediately BEFORE that migration is applied. It does two things:
--
--   1. Installs the probe fixtures the AFTER half measures against. Every value
--      is a MADE-UP TOKEN. No personal name, real username, alias text, or other
--      identifying value appears here, in the AFTER half, or in any output
--      either produces.
--   2. Pins the deployed TWO-argument function's identity — body hash, ACL,
--      comment, volatility, security attributes, and settings — so the AFTER
--      half can prove the expand migration left it byte-identical. The expand
--      must not touch it: it is the rollback target and the currently deployed
--      Worker still calls it.
--
-- TOKEN CHOICE IS CONSTRAINED, not arbitrary. The probe names must not contain
-- 'sentinel': assertions.sql K3/K4/K6/K8 use `ilike '%sentinel%'` as their own
-- leak detector over public.players.display_name and normalized_display_name,
-- so a probe player named with that token would trip a privacy assertion that is
-- doing its job. The tokens must likewise avoid 'aliasowner ', 'profileowner',
-- 'legacyfull', 'legacyrow' and 'legacyusernameonly', which
-- source-bound-import-identity-linked-alias-after.sql matches on. 'Matchprobe*'
-- collides with none of them. Check this list before renaming these fixtures.

create schema if not exists harness;

-- ---------------------------------------------------------------------------
-- Probe fixtures
-- ---------------------------------------------------------------------------
--
-- Group 22222222 and user 11111111 come from seed.sql; that user is the only
-- member of that group. A SECOND group with its OWN member is added here so a
-- "member, but of a different group" rejection can be distinguished from a
-- blanket rejection: the same user must be accepted for their own group.

insert into auth.users (id, email)
values ('b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0', 'matchprobe-other-member@example.invalid');

insert into public.groups (id, name)
values ('2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b', 'Matchprobe Second Group');

insert into public.group_members (group_id, user_id, role)
values (
  '2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b',
  'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
  'editor'
);

-- The linked account behind probe player 1. It exists so `is_linked` is not
-- constant across the probe set — otherwise the AFTER half's equivalence check
-- would compare a column that is `false` everywhere and could not detect a
-- difference in it. This account is deliberately NOT a member of group A.
insert into public.user_profiles (user_id, username, full_name)
values (
  'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
  'matchprobeuser-otherlinked',
  'Matchprobeuser Otherlinked'
)
on conflict (user_id) do update set username = excluded.username;

-- One probe player per disclosed coarse class, in the group the accepted caller
-- belongs to. Names are chosen so each probe has exactly one highest-ranked
-- candidate and none collides with the fixtures other harness files install.
insert into public.players (id, group_id, display_name, full_name, linked_user_id)
values
  -- rank 400, display_name exact -> coarse 'exact' / 2; linked, so is_linked true
  ('5e401001-5e40-4001-8001-000000000001',
   '22222222-2222-4222-8222-222222222222',
   'Matchprobealpha Displayprobe', null,
   'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0'),
  -- rank 350, full_name exact -> coarse 'exact' / 2
  ('5e402002-5e40-4002-8002-000000000002',
   '22222222-2222-4222-8222-222222222222',
   'Guest Matchprobesecond', 'Matchprobebravo Fullprobe', null),
  -- rank 250, alias exact -> coarse 'exact' / 2
  ('5e403003-5e40-4003-8003-000000000003',
   '22222222-2222-4222-8222-222222222222',
   'Guest Matchprobethird', null, null),
  -- rank 200, display_name prefix -> coarse 'partial' / 1
  ('5e404004-5e40-4004-8004-000000000004',
   '22222222-2222-4222-8222-222222222222',
   'Matchprobedelta Longsurname', null, null),
  -- Belongs to the SECOND group only. It must never appear in the accepted
  -- caller's pool, and it is what makes the second group's own-group probe
  -- return a row rather than nothing.
  ('5e405005-5e40-4005-8005-000000000005',
   '2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b',
   'Matchprobeecho Otherprobe', null, null);

insert into public.player_import_aliases (
  group_id, player_id, source_type, identity_mode, alias_text, normalized_alias
) values (
  '22222222-2222-4222-8222-222222222222',
  '5e403003-5e40-4003-8003-000000000003',
  'game_log',
  'personal_name',
  'Matchprobecharlie Aliasprobe',
  public.normalize_claim_player_name('Matchprobecharlie Aliasprobe')
);

-- ---------------------------------------------------------------------------
-- Pin the two-argument function's identity
-- ---------------------------------------------------------------------------

drop table if exists harness.matcher_two_arg_snapshot;

create table harness.matcher_two_arg_snapshot as
select
  p.oid                                   as fn_oid,
  pg_catalog.md5(p.prosrc)                as body_md5,
  coalesce(p.proacl::text, '<default>')   as acl,
  p.prosecdef                             as security_definer,
  p.provolatile                           as volatility,
  coalesce(p.proconfig::text, '<none>')   as settings,
  p.prorettype                            as return_type,
  coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<none>') as fn_comment,
  (
    select pg_catalog.count(*)
    from pg_catalog.pg_proc q
    join pg_catalog.pg_namespace m on m.oid = q.pronamespace
    where m.nspname = 'public' and q.proname = 'match_import_player_names'
  )                                       as overload_count
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'match_import_player_names'
  and p.oid = 'public.match_import_player_names(uuid,text[])'::regprocedure;

do $$
declare
  v_rows integer;
  v_overloads integer;
begin
  select pg_catalog.count(*) into v_rows from harness.matcher_two_arg_snapshot;
  if v_rows <> 1 then
    raise exception
      'BEFORE FAIL: expected exactly one two-argument matcher to pin, found %',
      v_rows;
  end if;

  select overload_count into v_overloads from harness.matcher_two_arg_snapshot;
  if v_overloads <> 1 then
    raise exception
      'BEFORE FAIL: expected exactly ONE overload before the expand, found % — the AFTER half''s "expand added exactly one" assertion would be meaningless',
      v_overloads;
  end if;

  if to_regprocedure('public.match_import_player_names(uuid,uuid,text[])') is not null then
    raise exception
      'BEFORE FAIL: the three-argument overload already exists before the expand migration ran';
  end if;
end $$;
