import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPLIED_UNDER_DIFFERENT_LEDGER_VERSION,
  APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME,
  APPLIED_UNDER_UNCONFIRMED_REMOTE_VERSION,
  GATED_UNAPPLIED,
  MIGRATION_HAZARD_CLASS,
  PRODUCTION_LEDGER_ATTESTATION,
  PRODUCTION_LEDGER_VERSIONS,
  PRODUCTION_ONLY_ENTRY_PROVENANCE,
  PRODUCTION_ONLY_LEDGER_VERSIONS,
  RECONSTRUCTED_REMOTE_ONLY,
  type MigrationHazardClass,
} from './migration-ledger-map';

// Migration-ledger drift check (audit §18), enforced in both directions.
//
// repo → ledger: every migration file must be accounted for by exactly one
// classification, and the classifications must stay mutually consistent with
// the captured production ledger. A new migration file, a gated file that
// suddenly appears applied, or a renamed mapping pointing at a nonexistent
// ledger version all fail here.
//
// ledger → repo: every captured ledger version must resolve to exactly one
// classification too. Without this direction a production application made
// from another branch could land in the ledger and leave no trace in the map
// (LEDGER_INCOMPLETE).
//
// Hazard class is a separate, orthogonal dimension: every migration file must
// declare whether applying it contracts, expands, or leaves unchanged the
// contract surface a deployed reader or writer depends on
// (CLASSIFICATION_MISSING).

const HAZARD_CLASSES: readonly MigrationHazardClass[] = [
  'contraction',
  'expansion',
  'neutral',
];

function repoMigrationFiles(): string[] {
  return readdirSync(resolve(process.cwd(), 'supabase/migrations')).filter(
    (file) => file.endsWith('.sql'),
  );
}

function repoMigrationVersions(): string[] {
  return repoMigrationFiles().map((file) => file.split('_')[0]);
}

