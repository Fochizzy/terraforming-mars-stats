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
        corporationIds: ['corp1'],
        midgamePreludeIds: [],
        preludeIds: ['prelude1', 'prelude2'],
      },
    });
  });

  it('extracts multiple corporations for the same player from confident lines', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: preludes,
        rawLogText: [
          'Friday Mars played Tharsis Republic',
          'Friday Mars played Poseidon',
          'Friday Mars kept preludes Allied Bank',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        corporationIds: ['corp1', 'corp2'],
        midgamePreludeIds: [],
        preludeIds: ['prelude1'],
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

  it('keeps confidently detected corporations when a later line is ambiguous', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: preludes,
        rawLogText: [
          'Friday Mars played Tharsis Republic',
          'Friday Mars played Poseidon',
          'Friday Mars mentioned corporation Tharsis Republic and Poseidon in the same line',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        corporationIds: ['corp1', 'corp2'],
        midgamePreludeIds: [],
        preludeIds: [],
      },
    });
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
        corporationIds: ['corp1'],
        midgamePreludeIds: [],
        preludeIds: ['prelude1'],
      },
    });
  });

  it('separates preludes played after the opening phase from setup selections', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: [
          ...corporations,
          {
            expansionCode: 'promo',
            id: 'corp-valley-trust',
            name: 'Valley Trust',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
        ],
        participants: [{ importedName: 'Corey', playerId: 'p1' }],
        preludeOptions: [
          ...preludes,
          {
            expansionCode: 'prelude',
            id: 'prelude-board',
            name: 'Board of Directors',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
          {
            expansionCode: 'prelude',
            id: 'prelude-merger',
            name: 'Merger',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
          {
            expansionCode: 'prelude',
            id: 'prelude-new-partner',
            name: 'New Partner',
            promoSetSlug: null,
            requiredExpansionCodes: ['prelude'],
          },
        ],
        // Valley Trust's first action and the Board of Directors prelude both
        // play further preludes, so Corey names five preludes across the log
        // while only starting with two.
        rawLogText: [
          'Corey played Valley Trust',
          'Corey played Board of Directors',
          'Corey played Merger',
          'Corey took the first action of Valley Trust corporation',
          'Corey played New Partner',
          'Corey used Board of Directors action',
          'Corey played Corporate Archives',
          'Corey used Board of Directors action',
          'Corey played Donation',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp-valley-trust',
        corporationIds: ['corp-valley-trust'],
        midgamePreludeIds: ['prelude-new-partner', 'prelude2', 'prelude3'],
        preludeIds: ['prelude-board', 'prelude-merger'],
      },
    });
  });

  it('never counts a mid-game prelude that is already a setup selection', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Corey', playerId: 'p1' }],
        preludeOptions: preludes,
        rawLogText: [
          'Corey played Tharsis Republic',
          'Corey played Donation',
          'Corey passed',
          // Double Down replays a prelude the player already started with.
          'Corey played Donation',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        corporationIds: ['corp1'],
        midgamePreludeIds: [],
        preludeIds: ['prelude3'],
      },
    });
  });

  it('treats preludes played after a project as mid-game without an explicit action marker', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Nyx', playerId: 'p1' }],
        preludeOptions: preludes,
        // There is no "used"/"passed"/"took the first action" line here — the
        // opening phase ends when Nyx plays a project card, so the preludes
        // played afterward are recorded as mid-game rather than being lost.
        rawLogText: [
          'Nyx played Tharsis Republic',
          'Nyx played Allied Bank',
          'Nyx played Corporate Archives',
          'Nyx played Space Elevator',
          'Nyx played Donation',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        corporationIds: ['corp1'],
        midgamePreludeIds: ['prelude3'],
        preludeIds: ['prelude1', 'prelude2'],
      },
    });
  });

  it('overflows opening preludes beyond three into mid-game instead of dropping them', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Zed', playerId: 'p1' }],
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
        // Four preludes accumulate as opening selections with no detected end to
        // the opening phase; the fourth overflows to mid-game rather than the
        // whole prelude set being discarded.
        rawLogText: [
          'Zed played Tharsis Republic',
          'Zed played Allied Bank',
          'Zed played Corporate Archives',
          'Zed played Donation',
          'Zed played Experimental Forest',
        ].join('\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        corporationIds: ['corp1'],
        midgamePreludeIds: ['prelude4'],
        preludeIds: ['prelude1', 'prelude2', 'prelude3'],
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
        corporationIds: ['corp3'],
        midgamePreludeIds: [],
        preludeIds: ['prelude4', 'prelude5'],
      },
      p2: {
        corporationId: 'corp2',
        corporationIds: ['corp2'],
        midgamePreludeIds: [],
        preludeIds: ['prelude6', 'prelude7'],
      },
    });
  });
});
