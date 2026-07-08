# Persisted Supabase Efficiency Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Terraforming Mars efficiency, map, tag, award, milestone, profile, and global winning metrics in Supabase and read those prepared rows in the profile, insights, and native dashboards.

**Architecture:** Add persisted public metric snapshot and summary tables with RLS, a database refresh RPC that rebuilds metrics from finalized game facts, and TypeScript repository methods that read those persisted rows. The UI receives prepared Supabase-backed metrics and only formats, filters, or selects display subsets.

**Tech Stack:** Supabase Postgres migrations and RPCs, Row Level Security, Next.js server components/actions, TypeScript, React, Vitest, React Testing Library.

---

## Execution Notes

Start implementation in an isolated worktree or clean branch because the current checkout has unrelated import work in progress. Preserve unrelated local edits.

Use Windows-safe commands:

```powershell
npm.cmd run test -- src/lib/db/analytics-repo.test.ts
npx.cmd tsc --noEmit --pretty false
git diff --check
```

For Supabase CLI work, first run the help command in the implementation session:

```powershell
npx.cmd supabase --help
npx.cmd supabase db --help
npx.cmd supabase db query --help
```

If local Supabase is blocked by Docker, record the exact error and rely on static SQL verification plus focused Vitest tests until the local database is available.

## File Structure

Create:

- `supabase/migrations/<generated>_add_persisted_metric_snapshots.sql`: metric tables, indexes, RLS policies, grants, and refresh RPCs.
- `supabase/tests/persisted_metrics_schema_verification.sql`: information-schema checks for tables, columns, indexes, policies, and functions.
- `supabase/tests/persisted_metrics_refresh_verification.sql`: database-level smoke query for the refresh RPC against seeded finalized games.
- `src/lib/db/metric-refresh-repo.ts`: small server-side helper for calling `refresh_game_metric_snapshots`.
- `src/lib/db/metric-refresh-repo.test.ts`: RPC call behavior.
- `src/features/analytics/efficiency-summary.tsx`: compact cards for profile/group efficiency rows.
- `src/features/analytics/map-performance-list.tsx`: map performance rows for profile and insights.
- `src/features/analytics/award-milestone-summary.tsx`: award funding and milestone tempo rows.
- `src/features/analytics/global-metric-board.tsx`: aggregate global metric rows for opted-in data.

Modify:

- `src/lib/db/analytics-repo.ts`: add persisted metric types, mappers, list/get methods, and include metrics in `ProfileAnalytics` and `GroupAnalytics`.
- `src/lib/db/analytics-repo.test.ts`: repository mapping and query coverage.
- `src/lib/db/game-draft-repo.ts`: call refresh RPC after finalized game writes finish.
- `src/lib/db/game-draft-repo.test.ts`: verify refresh call after finalization.
- `src/lib/db/game-import-repo.ts`: call refresh RPC after tag summaries are saved for a finalized game.
- `src/lib/db/game-import-repo.test.ts`: verify tag-summary refresh path.
- `src/features/analytics/profile-dashboard.tsx`: add efficiency, map, award, milestone, and tag profile sections.
- `src/features/analytics/profile-dashboard.test.tsx`: render coverage for new sections.
- `src/features/analytics/group-dashboard.tsx`: add group efficiency/map summaries.
- `src/features/analytics/group-dashboard.test.tsx`: render coverage for group additions.
- `src/features/insights/insights-dashboard.tsx`: add map, efficiency, award, milestone, tag, and global panels.
- `src/features/insights/insights-dashboard.test.tsx`: render coverage for new insights panels.
- `src/features/insights/build-insight-cards.ts`: add sentence-form insight cards for efficiency, map, award ROI, milestones, and tag lanes.
- `src/features/insights/build-insight-cards.test.ts`: focused card assertions.
- `src/features/native/load-native-dashboard.ts`: pull persisted profile/global metric rows.
- `src/features/native/native-dashboard-screen.tsx`: display compact metric rows.
- `src/features/native/native-dashboard-screen.test.tsx`: native dashboard expectations.
- `supabase/tests/analytics_verification.sql`: include persisted metric tables in verification output.

## Task 1: Schema And Static Verification

**Files:**
- Create: `supabase/migrations/<generated>_add_persisted_metric_snapshots.sql`
- Create: `supabase/tests/persisted_metrics_schema_verification.sql`
- Modify: `supabase/tests/analytics_verification.sql`

- [ ] **Step 1: Create the migration file with the Supabase CLI**

Run:

```powershell
npx.cmd supabase migration new add_persisted_metric_snapshots
```

Expected: a new file appears under `supabase/migrations` with a timestamped name ending in `add_persisted_metric_snapshots.sql`.

- [ ] **Step 2: Write the failing schema verification query**

Create `supabase/tests/persisted_metrics_schema_verification.sql`:

```sql
with expected_tables(table_name) as (
  values
    ('game_player_metric_snapshots'),
    ('game_player_tag_metric_snapshots'),
    ('game_milestone_metric_snapshots'),
    ('game_award_metric_snapshots'),
    ('player_metric_summaries'),
    ('player_map_metric_summaries'),
    ('global_corporation_metric_summaries'),
    ('global_style_metric_summaries'),
    ('global_tag_metric_summaries'),
    ('global_map_metric_summaries'),
    ('global_milestone_metric_summaries'),
    ('global_award_metric_summaries'),
    ('global_player_count_metric_summaries'),
    ('global_generation_metric_summaries')
),
expected_functions(function_name) as (
  values
    ('refresh_game_metric_snapshots'),
    ('refresh_all_metric_snapshots')
)
select 'missing_table' as check_name, expected_tables.table_name as object_name
from expected_tables
left join information_schema.tables
  on tables.table_schema = 'public'
 and tables.table_name = expected_tables.table_name
where tables.table_name is null

union all

select 'missing_function' as check_name, expected_functions.function_name as object_name
from expected_functions
left join information_schema.routines
  on routines.specific_schema = 'public'
 and routines.routine_name = expected_functions.function_name
where routines.routine_name is null

union all

select 'missing_rls' as check_name, expected_tables.table_name as object_name
from expected_tables
join pg_class on pg_class.relname = expected_tables.table_name
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and pg_class.relrowsecurity = false
order by check_name, object_name;
```

- [ ] **Step 3: Run the schema verification before implementation**

Run after applying the current migrations to a local database:

```powershell
npx.cmd supabase db query --local -f supabase/tests/persisted_metrics_schema_verification.sql
```

Expected before the migration exists: rows with `missing_table` and `missing_function`. If local Supabase cannot start, record the blocker and continue to Task 3 with static Vitest checks.

- [ ] **Step 4: Add metric tables to the migration**

Add table DDL to the new migration file. Use `numeric(12, 4)` for ratios/efficiencies and keep IDs nullable only where the source facts are nullable.

```sql
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
```

- [ ] **Step 5: Add summary tables to the migration**

Add this block in the same migration:

```sql
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
```

- [ ] **Step 6: Add indexes, RLS, and policies**

Append to the migration:

```sql
create index game_player_metric_snapshots_group_player_idx
on public.game_player_metric_snapshots (group_id, player_id);

create index game_player_metric_snapshots_map_idx
on public.game_player_metric_snapshots (map_id, player_count, generation_count);

create index game_player_tag_metric_snapshots_group_tag_idx
on public.game_player_tag_metric_snapshots (group_id, tag_code);

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
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = player_metric_summaries.group_id
      and gm.user_id = auth.uid()
  )
);

create policy "members read player map metric summaries"
on public.player_map_metric_summaries for select
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = player_map_metric_summaries.group_id
      and gm.user_id = auth.uid()
  )
);
```

For global tables, add authenticated read policies:

```sql
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
```

- [ ] **Step 7: Update analytics verification output**

Modify `supabase/tests/analytics_verification.sql` by adding the persisted table names to the view/table discovery query so future verification shows these objects.

- [ ] **Step 8: Run schema verification**

Run:

```powershell
npx.cmd supabase db query --local -f supabase/tests/persisted_metrics_schema_verification.sql
```

Expected after migration: zero rows. If rows remain, add the missing table/function/RLS object before continuing.

- [ ] **Step 9: Commit schema**

```powershell
git add supabase/migrations supabase/tests/persisted_metrics_schema_verification.sql supabase/tests/analytics_verification.sql
git commit -m "Add persisted metric snapshot schema"
```

## Task 2: Refresh RPCs And SQL Calculations

**Files:**
- Modify: `supabase/migrations/<generated>_add_persisted_metric_snapshots.sql`
- Create: `supabase/tests/persisted_metrics_refresh_verification.sql`

- [ ] **Step 1: Write refresh verification query**

Create `supabase/tests/persisted_metrics_refresh_verification.sql`:

```sql
select
  game_id,
  count(*) as player_snapshot_count,
  round(avg(points_per_generation), 4) as average_points_per_generation
from public.game_player_metric_snapshots
group by game_id
order by game_id;

select
  group_id,
  player_id,
  average_points_per_generation,
  average_score_delta_vs_expected
from public.player_metric_summaries
order by group_id, player_id;

select
  map_id,
  player_count,
  average_points,
  average_points_per_generation
from public.global_map_metric_summaries
order by map_id, player_count;
```

Expected before the refresh function is implemented: empty metric outputs after seeded finalized games exist.

- [ ] **Step 2: Implement timing bucket helper**

Append to the migration:

```sql
create or replace function public.metric_timing_bucket(
  p_generation_number integer,
  p_generation_count integer
)
returns text
language sql
immutable
as $$
  select case
    when p_generation_number is null then null
    when p_generation_count <= 0 then null
    when p_generation_number <= greatest(1, floor(p_generation_count / 3.0)::integer) then 'early'
    when p_generation_number <= greatest(1, floor((p_generation_count * 2) / 3.0)::integer) then 'mid'
    else 'late'
  end;
$$;
```

- [ ] **Step 3: Implement game snapshot refresh**

