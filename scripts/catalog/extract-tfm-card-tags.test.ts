import { describe, expect, it } from 'vitest';
import {
  assertUsableTfmCardRecords,
  extractCardNameKeys,
  extractChunkNames,
  extractTfmCardManifest,
  mergeTfmCardRecords,
  MIN_EXPECTED_CARD_RECORDS,
  normalizeCardName,
  type TfmCardTagRecord,
} from './extract-tfm-card-tags';

// Shaped like the real entry point: a CardName enum plus the webpack chunk
// filename helper and the chunk ids the runtime requests.
const SYNTHETIC_MAIN = `
"use strict";
(() => {
  var A = {};
  !function (e) {
    e.RESEARCH = "Research", e.BIO_SOL = "Bio-Sol", e.AGRICOLA_INC = "Agricola Inc", e.SIXTEEN_PSYCHE = "16 Psyche", e.MERGER = "Merger";
  }(A.CardName || (A.CardName = {}));
  A.u = e => "chunks/" + ({ 22: "help", 614: "card-list" }[e] || e) + ".js";
  A.e(22);
  Promise.all([A.e(614), A.e(756)]);
})();
`;

function manifestChunk(cards: unknown[]) {
  // The bundle embeds the manifest as a single-quoted JS string.
  const json = JSON.stringify(cards).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `(self.webpackChunk=self.webpackChunk||[]).push([[756],{6246(e,t,i){const s=JSON.parse('${json}');}}]);`;
}

const MANIFEST_CARDS = [
  {
    module: 'base',
    name: 'Research',
    tags: ['science', 'science'],
    victoryPoints: 1,
    type: 'automated',
    metadata: { cardNumber: '077' },
  },
  {
    module: 'pathfinders',
    name: 'Bio-Sol',
    tags: ['microbe'],
    victoryPoints: { resourcesHere: {}, per: 3 },
    type: 'corporation',
    metadata: { cardNumber: 'PfC14' },
  },
  {
    module: 'community',
    name: 'Agricola Inc',
    tags: ['plant'],
    victoryPoints: 'special',
    type: 'corporation',
    metadata: { cardNumber: 'R36' },
  },
  {
    module: 'promo',
    name: '16 Psyche',
    tags: ['space'],
    victoryPoints: 2,
    type: 'automated',
    metadata: { cardNumber: 'X44' },
  },
  {
    module: 'prelude2',
    name: 'Merger',
    tags: [],
    type: 'prelude',
    metadata: { cardNumber: 'P41' },
  },
  // Upstream marks event-ness as the type, not as a tag.
  {
    module: 'base',
    name: 'Asteroid',
    tags: ['space'],
    type: 'event',
    metadata: { cardNumber: '009' },
  },
  {
    module: 'promo',
    name: 'Air Raid',
    tags: [],
    type: 'event',
    metadata: { cardNumber: 'X01' },
  },
];

function buildRecords() {
  return extractTfmCardManifest({
    chunkSource: manifestChunk(MANIFEST_CARDS),
    nameKeysByName: extractCardNameKeys(SYNTHETIC_MAIN),
  });
}

describe('normalizeCardName', () => {
  it('matches the app-side normalization', () => {
    expect(normalizeCardName('Towing A Comet')).toBe('towing a comet');
    expect(normalizeCardName("Inventors' Guild")).toBe('inventors guild');
    expect(normalizeCardName('Sub-Zero Salt Fish')).toBe('sub zero salt fish');
  });
});

describe('extractCardNameKeys', () => {
  it('maps display names back to their CardName enum keys', () => {
    const keys = extractCardNameKeys(SYNTHETIC_MAIN);

    expect(keys.get('Bio-Sol')).toBe('BIO_SOL');
    expect(keys.get('16 Psyche')).toBe('SIXTEEN_PSYCHE');
  });
});

describe('extractChunkNames', () => {
  it('resolves requested chunk ids through the named chunk map', () => {
    // 22 and 614 are named; 756 (the manifest) falls back to its bare id.
    expect(extractChunkNames(SYNTHETIC_MAIN).sort()).toEqual(
      ['756', 'card-list', 'help'].sort(),
    );
  });
});

