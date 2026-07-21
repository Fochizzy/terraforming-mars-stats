-- Four games, proving each required property from Gap 3:
--   A: already-correct control -> must remain fully untouched.
--   B: stale nonzero Event-tag snapshot row (signal a) -> refreshed.
--   C: total_tag_count mismatch with NO nonzero Event-tag snapshot row
--      (signal b only) -> refreshed.
--   D: second, differently-shaped, already-correct control -> untouched,
--      proves unrelated games/rows are never touched by a run that DOES
--      write something (B and C).
--
-- UUIDs below are plain hex (0-9, a-d as leading digit only) — group id
-- prefix 1, players 2, games/game_players/imports prefixed a/b/c/d per
-- scenario for readability in the assertion queries.

insert into public.groups (id) values
  ('10000000-0000-0000-0000-000000000000');

insert into public.players (id, group_id, display_name, normalized_display_name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', 'Friday Mars', 'friday mars'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000000', 'Corey', 'corey'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000000', 'Alex', 'alex');

insert into public.games (id, group_id, status) values
  ('a0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000', 'finalized'),
  ('b0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000', 'finalized'),
  ('d0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000', 'finalized');

insert into public.game_players (id, game_id, player_id, placement, is_winner, total_points) values
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 1, true, 80),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 1, true, 75),
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 2, false, 60),
  ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 1, true, 90);

insert into public.game_log_imports (id, game_id) values
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000'),
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000000'),
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000000'),
  ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000000');

-- Root data (game_log_tag_summaries). Every row here already reflects the
-- corrected code (verified-clean root, as in production): no tag_code
-- carries a value the fixed derivation wouldn't produce.
insert into public.game_log_tag_summaries (
  game_log_import_id, game_player_id, player_name, normalized_player_name,
  tag_code, tag_count, played_card_count, matched_card_count,
  unresolved_card_count, total_tag_count
) values
  -- Game A: consistent root, 2 tags summing to total_tag_count=3.
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Friday Mars', 'friday mars', 'space', 2, 4, 4, 0, 3),
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Friday Mars', 'friday mars', 'building', 1, 4, 4, 0, 3),

  -- Game B: root already correct (event tag_count = 0, matches the
  -- production "0 root rows" finding); total_tag_count = 1, from 'space'
  -- alone.
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Friday Mars', 'friday mars', 'space', 1, 3, 3, 0, 1),
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Friday Mars', 'friday mars', 'event', 0, 3, 3, 0, 1),

  -- Game C: root consistent (building=3, total_tag_count=3); no event row
  -- at all — the snapshot mismatch here is total_tag_count only.
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Corey', 'corey', 'building', 3, 5, 5, 0, 3),

  -- Game D: consistent root, single tag.
  ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Alex', 'alex', 'microbe', 4, 6, 6, 0, 4);

-- Persisted player-level snapshot (game_player_metric_snapshots). Deliberate
-- old updated_at so a real, later write is unambiguous in the diff.
insert into public.game_player_metric_snapshots (
  game_id, game_player_id, group_id, player_id, total_tag_count,
  played_card_count, matched_played_card_count, unresolved_played_card_count,
  created_at, updated_at
) values
  ('a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 3, 4, 4, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  -- Game B: stale total_tag_count (2, should be 1 — inflated by the phantom
  -- Event contribution).
  ('b0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 2, 3, 3, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  -- Game C: stale total_tag_count (5, should be 3) with no Event row
  -- involved at all.
  ('c0000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 5, 5, 5, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 4, 6, 6, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00');

-- Persisted per-tag snapshot (game_player_tag_metric_snapshots).
insert into public.game_player_tag_metric_snapshots (
  game_id, game_player_id, group_id, player_id, tag_code, tag_count,
  total_tag_count, played_card_count, matched_card_count, unresolved_card_count,
  created_at, updated_at
) values
  -- Game A: matches root exactly.
  ('a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'space', 2, 3, 4, 4, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  ('a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'building', 1, 3, 4, 4, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),

  -- Game B: 'space' already correct; 'event' is the stale nonzero row
  -- (signal a).
  ('b0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'space', 1, 2, 3, 3, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  ('b0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'event', 1, 2, 3, 3, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),

  -- Game C: the only per-tag row is already correct (building=3) — proves
  -- signal (b) alone must catch this game; a per-tag-only check would miss
  -- it entirely.
  ('c0000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'building', 3, 5, 5, 5, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),

  -- Game D: matches root exactly.
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 'microbe', 4, 4, 6, 6, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00');