Append `public.refresh_game_metric_snapshots(p_game_id uuid)` to the migration. The function should use `security invoker` and `set search_path = public`.

Core insert for player snapshots:

```sql
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
select
  g.id,
  gp.id,
  g.group_id,
  gp.player_id,
  g.map_id,
  gp.corporation_id,
  g.player_count,
  g.generation_count,
  gp.placement,
  gp.is_winner,
  gp.total_points,
  round(gp.total_points::numeric / g.generation_count, 4),
  case when baseline.expected_score > 0
    then round((gp.total_points::numeric / baseline.expected_score), 4)
    else null
  end,
  baseline.expected_score,
  case when baseline.expected_score is null
    then null
    else round(gp.total_points::numeric - baseline.expected_score, 4)
  end,
  round(gp.cities_points::numeric / g.generation_count, 4),
  round(gp.greenery_points::numeric / g.generation_count, 4),
  round(gp.card_points_total::numeric / g.generation_count, 4),
  round(gp.tr_points::numeric / g.generation_count, 4),
  round(gp.milestone_points::numeric / g.generation_count, 4),
  round(gp.award_points::numeric / g.generation_count, 4),
  case when coalesce(tag_totals.played_card_count, 0) > 0
    then round(gp.card_points_total::numeric / tag_totals.played_card_count, 4)
    else null
  end,
  coalesce(tag_totals.played_card_count, 0),
  coalesce(tag_totals.matched_card_count, 0),
  coalesce(tag_totals.unresolved_card_count, 0),
  coalesce(tag_totals.total_tag_count, 0),
  round(gp.tr_points::numeric / greatest(gp.total_points, 1), 4),
  round(gp.card_points_total::numeric / greatest(gp.total_points, 1), 4),
  round(gp.cities_points::numeric / greatest(gp.total_points, 1), 4),
  round(gp.greenery_points::numeric / greatest(gp.total_points, 1), 4),
  round(gp.milestone_points::numeric / greatest(gp.total_points, 1), 4),
  round(gp.award_points::numeric / greatest(gp.total_points, 1), 4),
  case when gp.is_winner then margin.win_margin_points else null end,
  case when gp.is_winner then null else margin.loss_gap_points end,
  abs(coalesce(margin.win_margin_points, margin.loss_gap_points, 999)) <= 5
from public.games g
join public.game_players gp on gp.game_id = g.id
left join lateral (
  select round(avg(other_gp.total_points::numeric), 4) as expected_score
  from public.games other_g
  join public.game_players other_gp on other_gp.game_id = other_g.id
  where other_g.status = 'finalized'
    and other_g.player_count = g.player_count
    and other_g.generation_count = g.generation_count
    and (other_g.map_id = g.map_id or g.map_id is null)
    and other_g.id <> g.id
) baseline on true
left join lateral (
  select
    max(glts.played_card_count) as played_card_count,
    max(glts.matched_card_count) as matched_card_count,
    max(glts.unresolved_card_count) as unresolved_card_count,
    max(glts.total_tag_count) as total_tag_count
  from public.game_log_imports gli
  join public.game_log_tag_summaries glts on glts.game_log_import_id = gli.id
  join public.players p on p.id = gp.player_id
  where gli.game_id = g.id
    and glts.normalized_player_name = lower(regexp_replace(p.display_name, '[^a-z0-9]+', '', 'g'))
) tag_totals on true
left join lateral (
  select
    case when gp.is_winner then gp.total_points - max(other_gp.total_points) filter (where other_gp.placement > gp.placement) end as win_margin_points,
    case when not gp.is_winner then min(other_gp.total_points) filter (where other_gp.placement < gp.placement) - gp.total_points end as loss_gap_points
  from public.game_players other_gp
  where other_gp.game_id = g.id
    and other_gp.id <> gp.id
) margin on true
where g.id = p_game_id
  and g.status = 'finalized';
```

After inserting player snapshots, insert tag, milestone, award, player summary, player-map summary, and global rows from the snapshot tables in the same transaction.

- [ ] **Step 4: Implement full rebuild function**

Append:

```sql
create or replace function public.refresh_all_metric_snapshots()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  game_record record;
begin
  for game_record in
    select id
    from public.games
    where status = 'finalized'
    order by finalized_at nulls first, created_at
  loop
    perform public.refresh_game_metric_snapshots(game_record.id);
  end loop;
end;
$$;
```

- [ ] **Step 5: Run SQL verification**

Run:

```powershell
npx.cmd supabase db query --local -f supabase/tests/persisted_metrics_refresh_verification.sql
```

Expected after refreshing seeded finalized games: one player snapshot per finalized `game_players` row, profile summaries grouped by player, and global map rows only for opted-in groups.

- [ ] **Step 6: Commit refresh SQL**

```powershell
git add supabase/migrations supabase/tests/persisted_metrics_refresh_verification.sql
git commit -m "Add persisted metric refresh functions"
```

## Task 3: Refresh RPC Repository And Hooks

