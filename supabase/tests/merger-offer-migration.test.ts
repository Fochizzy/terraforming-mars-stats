import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260717190000_add_merger_offer_rule_snapshots.sql',
  ),
  'utf8',
);

const dryRun = readFileSync(
  resolve(
    process.cwd(),
    'supabase/verification/merger-offer-historical-policy-dry-run.sql',
  ),
  'utf8',
);

const backfill = readFileSync(
  resolve(
    process.cwd(),
    'supabase/verification/merger-offer-historical-policy-backfill.sql',
  ),
  'utf8',
);

describe('Merger offer migration package', () => {
  it('preserves legacy game state as nullable and constrains provenance', () => {
    expect(migration).toContain(
      'add column if not exists guaranteed_merger_offer boolean',
    );
    expect(migration).toContain(
      'add column if not exists guaranteed_merger_offer_source text',
    );
    expect(migration).toContain('games_guaranteed_merger_offer_source_check');
    expect(migration).toContain("'historical_policy'");
    expect(migration).not.toMatch(/update\s+public\.games/i);
  });

  it('keeps owner group settings and editor game snapshots under their existing RLS policies', () => {
    const corePolicies = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260703121500_create_core_rls.sql'),
      'utf8',
    );

    expect(corePolicies).toContain('owners manage settings');
    expect(corePolicies).toContain('public.is_group_owner(group_settings.group_id)');
    expect(corePolicies).toContain('editors can write games');
    expect(corePolicies).toContain('public.can_edit_group(g.group_id)');
  });

  it('requires a read-only, group-scoped count before an idempotent backfill', () => {
    expect(dryRun).toContain('begin read only;');
    expect(dryRun).toContain('total_eligible_historical_games');
    expect(dryRun).toContain('games_with_unresolved_actor_mappings');
    expect(dryRun).toContain("('promo:p39', 'promo:merger')");
    expect(dryRun).toContain('rollback;');
    expect(backfill).toContain("guaranteed_merger_offer is null");
    expect(backfill).toContain("guaranteed_merger_offer_source is null");
    expect(backfill).toContain("guaranteed_merger_offer_source = 'historical_policy'");
  });
});
