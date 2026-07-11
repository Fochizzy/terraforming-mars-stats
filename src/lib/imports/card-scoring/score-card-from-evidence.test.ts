import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';
import { scoreCardFromEvidence } from './score-card-from-evidence';

describe('scoreCardFromEvidence', () => {
  it('scores resource-count cards from card resources', () => {
    expect(
      scoreCardFromEvidence({
        evidence: {
          boardStateTextLines: [],
          cardId: 'card-1',
          cardName: 'Pets',
          playerName: 'Friday Mars',
          resourceCountsByType: { animal: 3 },
          selfTagCounts: {},
          selfTileCounts: {},
          sourceTags: [],
        },
        rule: {
          category: 'animals',
          confidence: 1,
          humanSummary: '1 VP per animal on this card',
          mode: 'resource_count',
          pointsPerSet: 1,
          resourceType: 'animal',
          scope: 'card',
          setSize: 1,
          sourceType: 'curated',
        },
      }),
    ).toEqual({
      category: 'animals',
      evidenceSummary: '3 animal => 3 VP',
      points: 3,
      status: 'scored',
    });
  });

  it('scores Capital through the generic adjacent-tile-count-from-placed-tile rule', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '14': {
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
          '22': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Corey',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
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
      scoreCardFromEvidence({
        boardEvidenceContext,
        evidence: {
          boardStateTextLines: [],
          cardId: 'card-capital',
          cardName: 'Capital',
          playerName: 'Izzy',
          resourceCountsByType: {},
          selfTagCounts: {},
          selfTileCounts: { city: 1 },
          sourceTags: [],
        },
        rule: {
          adjacentTileKinds: ['ocean'],
          category: 'other',
          confidence: 1,
          humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
          mode: 'adjacent_tile_count_from_placed_tile',
          pointsPerSet: 1,
          setSize: 1,
          sourceType: 'curated',
        },
      }),
    ).toEqual({
      category: 'other',
      evidenceSummary: 'Capital at space 21 had 3 adjacent ocean tiles => 3 VP',
      points: 3,
      status: 'scored',
    });
  });

  it('returns review-needed with requested spaces when a board-aware rule still lacks confirmation', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Commercial Harbor',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
    });

    expect(
      scoreCardFromEvidence({
        boardEvidenceContext,
        evidence: {
          boardStateTextLines: [],
          cardId: 'card-harbor',
          cardName: 'Commercial Harbor',
          playerName: 'Izzy',
          resourceCountsByType: {},
          selfTagCounts: {},
          selfTileCounts: { city: 1 },
          sourceTags: [],
        },
        rule: {
          adjacentTileKinds: ['ocean'],
          category: 'other',
          confidence: 1,
          humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
          mode: 'adjacent_tile_count_from_placed_tile',
          pointsPerSet: 1,
          setSize: 1,
          sourceType: 'curated',
        },
      }),
    ).toEqual({
      reason:
        'Commercial Harbor still needs board confirmation for spaces 14, 22, 29, 30.',
      requestedSpaceIds: ['14', '22', '29', '30'],
      reviewKind: 'board_evidence',
      status: 'review',
    });
  });

  it('scores tag-count cards from played-card tags', () => {
    expect(
      scoreCardFromEvidence({
        evidence: {
          boardStateTextLines: [],
          cardId: 'card-2',
          cardName: 'Research Network',
          playerName: 'Friday Mars',
          resourceCountsByType: {},
          selfTagCounts: { science: 5 },
          selfTileCounts: {},
          sourceTags: ['science'],
        },
        rule: {
          category: 'other',
          confidence: 0.9,
          humanSummary: '1 VP per 2 science tags you have',
          mode: 'tag_count',
          pointsPerSet: 1,
          scope: 'self',
          setSize: 2,
          sourceType: 'ocr',
          tag: 'science',
        },
      }),
    ).toEqual({
      category: 'other',
      evidenceSummary: '5 science tags => 2 VP',
      points: 2,
      status: 'scored',
    });
  });

  it('returns review for tag-count cards when no matching tag evidence was derived', () => {
    expect(
      scoreCardFromEvidence({
        evidence: {
          boardStateTextLines: [],
          cardId: 'card-3',
          cardName: 'Olympus Conference',
          playerName: 'Friday Mars',
          resourceCountsByType: {},
          selfTagCounts: { corporate_era: 4 },
          selfTileCounts: {},
          sourceTags: ['corporate_era'],
        },
        rule: {
          category: 'other',
          confidence: 1,
          humanSummary: '1 VP per 2 science tags you have',
          mode: 'tag_count',
          pointsPerSet: 1,
          scope: 'self',
          setSize: 2,
          sourceType: 'curated',
          tag: 'science',
        },
      }),
    ).toEqual({
      reason:
        'Olympus Conference needs trusted science tag evidence before it can be scored.',
      status: 'review',
    });
  });
});