**Files:**
- Create: `src/lib/db/metric-refresh-repo.ts`
- Create: `src/lib/db/metric-refresh-repo.test.ts`
- Modify: `src/lib/db/game-draft-repo.ts`
- Modify: `src/lib/db/game-draft-repo.test.ts`
- Modify: `src/lib/db/game-import-repo.ts`
- Modify: `src/lib/db/game-import-repo.test.ts`

- [ ] **Step 1: Write failing RPC helper test**

Create `src/lib/db/metric-refresh-repo.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { refreshGameMetricSnapshots } from './metric-refresh-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('refreshGameMetricSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the persisted Supabase metric refresh RPC for a finalized game', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await refreshGameMetricSnapshots('game-1');

    expect(rpc).toHaveBeenCalledWith('refresh_game_metric_snapshots', {
      p_game_id: 'game-1',
    });
  });

  it('throws the RPC error so callers do not silently skip metrics', async () => {
    const error = new Error('permission denied');
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await expect(refreshGameMetricSnapshots('game-1')).rejects.toThrow(error);
  });
});
```

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```powershell
npm.cmd run test -- src/lib/db/metric-refresh-repo.test.ts
```

Expected: fail because `metric-refresh-repo.ts` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/lib/db/metric-refresh-repo.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function refreshGameMetricSnapshots(gameId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('refresh_game_metric_snapshots', {
    p_game_id: gameId,
  });

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 4: Run helper test and verify it passes**

Run:

```powershell
npm.cmd run test -- src/lib/db/metric-refresh-repo.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Hook refresh after finalization**

Modify `src/lib/db/game-draft-repo.ts`:

```ts
import { refreshGameMetricSnapshots } from './metric-refresh-repo';
```

At the end of `finalizeGameLog`, after all finalization writes and revision writes complete, call:

```ts
await refreshGameMetricSnapshots(gameId);

return { gameId };
```

Update `src/lib/db/game-draft-repo.test.ts` by mocking `refreshGameMetricSnapshots` and asserting it is called with the finalized game id in the finalization success test.

- [ ] **Step 6: Hook refresh after import tag evidence is saved**

In `src/lib/db/game-import-repo.ts`, add a small helper:

```ts
async function getFinalizedGameIdForImport(gameLogImportId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_log_imports')
    .select('game_id, games!inner(status)')
    .eq('id', gameLogImportId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as
    | { game_id: string; games: { status: string } | Array<{ status: string }> }
    | null;
  const gameStatus = Array.isArray(row?.games)
    ? row.games[0]?.status
    : row?.games.status;

  return gameStatus === 'finalized' ? row?.game_id ?? null : null;
}
```

At the end of `saveGameLogTagSummaries`, after insert succeeds:

```ts
const finalizedGameId = await getFinalizedGameIdForImport(input.gameLogImportId);

if (finalizedGameId) {
  await refreshGameMetricSnapshots(finalizedGameId);
}
```

Update `src/lib/db/game-import-repo.test.ts` with one test where the import's game is finalized and one where it is a draft.

- [ ] **Step 7: Run focused repo tests**

Run:

```powershell
npm.cmd run test -- src/lib/db/metric-refresh-repo.test.ts src/lib/db/game-draft-repo.test.ts src/lib/db/game-import-repo.test.ts
```

Expected: all focused repo tests pass.

- [ ] **Step 8: Commit refresh hooks**

```powershell
git add src/lib/db/metric-refresh-repo.ts src/lib/db/metric-refresh-repo.test.ts src/lib/db/game-draft-repo.ts src/lib/db/game-draft-repo.test.ts src/lib/db/game-import-repo.ts src/lib/db/game-import-repo.test.ts
git commit -m "Refresh persisted metrics after finalized data changes"
```

## Task 4: Analytics Repository Reads

**Files:**
- Modify: `src/lib/db/analytics-repo.ts`
- Modify: `src/lib/db/analytics-repo.test.ts`

- [ ] **Step 1: Add failing repository mapping test**

Append to `src/lib/db/analytics-repo.test.ts`:

```ts
it('includes persisted efficiency and map metrics in profile analytics', async () => {
  const playersOrderByDisplayName = vi.fn().mockResolvedValue({
    data: [{ display_name: 'Friday Mars', id: 'player-1' }],
    error: null,
  });
  const playersOrderByCreatedAt = vi.fn().mockReturnValue({ order: playersOrderByDisplayName });
  const playersEqLinkedUserId = vi.fn().mockReturnValue({ order: playersOrderByCreatedAt });
  const playersSelect = vi.fn().mockReturnValue({ eq: playersEqLinkedUserId });

  const fromPublic = vi.fn((table: string) => {
    if (table === 'players') return { select: playersSelect };
    if (table === 'player_metric_summaries') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{
                average_award_roi: '2.0000',
                average_normalized_efficiency: '1.1200',
                average_points_per_generation: '8.4000',
                average_score_delta_vs_expected: '6.5000',
                best_score_source: 'cards',
                best_tag_lane: 'science',
                close_game_win_rate: '0.5000',
                games_played: 4,
                group_id: 'group-1',
                player_id: 'player-1',
                tag_evidence_coverage: '0.7500',
              }],
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'player_map_metric_summaries') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{
                average_points: '84.5000',
                average_points_per_generation: '8.4500',
                games_played: 2,
                group_id: 'group-1',
                map_id: 'map-1',
                map_rank_for_player: 1,
                player_id: 'player-1',
                win_rate: '0.5000',
              }],
              error: null,
            }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: fromPublic,
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })),
    })),
  } as never);

  await expect(getProfileAnalytics('user-1')).resolves.toMatchObject({
    efficiencySummary: {
      averagePointsPerGeneration: 8.4,
      averageNormalizedEfficiency: 1.12,
      bestScoreSource: 'cards',
      bestTagLane: 'science',
    },
    mapMetricRows: [{
      averagePoints: 84.5,
      averagePointsPerGeneration: 8.45,
      mapId: 'map-1',
    }],
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

```powershell
npm.cmd run test -- src/lib/db/analytics-repo.test.ts
```

Expected: fail because `efficiencySummary` and `mapMetricRows` are not returned.

- [ ] **Step 3: Add types, mappers, and fetchers**

In `src/lib/db/analytics-repo.ts`, add:

```ts
export type PlayerEfficiencySummary = {
  averageAwardRoi: number;
  averageNormalizedEfficiency: number | null;
  averagePointsPerGeneration: number;
  averageScoreDeltaVsExpected: number | null;
  bestScoreSource: string | null;
  bestTagLane: string | null;
  closeGameWinRate: number;
  gamesPlayed: number;
  groupId: string;
  playerId: string;
  tagEvidenceCoverage: number;
};

export type PlayerMapMetricRow = {
  averagePoints: number;
  averagePointsPerGeneration: number;
  gamesPlayed: number;
  groupId: string;
  mapId: string;
  mapRankForPlayer: number | null;
  playerId: string;
  winRate: number;
};

type RawPlayerEfficiencySummaryRow = {
  average_award_roi: number | string;
  average_normalized_efficiency: number | string | null;
  average_points_per_generation: number | string;
  average_score_delta_vs_expected: number | string | null;
  best_score_source: string | null;
  best_tag_lane: string | null;
  close_game_win_rate: number | string;
  games_played: number;
  group_id: string;
  player_id: string;
  tag_evidence_coverage: number | string;
};

type RawPlayerMapMetricRow = {
  average_points: number | string;
  average_points_per_generation: number | string;
  games_played: number;
  group_id: string;
  map_id: string;
  map_rank_for_player: number | string | null;
  player_id: string;
  win_rate: number | string;
};
```

Add mapper functions:

```ts
function mapPlayerEfficiencySummary(
  row: RawPlayerEfficiencySummaryRow,
): PlayerEfficiencySummary {
  return {
    averageAwardRoi: toNumber(row.average_award_roi),
    averageNormalizedEfficiency: toNullableNumber(row.average_normalized_efficiency),
    averagePointsPerGeneration: toNumber(row.average_points_per_generation),
    averageScoreDeltaVsExpected: toNullableNumber(row.average_score_delta_vs_expected),
    bestScoreSource: row.best_score_source,
    bestTagLane: row.best_tag_lane,
    closeGameWinRate: toNumber(row.close_game_win_rate),
    gamesPlayed: row.games_played,
    groupId: row.group_id,
    playerId: row.player_id,
    tagEvidenceCoverage: toNumber(row.tag_evidence_coverage),
  };
}

function mapPlayerMapMetricRow(row: RawPlayerMapMetricRow): PlayerMapMetricRow {
  return {
    averagePoints: toNumber(row.average_points),
    averagePointsPerGeneration: toNumber(row.average_points_per_generation),
    gamesPlayed: row.games_played,
    groupId: row.group_id,
    mapId: row.map_id,
    mapRankForPlayer: toNullableNumber(row.map_rank_for_player),
    playerId: row.player_id,
    winRate: toNumber(row.win_rate),
  };
}
```

Extend `ProfileAnalytics`:

```ts
export type ProfileAnalytics = {
  coverage: CoverageRow | null;
  efficiencySummary: PlayerEfficiencySummary | null;
  headToHeadRows: ProfileHeadToHeadRow[];
  mapMetricRows: PlayerMapMetricRow[];
  performance: LeaderboardRow | null;
  playerId: string;
  playerName: string;
  scoreAverages: ScoreSourceAverages | null;
  styleAgreement: StyleAgreementRow | null;
};
```

In `getProfileAnalytics`, after `linkedPlayerIds` are known, query:

```ts
const { data: efficiencyRows, error: efficiencyError } = await supabase
  .from('player_metric_summaries')
  .select('average_award_roi, average_normalized_efficiency, average_points_per_generation, average_score_delta_vs_expected, best_score_source, best_tag_lane, close_game_win_rate, games_played, group_id, player_id, tag_evidence_coverage')
  .in('player_id', linkedPlayerIds)
  .order('games_played', { ascending: false });
```

Query maps:

```ts
const { data: mapRows, error: mapError } = await supabase
  .from('player_map_metric_summaries')
  .select('average_points, average_points_per_generation, games_played, group_id, map_id, map_rank_for_player, player_id, win_rate')
  .in('player_id', linkedPlayerIds)
  .order('map_rank_for_player', { ascending: true });
```

Return the first efficiency row and all mapped map rows with the existing profile analytics.

- [ ] **Step 4: Run repository test**

```powershell
npm.cmd run test -- src/lib/db/analytics-repo.test.ts
```

Expected: repository tests pass.

- [ ] **Step 5: Commit analytics repository reads**

```powershell
git add src/lib/db/analytics-repo.ts src/lib/db/analytics-repo.test.ts
git commit -m "Read persisted efficiency metrics from Supabase"
```

## Task 5: Profile Dashboard UI

**Files:**
- Create: `src/features/analytics/efficiency-summary.tsx`
- Create: `src/features/analytics/map-performance-list.tsx`
- Create: `src/features/analytics/award-milestone-summary.tsx`
- Modify: `src/features/analytics/profile-dashboard.tsx`
- Modify: `src/features/analytics/profile-dashboard.test.tsx`
- Modify: `src/app/(app)/profile/page.tsx`

- [ ] **Step 1: Write failing profile dashboard expectations**

In `src/features/analytics/profile-dashboard.test.tsx`, add `efficiencySummary` and `mapMetricRows` to the existing props and assert:

```ts
expect(screen.getByText(/efficiency/i)).toBeInTheDocument();
expect(screen.getByText(/8.4 pts\/gen/i)).toBeInTheDocument();
expect(screen.getByText(/map performance/i)).toBeInTheDocument();
expect(screen.getByText(/84.5 avg points/i)).toBeInTheDocument();
expect(screen.getByText(/science/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify it fails**

```powershell
npm.cmd run test -- src/features/analytics/profile-dashboard.test.tsx
```

Expected: fail because new sections are absent.

- [ ] **Step 3: Add reusable components**

Create `src/features/analytics/efficiency-summary.tsx`:

```tsx
import { ChartFrame } from '@/components/charts/chart-frame';
import type { PlayerEfficiencySummary } from '@/lib/db/analytics-repo';

function formatAverage(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function EfficiencySummary({
  summary,
}: {
  summary: PlayerEfficiencySummary | null;
}) {
  return (
    <ChartFrame title="Efficiency">
      {summary ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="tm-stat-card">
            <dt className="tm-data-label">Points Per Generation</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {formatAverage(summary.averagePointsPerGeneration)} pts/gen
            </dd>
          </div>
          <div className="tm-stat-card">
            <dt className="tm-data-label">Normalized Efficiency</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {formatAverage(summary.averageNormalizedEfficiency)}
            </dd>
          </div>
          <div className="tm-stat-card">
            <dt className="tm-data-label">Expected Delta</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {formatAverage(summary.averageScoreDeltaVsExpected)}
            </dd>
          </div>
          <div className="tm-stat-card">
            <dt className="tm-data-label">Best Lane</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {summary.bestTagLane ?? summary.bestScoreSource ?? '—'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-stone-400">
          Efficiency metrics will appear after persisted Supabase snapshots refresh.
        </p>
      )}
    </ChartFrame>
  );
}
```

Create `src/features/analytics/map-performance-list.tsx`:

```tsx
import { ChartFrame } from '@/components/charts/chart-frame';
import type { PlayerMapMetricRow } from '@/lib/db/analytics-repo';

function formatAverage(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function MapPerformanceList({ rows }: { rows: PlayerMapMetricRow[] }) {
  return (
    <ChartFrame title="Map Performance">
      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">
          Map efficiency metrics will appear after persisted Supabase summaries refresh.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.slice(0, 6).map((row) => (
            <article className="tm-stat-card" key={`${row.playerId}-${row.mapId}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-stone-100">Map {row.mapRankForPlayer ?? '—'}</h3>
                <p className="tm-accent-copy text-sm">
                  {formatAverage(row.averagePointsPerGeneration)} pts/gen
                </p>
              </div>
              <p className="tm-muted-copy mt-2 text-sm">
                {formatAverage(row.averagePoints)} avg points | {formatPercent(row.winRate)} wins | {row.gamesPlayed} games
              </p>
            </article>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
```

Create `src/features/analytics/award-milestone-summary.tsx`:

```tsx
import { ChartFrame } from '@/components/charts/chart-frame';
import type { PlayerEfficiencySummary } from '@/lib/db/analytics-repo';

function formatAverage(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function AwardMilestoneSummary({
  summary,
}: {
  summary: PlayerEfficiencySummary | null;
}) {
  return (
    <ChartFrame title="Awards, Milestones, and Coverage">
      {summary ? (
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="tm-stat-card">
            <dt className="tm-data-label">Award ROI</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {formatAverage(summary.averageAwardRoi)}
            </dd>
          </div>
          <div className="tm-stat-card">
            <dt className="tm-data-label">Close Game Win Rate</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {formatPercent(summary.closeGameWinRate)}
            </dd>
          </div>
          <div className="tm-stat-card">
            <dt className="tm-data-label">Tag Coverage</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {formatPercent(summary.tagEvidenceCoverage)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-stone-400">
          Award, milestone, and tag coverage metrics will appear after persisted summaries refresh.
        </p>
      )}
    </ChartFrame>
  );
}
```

- [ ] **Step 4: Wire profile dashboard**

Modify `ProfileDashboardProps` to include:

```ts
efficiencySummary?: PlayerEfficiencySummary | null;
mapMetricRows?: PlayerMapMetricRow[];
```

Render:

```tsx
<EfficiencySummary summary={efficiencySummary} />
<MapPerformanceList rows={mapMetricRows} />
<AwardMilestoneSummary summary={efficiencySummary} />
```

Modify `src/app/(app)/profile/page.tsx` to pass:

```tsx
efficiencySummary={profileAnalytics?.efficiencySummary ?? null}
mapMetricRows={profileAnalytics?.mapMetricRows ?? []}
```

- [ ] **Step 5: Run profile UI tests**

```powershell
npm.cmd run test -- src/features/analytics/profile-dashboard.test.tsx src/app/(app)/profile/page.test.tsx
```

Expected: tests pass.

- [ ] **Step 6: Commit profile UI**

```powershell
git add src/features/analytics/efficiency-summary.tsx src/features/analytics/map-performance-list.tsx src/features/analytics/award-milestone-summary.tsx src/features/analytics/profile-dashboard.tsx src/features/analytics/profile-dashboard.test.tsx src/app/(app)/profile/page.tsx
git commit -m "Show persisted efficiency metrics on profile"
```

## Task 6: Group, Insights, And Global Web UI

**Files:**
- Create: `src/features/analytics/global-metric-board.tsx`
- Modify: `src/features/analytics/group-dashboard.tsx`
- Modify: `src/features/analytics/group-dashboard.test.tsx`
- Modify: `src/features/insights/insights-dashboard.tsx`
- Modify: `src/features/insights/insights-dashboard.test.tsx`
- Modify: `src/features/insights/build-insight-cards.ts`
- Modify: `src/features/insights/build-insight-cards.test.ts`
- Modify: `src/lib/db/analytics-repo.ts`

- [ ] **Step 1: Extend group analytics types and queries**

Add types in `src/lib/db/analytics-repo.ts`:

```ts
export type GlobalMapMetricRow = {
  averageGenerations: number;
  averagePoints: number;
  averagePointsPerGeneration: number;
  gamesPlayed: number;
  mapId: string;
  playerCount: number | null;
};
```

Add a `listGlobalMapMetrics` function that reads `global_map_metric_summaries` and include `globalMapMetricRows` in `GroupAnalytics`.

- [ ] **Step 2: Write failing insights test**

In `src/features/insights/insights-dashboard.test.tsx`, add analytics fixture rows:

```ts
globalMapMetricRows: [{
  averageGenerations: 10,
  averagePoints: 84.5,
  averagePointsPerGeneration: 8.45,
  gamesPlayed: 6,
  mapId: 'map-1',
  playerCount: 3,
}],
```

Assert:

```ts
expect(screen.getByText(/global map meta/i)).toBeInTheDocument();
expect(screen.getByText(/8.45 pts\/gen/i)).toBeInTheDocument();
```

- [ ] **Step 3: Run test and verify it fails**

```powershell
npm.cmd run test -- src/features/insights/insights-dashboard.test.tsx
```

Expected: fail because the global map section is not rendered.

- [ ] **Step 4: Implement `GlobalMetricBoard`**

Create `src/features/analytics/global-metric-board.tsx`:

```tsx
import { ChartFrame } from '@/components/charts/chart-frame';
import type { GlobalMapMetricRow } from '@/lib/db/analytics-repo';

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function GlobalMetricBoard({ rows }: { rows: GlobalMapMetricRow[] }) {
  return (
    <ChartFrame title="Global Map Meta">
      {rows.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Opted-in global map metrics will appear after persisted summaries refresh.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.slice(0, 6).map((row) => (
            <article
              className="tm-stat-card"
              key={`${row.mapId}-${row.playerCount ?? 'all'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-stone-100">
                  {row.playerCount ? `${row.playerCount}p map baseline` : 'All-player map baseline'}
                </h3>
                <p className="tm-accent-copy text-sm">
                  {formatAverage(row.averagePointsPerGeneration)} pts/gen
                </p>
              </div>
              <p className="tm-muted-copy mt-2 text-sm">
                {formatAverage(row.averagePoints)} avg points | {formatAverage(row.averageGenerations)} gens | {row.gamesPlayed} games
              </p>
            </article>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
```

- [ ] **Step 5: Wire group and insights dashboards**

Render `EfficiencySummary`, `MapPerformanceList`, and `GlobalMetricBoard` in `GroupDashboard` and `InsightsDashboard` using the new persisted metric rows. In `buildInsightCards`, add a card that reports the best points-per-generation player or map when rows exist.

- [ ] **Step 6: Run focused web analytics tests**

```powershell
npm.cmd run test -- src/features/analytics/group-dashboard.test.tsx src/features/insights/insights-dashboard.test.tsx src/features/insights/build-insight-cards.test.ts
```

Expected: tests pass.

- [ ] **Step 7: Commit group and insights UI**

```powershell
git add src/features/analytics/global-metric-board.tsx src/features/analytics/group-dashboard.tsx src/features/analytics/group-dashboard.test.tsx src/features/insights/insights-dashboard.tsx src/features/insights/insights-dashboard.test.tsx src/features/insights/build-insight-cards.ts src/features/insights/build-insight-cards.test.ts src/lib/db/analytics-repo.ts
git commit -m "Add persisted metric insights"
```

## Task 7: Native Dashboard Metrics

**Files:**
- Modify: `src/features/native/load-native-dashboard.ts`
- Modify: `src/features/native/native-dashboard-screen.tsx`
- Modify: `src/features/native/native-dashboard-screen.test.tsx`
- Modify: `src/features/native/ready-route.test.tsx`

- [ ] **Step 1: Add failing native dashboard test**

In `src/features/native/native-dashboard-screen.test.tsx`, add metric rows to the fixture profile/global sections and assert:

```ts
expect(screen.getByText(/points per generation/i)).toBeInTheDocument();
expect(screen.getByText(/8.4 pts\/gen/i)).toBeInTheDocument();
expect(screen.getByText(/global map meta/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify it fails**

```powershell
npm.cmd run test -- src/features/native/native-dashboard-screen.test.tsx
```

Expected: fail because native metric rows are not displayed.

- [ ] **Step 3: Load persisted rows**

In `src/features/native/load-native-dashboard.ts`, add Supabase queries for:

```ts
.from('player_metric_summaries')
.select('average_points_per_generation, average_normalized_efficiency, average_score_delta_vs_expected, best_tag_lane, best_score_source')
```

and:

```ts
.from('global_map_metric_summaries')
.select('map_id, player_count, games_played, average_points, average_generations, average_points_per_generation')
```

Map them into existing `NativeDashboardSection.metrics` rows:

```ts
{
  label: 'Points Per Generation',
  value: `${formatAverage(toNumber(row.average_points_per_generation))} pts/gen`,
}
```

- [ ] **Step 4: Render compact native rows**

In `src/features/native/native-dashboard-screen.tsx`, reuse the existing metrics rendering list. Add a `globalSection.summary` fallback that mentions global map metrics when global rows exist.

- [ ] **Step 5: Run native tests**

```powershell
npm.cmd run test -- src/features/native/native-dashboard-screen.test.tsx src/features/native/ready-route.test.tsx
```

Expected: tests pass.

- [ ] **Step 6: Commit native dashboard metrics**

```powershell
git add src/features/native/load-native-dashboard.ts src/features/native/native-dashboard-screen.tsx src/features/native/native-dashboard-screen.test.tsx src/features/native/ready-route.test.tsx
git commit -m "Show persisted metrics in native dashboard"
```

## Task 8: End-To-End Verification And Cleanup

**Files:**
- All files touched by Tasks 1-7

- [ ] **Step 1: Run focused tests**

```powershell
npm.cmd run test -- src/lib/db/metric-refresh-repo.test.ts src/lib/db/analytics-repo.test.ts src/lib/db/game-draft-repo.test.ts src/lib/db/game-import-repo.test.ts src/features/analytics/profile-dashboard.test.tsx src/features/analytics/group-dashboard.test.tsx src/features/insights/insights-dashboard.test.tsx src/features/insights/build-insight-cards.test.ts src/features/native/native-dashboard-screen.test.tsx src/features/native/ready-route.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 2: Run TypeScript**

```powershell
npx.cmd tsc --noEmit --pretty false
```

Expected: exit code 0.

- [ ] **Step 3: Run full Vitest suite**

```powershell
npm.cmd run test -- --exclude ".worktrees/**"
```

Expected: exit code 0. Read the output for non-fatal warnings and record them if they are unrelated.

- [ ] **Step 4: Run SQL verification if local Supabase is available**

```powershell
npx.cmd supabase db query --local -f supabase/tests/persisted_metrics_schema_verification.sql
npx.cmd supabase db query --local -f supabase/tests/persisted_metrics_refresh_verification.sql
```

Expected: schema verification returns zero missing objects, and refresh verification returns persisted metric rows for seeded finalized games. If Docker or local Supabase is unavailable, record the exact error.

- [ ] **Step 5: Check staged and unstaged scope**

```powershell
git status --short --branch
git diff --check
```

Expected: only files from this feature are modified in the implementation worktree, and `git diff --check` reports no whitespace errors.

- [ ] **Step 6: Final commit**

```powershell
git add supabase src
git commit -m "Add persisted Supabase efficiency analytics"
```

Expected: commit contains schema, refresh hooks, repository reads, UI sections, and tests for persisted metrics.
