alter table public.game_log_tag_summaries
  drop constraint game_log_tag_summaries_tag_code_check;

alter table public.game_log_tag_summaries
  add constraint game_log_tag_summaries_tag_code_check check (
    tag_code in (
      'building',
      'space',
      'power',
      'science',
      'jovian',
      'earth',
      'plant',
      'microbe',
      'animal',
      'city',
      'event',
      'venus',
      'wild',
      'moon'
    )
  );
