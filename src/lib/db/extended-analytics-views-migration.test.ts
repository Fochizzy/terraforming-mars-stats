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
