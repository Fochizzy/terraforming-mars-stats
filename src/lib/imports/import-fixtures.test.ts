import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTerraformingMarsExpansionMechanics } from './parse-terraforming-mars-expansion-mechanics';
import { parseTerraformingMarsTileActions } from './parse-terraforming-mars-tile-actions';

function fixture(name: string) {
  return readFileSync(
    resolve(process.cwd(), 'src/lib/imports/fixtures', name),
    'utf8',
  );
}

const REAL_EXPORTS = [
  'retained-real-negative-game-2026-07-15.txt',
  'retained-real-grid-placement-2026-07-08.txt',
];

describe('real import fixtures', () => {
  it('never commits the original private player names', () => {
    for (const name of REAL_EXPORTS) {
      expect(fixture(name)).not.toMatch(/\b(izzy|james)\b/i);
    }
  });

  it('preserves grid coordinates from the real grid-placement export', () => {
    const text = fixture('retained-real-grid-placement-2026-07-08.txt');
    const { actions } = parseTerraformingMarsTileActions(text);
    const grid = actions.filter((action) => action.format === 'grid');

    expect(grid.length).toBeGreaterThan(0);
    // Grid coordinates are retained, not discarded after producing a flat id.
    for (const action of grid) {
      expect(action.boardRow).not.toBeNull();
      expect(action.boardPosition).not.toBeNull();
    }

    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
    });
    expect(expansion.sourceCoverage.complete).toBe(true);
    expect(expansion.venusNext.state).toBe('confirmed_absent');
    expect(expansion.colonies.state).toBe('confirmed_absent');
  });

  it('parses flat placements and a negative expansion state from the real negative export', () => {
    const text = fixture('retained-real-negative-game-2026-07-15.txt');
    const { actions } = parseTerraformingMarsTileActions(text);

    expect(actions.some((action) => action.format === 'flat-id')).toBe(true);

    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
    });
    expect(expansion.venusNext.state).toBe('confirmed_absent');
    expect(expansion.colonies.state).toBe('confirmed_absent');
  });

  it('parses Venus and Colony events from the source-backed upstream fragment', () => {
    const text = fixture('upstream-venus-colonies-action-fragment.txt');
    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
    });

    expect(
      expansion.events.some((event) => event.eventType.startsWith('venus_')),
    ).toBe(true);
    expect(
      expansion.events.some((event) => event.eventType.startsWith('colony_')),
    ).toBe(true);
  });
});
