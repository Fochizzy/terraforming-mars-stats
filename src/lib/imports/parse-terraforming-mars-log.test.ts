import { describe, expect, it } from 'vitest';
import type { ImportMapReferenceCatalog } from '@/lib/db/reference-repo';
import {
  applyImportObjectiveCorrections,
  auditImportMapReferenceCatalog,
  getObjectiveCorrectionOptions,
  parseTerraformingMarsLog,
} from './parse-terraforming-mars-log';

const objectiveSets = {
  amazonis: {
    awards: ['Curator', 'A. Engineer', 'Promoter', 'Tourist', 'A. Zoologist'],
    milestones: ['Colonizer', 'Forester', 'Minimalist', 'Terran', 'Tropicalist'],
    name: 'Amazonis Planitia',
  },
  arabia: {
    awards: ['Cosmic Settler', 'Botanist', 'Promoter', 'Zoologist', 'A. Manufacturer'],
    milestones: ['Economizer', 'Pioneer', 'Land Specialist', 'Martian', 'Terran'],
    name: 'Arabia Terra',
  },
  elysium: {
    awards: ['Celebrity', 'Industrialist', 'Desert Settler', 'Estate Dealer', 'Benefactor'],
    milestones: ['Generalist', 'Specialist', 'Ecologist', 'Tycoon', 'Legend'],
    name: 'Elysium',
  },
  hellas: {
    awards: ['Cultivator', 'Magnate', 'Space Baron', 'Excentric', 'Contractor'],
    milestones: ['Diversifier', 'Tactician', 'Polar Explorer', 'Energizer', 'Rim Settler'],
    name: 'Hellas',
  },
  tharsis: {
    awards: ['Landlord', 'Scientist', 'Banker', 'Thermalist', 'Miner'],
    milestones: ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner'],
    name: 'Tharsis',
  },
  terra_cimmeria: {
    awards: ['Biologist', 'Incorporator', 'T. Politician', 'Urbanist', 'Warmonger'],
    milestones: ['T. Collector', 'Firestarter', 'Terra Pioneer', 'Spacefarer', 'Gambler'],
    name: 'Terra Cimmeria',
  },
  terra_cimmeria_nova: {
    awards: ['Electrician', 'Founder', 'Mogul', 'A. Zoologist', 'Forecaster'],
    milestones: ['Planetologist', 'Architect', 'Coastguard', 'C. Forester', 'Fundraiser'],
    name: 'Terra Cimmeria Nova',
  },
  utopia: {
    awards: ['Edgedancer', 'Investor', 'Botanist', 'Incorporator', 'Metropolist'],
    milestones: ['Land Specialist', 'Pioneer', 'Tradesman', 'Smith', 'Researcher'],
    name: 'Utopia Planitia',
  },
  vastitas: {
    awards: ['Forecaster', 'Edgedancer', 'Visionary', 'Naturalist', 'Voyager'],
    milestones: ['V. Electrician', 'Smith', 'Tradesman', 'Irrigator', 'Capitalist'],
    name: 'Vastitas Borealis',
  },
  vastitas_nova: {
    awards: ['Traveller', 'Landscaper', 'Highlander', 'Promoter', 'Blacksmith'],
    milestones: ['Agronomist', 'V. Spacefarer', 'Geologist', 'Engineer', 'Farmer'],
    name: 'Vastitas Borealis Nova',
  },
} as const;

