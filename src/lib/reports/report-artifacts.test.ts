import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Immutable-report separation (audit finding F-08): every Step 4.3
// historical verification keeps its read-only dry run and its authorized
// production execution as SEPARATE artifacts with distinct, non-contradictory
// semantics. This test fails if an artifact goes missing or a future change
// collapses the pair again.

const reportsDir = resolve(process.cwd(), 'docs/redesign/reports');

function read(relativePath: string) {
  const fullPath = resolve(reportsDir, relativePath);
  expect(existsSync(fullPath), `${relativePath} must exist`).toBe(true);
  return readFileSync(fullPath, 'utf8');
}

describe('Step 4.3 immutable report artifacts', () => {
  it('keeps the Venus/Colonies dry run and production execution separate and honest', () => {
    const dryRunMd = read('phase-04-step-03b/venus-colonies-historical-dry-run.md');
    const dryRunJson = JSON.parse(
      read('phase-04-step-03b/venus-colonies-historical-dry-run.json'),
    );
    const productionMd = read(
      'phase-04-step-03b/venus-colonies-historical-production.md',
    );
    const productionJson = JSON.parse(
      read('phase-04-step-03b/venus-colonies-historical-production.json'),
    );

    // The dry run is read-only and says so.
    expect(dryRunMd).toContain('read-only production dry run');
    expect(dryRunMd).toContain('Production write performed: no');
    expect(dryRunJson.productionWritePerformed).toBe(false);

    // The production report records the authorized write with its
    // verification, and never carries the dry-run boilerplate.
    expect(productionMd).toContain('authorized production execution');
    expect(productionMd).toContain('Production write performed: **yes**');
    expect(productionMd).not.toContain('The dry run writes no game changes');
    expect(productionJson.productionWritePerformed).toBe(true);
    expect(productionJson.writeVerification.actualPersistedRows).toBe(42);
    expect(productionJson.writeVerification.secondRunPlannedWrites).toBe(0);

    // Distinct generation timestamps: the dry run predates the execution.
    expect(dryRunJson.generatedAt < productionJson.generatedAt).toBe(true);
  });

  it('keeps the placement dry run and production execution separate', () => {
    const dryRun = read('phase-04-step-03-placement/placement-backfill-dry-run.md');
    const production = read(
      'phase-04-step-03-placement/placement-backfill-production.md',
    );

    expect(dryRun).toContain('read-only dry run');
    expect(dryRun).toContain('Writes performed: **0**');
    expect(production).toContain('authorized production execution');
    expect(production).not.toContain('Writes performed: **0**');
  });

  it('keeps the live-capture reconciliation as its own read-only artifact', () => {
    const reconciliation = read(
      'phase-04-step-03-compat/live-capture-v2-reconciliation.md',
    );
    expect(reconciliation).toContain('read-only');
    expect(reconciliation).toContain('Writes performed: **0**');
  });
});
