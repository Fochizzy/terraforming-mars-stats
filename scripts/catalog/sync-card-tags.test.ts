import { describe, expect, it } from 'vitest';
import {
  buildCatalogCardPatch,
  mapTfmRecordToCatalogSource,
  type CatalogCardRow,
} from './sync-card-tags';
import type { TfmCardTagRecord } from './extract-tfm-card-tags';

function sourceRecord(
  overrides: Partial<TfmCardTagRecord> = {},
): TfmCardTagRecord {
  return {
    cardNumber: 'P78',
    cardType: 'active',
    category: 'projectCards',
    module: 'Prelude 2',
    name: 'L1 Trade Terminal',
    nameKey: 'L1_TRADE_TERMINAL',
    tags: ['space'],
    victoryPoints: { kind: 'static', points: 2 },
    ...overrides,
  };
}

function catalogRow(overrides: Partial<CatalogCardRow> = {}): CatalogCardRow {
  return {
    card_name: 'L1 Trade Terminal',
    card_number: '',
    card_type: 'Prelude',
    expansion_code: 'prelude',
    expansion_name: 'Prelude',
    gameplay_tags: [],
    id: 'card-1',
    printed_victory_points: null,
    victory_points_kind: 'none',
    ...overrides,
  };
}

describe('mapTfmRecordToCatalogSource', () => {
  it('maps source category, expansion, tags, numbers, and points into catalog fields', () => {
    expect(mapTfmRecordToCatalogSource(sourceRecord())).toMatchObject({
      cardName: 'L1 Trade Terminal',
      cardNumber: 'P78',
      cardType: 'Project',
      expansionCode: 'prelude_2',
      expansionName: 'Prelude 2',
      gameplayTags: ['space'],
      printedVictoryPoints: 2,
      victoryPointsKind: 'static',
    });

    expect(
      mapTfmRecordToCatalogSource(
        sourceRecord({
          category: 'corporationCards',
          module: 'Moon',
          name: 'Luna First Incorporated',
          victoryPoints: { kind: 'none' },
        }),
      ),
    ).toMatchObject({
      cardType: 'Corporation',
      expansionCode: 'moon',
      expansionName: 'Moon',
      printedVictoryPoints: null,
      victoryPointsKind: 'none',
    });

    expect(
      mapTfmRecordToCatalogSource(
        sourceRecord({
          module: 'Ares',
          victoryPoints: { kind: 'dynamic' },
        }),
      ),
    ).toMatchObject({
      expansionCode: 'ares',
      victoryPointsKind: 'dynamic',
    });
  });
});

describe('buildCatalogCardPatch', () => {
  it('updates stale category, expansion, tags, number, and points fields', () => {
    const source = mapTfmRecordToCatalogSource(sourceRecord());

    expect(buildCatalogCardPatch(catalogRow(), source)).toEqual({
      card_number: 'P78',
      card_type: 'Project',
      expansion_code: 'prelude_2',
      expansion_name: 'Prelude 2',
      gameplay_tags: ['space'],
      printed_victory_points: 2,
      victory_points_kind: 'static',
    });
  });

  it('leaves matching rows unchanged', () => {
    const source = mapTfmRecordToCatalogSource(sourceRecord());

    expect(
      buildCatalogCardPatch(
        catalogRow({
          card_number: 'P78',
          card_type: 'Project',
          expansion_code: 'prelude_2',
          expansion_name: 'Prelude 2',
          gameplay_tags: ['space'],
          printed_victory_points: 2,
          victory_points_kind: 'static',
        }),
        source,
      ),
    ).toBeNull();
  });
});
