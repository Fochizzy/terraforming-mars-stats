create table public.game_player_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  corporation_id uuid references public.corporations(id) on delete set null,
  player_count integer not null check (player_count between 1 and 5),
  generation_count integer not null check (generation_count > 0),
  placement integer not null check (placement > 0),
  is_winner boolean not null,
  total_points integer not null,
  points_per_generation numeric(12, 4) not null,
  normalized_efficiency numeric(12, 4),
  expected_score numeric(12, 4),
  score_delta_vs_expected numeric(12, 4),
  cities_points_per_generation numeric(12, 4) not null,
  greenery_points_per_generation numeric(12, 4) not null,
  card_points_per_generation numeric(12, 4) not null,
  tr_points_per_generation numeric(12, 4) not null,
  milestone_points_per_generation numeric(12, 4) not null,
  award_points_per_generation numeric(12, 4) not null,
  card_points_per_played_card numeric(12, 4),
  played_card_count integer not null default 0 check (played_card_count >= 0),
  matched_played_card_count integer not null default 0 check (matched_played_card_count >= 0),
  unresolved_played_card_count integer not null default 0 check (unresolved_played_card_count >= 0),
  total_tag_count integer not null default 0 check (total_tag_count >= 0),
  tr_score_share numeric(12, 4) not null,
  card_score_share numeric(12, 4) not null,
  cities_score_share numeric(12, 4) not null,
  greenery_score_share numeric(12, 4) not null,
  milestone_score_share numeric(12, 4) not null,
  award_score_share numeric(12, 4) not null,
  win_margin_points integer,
  loss_gap_points integer,
  close_game boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_player_id)
);

create table public.game_log_tag_summaries (
  id uuid primary key default gen_random_uuid(),
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  game_player_id uuid references public.game_players(id) on delete set null,
  player_name text not null,
  normalized_player_name text not null,
  tag_code text not null,
  tag_count integer not null default 0,
  played_card_count integer not null default 0,
  matched_card_count integer not null default 0,
  unresolved_card_count integer not null default 0,
  total_tag_count integer not null default 0,
  tag_evidence_coverage numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_log_import_id, normalized_player_name, tag_code),
  check (
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
      'event'
    )
  ),
  check (tag_count >= 0),
  check (played_card_count >= 0),
  check (matched_card_count >= 0),
  check (unresolved_card_count >= 0),
  check (total_tag_count >= 0),
  check (tag_evidence_coverage >= 0 and tag_evidence_coverage <= 1)
);

create table public.game_player_tag_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  tag_code text not null,
  tag_count integer not null check (tag_count >= 0),
  tag_share numeric(12, 4) not null,
  total_tag_count integer not null check (total_tag_count >= 0),
  played_card_count integer not null check (played_card_count >= 0),
  matched_card_count integer not null check (matched_card_count >= 0),
  unresolved_card_count integer not null check (unresolved_card_count >= 0),
  tag_evidence_coverage numeric(12, 4) not null,
  is_winner boolean not null,
  total_points integer not null,
  points_per_generation numeric(12, 4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_player_id, tag_code)
);

create table public.game_milestone_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_milestone_id uuid not null references public.game_milestones(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  winner_game_player_id uuid not null references public.game_players(id) on delete cascade,
  winner_player_id uuid not null references public.players(id) on delete cascade,
  winner_final_placement integer not null,
  winner_total_points integer not null,
  winner_points_per_generation numeric(12, 4) not null,
  winner_won_game boolean not null,
  claimed_generation_number integer,
  claimed_timing_bucket text,
  player_count integer not null,
  generation_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_milestone_id)
);

create table public.game_award_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_award_id uuid not null references public.game_awards(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  award_id uuid not null references public.awards(id) on delete cascade,
  place integer not null check (place in (1, 2)),
  funded_by_game_player_id uuid not null references public.game_players(id) on delete cascade,
  funder_player_id uuid not null references public.players(id) on delete cascade,
  winner_game_player_id uuid not null references public.game_players(id) on delete cascade,
  winner_player_id uuid not null references public.players(id) on delete cascade,
  winner_final_placement integer not null,
  winner_total_points integer not null,
  winner_points_per_generation numeric(12, 4) not null,
  winner_won_game boolean not null,
  funder_final_placement integer not null,
  funder_won_game boolean not null,
  funder_award_points integer not null default 0,
  funder_award_roi integer not null default 0,
  funded_generation_number integer,
  funded_timing_bucket text,
  funder_got_first_place boolean not null default false,
  funder_got_second_place boolean not null default false,
  funder_missed_award boolean not null default true,
  player_count integer not null,
  generation_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_award_id)
);

create table public.player_metric_summaries (
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  games_played integer not null default 0,
  wins integer not null default 0,
  win_rate numeric(12, 4) not null default 0,
  average_score numeric(12, 4) not null default 0,
  average_placement numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  average_normalized_efficiency numeric(12, 4),
  average_expected_score numeric(12, 4),
  average_score_delta_vs_expected numeric(12, 4),
  average_win_margin numeric(12, 4),
  average_loss_gap numeric(12, 4),
  close_game_count integer not null default 0,
  close_game_wins integer not null default 0,
  close_game_win_rate numeric(12, 4) not null default 0,
  best_score_source text,
  tr_score_share numeric(12, 4) not null default 0,
  card_score_share numeric(12, 4) not null default 0,
  cities_score_share numeric(12, 4) not null default 0,
  greenery_score_share numeric(12, 4) not null default 0,
  milestone_score_share numeric(12, 4) not null default 0,
  award_score_share numeric(12, 4) not null default 0,
  best_tag_lane text,
  tag_evidence_coverage numeric(12, 4) not null default 0,
  milestones_claimed integer not null default 0,
  milestone_winner_win_rate numeric(12, 4) not null default 0,
  average_milestone_claimed_generation numeric(12, 4),
  awards_funded integer not null default 0,
  funded_awards_won_first integer not null default 0,
  funded_awards_won_second integer not null default 0,
  funded_awards_missed integer not null default 0,
  average_award_roi numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, player_id)
);

create table public.player_map_metric_summaries (
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  games_played integer not null default 0,
  wins integer not null default 0,
  win_rate numeric(12, 4) not null default 0,
  average_points numeric(12, 4) not null default 0,
  average_generations numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  average_normalized_efficiency numeric(12, 4),
  average_score_delta_vs_expected numeric(12, 4),
  best_score_source_on_map text,
  best_tag_lane_on_map text,
  map_rank_for_player integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, player_id, map_id)
);

create table public.global_map_metric_summaries (
  map_id uuid not null references public.maps(id) on delete cascade,
  player_count integer not null default 0 check (player_count between 0 and 5),
  games_played integer not null default 0,
  average_points numeric(12, 4) not null default 0,
  average_generations numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  average_normalized_efficiency numeric(12, 4),
  expected_score_baseline numeric(12, 4),
  highest_win_rate_corporation_id uuid references public.corporations(id) on delete set null,
  highest_efficiency_style_code text,
  best_tag_lane text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (map_id, player_count)
);

