import { describe, expect, it } from 'vitest';
import { extractTfmCardTags, normalizeCardName } from './extract-tfm-card-tags';

const SYNTHETIC_BUNDLE = `
(() => {
  const t = {};
  !function (e) {
    e.RESEARCH = "Research", e.BIRDS = "Birds", e.ECOLOGICAL_ZONE = "Ecological Zone", e.DEIMOS_DOWN = "Deimos Down", e.MINUS_TWO = "Minus Two";
  }(t.CardName || (t.CardName = {}));
  let a;
  (a = t.Tags || (t.Tags = {})).BUILDING = "building", a.SCIENCE = "science", a.ANIMAL = "animal", a.PLANT = "plant", a.SPACE = "space", a.EVENT = "event";
  !function (e) {
    e.AUTOMATED = "automated", e.ACTIVE = "active", e.EVENT = "event";
  }(t.CardType || (t.CardType = {}));
  !function (e) {
    e.Base = "Base", e.CorpEra = "Corp Era";
  }(t.GameModule || (t.GameModule = {}));

  class Research {
    constructor() {
      this.def = { cardType: t.CardType.AUTOMATED, name: t.CardName.RESEARCH, tags: [t.Tags.SCIENCE, t.Tags.SCIENCE], cost: 11, metadata: { cardNumber: "001", victoryPoints: 1 } };
    }
  }
  class Birds {
    constructor() {
      this.def = { cardType: t.CardType.ACTIVE, name: t.CardName.BIRDS, tags: [t.Tags.ANIMAL], cost: 10, metadata: { cardNumber: "002", victoryPoints: d.CardRenderDynamicVictoryPoints.animals(1, 1) } };
    }
  }
  class EcologicalZone {
    constructor(e = t.CardName.ECOLOGICAL_ZONE, n = 12) {
      this.def = { cardType: t.CardType.ACTIVE, name: e, tags: [t.Tags.ANIMAL, t.Tags.PLANT], cost: n };
    }
  }
  class DeimosDown {
    constructor() {
      this.def = { cardType: t.CardType.EVENT, name: t.CardName.DEIMOS_DOWN, tags: [t.Tags.SPACE], cost: 31, metadata: { cardNumber: "009" } };
    }
  }
  class MinusTwo {
    constructor() {
      this.def = { cardType: t.CardType.AUTOMATED, name: t.CardName.MINUS_TWO, tags: [], cost: 5, metadata: { victoryPoints: -2 } };
    }
  }
  const manifest = {
    module: t.GameModule.Base,
    projectCards: [
      { cardName: t.CardName.RESEARCH, Factory: Research },
      { cardName: t.CardName.BIRDS, Factory: Birds },
      { cardName: t.CardName.ECOLOGICAL_ZONE, Factory: EcologicalZone },
      { cardName: t.CardName.DEIMOS_DOWN, Factory: DeimosDown },
      { cardName: t.CardName.MINUS_TWO, Factory: MinusTwo },
    ],
  };
  return manifest;
})();
`;

describe('extractTfmCardTags', () => {
  it('extracts card names, duplicate-preserving tags, and manifest modules', () => {
    const records = extractTfmCardTags(SYNTHETIC_BUNDLE);
    const byName = new Map(records.map((record) => [record.name, record]));

    expect(byName.get('Research')).toMatchObject({
      cardType: 'automated',
      category: 'projectCards',
      cardNumber: '001',
      module: 'Base',
      tags: ['science', 'science'],
      victoryPoints: { kind: 'static', points: 1 },
    });
    expect(byName.get('Birds')).toMatchObject({
      cardNumber: '002',
      tags: ['animal'],
      victoryPoints: { kind: 'dynamic' },
    });
    // Name resolved through the constructor default parameter.
    expect(byName.get('Ecological Zone')).toMatchObject({
      tags: ['animal', 'plant'],
    });
    // Event cards regain their printed event tag.
    expect(byName.get('Deimos Down')).toMatchObject({
      cardNumber: '009',
      cardType: 'event',
      tags: ['space', 'event'],
      victoryPoints: { kind: 'none' },
    });
    expect(byName.get('Minus Two')).toMatchObject({
      tags: [],
      victoryPoints: { kind: 'static', points: -2 },
    });
    // Cards unreachable by the parser are supplied as fixups.
    expect(byName.get('Mining Area')).toMatchObject({ tags: ['building'] });
    expect(byName.get('Pharmacy Union')).toMatchObject({
      tags: ['microbe', 'microbe'],
    });
  });
});

describe('normalizeCardName', () => {
  it('matches the app-side normalization', () => {
    expect(normalizeCardName('Towing A Comet')).toBe('towing a comet');
    expect(normalizeCardName("Inventors' Guild")).toBe('inventors guild');
    expect(normalizeCardName('Sub-Zero Salt Fish')).toBe('sub zero salt fish');
  });
});
