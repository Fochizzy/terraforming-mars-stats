import { describe, expect, it } from 'vitest';
import {
  buildTagWinRateSummary,
  formatTagName,
  getTagWinRateBand,
  isLowSampleTag,
  type TagWinRatePresentationDatum,
} from './tag-outcomes-presentation';

const data: TagWinRatePresentationDatum[] = [
  {
    averageTagCount: 3,
    maxTagCount: 3,
    results: 2,
    tagCode: 'animal',
    winRate: 100,
    wins: 2,
  },
  {
    averageTagCount: 9.7,
    maxTagCount: 15,
    results: 9,
    tagCode: 'building',
    winRate: 33,
    wins: 3,
  },
  {
    averageTagCount: 3,
    maxTagCount: 7,
    results: 5,
    tagCode: 'jovian',
    winRate: 0,
    wins: 0,
  },
];

describe('tag outcome presentation helpers', () => {
  it('selects the best, most-played, and weakest tag callouts', () => {
    expect(buildTagWinRateSummary(data)).toEqual({
      best: data[0],
      mostPlayed: data[1],
      weakest: data[2],
    });
  });

  it('maps win rates to semantic bands', () => {
    expect(getTagWinRateBand(100)).toBe('strong');
    expect(getTagWinRateBand(50)).toBe('competitive');
    expect(getTagWinRateBand(33)).toBe('mixed');
    expect(getTagWinRateBand(0)).toBe('winless');
  });

  it('formats multi-word tag codes and identifies low samples', () => {
    expect(formatTagName('wild_planet')).toBe('Wild Planet');
    expect(isLowSampleTag(4)).toBe(true);
    expect(isLowSampleTag(5)).toBe(false);
  });
});
