select
  (select count(*) from public.expansions) as expansions_count,
  (select count(*) from public.maps) as maps_count,
  (select count(*) from public.style_definitions) as styles_count;