function objectiveId(type: 'award' | 'milestone', name: string) {
  return `${type}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function buildCatalog(): ImportMapReferenceCatalog {
  const maps = [
    ...Object.entries(objectiveSets).map(([code, value]) => ({
      code,
      id: `map-${code}`,
      name: value.name,
    })),
    { code: 'hollandia', id: 'map-hollandia', name: 'Hollandia' },
  ];

  const awards = Object.entries(objectiveSets).flatMap(([code, value]) =>
    value.awards.map((name) => ({
      awardId: objectiveId('award', name),
      awardName: name,
      mapId: `map-${code}`,
    })),
  );
  const milestones = Object.entries(objectiveSets).flatMap(([code, value]) =>
    value.milestones.map((name) => ({
      mapId: `map-${code}`,
      milestoneId: objectiveId('milestone', name),
      milestoneName: name,
    })),
  );
  // The catalog-wide objective lists mirror listMilestones()/listAwards():
  // every canonical objective, deduplicated by id, independent of any map.
  const allMilestones = [
    ...new Map(
      milestones.map((relationship) => [
        relationship.milestoneId,
        { id: relationship.milestoneId, name: relationship.milestoneName },
      ]),
    ).values(),
  ];
  const allAwards = [
    ...new Map(
      awards.map((relationship) => [
        relationship.awardId,
        { id: relationship.awardId, name: relationship.awardName },
      ]),
    ).values(),
  ];

  return {
    aliases: [
      { aliasText: 'Amazonis Engineer', entityId: objectiveId('award', 'A. Engineer'), entityType: 'award' },
      { aliasText: 'Amazonis Zoologist', entityId: objectiveId('award', 'A. Zoologist'), entityType: 'award' },
      { aliasText: 'Arabia Manufacturer', entityId: objectiveId('award', 'A. Manufacturer'), entityType: 'award' },
      { aliasText: 'Collector', entityId: objectiveId('milestone', 'T. Collector'), entityType: 'milestone' },
      { aliasText: 'Politician', entityId: objectiveId('award', 'T. Politician'), entityType: 'award' },
      { aliasText: 'Vastitas Electrician', entityId: objectiveId('milestone', 'V. Electrician'), entityType: 'milestone' },
      { aliasText: 'Vastitas Spacefarer', entityId: objectiveId('milestone', 'V. Spacefarer'), entityType: 'milestone' },
    ],
    allAwards,
    allMilestones,
    awards,
    maps,
    milestones,
  };
}

function parseLines(lines: string[]) {
  return parseTerraformingMarsLog({
    catalog: buildCatalog(),
    exportedLogText: [
      'Good luck Friday!',
      'Good luck Izzy!',
      'Generation 1',
      'Generation 12',
      ...lines,
    ].join('\n'),
  });
}

describe('Terraforming Mars exported-log parser', () => {
  it.each(Object.entries(objectiveSets))(
    'resolves the complete %s milestone set to its map',
    (code, value) => {
      const result = parseLines(
        value.milestones.map((name) => `Friday claimed ${name} milestone`),
      );

      expect(result.map.kind).toBe('resolved');
      expect(result.map.confirmedMapId).toBe(`map-${code}`);
    },
  );

  it.each(Object.entries(objectiveSets))(
    'resolves the complete %s award set to its map',
    (code, value) => {
      const result = parseLines(
        value.awards.map((name) => `Izzy funded ${name} award`),
      );

      expect(result.map.kind).toBe('resolved');
      expect(result.map.confirmedMapId).toBe(`map-${code}`);
    },
  );

  it('resolves combined milestone and award evidence', () => {
    const result = parseLines([
      'Friday claimed Mayor milestone',
      'Izzy funded Scientist award',
    ]);

    expect(result.map.kind).toBe('resolved');
    expect(result.map.confirmedMapId).toBe('map-tharsis');
  });

  it('normalizes capitalization, harmless punctuation, and approved aliases', () => {
    const result = parseLines([
      'Friday claimed collector!!! milestone',
      'Izzy funded POLITICIAN award',
    ]);

    expect(result.map.kind).toBe('resolved');
    expect(result.map.confirmedMapId).toBe('map-terra_cimmeria');
    expect(result.map.evidence.map((item) => item.resolution)).toEqual([
      'alias',
      'alias',
    ]);
  });

  it('returns a candidate state for partial evidence', () => {
    const result = parseLines(['Friday claimed Mayor milestone']);

    expect(result.map.kind).toBe('partial');
    expect(result.map.candidates.map((candidate) => candidate.id)).toEqual([
      'map-tharsis',
    ]);
    expect(result.map.confirmedMapId).toBeNull();
  });

  it('does not auto-select ambiguous evidence', () => {
    const result = parseLines([
      'Friday claimed Pioneer milestone',
      'Izzy claimed Land Specialist milestone',
    ]);

    expect(result.map.kind).toBe('ambiguous');
    expect(result.map.candidates.map((candidate) => candidate.id).sort()).toEqual([
      'map-arabia',
      'map-utopia',
    ]);
    expect(result.map.confirmedMapId).toBeNull();
  });

  it('does not auto-select conflicting evidence', () => {
    const result = parseLines([
      'Friday claimed Mayor milestone',
      'Izzy claimed Generalist milestone',
    ]);

    expect(result.map.kind).toBe('conflicting');
    expect(result.map.confirmedMapId).toBeNull();
  });

  it('keeps unknown values visible and constrains corrections to a confirmed map', () => {
    const catalog = buildCatalog();
    const result = parseTerraformingMarsLog({
      catalog,
      exportedLogText: [
        'Good luck Friday!',
        'Generation 10',
        'Friday claimed Mayor milestone',
        'Friday funded Scientist award',
        'Friday funded Imaginary Award award',
      ].join('\n'),
    });

    expect(result.map.evidence.at(-1)).toMatchObject({
      originalValue: 'Imaginary Award',
      resolution: 'unknown',
    });
    expect(result.map.kind).toBe('partial');
    expect(
      getObjectiveCorrectionOptions(catalog, 'map-tharsis', 'milestone'),
    ).toHaveLength(5);
    expect(
      getObjectiveCorrectionOptions(catalog, 'map-tharsis', 'award'),
    ).toHaveLength(5);
  });

  it('applies a canonical objective correction without discarding source evidence', () => {
    const catalog = buildCatalog();
    const parsed = parseTerraformingMarsLog({
      catalog,
      exportedLogText: [
        'Good luck Friday!',
        'Generation 10',
        'Friday funded Imaginary Award award',
      ].join('\n'),
    });
    const sourceEvidence = parsed.map.evidence[0];
    const reviewed = applyImportObjectiveCorrections({
      catalog,
      corrections: [
        {
          canonicalId: objectiveId('award', 'Scientist'),
          lineNumber: sourceEvidence.lineNumber,
          type: 'award',
        },
      ],
      evidence: parsed.map.evidence,
    });

    expect(reviewed[0]).toMatchObject({
      canonicalName: 'Scientist',
      originalLine: 'Friday funded Imaginary Award award',
      originalPlayerValue: 'Friday',
      originalValue: 'Imaginary Award',
      resolution: 'corrected',
    });
  });

  it('audits every fixed map relationship while preserving Hollandia as unsupported', () => {
    const catalog = buildCatalog();
    const audit = auditImportMapReferenceCatalog(catalog);

    expect(audit.blockingIssues).toEqual([]);
    expect(audit.randomizedUnsupportedMaps.map((map) => map.name)).toEqual([
      'Hollandia',
    ]);
    for (const map of catalog.maps.filter((map) => map.name !== 'Hollandia')) {
      expect(catalog.milestones.filter((row) => row.mapId === map.id)).toHaveLength(5);
      expect(catalog.awards.filter((row) => row.mapId === map.id)).toHaveLength(5);
    }
  });
});