describe('migration-ledger map', () => {
  const ledger = new Set(PRODUCTION_LEDGER_VERSIONS);
  const repoVersions = repoMigrationVersions();
  const repoVersionSet = new Set(repoVersions);
  const renamedLedgerVersions = new Set(
    Object.values(APPLIED_UNDER_DIFFERENT_LEDGER_VERSION),
  );
  const productionOnly = new Set(PRODUCTION_ONLY_LEDGER_VERSIONS);

  it('matches the recorded read-only attestation', () => {
    expect(
      PRODUCTION_LEDGER_VERSIONS.length,
      `the snapshot holds ${PRODUCTION_LEDGER_VERSIONS.length} entries but the ${PRODUCTION_LEDGER_ATTESTATION.attestedOn} attestation recorded ${PRODUCTION_LEDGER_ATTESTATION.entryCount} — re-attest read-only and update both together`,
    ).toBe(PRODUCTION_LEDGER_ATTESTATION.entryCount);
    expect(
      PRODUCTION_LEDGER_VERSIONS[PRODUCTION_LEDGER_VERSIONS.length - 1],
      'the snapshot head must equal the attested ledger head',
    ).toBe(PRODUCTION_LEDGER_ATTESTATION.headVersion);
    expect(ledger.size, 'the snapshot contains a duplicate version').toBe(
      PRODUCTION_LEDGER_VERSIONS.length,
    );
    expect(
      [...PRODUCTION_LEDGER_VERSIONS],
      'the snapshot must stay in ledger (ascending version) order',
    ).toEqual([...PRODUCTION_LEDGER_VERSIONS].sort());
  });

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

  it('classifies every production-ledger version exactly once', () => {
    for (const version of PRODUCTION_LEDGER_VERSIONS) {
      const classifications = [
        repoVersionSet.has(version) &&
        !RECONSTRUCTED_REMOTE_ONLY.includes(version)
          ? 'repo_native_applied'
          : null,
        RECONSTRUCTED_REMOTE_ONLY.includes(version)
          ? 'reconstructed_remote_only'
          : null,
        renamedLedgerVersions.has(version) ? 'renamed_drift_target' : null,
        GATED_UNAPPLIED.includes(version) ? 'gated_unapplied' : null,
        productionOnly.has(version) ? 'known_production_only' : null,
      ].filter(Boolean);
      expect(
        classifications,
        `LEDGER_INCOMPLETE: ledger version ${version} resolves to ${classifications.length} classifications (${classifications.join(', ') || 'none'}). Every attested ledger entry must be repo-native, a reconstruction, a renamed-drift target, or a registered production-only entry — re-attest read-only and update src/lib/db/migration-ledger-map.ts and docs/redesign/reference/MIGRATION-LEDGER-MAP.md together`,
      ).toHaveLength(1);
    }
  });

  it('keeps the production-only register honest', () => {
    for (const version of PRODUCTION_ONLY_LEDGER_VERSIONS) {
      expect(
        ledger.has(version),
        `${version} is registered production-only but is not in the captured ledger`,
      ).toBe(true);
      expect(
        repoVersionSet.has(version),
        `${version} is registered production-only but a migration file for it exists on this branch — reclassify it`,
      ).toBe(false);
      expect(
        renamedLedgerVersions.has(version),
        `${version} is registered production-only but is also a renamed-drift target`,
      ).toBe(false);
    }
    expect(new Set(PRODUCTION_ONLY_LEDGER_VERSIONS).size).toBe(
      PRODUCTION_ONLY_LEDGER_VERSIONS.length,
    );
    for (const version of Object.keys(PRODUCTION_ONLY_ENTRY_PROVENANCE)) {
      expect(
        productionOnly.has(version),
        `provenance is recorded for ${version}, which is not a registered production-only ledger entry`,
      ).toBe(true);
    }
  });

  it('declares a hazard class for every migration file', () => {
    for (const version of repoVersions) {
      const declared = MIGRATION_HAZARD_CLASS[version];
      expect(
        declared,
        `CLASSIFICATION_MISSING: migration ${version} has no declared hazard class. Declare it explicitly in MIGRATION_HAZARD_CLASS as contraction | expansion | neutral — the class depends on what was deployed before the migration and must never be inferred from the SQL`,
      ).toBeDefined();
      expect(
        HAZARD_CLASSES,
        `migration ${version} declares an unsupported hazard class ${String(declared)}`,
      ).toContain(declared);
    }
    for (const version of Object.keys(MIGRATION_HAZARD_CLASS)) {
      expect(
        repoVersionSet.has(version),
        `hazard class declared for ${version}, which has no migration file on this branch — production-only entries are covered by the ledger completeness check instead`,
      ).toBe(true);
    }
  });

  it('records the known contraction hazards', () => {
    // Pinned so a later edit cannot quietly downgrade a contraction to an
    // expansion and bypass the expand/contract release gate.
    expect(
      MIGRATION_HAZARD_CLASS['20260720120000'],
      'coarsening the disclosed match classification narrows what a deployed caller can read',
    ).toBe('contraction');
    expect(MIGRATION_HAZARD_CLASS['20260719234500']).toBe('contraction');
    expect(MIGRATION_HAZARD_CLASS['20260719223000']).toBe('contraction');
    expect(
      MIGRATION_HAZARD_CLASS['20260720110000'],
      'game_log_events_owner_requires_explicit_state is a CHECK on pre-existing columns added without `not valid`: it rejects owner ids alongside a non-explicit_owner ownership_state that the deployed contract accepts, so the widened vocabularies do not make the file an expansion',
    ).toBe('contraction');
    expect(
      MIGRATION_HAZARD_CLASS['20260721173000'],
      'the ledger #106 claim-RPC hardening narrows what the three RPCs disclose (exact-match only, 3-character input floor, 10-row cap, no personal-name label fallback, null group_name) and restores no equal-or-broader replacement',
    ).toBe('contraction');
  });

  it('never lists a gated migration as applied', () => {
    for (const version of GATED_UNAPPLIED) {
      expect(
        ledger.has(version),
        `GATED_MIGRATION_APPLIED: gated migration ${version} appears in the captured production ledger — if it was authorized and applied, reclassify it and re-verify; otherwise this is drift`,
      ).toBe(false);
      expect(version in APPLIED_UNDER_DIFFERENT_LEDGER_VERSION).toBe(false);
      expect(
        productionOnly.has(version),
        `gated migration ${version} is registered as a production-only ledger entry`,
      ).toBe(false);
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

  it('reconciles name-keyed renamed applications against the real filename', () => {
    // A renamed apply has no version in common with its ledger entry, so the
    // NAME is the only surviving join key. Assert it against the filename on
    // disk rather than against another constant, so renaming or deleting the
    // file breaks the gate instead of orphaning the mapping.
    const filesByVersion = new Map(
      repoMigrationFiles().map((file) => [file.split('_')[0], file]),
    );
    for (const [name, record] of Object.entries(
      APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME,
    )) {
      expect(
        APPLIED_UNDER_DIFFERENT_LEDGER_VERSION[record.fileVersion],
        `${name} is name-keyed to ledger version ${record.ledgerVersion} but the version-keyed map disagrees`,
      ).toBe(record.ledgerVersion);
      expect(
        ledger.has(record.ledgerVersion),
        `${name} claims ledger version ${record.ledgerVersion}, which is not in the captured ledger`,
      ).toBe(true);
      expect(
        filesByVersion.get(record.fileVersion),
        `${name} is mapped to file version ${record.fileVersion}, but no migration file on this branch is named ${record.fileVersion}_${name}.sql`,
      ).toBe(`${record.fileVersion}_${name}.sql`);
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
