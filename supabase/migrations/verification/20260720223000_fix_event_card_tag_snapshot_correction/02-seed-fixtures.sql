-- Eight games proving every required Defect-1/Defect-2 case. UUIDs use
-- plain hex only: group prefix 'a', players 'b1'..'b9', games 'c1'..'c9',
-- game_players 'd1'..'d9', imports 'e1'..'e9' (digit N identifies the
-- scenario below; 5/'e5' etc. reserved for the rollback-test poison game).
--
-- N  Label  Scenario
-- 1  A      Fully consistent control -> untouched.
-- 2  B      Root event=0 (explicit row), snapshot event=1 (stale) ->
--           selected & refreshed. [Defect-1 case 1, explicit zero row]
-- 3  C      Root total=3 (no event row in root at all), snapshot total=5
--           (stale) -> selected & refreshed via total signal only.
--           [Original Gap-2 case; Defect-1 case 1, root ABSENT variant,
--           combined with Defect-2 case 3]
-- 4  D      Fully consistent control -> untouched.
-- 6  F      MANDATORY: root event=1 (legitimate — a real non-Event card
--           carrying a literal 'event' tag), snapshot event=1 (matching) ->
--           must NOT be selected. Would be wrongly selected under the
--           pre-correction migration (tag_count<>0 alone).
-- 7  G      MANDATORY: root has NO tag rows at all for this game_player
--           (zero root evidence), persisted total_tag_count is nonzero
--           (stale) -> expected root total is 0 -> selected & refreshed.
--           Would be missed under the pre-correction migration's inner join.
-- 8  H      Root event=2 (nonzero), snapshot has no 'event' row at all
--           (present for other tags, absent for event) -> selected &
--           refreshed. [Defect-1 case 3]
-- 9  I      Root total nonzero (space=3), game_player_metric_snapshots has
--           NO row at all for this game_player (never snapshotted) ->
--           selected & refreshed, creating the row fresh. [Defect-2 case 4]

insert into public.groups (id) values
  ('a0000000-0000-0000-0000-000000000000');

insert into public.players (id, group_id, display_name, normalized_display_name) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Player One', 'player one'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'Player Two', 'player two'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'Player Three', 'player three'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000', 'Player Four', 'player four'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000000', 'Player Six', 'player six'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000000', 'Player Seven', 'player seven'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000000', 'Player Eight', 'player eight'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000000', 'Player Nine', 'player nine');

insert into public.games (id, group_id, status) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000000', 'finalized'),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000000', 'finalized');

insert into public.game_players (id, game_id, player_id, placement, is_winner, total_points) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, true, 80),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1, true, 75),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 2, false, 60),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 1, true, 90),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 1, true, 55),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007', 1, true, 40),
  ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', 1, true, 65),
  ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009', 1, true, 70);

-- Game G (7) deliberately has NO game_log_imports / game_log_tag_summaries
-- rows at all: zero root evidence for that game_player.
insert into public.game_log_imports (id, game_id) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004'),
  ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000008'),
  ('e0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000009');

insert into public.game_log_tag_summaries (
  game_log_import_id, game_player_id, player_name, normalized_player_name,
  tag_code, tag_count, played_card_count, matched_card_count,
  unresolved_card_count, total_tag_count
) values
  -- Game A (1): consistent root, 2 tags summing to total_tag_count=3.
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Player One', 'player one', 'space', 2, 4, 4, 0, 3),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Player One', 'player one', 'building', 1, 4, 4, 0, 3),

  -- Game B (2): root already correct (explicit event row, tag_count=0);
  -- total_tag_count=1 from 'space' alone.
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Player Two', 'player two', 'space', 1, 3, 3, 0, 1),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Player Two', 'player two', 'event', 0, 3, 3, 0, 1),

  -- Game C (3): root consistent (building=3, total_tag_count=3); no event
  -- row at all.
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'Player Three', 'player three', 'building', 3, 5, 5, 0, 3),

  -- Game D (4): consistent root, single tag.
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'Player Four', 'player four', 'microbe', 4, 6, 6, 0, 4),

  -- Game F (6): a recognized non-Event card legitimately carrying a literal
  -- 'event' tag. Root: event=1, total_tag_count=1 (event alone). This is
  -- exactly the derive-player-tag-summaries.test.ts "Mislabeled Project"
  -- scenario, reflected at the root-table level.
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'Player Six', 'player six', 'event', 1, 2, 2, 0, 1),

  -- Game H (8): root event=2 (nonzero, legitimate per this fixture's intent
  -- — the point under test is snapshot absence, not root legitimacy);
  -- total_tag_count=2.
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 'Player Eight', 'player eight', 'event', 2, 3, 3, 0, 2),

  -- Game I (9): root total nonzero via 'space' alone; no event row.
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000009', 'Player Nine', 'player nine', 'space', 3, 4, 4, 0, 3);
  -- Game G (7): intentionally NO game_log_tag_summaries rows at all.

-- Persisted player-level snapshot (game_player_metric_snapshots). Old
-- updated_at so a real, later write is unambiguous in the diff. Game I (9)
-- deliberately has NO row here at all.
insert into public.game_player_metric_snapshots (
  game_id, game_player_id, group_id, player_id, total_tag_count,
  played_card_count, matched_played_card_count, unresolved_played_card_count,
  created_at, updated_at
) values
  ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 3, 4, 4, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  -- Game B: stale total_tag_count (2, should be 1 — inflated by the phantom
  -- Event contribution).
  ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 2, 3, 3, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  -- Game C: stale total_tag_count (5, should be 3).
  ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000003', 5, 5, 5, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  ('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000004', 4, 6, 6, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  -- Game F: total_tag_count already correct (1) — matches root exactly.
  ('c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000006', 1, 2, 2, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  -- Game G: root has zero tag rows, so expected total is 0 — this snapshot
  -- is stale at 7.
  ('c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000007', 7, 2, 2, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  -- Game H: total_tag_count already correct (2) — only the per-tag 'event'
  -- row is missing/stale, not the total.
  ('c0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000008', 2, 3, 3, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00');
  -- Game I: intentionally NO row here at all.

-- Persisted per-tag snapshot (game_player_tag_metric_snapshots). Game I (9)
-- deliberately has no rows. Game H (8) deliberately has no 'event' row.
insert into public.game_player_tag_metric_snapshots (
  game_id, game_player_id, group_id, player_id, tag_code, tag_count,
  total_tag_count, played_card_count, matched_card_count, unresolved_card_count,
  created_at, updated_at
) values
  -- Game A: matches root exactly.
  ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'space', 2, 3, 4, 4, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'building', 1, 3, 4, 4, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),

  -- Game B: 'space' already correct; 'event' is the stale nonzero row
  -- (root says 0).
  ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'space', 1, 2, 3, 3, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'event', 1, 2, 3, 3, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),

  -- Game C: the only per-tag row is already correct (building=3) — proves
  -- the total signal alone must catch this game.
  ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000003', 'building', 3, 5, 5, 5, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),

  -- Game D: matches root exactly.
  ('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000004', 'microbe', 4, 4, 6, 6, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00'),

  -- Game F: legitimate — event=1 in BOTH root and snapshot. Must remain
  -- exactly this after the migration (untouched).
  ('c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000006', 'event', 1, 1, 2, 2, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00');
  -- Game G: no per-tag rows (nothing to be stale about beyond the total).
  -- Game H: no 'event' row at all, despite root having event=2.
