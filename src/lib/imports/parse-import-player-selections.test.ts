import { describe, expect, it } from 'vitest';
import { parseImportPlayerSelections } from './parse-import-player-selections';

const corporations = [
  {
    expansionCode: 'base',
    id: 'corp1',
    name: 'Tharsis Republic',
    promoSetSlug: null,
    requiredExpansionCodes: ['base'],
  },
  {
    expansionCode: 'colonies',
    id: 'corp2',
    name: 'Poseidon',
    promoSetSlug: null,
    requiredExpansionCodes: ['colonies'],
  },
];

const preludes = [
  {
    expansionCode: 'prelude',
    id: 'prelude1',
    name: 'Allied Bank',
    promoSetSlug: null,
    requiredExpansionCodes: ['prelude'],
  },
  {
    expansionCode: 'prelude',
    id: 'prelude2',
    name: 'Corporate Archives',
    promoSetSlug: null,
    requiredExpansionCodes: ['prelude'],
  },
  {
    expansionCode: 'prelude',
    id: 'prelude3',
    name: 'Donation',
    promoSetSlug: null,
    requiredExpansionCodes: ['prelude'],
  },
];

describe('parseImportPlayerSelections', () => {
  it('extracts a corporation and up to three preludes from confident lines', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: preludes,
        rawLogText: [
          'Friday Mars chose corporation Tharsis Republic',
          'Friday Mars kept preludes Allied Bank, Corporate Archives',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        preludeIds: ['prelude1', 'prelude2'],
      },
    });
  });

  it('drops an ambiguous corporation match instead of guessing', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: preludes,
        rawLogText:
          'Friday Mars mentioned corporation Tharsis Republic and Poseidon in the same line',
      }),
    ).toEqual({});
  });

  it('ignores prelude lines that resolve to more than three unique cards', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: [
          ...preludes,
          {
            expansionCode: 'prelude',
            id: 'prelude4',
            name: 'Experimental Forest',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
        ],
        rawLogText:
          'Friday Mars kept preludes Allied Bank, Corporate Archives, Donation, Experimental Forest',
      }),
    ).toEqual({});
  });

  it('does not match a prelude when a played card merely starts with its name', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'James', playerId: 'p1' }],
        preludeOptions: [
          ...preludes,
          {
            expansionCode: 'prelude',
            id: 'prelude-mohole',
            name: 'Mohole',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
        ],
        rawLogText: [
          'James played Tharsis Republic',
          'James played Allied Bank',
          'James played Mohole Lake',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        preludeIds: ['prelude1'],
      },
    });
  });

  it('extracts corporations and preludes from real TM export play lines', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: [
          ...corporations,
          {
            expansionCode: 'promo',
            id: 'corp3',
            name: 'Project Workshop',
            promoSetSlug: null,
            requiredExpansionCodes: ['base'],
          },
        ],
        participants: [
          { importedName: 'Izzy', playerId: 'p1' },
          { importedName: 'Corey', playerId: 'p2' },
        ],
        preludeOptions: [
          ...preludes,
          {
            expansionCode: 'prelude',
            id: 'prelude4',
            name: 'Self-Sufficient Settlement',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
          {
            expansionCode: 'prelude',
            id: 'prelude5',
            name: 'New Partner',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
          {
            expansionCode: 'prelude',
            id: 'prelude6',
            name: 'Project Eden',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
          {
            expansionCode: 'prelude',
            id: 'prelude7',
            name: 'Double Down',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
        ],
        rawLogText: [
          'Izzy played Project Workshop',
          'Izzy played Self-Sufficient Settlement',
          'Izzy played New Partner',
          'Izzy took the first action of Project Workshop corporation',
          'Corey played Poseidon',
          'Corey played Project Eden',
          'Corey played Double Down',
          'Corey used Poseidon action',
          'Corey played Project Eden',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp3',
        preludeIds: ['prelude4', 'prelude5'],
      },
      p2: {
        corporationId: 'corp2',
        preludeIds: ['prelude6', 'prelude7'],
      },
    });
  });
});
