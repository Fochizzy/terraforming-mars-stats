import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrations = join(process.cwd(), 'supabase', 'migrations');

/**
 * The repository is checked out with core.autocrlf=true and carries no
 * .gitattributes, so a fresh Windows clone materializes these files with CRLF
 * while the committed blobs are LF. These assertions are about SQL structure,
 * not line endings, so the checkout's newline form is normalized away here
 * rather than encoded into every expectation.
 */
function readMigration(fileName: string): string {
  return readFileSync(join(migrations, fileName), 'utf8')
    .replace(/\r\n/g, '\n')
    .toLowerCase();
}

/** Drops `--` line comments so assertions read executable SQL, not prose. */
function withoutComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const expansion = readMigration(
  '20260722012658_add_source_bound_import_identity_staging.sql',
);
const contraction = readMigration(
  '20260722012707_retire_free_form_import_name_matcher.sql',
);

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

  it('matches identity evidence for linked and unlinked players alike', () => {
    const matcherStart = expansion.indexOf(
      'create or replace function private.import_identity_player_matches',
    );
    const matcherEnd = expansion.indexOf(
      'create or replace function public.stage_import_player_identity_evidence',
    );
    expect(matcherStart).toBeGreaterThan(-1);
    expect(matcherEnd).toBeGreaterThan(matcherStart);
    const matcher = withoutComments(expansion.slice(matcherStart, matcherEnd));

    // Every production alias row belongs to a linked player, so gating the
    // alias and private-identity branches on this made the path unreachable and
    // pushed the importer toward minting a duplicate for a registered user.
    expect(matcher).not.toContain('linked_user_id is null');

    // Legacy alias rows carry identity_mode IS NULL and are mode-agnostic.
    expect(matcher).toContain('pia.identity_mode is null');

    // Identity evidence the matcher must read for players that have nothing else.
    expect(matcher).toContain('private.player_legacy_identities');
    expect(matcher).toContain('legacy_full_name');
    expect(matcher).toContain('legacy_username');
    expect(matcher).toMatch(/normalize_private_personal_name\(p\.full_name/);
    expect(matcher).toMatch(/normalize_guest_username\(p\.username/);

    // Exact equality only, in both normalized forms. No fuzzy comparison.
    expect(matcher).not.toMatch(/\bilike\b|\blike\b|similarity\s*\(|levenshtein|word_similarity/);
    expect(matcher).not.toMatch(/match_reason|match_score/);

    // Alias lookups stay inside the staged group.
    expect(matcher.match(/pia\.group_id = p_group_id/g)?.length).toBe(3);
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
