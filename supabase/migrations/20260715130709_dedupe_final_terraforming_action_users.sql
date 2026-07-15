create or replace function public.get_final_terraforming_action_stats(
  scope text default 'personal'::text,
  target_group_id uuid default null::uuid
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
with scoped_games as (
  select g.id, g.group_id
  from games g
  where g.status = 'finalized'
    and (
      scope = 'global'
      or (
        scope = 'personal'
        and exists (
          select 1
          from game_players gp_self
          join players p_self on p_self.id = gp_self.player_id
          where gp_self.game_id = g.id
            and p_self.linked_user