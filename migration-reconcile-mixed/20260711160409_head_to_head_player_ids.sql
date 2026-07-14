create or replace function public.get_head_to_head_stats(target_group_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with group_game_players as (
  select gp.*, g.id as gid
  from game_players gp
  join games g on g.id = gp.game_id
  where g.group_id = target_group_id
    and g.status is distinct from 'draft'
),
pairs as (
  select
    pa.id as player_a_id,
    pa.display_name as player_a,
    pb.id as player_b_id,
    pb.display_name as player_b,
    count(*) as games,
    count(*) filter (where a.is_winner) as player_a_wins,
    count(*) filter (where b.is_winner) as player_b_wins,
    round(avg(a.total_points - b.total_points)::numeric, 1) as avg_margin
  from group_game_players a
  join group_game_players b
    on b.gid = a.gid and a.player_id < b.player_id
  join players pa on pa.id = a.player_id
  join players pb on pb.id = b.player_id
  group by pa.id, pa.display_name, pb.id, pb.display_name
),
corp_matchups as (
  select
    ca.name as corporation_a,
    cb.name as corporation_b,
    count(*) as games,
    count(*) filter (where a.is_winner) as corporation_a_wins,
    count(*) filter (where b.is_winner) as corporation_b_wins
  from group_game_players a
  join group_game_players b
    on b.gid = a.gid and a.id < b.id
  join lateral (
    select gpc.corporation_id
    from game_player_corporations gpc
    where gpc.game_player_id = a.id

    union all

    select a.corporation_id
    where a.corporation_id is not null
      and not exists (
        select 1
        from game_player_corporations gpc
        where gpc.game_player_id = a.id
      )
  ) a_corporations on true
  join lateral (
    select gpc.corporation_id
    from game_player_corporations gpc
    where gpc.game_player_id = b.id

    union all

    select b.corporation_id
    where b.corporation_id is not null
      and not exists (
        select 1
        from game_player_corporations gpc
        where gpc.game_player_id = b.id
      )
  ) b_corporations on true
  join corporations ca on ca.id = a_corporations.corporation_id
  join corporations cb on cb.id = b_corporations.corporation_id
  group by ca.name, cb.name
)
select jsonb_build_object(
  'pairs',
  (select coalesce(jsonb_agg(to_jsonb(p) order by p.games desc, p.player_a), '[]'::jsonb) from pairs p),
  'corporationMatchups',
  (select coalesce(jsonb_agg(to_jsonb(cm) order by cm.games desc, cm.corporation_a), '[]'::jsonb) from corp_matchups cm)
);
$$;

revoke all on function public.get_head_to_head_stats(uuid) from public;
grant execute on function public.get_head_to_head_stats(uuid) to authenticated;;
