import { describe, expect, it } from 'vitest';
import { compareTfmCardSnapshots } from './check-tfm-card-source';
import type { TfmCardTagRecord } from './extract-tfm-card-tags';

function card(overrides: Partial<TfmCardTagRecord> = {}): TfmCardTagRecord {
  return {
    cardNumber: '001',
    cardType: 'automated',
    category: 'projectCards',
    module: 'Base',
    name: 'Research',
    nameKey: 'RESEARCH',
    tags: ['science'],
    victoryPoints: { kind: 'static', points: 1 },
    ...overrides,
  };
}

describe('compareTfmCardSnapshots', () => {
  it('reports added, removed, and changed source cards', () => {
    const result = compareTfmCardSnapshots({
      committed: [
        card(),
        card({ name: 'Birds', nameKey: 'BIRDS', tags: ['animal'] }),
        card({ name: 'Old Card', nameKey: 'OLD_CARD' }),
      ],
      live: [
        card(),
        card({ name: 'Birds', nameKey: 'BIRDS', tags: ['animal', 'earth'] }),
        card({ name: 'New Card', nameKey: 'NEW_CARD' }),
      ],
    });

    expect(result.matches).toBe(false);
    expect(result.added).toEqual(['New Card']);
    expect(result.removed).toEqual(['Old Card']);
    expect(result.changed).toEqual(['Birds']);
  });
});