describe('extractTfmCardManifest', () => {
  it('reads the manifest embedded as a JSON.parse literal', () => {
    const records = buildRecords();

    expect(records).toHaveLength(7);
    expect(records.find((record) => record.name === 'Research')).toEqual({
      cardNumber: '077',
      cardType: 'automated',
      category: 'projectCards',
      module: 'Base',
      name: 'Research',
      nameKey: 'RESEARCH',
      tags: ['science', 'science'],
      victoryPoints: { kind: 'static', points: 1 },
    });
  });

  it('categorises corporations and preludes away from project cards', () => {
    const records = buildRecords();
    const byName = new Map(records.map((record) => [record.name, record]));

    expect(byName.get('Bio-Sol')).toMatchObject({
      category: 'corporationCards',
      module: 'Pathfinders',
      nameKey: 'BIO_SOL',
    });
    expect(byName.get('Merger')).toMatchObject({
      category: 'preludeCards',
      module: 'Prelude 2',
    });
  });

  it('classifies victory points as static, dynamic or none', () => {
    const byName = new Map(
      buildRecords().map((record) => [record.name, record.victoryPoints]),
    );

    expect(byName.get('16 Psyche')).toEqual({ kind: 'static', points: 2 });
    // Scaling objects and the "special" marker both mean no printed number.
    expect(byName.get('Bio-Sol')).toEqual({ kind: 'dynamic' });
    expect(byName.get('Agricola Inc')).toEqual({ kind: 'dynamic' });
    expect(byName.get('Merger')).toEqual({ kind: 'none' });
  });

  // The catalog counts gameplay tags per player, and events are one of the
  // things it counts, so the tag has to survive the round trip.
  it('restores the event tag that upstream carries as a card type', () => {
    const byName = new Map(buildRecords().map((r) => [r.name, r]));

    expect(byName.get('Asteroid')).toMatchObject({
      cardType: 'event',
      tags: ['space', 'event'],
    });
    expect(byName.get('Air Raid')).toMatchObject({
      cardType: 'event',
      tags: ['event'],
    });
    // Non-event cards must not gain the tag.
    expect(byName.get('Research')?.tags).toEqual(['science', 'science']);
    expect(byName.get('Merger')?.tags).toEqual([]);
  });

  it('returns nothing for a chunk that holds no manifest', () => {
    expect(
      extractTfmCardManifest({
        chunkSource: 'const a = JSON.parse(\'{"notAnArray":true}\');',
        nameKeysByName: new Map(),
      }),
    ).toEqual([]);
  });

  // Other chunks embed milestones, awards, colonies and global events with the
  // same JSON.parse shape. They have a name but no card type.
  it('ignores named entries that are not cards', () => {
    const records = extractTfmCardManifest({
      chunkSource: manifestChunk([
        { name: 'Landlord', description: 'Own the most tiles' },
        { module: 'colonies', name: 'Ceres', build: { type: 8 } },
        { module: 'turmoil', name: 'Jovian Tax Rights', description: 'Increase M€' },
        { module: 'base', name: 'Research', tags: [], type: 'automated' },
      ]),
      nameKeysByName: extractCardNameKeys(SYNTHETIC_MAIN),
    });

    expect(records.map((record) => record.name)).toEqual(['Research']);
  });
});

describe('mergeTfmCardRecords', () => {
  // Upstream spreads the manifest over several chunks; reading only the largest
  // one silently drops the expansion modules carried by the others.
  it('unions the chunks and keeps the first definition of each card', () => {
    const first = buildRecords();
    const second = extractTfmCardManifest({
      chunkSource: manifestChunk([
        { module: 'community', name: 'Aristarchus', tags: [], type: 'corporation' },
        // Also present in the first chunk, with different data.
        { module: 'community', name: 'Research', tags: ['plant'], type: 'event' },
      ]),
      nameKeysByName: extractCardNameKeys(SYNTHETIC_MAIN),
    });

    const merged = mergeTfmCardRecords([first, second]);

    expect(merged).toHaveLength(8);
    expect(merged.map((record) => record.name)).toContain('Aristarchus');
    expect(merged.find((record) => record.name === 'Research')).toMatchObject({
      module: 'Base',
      tags: ['science', 'science'],
    });
  });
});

describe('assertUsableTfmCardRecords', () => {
  function buildRecord(overrides: Partial<TfmCardTagRecord>): TfmCardTagRecord {
    return {
      cardNumber: '001',
      cardType: 'automated',
      category: 'projectCards',
      module: 'Base',
      name: 'Card',
      nameKey: 'CARD',
      tags: [],
      victoryPoints: { kind: 'none' },
      ...overrides,
    };
  }

  function buildUsableRecords() {
    // Enough project cards that dropping a whole category still clears the
    // overall floor, so the per-category guard is what fires.
    return [
      ...Array.from({ length: 800 }, (_value, index) =>
        buildRecord({ name: `Project ${index}`, nameKey: `PROJECT_${index}` }),
      ),
      ...Array.from({ length: 90 }, (_value, index) =>
        buildRecord({
          category: 'corporationCards',
          name: `Corp ${index}`,
          nameKey: `CORP_${index}`,
        }),
      ),
      ...Array.from({ length: 80 }, (_value, index) =>
        buildRecord({
          category: 'preludeCards',
          name: `Prelude ${index}`,
          nameKey: `PRELUDE_${index}`,
        }),
      ),
    ];
  }

  it('accepts a full extraction', () => {
    const records = buildUsableRecords();

    expect(assertUsableTfmCardRecords(records)).toBe(records);
    expect(records.length).toBeGreaterThanOrEqual(MIN_EXPECTED_CARD_RECORDS);
  });

  // The old extractor read a bundle that no longer held the manifest, produced
  // three cards and exited successfully, overwriting the committed snapshot.
  it('refuses a truncated extraction rather than overwriting the snapshot', () => {
    expect(() =>
      assertUsableTfmCardRecords([buildRecord({}), buildRecord({ name: 'Two' })]),
    ).toThrow(/Extracted only 2 .*expected at least 700/);
  });

  it('refuses an extraction that lost a whole category', () => {
    const records = buildUsableRecords().filter(
      (record) => record.category !== 'corporationCards',
    );

    expect(() => assertUsableTfmCardRecords(records)).toThrow(
      /Extracted only 0 corporationCards/,
    );
  });

  it('refuses an extraction whose CardName enum could not be resolved', () => {
    const records = buildUsableRecords().map((record) => ({
      ...record,
      nameKey: '',
    }));

    expect(() => assertUsableTfmCardRecords(records)).toThrow(
      /Could not resolve a CardName key/,
    );
  });
});
