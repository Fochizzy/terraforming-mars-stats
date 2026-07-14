create or replace function public.get_style_effectiveness(
  p_scope text default 'global',
  p_group_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, analytics
as $$
  with scoped as (
    select pgr.*
    from analytics.player_game_results pgr
    where
      case
        when p_scope = 'personal' then pgr.player_id in (
          select p.id from public.players p where p.linked_user_id = auth.uid()
        )
        when p_scope = 'group' then pgr.group_id = p_group_id
        else true
      end
  ),
  styles as (
    select
      pgr.inferred_primary_style_code as "styleCode",
      count(*)::int as "gamesPlayed",
      (count(*) filter (where pgr.is_winner))::int as "wins",
      round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as "winRate",
      round(avg(pgr.placement::numeric), 3) as "averagePlacement",
      round(avg(pgr.total_points::numeric), 3) as "averageScore",
      round(avg(pgr.generation_count::numeric), 3) as "averageGenerationCount"
    from scoped pgr
    where pgr.inferred_primary_style_code is not null
    group by pgr.inferred_primary_style_code
  )
  select jsonb_build_object(
    'styleRows',
    coalesce(
      (select jsonb_agg(to_jsonb(s) order by s."gamesPlayed" desc) from styles s),
      '[]'::jsonb
    ),
    'scoreAverages',
    (
      select case
        when count(*) = 0 then null
        else jsonb_build_object(
          'averageTrPoints', round(avg(pgr.tr_points::numeric), 3),
          'averageCardPoints', round(avg(pgr.card_points_total::numeric), 3),
          'averageOtherCardPoints', round(avg(coalesce(pgr.other_card_points, 0)::numeric), 3),
          'averageGreeneryPoints', round(avg(pgr.greenery_points::numeric), 3),
          'averageCitiesPoints', round(avg(pgr.cities_points::numeric), 3),
          'averageMilestonePoints', round(avg(pgr.milestone_points::numeric), 3),
          'averageAwardPoints', round(avg(pgr.award_points::numeric), 3),
          'averageJovianPoints', round(avg(coalesce(pgr.card_points_jovian, 0)::numeric), 3),
          'averageMicrobePoints', round(avg(coalesce(pgr.card_points_microbes, 0)::numeric), 3),
          'averageAnimalPoints', round(avg(coalesce(pgr.card_points_animals, 0)::numeric), 3)
        )
      end
      from scoped pgr
    )
  );
$$;

revoke all on function public.get_style_effectiveness(text, uuid) from public;
grant execute on function public.get_style_effectiveness(text, uuid) to authenticated;;
