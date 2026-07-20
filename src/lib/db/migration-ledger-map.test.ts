import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPLIED_UNDER_DIFFERENT_LEDGER_VERSION,
  APPLIED_UNDER_UNCONFIRMED_REMOTE_VERSION,
  GATED_UNAPPLIED,
  PRODUCTION_LEDGER_VERSIONS,
  RECONSTRUCTED_REMOTE_ONLY,
} from './migration-ledger-map';

// Migration-ledger drift check (audit §18). Every repo migration file must
// be accounted for by exactly one classification, and the classifications
// must stay mutually consistent with the captured production ledger. A new
// migration file, a gated file that suddenly appears applied, or a renamed
// mapping pointing at a nonexistent ledger version all fail here.

function repoMigrationVersions(): string[] {
  return readdirSync(resolve(process.cwd(), 'supabase/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .map((file) => file.split('_')[0]);
}

describe('migration-ledger map', () => {
  const ledger = new Set(PRODUCTION_LEDGER_VERSIONS);
  const repoVersions = repoMigrationVersions();

  it('classifies every repo migration file exactly once', () => {
    for (const version of repoVersions) {
      const classifications = [
        ledger.has(version) &&
        !RECONSTRUCTED_REMOTE_ONLY.includes(version)
          ? 'repo_native_applied'
          : null,
        RECONSTRUCTED_REMOTE_ONLY.includes(version)
          ? 'reconstructed_remote_only'
          : null,
        version in APPLIED_UNDER_DIFFERENT_LEDGER_VERSION
          ? 'applied_under_different_ledger_version'
          : null,
        APPLIED_UNDER_UNCONFIRMED_REMOTE_VERSION.includes(version)
          ? 'applied_under_unconfirmed_remote_version'
          : null,
        GATED_UNAPPLIED.includes(version) ? 'gated_unapplied' : null,
      ].filter(Boolean);
      expect(
        classifications,
        `migration ${version} must have exactly one classification (got ${classifications.join(', ') || 'none'}) — update src/lib/db/migration-ledger-map.ts and docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
      ).toHaveLength(1);
    }
  });

  it('never lists a gated migration as applied', () => {
    for (const version of GATED_UNAPPLIED) {
      expect(
        ledger.has(version),
        `gated migration ${version} appears in the captured production ledger — if it was authorized and applied, reclassify it and re-verify; otherwise this is drift`,
      ).toBe(false);
      expect(version in APPLIED_UNDER_DIFFERENT_LEDGER_VERSION).toBe(false);
    }
  });

  it('maps every renamed application onto a real ledger version', () => {
    for (const [fileVersion, ledgerVersion] of Object.entries(
      APPLIED_UNDER_DIFFERENT_LEDGER_VERSION,
    )) {
      expect(
        ledger.has(ledgerVersion),
        `${fileVersion} claims ledger version ${ledgerVersion}, which is not in the captured ledger`,
      ).toBe(true);
      expect(
        ledger.has(fileVersion),
        `${fileVersion} is mapped as renamed but its own version is ALSO in the ledger — double application hazard`,
      ).toBe(false);
    }
  });

  it('keeps reconstructed remote-only files version-aligned with the ledger', () => {
    for (const version of RECONSTRUCTED_REMOTE_ONLY) {
      expect(
        ledger.has(version),
        `reconstruction ${version} must match a ledger version so production skips it`,
      ).toBe(true);
    }
  });

  it('accounts for every ledger version a repo file claims', () => {
    // Ledger versions covered by the repo in any way; the remainder are
    // remote-only history with no repo file, which is expected — the map
    // documents that `supabase/migrations/` is NOT a complete replay of the
    // production ledger and NOT a safe direct `db push` source.
    const covered = new Set<string>([
      ...repoVersions.filter((version) => ledger.has(version)),
      ...Object.values(APPLIED_UNDER_DIFFERENT_LEDGER_VERSION),
    ]);
    expect(covered.size).toBeGreaterThan(0);
    for (const version of covered) {
      expect(ledger.has(version)).toBe(true);
    }
  });
});
