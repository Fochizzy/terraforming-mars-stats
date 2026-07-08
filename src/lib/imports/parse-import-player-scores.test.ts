import { describe, expect, it } from 'vitest';
import { parseImportPlayerScores } from './parse-import-player-scores';

const players = [
  { id: 'p1', name: 'Colette LeRoux' },
  { id: 'p2', name: 'Corey Jansen' },
  { id: 'p3', name: 'Izzy Hodnett' },
];

describe('parseImportPlayerScores', () => {
  it('normalizes structured OCR player rows into draft score fields', () => {
    const result = parseImportPlayerScores({
      players,
      evidence: {
        players: [
          {
            name: 'Colette LeRoux',
            citiesPoints: 5,
            greeneryPoints: 14,
            cardPointsTotal: 18,
            cardPointsMicrobes: 2,
            cardPointsAnimals: 3,
            cardPointsJovian: 4,
            trPoints: 36,
            milestonePoints: 5,
            awardPoints: 2,
            totalPoints: 87,
            finalMegacredits: 11,
          },
        ],
      },
    });

    expect(result).toEqual({
      p1: {
        citiesPoints: 5,
        greeneryPoints: 14,
        cardPointsTotal: 18,
        cardPointsMicrobes: 2,
        cardPointsAnimals: 3,
        cardPointsJovian: 4,
        trPoints: 36,
        milestonePoints: 5,
        awardPoints: 2,
        totalPoints: 87,
        finalMegacredits: 11,
      },
    });
  });

  it('parses conservative text score lines by participant name', () => {
    const result = parseImportPlayerScores({
      players,
      evidence:
        'Colette LeRoux: Cities 4, Greenery 9, Cards 12, TR 38, Milestones 5, Awards 0, Total 68, MC 7\n' +
        'Corey Jansen: city points 2; greenery points 11; total card points 15; final megacredits 3; total points 71',
    });

    expect(result).toEqual({
      p1: {
        citiesPoints: 4,
        greeneryPoints: 9,
        cardPointsTotal: 12,
        trPoints: 38,
        milestonePoints: 5,
        awardPoints: 0,
        totalPoints: 68,
        finalMegacredits: 7,
      },
      p2: {
        citiesPoints: 2,
        greeneryPoints: 11,
        cardPointsTotal: 15,
        totalPoints: 71,
        finalMegacredits: 3,
      },
    });
  });

  it('keeps total points when card points total appears in the same clause', () => {
    const result = parseImportPlayerScores({
      players,
      evidence: 'Colette LeRoux: card points total 15; total points 71',
    });

    expect(result).toEqual({
      p1: {
        cardPointsTotal: 15,
        totalPoints: 71,
      },
    });
  });

  it('parses exported final score rows that use colon-delimited labels', () => {
    const result = parseImportPlayerScores({
      players: [
        { id: 'p1', name: 'James' },
        { id: 'p2', name: 'Izzy' },
      ],
      evidence: [
        'Player: James, Total: 145, TR: 59, Milestones: 5, Awards: 15, Greenery: 6, City: 8, VP: 52, Mâ‚¬: 105, Time: 24.95 mins, Actions: 161',
        'Player: Izzy, Total: 82, TR: 39, Milestones: 10, Awards: 0, Greenery: 4, City: 6, VP: 23, Mâ‚¬: 82, Time: 18.88 mins, Actions: 98',
      ].join('\n'),
    });

    expect(result).toEqual({
      p1: {
        awardPoints: 15,
        cardPointsTotal: 52,
        citiesPoints: 8,
        finalMegacredits: 105,
        greeneryPoints: 6,
        milestonePoints: 5,
        totalPoints: 145,
        trPoints: 59,
      },
      p2: {
        awardPoints: 0,
        cardPointsTotal: 23,
        citiesPoints: 6,
        finalMegacredits: 82,
        greeneryPoints: 4,
        milestonePoints: 10,
        totalPoints: 82,
        trPoints: 39,
      },
    });
  });

  it('keeps zero scores instead of treating them as blank', () => {
    const result = parseImportPlayerScores({
      players,
      evidence: {
        players: [{ name: 'Izzy Hodnett', awardPoints: 0, finalMegacredits: 0 }],
      },
    });

    expect(result).toEqual({ p3: { awardPoints: 0, finalMegacredits: 0 } });
  });

  it('omits fields with conflicting values from the same source', () => {
    const result = parseImportPlayerScores({
      players,
      evidence: 'Colette LeRoux: Total 68, Total 72, Cities 4',
    });

    expect(result).toEqual({ p1: { citiesPoints: 4 } });
  });

  it('omits rows that cannot be matched confidently to one participant', () => {
    const result = parseImportPlayerScores({
      players: [
        { id: 'p1', name: 'Alex Green' },
        { id: 'p2', name: 'Alex Grey' },
      ],
      evidence: 'Alex: Total 70, TR 38',
    });

    expect(result).toEqual({});
  });
});
