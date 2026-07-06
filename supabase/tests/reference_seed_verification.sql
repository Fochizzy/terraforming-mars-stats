select
  (select count(*) from public.expansions) as expansions_count,
  (select count(*) from public.maps) as maps_count,
  (select count(*) from public.style_definitions) as styles_count,
  (select count(*) from public.milestones) as milestones_count,
  (select count(*) from public.awards) as awards_count,
  (select count(*) from public.map_milestones) as map_milestones_count,
  (select count(*) from public.map_awards) as map_awards_count,
  (
    select jsonb_object_agg(code, milestone_count order by code)
    from (
      select maps.code, count(map_milestones.milestone_id) as milestone_count
      from public.maps maps
      left join public.map_milestones
        on map_milestones.map_id = maps.id
      group by maps.code
    ) milestone_counts
  ) as milestones_per_map,
  (
    select jsonb_object_agg(code, award_count order by code)
    from (
      select maps.code, count(map_awards.award_id) as award_count
      from public.maps maps
      left join public.map_awards
        on map_awards.map_id = maps.id
      group by maps.code
    ) award_counts
  ) as awards_per_map;
