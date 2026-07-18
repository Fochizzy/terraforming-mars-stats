import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260718120000_reconcile_upstream_card_identities.sql'),
  'utf8',
);

describe('upstream card identity reconciliation migration', () => {
  it('retains duplicate evidence and makes it reversible', () => {
    expect(migration).toContain('is_catalog_visible boolean not null default true');
    expect(migration).toContain('superseded_by_card_id uuid references public.cards(id)');
    expect(migration).toContain('having count(*) = 1');
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
  });
});
