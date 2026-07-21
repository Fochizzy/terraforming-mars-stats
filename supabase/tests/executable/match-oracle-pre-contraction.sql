-- Disclosed match classification BEFORE the gated contraction 20260720120000
-- (WS3 / Layer A). Runs against the modelled pre-image of production ledger
-- entry 20260720021300, i.e. the state production is in today.
--
-- It pins the oracle the contraction closes: a caller who may import into a
-- group can submit candidate strings and read back WHICH private field
-- matched, together with a score that maps 1:1 onto it. If this file ever
-- stops observing the fine-grained disclosure, the contraction has nothing
-- left to prove and the pairing must be re-derived rather than assumed.

-- Oracle probe fixtures. One player per disclosed reason, in the group the
-- test caller belongs to, with names chosen so each probe has exactly one
-- highest-ranked candidate.
insert into auth.users (id, email)
values ('0ac1e0a0-0ac1-40a0-80a0-0000000000a0', 'oracle-fixture@example.com');

insert into public.user_profiles (user_id, username, full_name)
values (
  '0ac1e0a0-0ac1-40a0-80a0-0000000000a0',
  'oraclefixture-username',
  'Oraclefixture Profileowner'
)
on conflict (user_id) do update set username = excluded.username;

insert into public.players (id, group_id, display_name, full_name, linked_user_id)
values
  ('0ac1e001-0ac1-4001-8001-000000000001',
   '22222222-2222-4222-8222-222222222222',
   'Oraclefixture Displaymatch', null, null),
  ('0ac1e002-0ac1-4002-8002-000000000002',
   '22222222-2222-4222-8222-222222222222',
   'Guest Oraclesecond', 'Oraclefixture Fullmatch', null),
  ('0ac1e003-0ac1-4003-8003-000000000003',
   '22222222-2222-4222-8222-222222222222',
   'Guest Oraclethird', null, '0ac1e0a0-0ac1-40a0-80a0-0000000000a0'),
  ('0ac1e004-0ac1-4004-8004-000000000004',
   '22222222-2222-4222-8222-222222222222',
   'Guest Oraclefourth', null, null);

insert into public.player_import_aliases (
  group_id, player_id, source_type, identity_mode, alias_text, normalized_alias
) values (
  '22222222-2222-4222-8222-222222222222',
  '0ac1e004-0ac1-4004-8004-000000000004',
  'game_log',
  'personal_name',
  'Oraclefixture Aliasmatch',
  public.normalize_claim_player_name('Oraclefixture Aliasmatch')
);

-- The deployed contract discloses the matched private field by name, and the
-- score restates it. Each probe is asserted on all three of reason, score,
-- and the selected player.
do $$
declare
  r record;
  probe text;
  expected_reason text;
  expected_score integer;
  expected_player uuid;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;

  for probe, expected_reason, expected_score, expected_player in
    select * from (values
      ('Oraclefixture Displaymatch', 'display_name_exact', 400,
       '0ac1e001-0ac1-4001-8001-000000000001'::uuid),
      ('Oraclefixture Fullmatch', 'full_name_exact', 350,
       '0ac1e002-0ac1-4002-8002-000000000002'::uuid),
      ('oraclefixture-username', 'username_exact', 300,
       '0ac1e003-0ac1-4003-8003-000000000003'::uuid),
      ('Oraclefixture Aliasmatch', 'alias_exact', 250,
       '0ac1e004-0ac1-4004-8004-000000000004'::uuid),
      ('Oraclefixture', 'display_name_partial', 200,
       '0ac1e001-0ac1-4001-8001-000000000001'::uuid)
    ) as p(probe, reason, score, player)
  loop
    select m.match_reason, m.match_score, m.player_id
    into r
    from public.match_import_player_names(
      '22222222-2222-4222-8222-222222222222', array[probe]
    ) m;

    if r.match_reason is distinct from expected_reason then
      raise exception 'PRE-CONTRACTION FAIL: probe % disclosed reason %, expected %',
        probe, coalesce(r.match_reason, '<no row>'), expected_reason;
    end if;
    if r.match_score is distinct from expected_score then
      raise exception 'PRE-CONTRACTION FAIL: probe % disclosed score %, expected %',
        probe, r.match_score, expected_score;
    end if;
    if r.player_id is distinct from expected_player then
      raise exception 'PRE-CONTRACTION FAIL: probe % resolved player %, expected %',
        probe, r.player_id, expected_player;
    end if;
  end loop;

  reset role;
end $$;

-- An unmatched name returns no row (the UI's "none" state), before and after.
do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select count(*) into n
  from public.match_import_player_names(
    '22222222-2222-4222-8222-222222222222', array['Zzzznomatchatall']
  );
  reset role;
  if n <> 0 then
    raise exception 'PRE-CONTRACTION FAIL: unmatched name returned % rows', n;
  end if;
end $$;

-- The predecessor is unbounded: a batch far larger than the contraction's
-- limit is accepted. This is the second half of the oracle (it was batch
-- queryable) and pins that the bound the contraction adds is genuinely new.
do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select count(*) into n
  from public.match_import_player_names(
    '22222222-2222-4222-8222-222222222222',
    (select array_agg('Probe ' || g::text) from generate_series(1, 65) as g)
  );
  reset role;
  if n <> 0 then
    raise exception 'PRE-CONTRACTION FAIL: unbounded probe batch matched % rows', n;
  end if;
exception
  when sqlstate '22023' then
    raise exception 'PRE-CONTRACTION FAIL: predecessor already bounds candidate input';
end $$;

-- Authorization is unchanged by the contraction, so pin it on both sides: a
-- caller who is not a member of the group is rejected.
do $$ begin
  perform set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
  set local role authenticated;
  begin
    perform public.match_import_player_names(
      '22222222-2222-4222-8222-222222222222', array['Oraclefixture Displaymatch']
    );
    raise exception 'PRE-CONTRACTION FAIL: non-member read the matching oracle';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

select 'MATCH_ORACLE_PRE_CONTRACTION_PINNED' as result;
