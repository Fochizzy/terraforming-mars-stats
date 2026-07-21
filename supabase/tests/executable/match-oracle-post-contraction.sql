-- Disclosed match classification AFTER the gated contraction 20260720120000
-- (WS3 / Layer A). Runs on the same probes and the same fixtures as
-- match-oracle-pre-contraction.sql, against the REPLACED function.
--
-- Three things must hold together, and only together do they show the
-- contraction is correct rather than merely different:
--   1. the disclosure is coarsened to 'exact' | 'partial' and 2 | 1;
--   2. no probe resolves to a different player than before, because the
--      internal ranking is unchanged; and
--   3. no fine-grained value survives anywhere in the output.

do $$
declare
  r record;
  probe text;
  expected_reason text;
  expected_score integer;
  expected_player uuid;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  -- Calling as `authenticated` also proves the ACL survived `create or
  -- replace`: the contraction grants nothing of its own.
  set local role authenticated;

  for probe, expected_reason, expected_score, expected_player in
    select * from (values
      -- Same five probes; the expected player is identical to the
      -- pre-contraction expectation, the disclosure is not.
      ('Oraclefixture Displaymatch', 'exact', 2,
       '0ac1e001-0ac1-4001-8001-000000000001'::uuid),
      ('Oraclefixture Fullmatch', 'exact', 2,
       '0ac1e002-0ac1-4002-8002-000000000002'::uuid),
      ('oraclefixture-username', 'exact', 2,
       '0ac1e003-0ac1-4003-8003-000000000003'::uuid),
      ('Oraclefixture Aliasmatch', 'exact', 2,
       '0ac1e004-0ac1-4004-8004-000000000004'::uuid),
      ('Oraclefixture', 'partial', 1,
       '0ac1e001-0ac1-4001-8001-000000000001'::uuid)
    ) as p(probe, reason, score, player)
  loop
    select m.match_reason, m.match_score, m.player_id
    into r
    from public.match_import_player_names(
      '22222222-2222-4222-8222-222222222222', array[probe]
    ) m;

    if r.match_reason is distinct from expected_reason then
      raise exception 'POST-CONTRACTION FAIL: probe % disclosed reason %, expected %',
        probe, coalesce(r.match_reason, '<no row>'), expected_reason;
    end if;
    if r.match_score is distinct from expected_score then
      raise exception 'POST-CONTRACTION FAIL: probe % disclosed score %, expected %',
        probe, r.match_score, expected_score;
    end if;
    if r.player_id is distinct from expected_player then
      raise exception 'POST-CONTRACTION FAIL: probe % resolved player % — the contraction changed WHICH player matches, not just the disclosure',
        probe, r.player_id;
    end if;
  end loop;

  reset role;
end $$;

-- No fine-grained classification survives on any probe, including a batch
-- that matches every rule at once.
do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select count(*) into n
  from public.match_import_player_names(
    '22222222-2222-4222-8222-222222222222',
    array['Oraclefixture Displaymatch', 'Oraclefixture Fullmatch',
          'oraclefixture-username', 'Oraclefixture Aliasmatch', 'Oraclefixture']
  ) m
  where m.match_reason not in ('exact', 'partial')
     or m.match_score not in (1, 2);
  reset role;
  if n <> 0 then
    raise exception 'POST-CONTRACTION FAIL: % rows still disclose a fine-grained classification', n;
  end if;
end $$;

-- The unmatched-name contract is unchanged.
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
    raise exception 'POST-CONTRACTION FAIL: unmatched name returned % rows', n;
  end if;
end $$;

-- Candidate input is now bounded: the batch the predecessor accepted is
-- rejected, and an over-long single name is rejected.
do $$ begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  begin
    perform public.match_import_player_names(
      '22222222-2222-4222-8222-222222222222',
      (select array_agg('Probe ' || g::text) from generate_series(1, 65) as g)
    );
    raise exception 'POST-CONTRACTION FAIL: oversized candidate batch accepted';
  exception when sqlstate '22023' then null; end;

  begin
    perform public.match_import_player_names(
      '22222222-2222-4222-8222-222222222222',
      array[repeat('n', 129)]
    );
    raise exception 'POST-CONTRACTION FAIL: over-long candidate name accepted';
  exception when sqlstate '22023' then null; end;
  reset role;
end $$;

-- Authorization is still enforced after the replacement.
do $$ begin
  perform set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
  set local role authenticated;
  begin
    perform public.match_import_player_names(
      '22222222-2222-4222-8222-222222222222', array['Oraclefixture Displaymatch']
    );
    raise exception 'POST-CONTRACTION FAIL: non-member read the matching RPC';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

select 'MATCH_ORACLE_CONTRACTION_VERIFIED' as result;
