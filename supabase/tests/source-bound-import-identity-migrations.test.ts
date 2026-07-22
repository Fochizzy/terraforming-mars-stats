import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrations = join(process.cwd(), 'supabase', 'migrations');
const expansion = readFileSync(
  join(migrations, '20260722012658_add_source_bound_import_identity_staging.sql'),
  'utf8',
).toLowerCase();
const contraction = readFileSync(
  join(migrations, '20260722012707_retire_free_form_import_name_matcher.sql'),
  'utf8',
).toLowerCase();

describe('source-bound import identity migrations', () => {
  it('keeps imported source evidence private, short-lived, bounded, and direct-access denied', () => {
    expect(expansion).toContain('create table if not exists private.import_identity_staging');
    expect(expansion).toContain('cardinality(source_player_texts) between 1 and 5');
    expect(expansion).toContain("interval '30 minutes'");
    expect(expansion).toContain('alter table private.import_identity_staging enable row level security');
    for (const role of ['public', 'anon', 'authenticated', 'service_role']) {
      expect(expansion).toContain(`revoke all on private.import_identity_staging from ${role}`);
    }
    expect(expansion).not.toMatch(/grant\s+(select|insert|update|delete|all).*import_identity_staging/);
  });

  it('exposes only service-role gateways with empty search paths', () => {
    for (const name of [
      'stage_import_player_identity_evidence',
      'attach_import_identity_staging',
      'discard_import_identity_staging',
      'resolve_staged_import_player_identity',
    ]) {
      expect(expansion).toContain(`create or replace function public.${name}`);
      expect(expansion).toContain(`grant execute on function public.${name}`);
      expect(expansion).toContain(`to service_role`);
    }
    expect(expansion.match(/security definer/g)?.length).toBeGreaterThanOrEqual(6);
    expect(expansion.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('binds resolution to one staged ordinal and returns no private classification', () => {
    const resolverStart = expansion.indexOf(
      'create or replace function public.resolve_staged_import_player_identity',
    );
    const resolverEnd = expansion.indexOf(
      'create or replace function private.delete_finalized_import_identity_staging',
    );
    const resolver = expansion.slice(resolverStart, resolverEnd);
    expect(resolver).toContain('p_source_player_ordinal integer');
    expect(resolver).not.toContain('p_source_player_texts text[]');
    expect(resolver).toContain('returns table (\n  outcome text,\n  player_id uuid,\n  public_label text');
    expect(resolver).not.toMatch(/match_reason|match_score|normalized_imported_value/);
    expect(resolver).not.toMatch(/\bilike\b|similarity\s*\(|levenshtein|word_similarity/);
    expect(resolver).toContain('for update');
    expect(resolver).toContain('exception when others then');
  });

  it('separates expansion from the gated legacy-matcher contraction', () => {
    expect(expansion).not.toContain('revoke execute on function public.match_import_player_names');
    expect(contraction).toContain('revoke execute on function public.match_import_player_names(uuid, text[]) from authenticated');
    expect(contraction).not.toContain('drop function');
  });

  it('enforces the preflight-backed normalized registered-username invariant', () => {
    expect(expansion).toContain('create unique index if not exists user_profiles_normalized_username_key');
    expect(expansion).toContain('private.normalize_guest_username(username)');
  });
});
