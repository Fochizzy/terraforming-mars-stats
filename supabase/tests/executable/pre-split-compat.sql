-- Pre-migration RPC payload compatibility (F-03 / WS3).
--
-- Runs BEFORE 20260719234500 is applied, i.e. against the deployed
-- production contract (the 20260718212340 RPC and a game_log_events table
-- with no review_state column). It proves:
--   1. the review_state column does not exist yet;
--   2. the exact payload shape the redesign emits — including the
--      review_state key — is accepted by the pre-split RPC (the unknown key
--      is ignored, so emitting it is production-safe today);
--   3. the computed review value is discarded by this contract (that is the
--      audited F-03 gap the gated migration closes — asserted here so the
--      pre-migration behavior is pinned, not assumed).

do $$
declare n int;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'game_log_events'
    and column_name = 'review_state';
  if n <> 0 then
    raise exception 'PRE-SPLIT FAIL: review_state column already exists before the migration';
  end if;
end $$;

do $$ begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  -- The redesign's emitted payload carries review_state; the deployed RPC
  -- must accept it (and the overloaded confidence vocabulary of the
  -- pre-split contract still allows 'reviewed').
  perform public.replace_game_log_events(
    '44444444-4444-4444-8444-444444444444',
    '[{"event_order": 800, "event_type": "milestone_claimed", "raw_line": "X claimed Builder", "confidence_level": "high", "review_state": "reviewed", "payload": {"resolution": "corrected"}},
      {"event_order": 900, "event_type": "milestone_claimed", "raw_line": "X claimed Terraformer", "confidence_level": "reviewed", "payload": {"resolution": "corrected"}},
      {"event_order": 901, "event_type": "colony_traded", "raw_line": "X traded with Atlantis", "confidence_level": "reviewed", "event_identity": "901:colony_traded:none", "payload": {"canonical_colony_name": "Atlantis"}}]'::jsonb
  );
  reset role;
end $$;

-- The row persisted, and no review lifecycle value survived anywhere — the
-- pre-split schema has nowhere to put it.
do $$
declare v_conf text; n int;
begin
  select confidence_level into v_conf
  from public.game_log_events
  where game_log_import_id = '44444444-4444-4444-8444-444444444444'
    and event_order = 800;
  if v_conf is distinct from 'high' then
    raise exception 'PRE-SPLIT FAIL: payload with review_state key was not persisted (confidence %)', v_conf;
  end if;

  select count(*) into n
  from public.game_log_events
  where game_log_import_id = '44444444-4444-4444-8444-444444444444'
    and confidence_level = 'reviewed';
  if n <> 2 then
    raise exception 'PRE-SPLIT FAIL: expected the 2 overloaded rows to persist pre-split, got %', n;
  end if;
end $$;
