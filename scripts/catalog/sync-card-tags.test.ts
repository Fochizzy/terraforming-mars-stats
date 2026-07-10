import { describe, expect, it } from 'vitest';
import {
  buildCatalogCardPatch,
  type CatalogCardRow,
} from './sync-card-tags';
import {
  buildMissingSelectionReferenceRows,
  mapTfmRecordToCatalogSource,
} from './tfm-reference-data';
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

describe('buildMissingSelectionReferenceRows', () => {
  const sources = [
    mapTfmRecordToCatalogSource(
      sourceRecord({
        category: 'corporationCards',
        module: 'Community',
        name: 'Project Workshop',
        cardNumber: 'R45',
        victoryPoints: { kind: 'none' },
      }),
    )!,
    mapTfmRecordToCatalogSource(
      sourceRecord({
        category: 'corporationCards',
        module: 'Base',
        name: 'Tharsis Republic',
        victoryPoints: { kind: 'none' },
      }),
    )!,
    mapTfmRecordToCatalogSource(
      sourceRecord({
        category: 'corporationCards',
        module: 'Automa',
        name: 'Tharsis Bot',
        victoryPoints: { kind: 'none' },
      }),
    )!,
    mapTfmRecordToCatalogSource(
      sourceRecord({
        category: 'preludeCards',
        module: 'Prelude',
        name: 'Allied Banks',
        cardNumber: 'P01',
        victoryPoints: { kind: 'none' },
      }),
    )!,
    mapTfmRecordToCatalogSource(
      sourceRecord({
        category: 'preludeCards',
        module: 'Moon',
        name: 'First Lunar Settlement',
        cardNumber: 'MP1',
        victoryPoints: { kind: 'none' },
      }),
    )!,
  ];

  it('seeds corporations that are missing from the reference table', () => {
    expect(
      buildMissingSelectionReferenceRows({
        existingNames: ['Tharsis Republic'],
        kind: 'Corporation',
        sources,
      }),
    ).toEqual([
      {
        code: 'community:project-workshop',
        expansion_code: 'community',
        name: 'Project Workshop',
        promo_set_slug: null,
        required_expansion_codes: ['community'],
      },
    ]);
  });

  it('skips automa bot corporations', () => {
    const rows = buildMissingSelectionReferenceRows({
      existingNames: [],
      kind: 'Corporation',
      sources,
    });

    expect(rows.map((row) => row.name)).not.toContain('Tharsis Bot');
  });

  it('treats aliased catalog names as already present', () => {
    expect(
      buildMissingSelectionReferenceRows({
        existingNames: ['Allied Bank'],
        kind: 'Prelude',
        sources,
      }),
    ).toEqual([
      {
        code: 'MP1',
        expansion_code: 'moon',
        name: 'First Lunar Settlement',
        promo_set_slug: null,
        required_expansion_codes: ['moon'],
      },
    ]);
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
