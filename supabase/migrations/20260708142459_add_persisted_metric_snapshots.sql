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

create or replace function public.refresh_game_metric_snapshots(p_game_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform p_game_id;
end;
$$;

create or replace function public.refresh_all_metric_snapshots()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  return;
end;
$$;

revoke execute on function public.refresh_game_metric_snapshots(uuid) from public;
revoke execute on function public.refresh_game_metric_snapshots(uuid) from anon;
revoke execute on function public.refresh_all_metric_snapshots() from public;
revoke execute on function public.refresh_all_metric_snapshots() from anon;
grant execute on function public.refresh_game_metric_snapshots(uuid) to authenticated;
grant execute on function public.refresh_all_metric_snapshots() to authenticated;
