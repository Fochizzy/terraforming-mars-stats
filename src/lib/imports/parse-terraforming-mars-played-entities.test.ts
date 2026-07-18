import { describe, expect, it } from 'vitest';
import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import {
  applyImportPlayedEntityCorrections,
  parseTerraformingMarsPlayedEntities,
} from './parse-terraforming-mars-played-entities';

const catalog: ImportGameReferenceCatalog = {
  aliases: [],
  allAwards: [],
  allMilestones: [],
  awards: [],
  cards: [
    {
      cardName: 'Asteroid Mining Consortium',
      cardNumber: '002',
      expansionCode: 'base',
      id: 'card-amc',
      promoSetSlug: null,
    },
    {
      cardName: 'Directed Impactors',
      cardNumber: 'X42',
      expansionCode: 'promo',
      id: 'card-directed-impactors',
      promoSetSlug: '2022-promos',
    },
  ],
  corporations: [
    {
      code: 'ecoline',
      expansionCode: 'base',
      id: 'corp-ecoline',
      logoPath: null,
      name: 'Ecoline',
      promoSetSlug: null,
    },
  ],
  entityAliases: [
    {
      aliasText: 'AMC',
      entityId: 'card-amc',
      entityType: 'card',
    },
  ],
  maps: [],
  milestones: [],
  preludes: [
    {
      expansionCode: 'prelude',
      id: 'prelude-allied-banks',
      name: 'Allied Banks',
    },
  ],
};

describe('Terraforming Mars played-entity parser', () => {
  it('separates corporations, Preludes, project cards, and promo provenance', () => {
    const result = parseTerraformingMarsPlayedEntities({
      catalog,
      exportedLogText: [
        'Friday played Ecoline',
        'Friday played Allied Banks',
        'Friday played AMC',
        'Friday played Directed Impactors',
      ].join('\n'),
    });

    expect(result.status).toBe('success');
    expect(result.evidence.map((item) => item.entityType)).toEqual([
      'corporation',
      'prelude',
      'card',
      'card',
    ]);
    expect(result.evidence[2]).toMatchObject({
      canonicalId: 'card-amc',
      resolution: 'alias',
    });
    expect(result.promoSetSlugs).toEqual(['2022-promos']);
  });

  it('keeps unknown played values visible without guessing', () => {
    const result = parseTerraformingMarsPlayedEntities({
      catalog,
      exportedLogText: 'Friday played Totally Unknown Card',
    });

    expect(result.status).toBe('partial');
    expect(result.evidence[0]).toMatchObject({
      canonicalId: null,
      originalValue: 'Totally Unknown Card',
      resolution: 'unknown',
    });
  });

  it('applies a canonical played-card correction without discarding source evidence', () => {
    const parsed = parseTerraformingMarsPlayedEntities({
      catalog,
      exportedLogText: 'Friday played Totally Unknown Card',
    });
    const reviewed = applyImportPlayedEntityCorrections({
      catalog,
      corrections: [
        {
          canonicalId: 'card-directed-impactors',
          entityType: 'card',
          lineNumber: parsed.evidence[0].lineNumber,
        },
      ],
      evidence: parsed.evidence,
    });

    expect(reviewed[0]).toMatchObject({
      canonicalId: 'card-directed-impactors',
      canonicalName: 'Directed Impactors',
      entityType: 'card',
      originalLine: 'Friday played Totally Unknown Card',
      originalPlayerValue: 'Friday',
      originalValue: 'Totally Unknown Card',
      promoSetSlug: '2022-promos',
      resolution: 'corrected',
    });
  });
});
