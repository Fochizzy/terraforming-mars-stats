import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from './build-board-evidence-context';

describe('buildBoardEvidenceContext', () => {
  it('resolves the tile placed by a played board-scoring card from the log-first snapshot', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
    });

    expect(
      context.resolvePlacedTileByCard({
        cardName: 'Capital',
        playerName: 'Izzy',
      }),
    ).toEqual({
      notes: [],
      spaceId: '21',
      status: 'proved',
      tileKind: 'city',
    });
  });

  it('counts adjacent matching tiles from log evidence and requests only unresolved spaces', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
    });

    expect(
      context.countAdjacentMatchingTiles({
        spaceId: '21',
        tileKinds: ['ocean'],
      }),
    ).toEqual({
      count: 1,
      notes: ['Adjacent spaces 22, 29, 30 still need confirmation.'],
      requestedSpaceIds: ['22', '29', '30'],
      status: 'review_needed',
    });
  });

  it('uses screenshot confirmations to complete an adjacent query without changing the log-owned spaces', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
      screenshotConfirmations: {
        '22': { status: 'confirmed', tileKind: 'ocean' },
        '29': { status: 'confirmed', tileKind: 'empty' },
        '30': { status: 'confirmed', tileKind: 'occupied_other' },
      },
    });

    expect(
      context.countAdjacentMatchingTiles({
        spaceId: '21',
        tileKinds: ['ocean'],
      }),
    ).toEqual({
      count: 2,
      notes: [
        'Adjacent query for 21 was completed with targeted screenshot confirmation.',
      ],
      requestedSpaceIds: [],
      status: 'proved',
    });
  });

  it('counts named city tiles as cities for adjacent city queries', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Corey',
            sourceCardName: 'Capital',
            sourceType: 'log_explicit',
            tileKind: 'Capital',
          },
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Commercial District',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
          '22': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: 'Noctis City',
            sourceType: 'log_explicit',
            tileKind: 'Noctis City',
          },
          '29': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
          '30': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
        },
      },
    });

    expect(
      context.countAdjacentMatchingTiles({
        spaceId: '21',
        tileKinds: ['city'],
      }),
    ).toEqual({
      count: 2,
      notes: [],
      requestedSpaceIds: [],
      status: 'proved',
    });
  });

  it('keeps confirmed unknown screenshot evidence unresolved and still requests that space', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
      screenshotConfirmations: {
        '22': { status: 'confirmed', tileKind: 'unknown' },
        '29': { status: 'confirmed', tileKind: 'empty' },
        '30': { status: 'confirmed', tileKind: 'occupied_other' },
      },
    });

    expect(
      context.countAdjacentMatchingTiles({
        spaceId: '21',
        tileKinds: ['ocean'],
      }),
    ).toEqual({
      count: 1,
      notes: ['Adjacent spaces 22 still need confirmation.'],
      requestedSpaceIds: ['22'],
      status: 'review_needed',
    });
  });

  it('counts owned matching tiles for award consumers without changing milestone behavior', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'hellas',
        spaces: {
          '18': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
          '19': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
        },
      },
    });

    expect(
      context.countOwnedMatchingTiles({
        playerName: 'Colette',
        tileKinds: ['greenery'],
      }),
    ).toEqual({
      count: 2,
      notes: [],
      status: 'proved',
    });
  });
});