create table public.global_corporation_metric_summaries (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references public.corporations(id) on delete cascade,
  map_id uuid references public.maps(id) on delete cascade,
  player_count integer not null default 0 check (player_count between 0 and 5),
  games_played integer not null default 0,
  wins integer not null default 0,
  win_rate numeric(12, 4) not null default 0,
  average_points numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  average_normalized_efficiency numeric(12, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_style_metric_summaries (
  id uuid primary key default gen_random_uuid(),
  style_code text not null,
  map_id uuid references public.maps(id) on delete cascade,
  player_count integer not null default 0 check (player_count between 0 and 5),
  games_played integer not null default 0,
  wins integer not null default 0,
  win_rate numeric(12, 4) not null default 0,
  average_points numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  average_normalized_efficiency numeric(12, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_tag_metric_summaries (
  id uuid primary key default gen_random_uuid(),
  tag_code text not null,
  map_id uuid references public.maps(id) on delete cascade,
  player_count integer not null default 0 check (player_count between 0 and 5),
  games_played integer not null default 0,
  wins integer not null default 0,
  win_rate numeric(12, 4) not null default 0,
  average_points numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  average_normalized_efficiency numeric(12, 4),
  average_tag_count numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_milestone_metric_summaries (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  map_id uuid references public.maps(id) on delete cascade,
  player_count integer not null default 0 check (player_count between 0 and 5),
  games_played integer not null default 0,
  winner_wins integer not null default 0,
  milestone_winner_win_rate numeric(12, 4) not null default 0,
  average_winner_points_per_generation numeric(12, 4) not null default 0,
  average_claimed_generation numeric(12, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_award_metric_summaries (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.awards(id) on delete cascade,
  map_id uuid references public.maps(id) on delete cascade,
  player_count integer not null default 0 check (player_count between 0 and 5),
  games_played integer not null default 0,
  funder_wins integer not null default 0,
  funder_success_rate numeric(12, 4) not null default 0,
  winner_wins integer not null default 0,
  award_winner_win_rate numeric(12, 4) not null default 0,
  average_award_roi numeric(12, 4) not null default 0,
  winner_funder_mismatch_rate numeric(12, 4) not null default 0,
  average_funded_generation numeric(12, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index global_corporation_metric_summaries_unique
on public.global_corporation_metric_summaries (
  corporation_id,
  coalesce(map_id, '00000000-0000-0000-0000-000000000000'::uuid),
  player_count
);

create unique index global_style_metric_summaries_unique
on public.global_style_metric_summaries (
  style_code,
  coalesce(map_id, '00000000-0000-0000-0000-000000000000'::uuid),
  player_count
);

create unique index global_tag_metric_summaries_unique
on public.global_tag_metric_summaries (
  tag_code,
  coalesce(map_id, '00000000-0000-0000-0000-000000000000'::uuid),
  player_count
);

create unique index global_milestone_metric_summaries_unique
on public.global_milestone_metric_summaries (
  milestone_id,
  coalesce(map_id, '00000000-0000-0000-0000-000000000000'::uuid),
  player_count
);

create unique index global_award_metric_summaries_unique
on public.global_award_metric_summaries (
  award_id,
  coalesce(map_id, '00000000-0000-0000-0000-000000000000'::uuid),
  player_count
);

create table public.global_player_count_metric_summaries (
  player_count integer primary key check (player_count between 1 and 5),
  games_played integer not null default 0,
  average_points numeric(12, 4) not null default 0,
  average_generations numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  expected_score_baseline numeric(12, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_generation_metric_summaries (
  generation_count integer primary key check (generation_count > 0),
  games_played integer not null default 0,
  average_points numeric(12, 4) not null default 0,
  average_points_per_generation numeric(12, 4) not null default 0,
  expected_score_baseline numeric(12, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index game_player_metric_snapshots_group_player_idx
on public.game_player_metric_snapshots (group_id, player_id);

create index game_player_metric_snapshots_game_idx
on public.game_player_metric_snapshots (game_id);

create index game_player_metric_snapshots_map_idx
on public.game_player_metric_snapshots (map_id, player_count, generation_count);

create index game_player_metric_snapshots_corporation_idx
on public.game_player_metric_snapshots (corporation_id);

create index game_log_tag_summaries_import_player_idx
on public.game_log_tag_summaries (
  game_log_import_id,
  normalized_player_name
);

create index game_log_tag_summaries_game_player_idx
on public.game_log_tag_summaries (game_player_id);

create index game_player_tag_metric_snapshots_group_tag_idx
on public.game_player_tag_metric_snapshots (group_id, tag_code);

create index game_player_tag_metric_snapshots_game_idx
on public.game_player_tag_metric_snapshots (game_id);

create index game_milestone_metric_snapshots_group_milestone_idx
on public.game_milestone_metric_snapshots (group_id, milestone_id);

create index game_milestone_metric_snapshots_game_idx
on public.game_milestone_metric_snapshots (game_id);

create index game_award_metric_snapshots_group_award_idx
on public.game_award_metric_snapshots (group_id, award_id);

create index game_award_metric_snapshots_game_idx
on public.game_award_metric_snapshots (game_id);

create index player_map_metric_summaries_group_player_idx
on public.player_map_metric_summaries (group_id, player_id);

alter table public.game_player_metric_snapshots enable row level security;
alter table public.game_log_tag_summaries enable row level security;
alter table public.game_player_tag_metric_snapshots enable row level security;
alter table public.game_milestone_metric_snapshots enable row level security;
alter table public.game_award_metric_snapshots enable row level security;
alter table public.player_metric_summaries enable row level security;
alter table public.player_map_metric_summaries enable row level security;
alter table public.global_corporation_metric_summaries enable row level security;
alter table public.global_style_metric_summaries enable row level security;
alter table public.global_tag_metric_summaries enable row level security;
alter table public.global_map_metric_summaries enable row level security;
alter table public.global_milestone_metric_summaries enable row level security;
alter table public.global_award_metric_summaries enable row level security;
alter table public.global_player_count_metric_summaries enable row level security;
alter table public.global_generation_metric_summaries enable row level security;

create policy "members read game player metric snapshots"
on public.game_player_metric_snapshots for select
using (public.can_read_game(game_id));

create policy "members read game log tag summaries"
on public.game_log_tag_summaries for select
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_tag_summaries.game_log_import_id
      and public.can_read_game(gli.game_id)
  )
);

create policy "editors manage game log tag summaries"
on public.game_log_tag_summaries for all
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_tag_summaries.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
)
with check (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_tag_summaries.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
);

create policy "members read tag metric snapshots"
on public.game_player_tag_metric_snapshots for select
using (public.can_read_game(game_id));

create policy "members read milestone metric snapshots"
on public.game_milestone_metric_snapshots for select
using (public.can_read_game(game_id));

create policy "members read award metric snapshots"
on public.game_award_metric_snapshots for select
using (public.can_read_game(game_id));

create policy "members read player metric summaries"
on public.player_metric_summaries for select
using (public.is_group_member(group_id));

create policy "members read player map metric summaries"
on public.player_map_metric_summaries for select
using (public.is_group_member(group_id));

create policy "authenticated users read global corporation metrics"
on public.global_corporation_metric_summaries for select to authenticated using (true);

create policy "authenticated users read global style metrics"
on public.global_style_metric_summaries for select to authenticated using (true);

create policy "authenticated users read global tag metrics"
on public.global_tag_metric_summaries for select to authenticated using (true);

create policy "authenticated users read global map metrics"
on public.global_map_metric_summaries for select to authenticated using (true);

create policy "authenticated users read global milestone metrics"
on public.global_milestone_metric_summaries for select to authenticated using (true);

create policy "authenticated users read global award metrics"
on public.global_award_metric_summaries for select to authenticated using (true);

create policy "authenticated users read global player count metrics"
on public.global_player_count_metric_summaries for select to authenticated using (true);

create policy "authenticated users read global generation metrics"
on public.global_generation_metric_summaries for select to authenticated using (true);

create or replace function public.metric_timing_bucket(
  p_generation_number integer,
  p_generation_count integer
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_generation_number is null
      or p_generation_count is null
      or p_generation_count <= 0
      or p_generation_number <= 0
    then null
    when p_generation_number <= ceiling(p_generation_count::numeric / 3)::integer
    then 'early'
    when p_generation_number <= ceiling((p_generation_count::numeric * 2) / 3)::integer
    then 'mid'
    else 'late'
  end;
$$;

create or replace function public.metric_normalized_label(p_label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(lower(coalesce(p_label, '')), '[^a-z0-9]+', ' ', 'g')),
    ''
  );
$$;

create or replace function public.rebuild_metric_summaries()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.player_metric_summaries;
  delete from public.player_map_metric_summaries;
  delete from public.global_award_metric_summaries;
  delete from public.global_milestone_metric_summaries;
  delete from public.global_tag_metric_summaries;
  delete from public.global_style_metric_summaries;
  delete from public.global_corporation_metric_summaries;
  delete from public.global_map_metric_summaries;
  delete from public.global_player_count_metric_summaries;
  delete from public.global_generation_metric_summaries;

  insert into public.player_metric_summaries (
    group_id,
    player_id,
    games_played,
    wins,
    win_rate,
    average_score,
    average_placement,
    average_points_per_generation,
    average_normalized_efficiency,
    average_expected_score,
    average_score_delta_vs_expected,
    average_win_margin,
    average_loss_gap,
    close_game_count,
    close_game_wins,
    close_game_win_rate,
    best_score_source,
    tr_score_share,
    card_score_share,
    cities_score_share,
    greenery_score_share,
    milestone_score_share,
    award_score_share,
    best_tag_lane,
    tag_evidence_coverage,
    milestones_claimed,
    milestone_winner_win_rate,
    average_milestone_claimed_generation,
    awards_funded,
    funded_awards_won_first,
    funded_awards_won_second,
    funded_awards_missed,
    average_award_roi,
    updated_at
  )
  with aggregate_rows as (
    select
      gps.group_id,
      gps.player_id,
      count(*)::integer as games_played,
      count(*) filter (where gps.is_winner)::integer as wins,
      round(count(*) filter (where gps.is_winner)::numeric / count(*), 4) as win_rate,
      round(avg(gps.total_points::numeric), 4) as average_score,
      round(avg(gps.placement::numeric), 4) as average_placement,
      round(avg(gps.points_per_generation), 4) as average_points_per_generation,
      round(avg(gps.normalized_efficiency), 4) as average_normalized_efficiency,
      round(avg(gps.expected_score), 4) as average_expected_score,
      round(avg(gps.score_delta_vs_expected), 4) as average_score_delta_vs_expected,
      round(avg(gps.win_margin_points::numeric), 4) as average_win_margin,
      round(avg(gps.loss_gap_points::numeric), 4) as average_loss_gap,
      count(*) filter (where gps.close_game)::integer as close_game_count,
      count(*) filter (where gps.close_game and gps.is_winner)::integer as close_game_wins,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as close_game_win_rate,
      round(avg(gps.tr_score_share), 4) as tr_score_share,
      round(avg(gps.card_score_share), 4) as card_score_share,
      round(avg(gps.cities_score_share), 4) as cities_score_share,
      round(avg(gps.greenery_score_share), 4) as greenery_score_share,
      round(avg(gps.milestone_score_share), 4) as milestone_score_share,
      round(avg(gps.award_score_share), 4) as award_score_share
    from public.game_player_metric_snapshots gps
    group by gps.group_id, gps.player_id
  ),
  tag_rows as (
    select
      tags.group_id,
      tags.player_id,
      round(avg(tags.tag_evidence_coverage), 4) as tag_evidence_coverage
    from public.game_player_tag_metric_snapshots tags
    group by tags.group_id, tags.player_id
  ),
  tag_lanes as (
    select group_id, player_id, tag_code
    from (
      select
        tags.group_id,
        tags.player_id,
        tags.tag_code,
        row_number() over (
          partition by tags.group_id, tags.player_id
          order by avg(tags.tag_count::numeric) desc, tags.tag_code
        ) as tag_rank
      from public.game_player_tag_metric_snapshots tags
      group by tags.group_id, tags.player_id, tags.tag_code
    ) ranked_tags
    where tag_rank = 1
  ),
  milestone_rows as (
    select
      ms.group_id,
      ms.winner_player_id as player_id,
      count(*)::integer as milestones_claimed,
      round(avg((case when ms.winner_won_game then 1 else 0 end)::numeric), 4) as milestone_winner_win_rate,
      round(avg(ms.claimed_generation_number::numeric), 4) as average_milestone_claimed_generation
    from public.game_milestone_metric_snapshots ms
    group by ms.group_id, ms.winner_player_id
  ),
  award_rows as (
    select
      awards.group_id,
      awards.funder_player_id as player_id,
      count(*)::integer as awards_funded,
      count(*) filter (where awards.funder_got_first_place)::integer as funded_awards_won_first,
      count(*) filter (where awards.funder_got_second_place)::integer as funded_awards_won_second,
      count(*) filter (where awards.funder_missed_award)::integer as funded_awards_missed,
      round(avg(awards.funder_award_roi::numeric), 4) as average_award_roi
    from public.game_award_metric_snapshots awards
    group by awards.group_id, awards.funder_player_id
  )
  select
    a.group_id,
    a.player_id,
    a.games_played,
    a.wins,
    coalesce(a.win_rate, 0),
    coalesce(a.average_score, 0),
    coalesce(a.average_placement, 0),
    coalesce(a.average_points_per_generation, 0),
    a.average_normalized_efficiency,
    a.average_expected_score,
    a.average_score_delta_vs_expected,
    a.average_win_margin,
    a.average_loss_gap,
    a.close_game_count,
    a.close_game_wins,
    coalesce(a.close_game_win_rate, 0),
    best_source.score_source,
    coalesce(a.tr_score_share, 0),
    coalesce(a.card_score_share, 0),
    coalesce(a.cities_score_share, 0),
    coalesce(a.greenery_score_share, 0),
    coalesce(a.milestone_score_share, 0),
    coalesce(a.award_score_share, 0),
    tag_lanes.tag_code,
    coalesce(tag_rows.tag_evidence_coverage, 0),
    coalesce(milestone_rows.milestones_claimed, 0),
    coalesce(milestone_rows.milestone_winner_win_rate, 0),
    milestone_rows.average_milestone_claimed_generation,
    coalesce(award_rows.awards_funded, 0),
    coalesce(award_rows.funded_awards_won_first, 0),
    coalesce(award_rows.funded_awards_won_second, 0),
    coalesce(award_rows.funded_awards_missed, 0),
    coalesce(award_rows.average_award_roi, 0),
    now()
  from aggregate_rows a
  left join tag_rows
    on tag_rows.group_id = a.group_id
   and tag_rows.player_id = a.player_id
  left join tag_lanes
    on tag_lanes.group_id = a.group_id
   and tag_lanes.player_id = a.player_id
  left join milestone_rows
    on milestone_rows.group_id = a.group_id
   and milestone_rows.player_id = a.player_id
  left join award_rows
    on award_rows.group_id = a.group_id
   and award_rows.player_id = a.player_id
  left join lateral (
    select source_rows.score_source
    from (
      values
        ('tr', a.tr_score_share),
        ('card', a.card_score_share),
        ('cities', a.cities_score_share),
        ('greenery', a.greenery_score_share),
        ('milestone', a.milestone_score_share),
        ('award', a.award_score_share)
    ) as source_rows(score_source, source_share)
    order by source_rows.source_share desc nulls last, source_rows.score_source
    limit 1
  ) best_source on true;

  insert into public.player_map_metric_summaries (
    group_id,
    player_id,
    map_id,
    games_played,
    wins,
    win_rate,
    average_points,
    average_generations,
    average_points_per_generation,
    average_normalized_efficiency,
    average_score_delta_vs_expected,
    best_score_source_on_map,
    best_tag_lane_on_map,
    map_rank_for_player,
    updated_at
  )
  with map_aggregate_rows as (
    select
      gps.group_id,
      gps.player_id,
      gps.map_id,
      count(*)::integer as games_played,
      count(*) filter (where gps.is_winner)::integer as wins,
      round(count(*) filter (where gps.is_winner)::numeric / count(*), 4) as win_rate,
      round(avg(gps.total_points::numeric), 4) as average_points,
      round(avg(gps.generation_count::numeric), 4) as average_generations,
      round(avg(gps.points_per_generation), 4) as average_points_per_generation,
      round(avg(gps.normalized_efficiency), 4) as average_normalized_efficiency,
      round(avg(gps.score_delta_vs_expected), 4) as average_score_delta_vs_expected,
      round(avg(gps.tr_score_share), 4) as tr_score_share,
      round(avg(gps.card_score_share), 4) as card_score_share,
      round(avg(gps.cities_score_share), 4) as cities_score_share,
      round(avg(gps.greenery_score_share), 4) as greenery_score_share,
      round(avg(gps.milestone_score_share), 4) as milestone_score_share,
      round(avg(gps.award_score_share), 4) as award_score_share
    from public.game_player_metric_snapshots gps
    where gps.map_id is not null
    group by gps.group_id, gps.player_id, gps.map_id
  ),
  tag_lanes as (
    select group_id, player_id, map_id, tag_code
    from (
      select
        tags.group_id,
        tags.player_id,
        tags.map_id,
        tags.tag_code,
        row_number() over (
          partition by tags.group_id, tags.player_id, tags.map_id
          order by avg(tags.tag_count::numeric) desc, tags.tag_code
        ) as tag_rank
      from public.game_player_tag_metric_snapshots tags
      where tags.map_id is not null
      group by tags.group_id, tags.player_id, tags.map_id, tags.tag_code
    ) ranked_tags
    where tag_rank = 1
  ),
  ranked_maps as (
    select
      map_aggregate_rows.*,
      (rank() over (
        partition by map_aggregate_rows.group_id, map_aggregate_rows.player_id
        order by map_aggregate_rows.average_points_per_generation desc, map_aggregate_rows.map_id
      ))::integer as map_rank_for_player
    from map_aggregate_rows
  )
  select
    ranked_maps.group_id,
    ranked_maps.player_id,
    ranked_maps.map_id,
    ranked_maps.games_played,
    ranked_maps.wins,
    coalesce(ranked_maps.win_rate, 0),
    coalesce(ranked_maps.average_points, 0),
    coalesce(ranked_maps.average_generations, 0),
    coalesce(ranked_maps.average_points_per_generation, 0),
    ranked_maps.average_normalized_efficiency,
    ranked_maps.average_score_delta_vs_expected,
    best_source.score_source,
    tag_lanes.tag_code,
    ranked_maps.map_rank_for_player,
    now()
  from ranked_maps
  left join tag_lanes
    on tag_lanes.group_id = ranked_maps.group_id
   and tag_lanes.player_id = ranked_maps.player_id
   and tag_lanes.map_id = ranked_maps.map_id
  left join lateral (
    select source_rows.score_source
    from (
      values
        ('tr', ranked_maps.tr_score_share),
        ('card', ranked_maps.card_score_share),
        ('cities', ranked_maps.cities_score_share),
        ('greenery', ranked_maps.greenery_score_share),
        ('milestone', ranked_maps.milestone_score_share),
        ('award', ranked_maps.award_score_share)
    ) as source_rows(score_source, source_share)
    order by source_rows.source_share desc nulls last, source_rows.score_source
    limit 1
  ) best_source on true;

  insert into public.global_map_metric_summaries (
    map_id,
    player_count,
    games_played,
    average_points,
    average_generations,
    average_points_per_generation,
    average_normalized_efficiency,
    expected_score_baseline,
    highest_win_rate_corporation_id,
    highest_efficiency_style_code,
    best_tag_lane,
    updated_at
  )
  with eligible_snapshots as (
    select gps.*
    from public.game_player_metric_snapshots gps
    join public.group_settings gs on gs.group_id = gps.group_id
    where gs.global_analytics_enabled = true
      and gps.map_id is not null
  ),
  map_rows as (
    select
      map_id,
      player_count,
      count(distinct game_id)::integer as games_played,
      round(avg(total_points::numeric), 4) as average_points,
      round(avg(generation_count::numeric), 4) as average_generations,
      round(avg(points_per_generation), 4) as average_points_per_generation,
      round(avg(normalized_efficiency), 4) as average_normalized_efficiency,
      round(avg(expected_score), 4) as expected_score_baseline
    from eligible_snapshots
    group by map_id, player_count
  ),
  corporation_rank as (
    select map_id, player_count, corporation_id
    from (
      select
        map_id,
        player_count,
        corporation_id,
        row_number() over (
          partition by map_id, player_count
          order by avg((case when is_winner then 1 else 0 end)::numeric) desc,
            count(*) desc,
            corporation_id
        ) as corporation_rank
      from eligible_snapshots
      where corporation_id is not null
      group by map_id, player_count, corporation_id
    ) ranked_corporations
    where corporation_rank = 1
  ),
  style_rank as (
    select map_id, player_count, style_code
    from (
      select
        style_rows.map_id,
        style_rows.player_count,
        style_rows.style_code,
        row_number() over (
          partition by style_rows.map_id, style_rows.player_count
          order by avg(style_rows.normalized_efficiency) desc nulls last,
            count(*) desc,
            style_rows.style_code
        ) as style_rank
      from (
        select gps.map_id, gps.player_count, gps.normalized_efficiency, sd.code as style_code
        from eligible_snapshots gps
        join public.game_player_inferred_styles gpis
          on gpis.game_player_id = gps.game_player_id
         and gpis.is_primary
        join public.style_definitions sd on sd.id = gpis.style_definition_id

        union all

        select gps.map_id, gps.player_count, gps.normalized_efficiency, sd.code as style_code
        from eligible_snapshots gps
        join public.game_player_declared_styles gpds
          on gpds.game_player_id = gps.game_player_id
         and gpds.is_primary
        join public.style_definitions sd on sd.id = gpds.style_definition_id
        where not exists (
          select 1
          from public.game_player_inferred_styles gpis
          where gpis.game_player_id = gps.game_player_id
            and gpis.is_primary
        )
      ) style_rows
      group by style_rows.map_id, style_rows.player_count, style_rows.style_code
    ) ranked_styles
    where style_rank = 1
  ),
  tag_rank as (
    select map_id, player_count, tag_code
    from (
      select
        tags.map_id,
        gps.player_count,
        tags.tag_code,
        row_number() over (
          partition by tags.map_id, gps.player_count
          order by avg(tags.tag_count::numeric) desc, count(*) desc, tags.tag_code
        ) as tag_rank
      from public.game_player_tag_metric_snapshots tags
      join public.group_settings gs on gs.group_id = tags.group_id
      join public.game_player_metric_snapshots gps
        on gps.game_player_id = tags.game_player_id
      where gs.global_analytics_enabled = true
        and tags.map_id is not null
      group by tags.map_id, gps.player_count, tags.tag_code
    ) ranked_tags
    where tag_rank = 1
  )
  select
    map_rows.map_id,
    map_rows.player_count,
    map_rows.games_played,
    coalesce(map_rows.average_points, 0),
    coalesce(map_rows.average_generations, 0),
    coalesce(map_rows.average_points_per_generation, 0),
    map_rows.average_normalized_efficiency,
    map_rows.expected_score_baseline,
    corporation_rank.corporation_id,
    style_rank.style_code,
    tag_rank.tag_code,
    now()
  from map_rows
  left join corporation_rank
    on corporation_rank.map_id = map_rows.map_id
   and corporation_rank.player_count = map_rows.player_count
  left join style_rank
    on style_rank.map_id = map_rows.map_id
   and style_rank.player_count = map_rows.player_count
  left join tag_rank
    on tag_rank.map_id = map_rows.map_id
   and tag_rank.player_count = map_rows.player_count;

  insert into public.global_corporation_metric_summaries (
    corporation_id,
    map_id,
    player_count,
    games_played,
    wins,
    win_rate,
    average_points,
    average_points_per_generation,
    average_normalized_efficiency,
    updated_at
  )
  select
    gps.corporation_id,
    gps.map_id,
    gps.player_count,
    count(*)::integer,
    count(*) filter (where gps.is_winner)::integer,
    round(count(*) filter (where gps.is_winner)::numeric / count(*), 4),
    round(avg(gps.total_points::numeric), 4),
    round(avg(gps.points_per_generation), 4),
    round(avg(gps.normalized_efficiency), 4),
    now()
  from public.game_player_metric_snapshots gps
  join public.group_settings gs on gs.group_id = gps.group_id
  where gs.global_analytics_enabled = true
    and gps.corporation_id is not null
  group by gps.corporation_id, gps.map_id, gps.player_count;

  insert into public.global_style_metric_summaries (
    style_code,
    map_id,
    player_count,
    games_played,
    wins,
    win_rate,
    average_points,
    average_points_per_generation,
    average_normalized_efficiency,
    updated_at
  )
  with style_rows as (
    select gps.*, sd.code as style_code
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    join public.game_player_inferred_styles gpis
      on gpis.game_player_id = gps.game_player_id
     and gpis.is_primary
    join public.style_definitions sd on sd.id = gpis.style_definition_id

    union all

    select gps.*, sd.code as style_code
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    join public.game_player_declared_styles gpds
      on gpds.game_player_id = gps.game_player_id
     and gpds.is_primary
    join public.style_definitions sd on sd.id = gpds.style_definition_id
    where not exists (
      select 1
      from public.game_player_inferred_styles gpis
      where gpis.game_player_id = gps.game_player_id
        and gpis.is_primary
    )
  )
  select
    style_rows.style_code,
    style_rows.map_id,
    style_rows.player_count,
    count(*)::integer,
    count(*) filter (where style_rows.is_winner)::integer,
    round(count(*) filter (where style_rows.is_winner)::numeric / count(*), 4),
    round(avg(style_rows.total_points::numeric), 4),
    round(avg(style_rows.points_per_generation), 4),
    round(avg(style_rows.normalized_efficiency), 4),
    now()
  from style_rows
  group by style_rows.style_code, style_rows.map_id, style_rows.player_count;

  insert into public.global_tag_metric_summaries (
    tag_code,
    map_id,
    player_count,
    games_played,
    wins,
    win_rate,
    average_points,
    average_points_per_generation,
    average_normalized_efficiency,
    average_tag_count,
    updated_at
  )
  select
    tags.tag_code,
    tags.map_id,
    gps.player_count,
    count(*)::integer,
    count(*) filter (where tags.is_winner)::integer,
    round(count(*) filter (where tags.is_winner)::numeric / count(*), 4),
    round(avg(tags.total_points::numeric), 4),
    round(avg(tags.points_per_generation), 4),
    round(avg(gps.normalized_efficiency), 4),
    round(avg(tags.tag_count::numeric), 4),
    now()
  from public.game_player_tag_metric_snapshots tags
  join public.group_settings gs
    on gs.group_id = tags.group_id
   and gs.global_analytics_enabled = true
  join public.game_player_metric_snapshots gps
    on gps.game_player_id = tags.game_player_id
  group by tags.tag_code, tags.map_id, gps.player_count;

  insert into public.global_milestone_metric_summaries (
    milestone_id,
    map_id,
    player_count,
    games_played,
    winner_wins,
    milestone_winner_win_rate,
    average_winner_points_per_generation,
    average_claimed_generation,
    updated_at
  )
  select
    ms.milestone_id,
    ms.map_id,
    ms.player_count,
    count(distinct ms.game_id)::integer,
    count(*) filter (where ms.winner_won_game)::integer,
    round(avg((case when ms.winner_won_game then 1 else 0 end)::numeric), 4),
    round(avg(ms.winner_points_per_generation), 4),
    round(avg(ms.claimed_generation_number::numeric), 4),
    now()
  from public.game_milestone_metric_snapshots ms
  join public.group_settings gs
    on gs.group_id = ms.group_id
   and gs.global_analytics_enabled = true
  group by ms.milestone_id, ms.map_id, ms.player_count;

  insert into public.global_award_metric_summaries (
    award_id,
    map_id,
    player_count,
    games_played,
    funder_wins,
    funder_success_rate,
    winner_wins,
    award_winner_win_rate,
    average_award_roi,
    winner_funder_mismatch_rate,
    average_funded_generation,
    updated_at
  )
  select
    awards.award_id,
    awards.map_id,
    awards.player_count,
    count(distinct awards.game_id)::integer,
    count(*) filter (where awards.funder_won_game)::integer,
    round(avg((case when not awards.funder_missed_award then 1 else 0 end)::numeric), 4),
    count(*) filter (where awards.winner_won_game)::integer,
    round(avg((case when awards.winner_won_game then 1 else 0 end)::numeric), 4),
    round(avg(awards.funder_award_roi::numeric), 4),
    round(avg((case when awards.winner_player_id <> awards.funder_player_id then 1 else 0 end)::numeric), 4),
    round(avg(awards.funded_generation_number::numeric), 4),
    now()
  from public.game_award_metric_snapshots awards
  join public.group_settings gs
    on gs.group_id = awards.group_id
   and gs.global_analytics_enabled = true
  group by awards.award_id, awards.map_id, awards.player_count;

  insert into public.global_player_count_metric_summaries (
    player_count,
    games_played,
    average_points,
    average_generations,
    average_points_per_generation,
    expected_score_baseline,
    updated_at
  )
  select
    gps.player_count,
    count(distinct gps.game_id)::integer,
    round(avg(gps.total_points::numeric), 4),
    round(avg(gps.generation_count::numeric), 4),
    round(avg(gps.points_per_generation), 4),
    round(avg(gps.expected_score), 4),
    now()
  from public.game_player_metric_snapshots gps
  join public.group_settings gs
    on gs.group_id = gps.group_id
   and gs.global_analytics_enabled = true
  group by gps.player_count;

  insert into public.global_generation_metric_summaries (
    generation_count,
    games_played,
    average_points,
    average_points_per_generation,
    expected_score_baseline,
    updated_at
  )
  select
    gps.generation_count,
    count(distinct gps.game_id)::integer,
    round(avg(gps.total_points::numeric), 4),
    round(avg(gps.points_per_generation), 4),
    round(avg(gps.expected_score), 4),
    now()
  from public.game_player_metric_snapshots gps
  join public.group_settings gs
    on gs.group_id = gps.group_id
   and gs.global_analytics_enabled = true
  group by gps.generation_count;
end;
$$;

create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid,
  p_require_editor boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game_status public.game_status;
begin
  if p_game_id is null then
    raise exception 'game id is required'
      using errcode = '22004';
  end if;

  if p_require_editor and not public.can_edit_game(p_game_id) then
    raise exception 'not authorized to refresh metric snapshots for game %', p_game_id
      using errcode = '42501';
  end if;

  select g.status
  into v_game_status
  from public.games g
  where g.id = p_game_id
  for update;

  if not found then
    raise exception 'game % does not exist', p_game_id
      using errcode = 'P0002';
  end if;

  delete from public.game_player_tag_metric_snapshots
  where game_id = p_game_id;

  delete from public.game_milestone_metric_snapshots
  where game_id = p_game_id;

  delete from public.game_award_metric_snapshots
  where game_id = p_game_id;

  delete from public.game_player_metric_snapshots
  where game_id = p_game_id;

  if v_game_status <> 'finalized' then
    perform public.rebuild_metric_summaries();
    return;
  end if;

  insert into public.game_player_metric_snapshots (
    game_id,
    game_player_id,
    group_id,
    player_id,
    map_id,
    corporation_id,
    player_count,
    generation_count,
    placement,
    is_winner,
    total_points,
    points_per_generation,
    normalized_efficiency,
    expected_score,
    score_delta_vs_expected,
    cities_points_per_generation,
    greenery_points_per_generation,
    card_points_per_generation,
    tr_points_per_generation,
    milestone_points_per_generation,
    award_points_per_generation,
    card_points_per_played_card,
    played_card_count,
    matched_played_card_count,
    unresolved_played_card_count,
    total_tag_count,
    tr_score_share,
    card_score_share,
    cities_score_share,
    greenery_score_share,
    milestone_score_share,
    award_score_share,
    win_margin_points,
    loss_gap_points,
    close_game
  )
  with target_players as (
    select
      g.id as game_id,
      g.group_id,
      g.map_id,
      g.player_count,
      g.generation_count,
      gp.id as game_player_id,
      gp.player_id,
      gp.corporation_id,
      gp.placement,
      gp.is_winner,
      gp.total_points,
      gp.cities_points,
      gp.greenery_points,
      gp.card_points_total,
      gp.tr_points,
      gp.milestone_points,
      gp.award_points
    from public.games g
    join public.game_players gp on gp.game_id = g.id
    where g.id = p_game_id
      and g.status = 'finalized'
  ),
  tag_summary_matches as (
    -- Canonical tag summaries are created by the import pipeline from played-card
    -- events and card source tags; refresh reads them instead of re-parsing raw events.
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.game_log_import_id,
      glts.played_card_count,
      glts.matched_card_count,
      glts.unresolved_card_count,
      glts.total_tag_count
    from public.game_log_imports gli
    join public.game_log_tag_summaries glts
      on glts.game_log_import_id = gli.id
    left join lateral (
      select gp_resolved.id as game_player_id
      from public.game_players gp_resolved
      join public.players p_resolved on p_resolved.id = gp_resolved.player_id
      where gp_resolved.game_id = gli.game_id
        and public.metric_normalized_label(p_resolved.display_name) = glts.normalized_player_name
      order by gp_resolved.id
      limit 1
    ) resolved_player on glts.game_player_id is null
    where gli.game_id = p_game_id
  ),
  player_tag_rollups as (
    select
      import_rollups.game_player_id,
      sum(import_rollups.played_card_count)::integer as played_card_count,
      sum(import_rollups.matched_card_count)::integer as matched_played_card_count,
      sum(import_rollups.unresolved_card_count)::integer as unresolved_played_card_count,
      sum(import_rollups.total_tag_count)::integer as total_tag_count
    from (
      select
        tag_summary_matches.game_player_id,
        tag_summary_matches.game_log_import_id,
        max(tag_summary_matches.played_card_count) as played_card_count,
        max(tag_summary_matches.matched_card_count) as matched_card_count,
        max(tag_summary_matches.unresolved_card_count) as unresolved_card_count,
        max(tag_summary_matches.total_tag_count) as total_tag_count
      from tag_summary_matches
      where tag_summary_matches.game_player_id is not null
      group by tag_summary_matches.game_player_id, tag_summary_matches.game_log_import_id
    ) import_rollups
    group by import_rollups.game_player_id
  ),
  score_rows as (
    select
      tp.*,
      coalesce(player_tag_rollups.played_card_count, 0) as played_card_count,
      coalesce(player_tag_rollups.matched_played_card_count, 0) as matched_played_card_count,
      coalesce(player_tag_rollups.unresolved_played_card_count, 0) as unresolved_played_card_count,
      coalesce(player_tag_rollups.total_tag_count, 0) as total_tag_count,
      expected.expected_score,
      case
        when tp.is_winner then (
          select (tp.total_points - max(gp_other.total_points))::integer
          from public.game_players gp_other
          where gp_other.game_id = tp.game_id
            and gp_other.id <> tp.game_player_id
        )
        else null
      end as win_margin_points,
      case
        when not tp.is_winner then (
          select (min(gp_winner.total_points) - tp.total_points)::integer
          from public.game_players gp_winner
          where gp_winner.game_id = tp.game_id
            and gp_winner.is_winner
        )
        else null
      end as loss_gap_points
    from target_players tp
    left join player_tag_rollups on player_tag_rollups.game_player_id = tp.game_player_id
    left join lateral (
      select coalesce(
        (
          select round(avg(gps.total_points::numeric), 4)
          from public.games baseline_game
          join public.game_players gps on gps.game_id = baseline_game.id
          where baseline_game.id <> tp.game_id
            and baseline_game.status = 'finalized'
            and baseline_game.map_id is not distinct from tp.map_id
            and baseline_game.player_count = tp.player_count
            and baseline_game.generation_count = tp.generation_count
        ),
        (
          select round(avg(gps.total_points::numeric), 4)
          from public.games baseline_game
          join public.game_players gps on gps.game_id = baseline_game.id
          where baseline_game.id <> tp.game_id
            and baseline_game.status = 'finalized'
            and baseline_game.player_count = tp.player_count
            and baseline_game.generation_count = tp.generation_count
        ),
        (
          select round(avg(gps.total_points::numeric), 4)
          from public.games baseline_game
          join public.game_players gps on gps.game_id = baseline_game.id
          where baseline_game.id <> tp.game_id
            and baseline_game.status = 'finalized'
            and baseline_game.player_count = tp.player_count
        )
      ) as expected_score
    ) expected on true
  )
  select
    score_rows.game_id,
    score_rows.game_player_id,
    score_rows.group_id,
    score_rows.player_id,
    score_rows.map_id,
    score_rows.corporation_id,
    score_rows.player_count,
    score_rows.generation_count,
    score_rows.placement,
    score_rows.is_winner,
    score_rows.total_points,
    round(score_rows.total_points::numeric / score_rows.generation_count, 4),
    case
      when score_rows.expected_score is null or score_rows.expected_score = 0 then null
      else round(score_rows.total_points::numeric / score_rows.expected_score, 4)
    end,
    score_rows.expected_score,
    case
      when score_rows.expected_score is null then null
      else round(score_rows.total_points::numeric - score_rows.expected_score, 4)
    end,
    round(score_rows.cities_points::numeric / score_rows.generation_count, 4),
    round(score_rows.greenery_points::numeric / score_rows.generation_count, 4),
    round(score_rows.card_points_total::numeric / score_rows.generation_count, 4),
    round(score_rows.tr_points::numeric / score_rows.generation_count, 4),
    round(score_rows.milestone_points::numeric / score_rows.generation_count, 4),
    round(score_rows.award_points::numeric / score_rows.generation_count, 4),
    case
      when score_rows.played_card_count = 0 then null
      else round(score_rows.card_points_total::numeric / score_rows.played_card_count, 4)
    end,
    score_rows.played_card_count,
    score_rows.matched_played_card_count,
    score_rows.unresolved_played_card_count,
    score_rows.total_tag_count,
    coalesce(round(score_rows.tr_points::numeric / nullif(score_rows.total_points, 0), 4), 0),
    coalesce(round(score_rows.card_points_total::numeric / nullif(score_rows.total_points, 0), 4), 0),
    coalesce(round(score_rows.cities_points::numeric / nullif(score_rows.total_points, 0), 4), 0),
    coalesce(round(score_rows.greenery_points::numeric / nullif(score_rows.total_points, 0), 4), 0),
    coalesce(round(score_rows.milestone_points::numeric / nullif(score_rows.total_points, 0), 4), 0),
    coalesce(round(score_rows.award_points::numeric / nullif(score_rows.total_points, 0), 4), 0),
    score_rows.win_margin_points,
    score_rows.loss_gap_points,
    coalesce(abs(coalesce(score_rows.win_margin_points, score_rows.loss_gap_points)) <= 5, false)
  from score_rows;

  insert into public.game_player_tag_metric_snapshots (
    game_id,
    game_player_id,
    group_id,
    player_id,
    map_id,
    tag_code,
    tag_count,
    tag_share,
    total_tag_count,
    played_card_count,
    matched_card_count,
    unresolved_card_count,
    tag_evidence_coverage,
    is_winner,
    total_points,
    points_per_generation
  )
  with tag_summary_matches as (
    -- Canonical tag summaries are created by the import pipeline from played-card
    -- events and card source tags; refresh reads them instead of re-parsing raw events.
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.game_log_import_id,
      glts.tag_code,
      glts.tag_count,
      glts.played_card_count,
      glts.matched_card_count,
      glts.unresolved_card_count,
      glts.total_tag_count,
      glts.tag_evidence_coverage
    from public.game_log_imports gli
    join public.game_log_tag_summaries glts
      on glts.game_log_import_id = gli.id
    left join lateral (
      select gp_resolved.id as game_player_id
      from public.game_players gp_resolved
      join public.players p_resolved on p_resolved.id = gp_resolved.player_id
      where gp_resolved.game_id = gli.game_id
        and public.metric_normalized_label(p_resolved.display_name) = glts.normalized_player_name
      order by gp_resolved.id
      limit 1
    ) resolved_player on glts.game_player_id is null
    where gli.game_id = p_game_id
  ),
  tag_counts as (
    select
      tag_summary_matches.game_player_id,
      tag_summary_matches.tag_code,
      sum(tag_summary_matches.tag_count)::integer as tag_count
    from tag_summary_matches
    where tag_summary_matches.game_player_id is not null
    group by tag_summary_matches.game_player_id, tag_summary_matches.tag_code
  ),
  player_tag_rollups as (
    select
      import_rollups.game_player_id,
      sum(import_rollups.played_card_count)::integer as played_card_count,
      sum(import_rollups.matched_card_count)::integer as matched_card_count,
      sum(import_rollups.unresolved_card_count)::integer as unresolved_card_count,
      sum(import_rollups.total_tag_count)::integer as total_tag_count,
      case
        when sum(import_rollups.played_card_count) = 0 then 0
        else round(sum(import_rollups.matched_card_count)::numeric / sum(import_rollups.played_card_count), 4)
      end as tag_evidence_coverage
    from (
      select
        tag_summary_matches.game_player_id,
        tag_summary_matches.game_log_import_id,
        max(tag_summary_matches.played_card_count) as played_card_count,
        max(tag_summary_matches.matched_card_count) as matched_card_count,
        max(tag_summary_matches.unresolved_card_count) as unresolved_card_count,
        max(tag_summary_matches.total_tag_count) as total_tag_count
      from tag_summary_matches
      where tag_summary_matches.game_player_id is not null
      group by tag_summary_matches.game_player_id, tag_summary_matches.game_log_import_id
    ) import_rollups
    group by import_rollups.game_player_id
  )
  select
    gps.game_id,
    gps.game_player_id,
    gps.group_id,
    gps.player_id,
    gps.map_id,
    tag_counts.tag_code,
    tag_counts.tag_count,
    coalesce(round(tag_counts.tag_count::numeric / nullif(player_tag_rollups.total_tag_count, 0), 4), 0),
    player_tag_rollups.total_tag_count,
    coalesce(player_tag_rollups.played_card_count, 0),
    coalesce(player_tag_rollups.matched_card_count, 0),
    coalesce(player_tag_rollups.unresolved_card_count, 0),
    coalesce(player_tag_rollups.tag_evidence_coverage, 0),
    gps.is_winner,
    gps.total_points,
    gps.points_per_generation
  from tag_counts
  join public.game_player_metric_snapshots gps
    on gps.game_player_id = tag_counts.game_player_id
  join player_tag_rollups on player_tag_rollups.game_player_id = tag_counts.game_player_id
  where gps.game_id = p_game_id
    and tag_counts.tag_code is not null;

  insert into public.game_milestone_metric_snapshots (
    game_id,
    game_milestone_id,
    group_id,
    map_id,
    milestone_id,
    winner_game_player_id,
    winner_player_id,
    winner_final_placement,
    winner_total_points,
    winner_points_per_generation,
    winner_won_game,
    claimed_generation_number,
    claimed_timing_bucket,
    player_count,
    generation_count
  )
  select
    gm.game_id,
    gm.id,
    gps.group_id,
    gps.map_id,
    gm.milestone_id,
    gm.winner_game_player_id,
    gps.player_id,
    gps.placement,
    gps.total_points,
    gps.points_per_generation,
    gps.is_winner,
    milestone_event.claimed_generation_number,
    public.metric_timing_bucket(milestone_event.claimed_generation_number, gps.generation_count),
    gps.player_count,
    gps.generation_count
  from public.game_milestones gm
  join public.game_player_metric_snapshots gps
    on gps.game_player_id = gm.winner_game_player_id
  join public.milestones m on m.id = gm.milestone_id
  left join lateral (
    select null::integer as claimed_generation_number
  ) milestone_event on true
  where gm.game_id = p_game_id;

  insert into public.game_award_metric_snapshots (
    game_id,
    game_award_id,
    group_id,
    map_id,
    award_id,
    place,
    funded_by_game_player_id,
    funder_player_id,
    winner_game_player_id,
    winner_player_id,
    winner_final_placement,
    winner_total_points,
    winner_points_per_generation,
    winner_won_game,
    funder_final_placement,
    funder_won_game,
    funder_award_points,
    funder_award_roi,
    funded_generation_number,
    funded_timing_bucket,
    funder_got_first_place,
    funder_got_second_place,
    funder_missed_award,
    player_count,
    generation_count
  )
  select
    ga.game_id,
    ga.id,
    winner_snapshot.group_id,
    winner_snapshot.map_id,
    ga.award_id,
    ga.place,
    ga.funded_by_game_player_id,
    funder_snapshot.player_id,
    ga.winner_game_player_id,
    winner_snapshot.player_id,
    winner_snapshot.placement,
    winner_snapshot.total_points,
    winner_snapshot.points_per_generation,
    winner_snapshot.is_winner,
    funder_snapshot.placement,
    funder_snapshot.is_winner,
    case
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 1 then 5
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 2 then 2
      else 0
    end as funder_award_points,
    -- Current ROI rule: first place earns 5, second earns 2, missed earns 0, minus a simple funding cost of 8.
    case
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 1 then 5
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 2 then 2
      else 0
    end - 8 as funder_award_roi,
    award_event.funded_generation_number,
    public.metric_timing_bucket(award_event.funded_generation_number, winner_snapshot.generation_count),
    ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 1,
    ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 2,
    ga.funded_by_game_player_id <> ga.winner_game_player_id,
    winner_snapshot.player_count,
    winner_snapshot.generation_count
  from public.game_awards ga
  join public.game_player_metric_snapshots winner_snapshot
    on winner_snapshot.game_player_id = ga.winner_game_player_id
  join public.game_player_metric_snapshots funder_snapshot
    on funder_snapshot.game_player_id = ga.funded_by_game_player_id
  join public.awards a on a.id = ga.award_id
  left join lateral (
    select null::integer as funded_generation_number
  ) award_event on true
  where ga.game_id = p_game_id;

  perform public.rebuild_metric_summaries();
end;
$$;

-- Replace tag summaries inside one database function so delete+insert is
-- transactionally rolled back together when any row is invalid.
create or replace function public.replace_game_log_tag_summaries(
  p_game_log_import_id uuid,
  p_summaries jsonb
)
returns table (
  id uuid,
  tag_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_summaries jsonb := coalesce(p_summaries, '[]'::jsonb);
  v_game_id uuid;
begin
  if p_game_log_import_id is null then
    raise exception 'game log import id is required'
      using errcode = '22004';
  end if;

  if jsonb_typeof(normalized_summaries) <> 'array' then
    raise exception 'p_summaries must be a JSON array'
      using errcode = '22023';
  end if;

  select gli.game_id
  into v_game_id
  from public.game_log_imports gli
  where gli.id = p_game_log_import_id
  for update;

  if not found then
    raise exception 'game log import % does not exist', p_game_log_import_id
      using errcode = 'P0002';
  end if;

  if not public.can_edit_game(v_game_id) then
    raise exception 'not authorized to replace tag summaries for import %', p_game_log_import_id
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_summaries) as summary_item
    where nullif(summary_item ->> 'game_player_id', '') is not null
      and not exists (
        select 1
        from public.game_players gp
        where gp.id = nullif(summary_item ->> 'game_player_id', '')::uuid
          and gp.game_id = v_game_id
      )
  ) then
    raise exception 'summary game_player_id must belong to import game %', v_game_id
      using errcode = '23503';
  end if;

  delete from public.game_log_tag_summaries glts
  where glts.game_log_import_id = p_game_log_import_id;

  if jsonb_array_length(normalized_summaries) = 0 then
    return;
  end if;

  insert into public.game_log_tag_summaries (
    game_log_import_id,
    game_player_id,
    player_name,
    normalized_player_name,
    tag_code,
    tag_count,
    played_card_count,
    matched_card_count,
    unresolved_card_count,
    total_tag_count,
    tag_evidence_coverage
  )
  select
    p_game_log_import_id,
    nullif(summary_item ->> 'game_player_id', '')::uuid,
    summary_item ->> 'player_name',
    summary_item ->> 'normalized_player_name',
    summary_item ->> 'tag_code',
    coalesce(nullif(summary_item ->> 'tag_count', '')::integer, 0),
    coalesce(nullif(summary_item ->> 'played_card_count', '')::integer, 0),
    coalesce(nullif(summary_item ->> 'matched_card_count', '')::integer, 0),
    coalesce(nullif(summary_item ->> 'unresolved_card_count', '')::integer, 0),
    coalesce(nullif(summary_item ->> 'total_tag_count', '')::integer, 0),
    coalesce(
      nullif(summary_item ->> 'tag_evidence_coverage', '')::numeric,
      case
        when coalesce(nullif(summary_item ->> 'played_card_count', '')::integer, 0) = 0 then 0
        else round(
          coalesce(nullif(summary_item ->> 'matched_card_count', '')::numeric, 0)
          / nullif(coalesce(nullif(summary_item ->> 'played_card_count', '')::numeric, 0), 0),
          4
        )
      end
    )
  from jsonb_array_elements(normalized_summaries) as summary_item;

  return query
  select glts.id, glts.tag_code
  from public.game_log_tag_summaries glts
  where glts.game_log_import_id = p_game_log_import_id
  order by glts.normalized_player_name, glts.tag_code;
end;
$$;

-- This project currently exposes client RPCs in the public schema. This
-- SECURITY DEFINER function is intentionally kept public so refresh logic can
-- rebuild derived metric rows without broad table mutation policies.
create or replace function public.refresh_game_metric_snapshots(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_game_id is null or not public.can_edit_game(p_game_id) then
    raise exception 'not authorized to refresh metric snapshots for game %', p_game_id
      using errcode = '42501';
  end if;

  perform public.refresh_game_metric_snapshots_internal(p_game_id, true);
end;
$$;

-- Full rebuilds can touch cross-group and global aggregates, so this RPC is
-- service/admin-only until a narrower application gate is designed.
create or replace function public.refresh_all_metric_snapshots()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  finalized_game record;
begin
  delete from public.game_player_tag_metric_snapshots;
  delete from public.game_milestone_metric_snapshots;
  delete from public.game_award_metric_snapshots;
  delete from public.game_player_metric_snapshots;

  perform public.rebuild_metric_summaries();

  for finalized_game in
    select g.id
    from public.games g
    where g.status = 'finalized'
    order by g.finalized_at nulls last, g.created_at, g.id
  loop
    perform public.refresh_game_metric_snapshots_internal(finalized_game.id, false);
  end loop;
end;
$$;

revoke execute on function public.refresh_game_metric_snapshots(uuid) from public;
revoke execute on function public.refresh_game_metric_snapshots(uuid) from anon;
revoke execute on function public.refresh_game_metric_snapshots(uuid) from authenticated;
revoke execute on function public.replace_game_log_tag_summaries(uuid, jsonb) from public;
revoke execute on function public.replace_game_log_tag_summaries(uuid, jsonb) from anon;
revoke execute on function public.replace_game_log_tag_summaries(uuid, jsonb) from authenticated;
revoke execute on function public.replace_game_log_tag_summaries(uuid, jsonb) from service_role;
revoke execute on function public.rebuild_metric_summaries() from public;
revoke execute on function public.rebuild_metric_summaries() from anon;
revoke execute on function public.rebuild_metric_summaries() from authenticated;
revoke execute on function public.rebuild_metric_summaries() from service_role;
revoke execute on function public.refresh_game_metric_snapshots_internal(uuid, boolean) from public;
revoke execute on function public.refresh_game_metric_snapshots_internal(uuid, boolean) from anon;
revoke execute on function public.refresh_game_metric_snapshots_internal(uuid, boolean) from authenticated;
revoke execute on function public.refresh_game_metric_snapshots_internal(uuid, boolean) from service_role;
revoke execute on function public.refresh_all_metric_snapshots() from public;
revoke execute on function public.refresh_all_metric_snapshots() from anon;
revoke execute on function public.refresh_all_metric_snapshots() from authenticated;
grant execute on function public.refresh_game_metric_snapshots(uuid) to authenticated;
grant execute on function public.refresh_game_metric_snapshots(uuid) to service_role;
grant execute on function public.replace_game_log_tag_summaries(uuid, jsonb) to authenticated;
grant execute on function public.refresh_all_metric_snapshots() to service_role;
