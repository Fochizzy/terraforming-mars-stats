import { describe, expect, it } from 'vitest';
import { reconcileScoreRowStats } from './reconcile-score-row-stats';

describe('reconcileScoreRowStats', () => {
  it('recovers a row no single pass reads correctly by balancing against the total', () => {
    // The real Izzy row of a 1366x955 capture: "28" reads as "22"/"26" in every
    // pass but one, and only 28 + 0 + 10 + 5 + 11 + 28 reaches the total of 82.
    expect(
      reconcileScoreRowStats([
        '26 0 10 5 11 28 82',
        '22 0 10 5 11 28 82',
        '28 o 10 S 11 23 82',
        '22 c 10 S 11 2 82',
      ]),
    ).toEqual({ stats: [28, 0, 10, 5, 11, 28], totalPoints: 82 });
  });

  it('keeps an unreadable token as a gap so later columns stay in place', () => {
    // Dropping "co" would shift the total into the cards column.
    expect(reconcileScoreRowStats(['28 co 10 5 11 28 82'])).toEqual({
      stats: [28, 0, 10, 5, 11, 28],
      totalPoints: 82,
    });
  });

  it('applies digit substitutions before treating a token as unreadable', () => {
    expect(reconcileScoreRowStats(['37 O 7 6 O 24 74'])).toEqual({
      stats: [37, 0, 7, 6, 0, 24],
      totalPoints: 74,
    });
  });

  it('stops at the elapsed-time column so it cannot be read as a score', () => {
    expect(reconcileScoreRowStats(['37 0 7 6 0 24 74 58 16:26 116'])).toEqual({
      stats: [37, 0, 7, 6, 0, 24],
      totalPoints: 74,
    });
  });

  it('returns null when no combination reaches the total', () => {
    expect(reconcileScoreRowStats(['30 10 10 12 17 31 115'])).toBeNull();
  });

  it('returns null when two different combinations are equally supported', () => {
    // 1+9 and 9+1 both reach 10, and neither reading is better attested.
    expect(
      reconcileScoreRowStats(['1 9 0 0 0 0 10', '9 1 0 0 0 0 10']),
    ).toBeNull();
  });

  it('ignores passes that are mostly noise', () => {
    expect(reconcileScoreRowStats(['- = -- . -', 'Es fT 2 5'])).toBeNull();
  });
});
