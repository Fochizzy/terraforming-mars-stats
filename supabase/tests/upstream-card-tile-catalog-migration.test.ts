import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260718114500_sync_upstream_cards_and_tile_catalog.sql'),
  'utf8',
);

describe('upstream card and tile catalog migration', () => {
  it('creates a read-protected complete tile reference table', () => {
    expect(migration).toContain(
      'create table if not exists public.terraforming_mars_tile_types',
    );
    expect(migration).toContain(
      'alter table public.terraforming_mars_tile_types enable row level security',
    );
    expect(migration).toContain('to authenticated');
    expect(migration.match(/^    \(\d+, /gm)).toHaveLength(45);
  });

  it('allows unknown card effects to remain null for newly discovered cards', () => {
    expect(migration).toContain("'card_effect_temperature_steps'");
    expect(migration).toContain('drop not null');
    expect(migration).toContain('drop default');
  });
});
