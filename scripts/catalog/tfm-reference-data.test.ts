import { describe, expect, it } from 'vitest';
import {
  buildTfmCardBrowserUrl,
  buildTfmCatalogImportPayload,
  mapTfmRecordToCatalogSource,
  TFM_CARD_IMAGE_PLACEHOLDER_PATH,
} from './tfm-reference-data';
import {
  TFM_CARDS_PAGE_URL,
  type TfmCardTagRecord,
} from './extract-tfm-card-tags';

function sourceRecord(
  overrides: Partial<TfmCardTagRecord> = {},
): TfmCardTagRecord {
  return {
    cardNumber: '001',
    cardType: 'automated',
    category: 'projectCards',
    module: 'Base',
    name: 'Colonizer Training Camp',
    nameKey: 'COLONIZER_TRAINING_CAMP',
    tags: ['building'],
    victoryPoints: { kind: 'none' },
    ...overrides,
  };
}

describe('mapTfmRecordToCatalogSource', () => {
  it('maps the Terraforming Mars source into compatible catalog ids and browser links', () => {
    expect(
      mapTfmRecordToCatalogSource(
        sourceRecord({
          cardNumber: 'X44',
          module: 'Promo',
          name: '16 Psyche',
          nameKey: 'SIXTEEN_PSYCHE',
          tags: ['space'],
          victoryPoints: { kind: 'static', points: 2 },
        }),
      ),
    ).toMatchObject({
      cardName: '16 Psyche',
      cardNumber: 'X44',
      cardType: 'Project',
      expansionCode: 'promo',
      expansionName: 'Promo Cards',
      fullImagePath: `${TFM_CARDS_PAGE_URL}&search=16%20Psyche`,
      gameplayTags: ['space'],
      printedVictoryPoints: 2,
      promoSetSlug: '2023-spielbox-promos',
      requiredExpansionCodes: [],
      sourceCardId: 'project:promo:X44',
      thumbnailPath: TFM_CARD_IMAGE_PLACEHOLDER_PATH,
      victoryPointsKind: 'static',
    });
  });

  it('keeps corporations and preludes that are missing from Hadronikle selectable', () => {
    const payload = buildTfmCatalogImportPayload([
      sourceRecord({
        cardNumber: 'R45',
        category: 'corporationCards',
        module: 'Community',
        name: 'Project Workshop',
        nameKey: 'PROJECT_WORKSHOP',
        tags: ['building'],
      }),
      sourceRecord({
        cardNumber: 'Y08',
        cardType: null,
        category: 'preludeCards',
        module: 'Community',
        name: 'Accumulated Knowledge',
        nameKey: 'ACCUMULATED_KNOWLEDGE',
        tags: ['science'],
      }),
      sourceRecord({
        category: 'corporationCards',
        module: 'Automa',
        name: 'Tharsis Bot',
        nameKey: 'THARSIS_BOT',
      }),
    ]);

    expect(payload.corporations).toEqual([
      {
        code: 'community:project-workshop',
        expansion_code: 'community',
        name: 'Project Workshop',
        promo_set_slug: null,
        required_expansion_codes: ['community'],
      },
    ]);
    expect(payload.preludes).toEqual([
      {
        code: 'Y08',
        expansion_code: 'community',
        name: 'Accumulated Knowledge',
        promo_set_slug: null,
        required_expansion_codes: ['community'],
      },
    ]);
    expect(payload.cards.map((card) => card.card_name)).toEqual([
      'Project Workshop',
      'Accumulated Knowledge',
    ]);
  });
});

describe('buildTfmCardBrowserUrl', () => {
  it('anchors card references to the canonical browser page', () => {
    expect(buildTfmCardBrowserUrl({ name: 'Allied Banks' })).toBe(
      `${TFM_CARDS_PAGE_URL}&search=Allied%20Banks`,
    );
  });
});
