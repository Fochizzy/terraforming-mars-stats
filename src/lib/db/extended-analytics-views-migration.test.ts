import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getExtendedAnalyticsViewsMigration() {
  const migrationsDirectory = path.resolve(process.cwd(), 'supabase', 'migrations');
  const migrationFileName = readdirSync(migrationsDirectory)
    .filter((entry) => entry.endsWith('.sql'))
    .sort()
    .reverse()
    .find((entry) =>
      readFileSync(path.join(migrationsDirectory, entry), 'utf8').includes(
        'create or replace view analytics.game_log_event_facts',
      ),
    );

  if (!migrationFileName) {
    throw new Error(
      'Expected an extended analytics views migration in supabase/migrations.',
    );
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

function getMigrationContaining(fragment: string) {
  const migrationsDirectory = path.resolve(process.cwd(), 'supabase', 'migrations');
  const migrationFileName = readdirSync(migrationsDirectory)
    .filter((entry) => entry.endsWith('.sql'))
    .sort()
    .reverse()
    .find((entry) =>
      readFileSync(path.join(migrationsDirectory, entry), 'utf8').includes(fragment),
    );

  if (!migrationFileName) {
    throw new Error(`Expected a migration containing ${fragment}.`);
  }

  return readFileSync(path.join(migrationsDirectory, migrationFileName), 'utf8');
}

describe('extended analytics views migration', () => {
  const migration = getExtendedAnalyticsViewsMigration();

  it('creates every extended analytics view with security invoker', () => {
    const expectedViews = [
      'player_placement_distribution',
      'player_count_performance',
      'group_generation_distribution',
      'player_game_length_performance',
      'group_map_performance',
      'player_map_performance',
      'group_milestone_economics',
      'player_milestone_claims',
      'group_award_outcomes',
      'award_funder_winner_matrix',
      'game_log_event_facts',
      'game_generation_pace',
      'game_tile_placements',
      'player_tag_outcomes',
    ];

    for (const view of expectedViews) {
      expect(migration).toContain(`create or replace view analytics.${view}`);
    }

    const securityInvokerCount = migration.match(
      /with \(security_invoker = true\)/g,
    )?.length;

    expect(securityInvokerCount).toBe(expectedViews.length);
  });

  it('only aggregates finalized games', () => {
    expect(migration).toContain("g.status = 'finalized'");
    expect(migration).not.toContain("status = 'draft'");
  });

  it('carries generation markers forward across ordered log events', () => {
    expect(migration).toContain('max(e.generation_number) over (');
    expect(migration).toContain('partition by e.game_log_import_id');
    expect(migration).toContain('order by e.event_order');
  });

  it('resolves log actors by normalized display name before import aliases', () => {
    expect(migration).toContain(
      "regexp_replace(lower(coalesce(e.payload->>'actor', '')), '[^a-z0-9]+', ' ', 'g')",
    );
    expect(migration).toContain("pia.source_type = 'game_log'");
    expect(migration).toContain('order by candidates.preference');
  });

  it('joins tag summaries through normalized player names', () => {
    expect(migration).toContain(
      'p.normalized_display_name = ts.normalized_player_name',
    );
  });

  it('re-grants analytics access so new views stay readable', () => {
    expect(migration).toContain(
      'grant select on all tables in schema analytics to authenticated;',
    );
  });
});

describe('tag summary alias resolution migration', () => {
  const migration = getMigrationContaining(
    "coalesce(c.name, 'Unknown Corporation') as corporation_name",
  );
  const multipleCorporationsMigration = getMigrationContaining(
    'create table if not exists public.game_player_corporations',
  );

  it('resolves tag outcomes through confirmed game-log aliases before display names', () => {
    expect(migration).toContain("pia.source_type = 'game_log'");
    expect(migration).toContain(
      'pia.normalized_alias = ts.normalized_player_name',
    );
    expect(migration).toContain(
      'p.normalized_display_name = ts.normalized_player_name',
    );
    expect(migration).toContain('order by candidates.preference');
  });

  it('exposes the selected corporation on tag outcome rows', () => {
    expect(migration).toContain('corporation_selections.corporation_id');
    expect(migration).toContain(
      "coalesce(c.name, 'Unknown Corporation') as corporation_name",
    );
    expect(migration).toContain(
      'from public.game_player_corporations gpc',
    );
    expect(migration).toContain(
      'left join public.corporations c on c.id = corporation_selections.corporation_id',
    );
  });

  it('uses the same resolved tag-summary links in selection stats', () => {
    expect(migration).toContain('tag_summary_player_links as');
    expect(migration).toContain('tsl.game_id = e.game_id');
    expect(migration).toContain('tsl.player_id = e.player_id');
  });

  it('creates and backfills the game-player corporation join table', () => {
    expect(multipleCorporationsMigration).toContain(
      'create table if not exists public.game_player_corporations',
    );
    expect(multipleCorporationsMigration).toContain(
      'insert into public.game_player_corporations',
    );
    expect(multipleCorporationsMigration).toContain(
      'alter table public.game_player_corporations enable row level security',
    );
    expect(multipleCorporationsMigration).toContain(
      'public.can_read_game_player(game_player_id)',
    );
    expect(multipleCorporationsMigration).toContain(
      'public.can_edit_game_player(game_player_id)',
    );
  });
});

describe('Merger impact stats migration', () => {
  const migration = getMigrationContaining('get_merger_impact_stats');

  it('detects Merger from imported log events instead of manual selections', () => {
    expect(migration).toContain(
      'create or replace function public.get_merger_impact_stats',
    );
    expect(migration).toContain('latest_imports as');
    expect(migration).toContain("btrim(gli.raw_log_text) <> ''");
    expect(migration).toContain('join game_log_events gle');
    expect(migration).toContain("gle.event_type = 'card_played'");
    expect(migration).toContain("gle.payload->>'cardName'");
    expect(migration).toContain(") = 'merger'");
    expect(migration).not.toContain('join game_player_preludes');
  });

  it('resolves Merger log actors to saved players and compares non-Merger logs', () => {
    expect(migration).toContain("gle.payload->>'actor'");
    expect(migration).toContain('p.normalized_display_name');
    expect(migration).toContain("pia.source_type = 'game_log'");
    expect(migration).toContain('not rf.played_merger');
    expect(migration).toContain('win_rate_delta');
  });

  it('keeps the Merger impact RPC executable only by authenticated callers', () => {
    expect(migration).toContain(
      'security invoker',
    );
    expect(migration).toContain(
      'revoke all on function public.get_merger_impact_stats(uuid) from public;',
    );
    expect(migration).toContain(
      'grant execute on function public.get_merger_impact_stats(uuid) to authenticated;',
    );
  });
});

describe('Award economics migration', () => {
  const migration = getMigrationContaining(
    'create or replace function public.get_award_economics',
  );

  it('aggregates award economics across groups with security definer', () => {
    expect(migration).toContain(
      "create or replace function public.get_award_economics(scope text default 'personal')",
    );
    expect(migration).toContain('security definer');
    expect(migration).toContain("g.status = 'finalized'");
    expect(migration).toContain('ga.place = 1');
    // No group_id in the select/grouping — that is what lets it span groups.
    expect(migration).not.toContain('g.group_id');
  });

  it('scopes to the caller-played games unless the global scope is requested', () => {
    expect(migration).toContain("scope = 'global'");
    expect(migration).toContain('p.linked_user_id = auth.uid()');
  });

  it('returns both the funder/winner matrix and per-award outcomes', () => {
    expect(migration).toContain("'outcomes'");
    expect(migration).toContain("'matrix'");
    expect(migration).toContain('funder.display_name as funder_player_name');
    expect(migration).toContain('winner.display_name as winner_player_name');
  });

  it('keeps the RPC executable only by authenticated callers', () => {
    expect(migration).toContain(
      'revoke all on function public.get_award_economics(text) from public;',
    );
    expect(migration).toContain(
      'grant execute on function public.get_award_economics(text) to authenticated;',
    );
  });
});

describe('Selection stats mid-game prelude migration', () => {
  const migration = getMigrationContaining('prelude_entries as');

  it('counts setup and in-game preludes in prelude selection stats', () => {
    expect(migration).toContain('from game_player_preludes gpp');
    expect(migration).toContain('from game_player_midgame_preludes gpmp');
    expect(migration).toContain('join prelude_entries pe on pe.game_player_id = e.id');
    expect(migration).toContain('join prelude_entries pe on pe.game_player_id = ce.id');
    expect(migration).toContain('Board of Directors');
  });

  it('preserves the get_selection_stats grants after replacing the function', () => {
    expect(migration).toContain(
      'revoke all on function public.get_selection_stats(text) from public;',
    );
    expect(migration).toContain(
      'grant execute on function public.get_selection_stats(text) to authenticated;',
    );
  });
});
