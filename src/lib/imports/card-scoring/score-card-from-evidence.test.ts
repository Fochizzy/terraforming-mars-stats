import { describe, expect, it } from 'vitest';
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
});
