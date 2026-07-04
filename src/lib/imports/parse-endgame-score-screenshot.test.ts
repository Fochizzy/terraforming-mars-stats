import { describe, expect, it } from 'vitest';
import { parseEndgameScoreScreenshot } from './parse-endgame-score-screenshot';

describe('parseEndgameScoreScreenshot', () => {
  it('parses totals and visible score-source rows from OCR lines', () => {
    const parsed = parseEndgameScoreScreenshot([
      'Izzy 18 5 10 7 22 62 8',
      'Corey 16 0 4 6 19 45 3',
      'Card Points',
      'Izzy Microbes 4 Animals 2 Jovian 6',
      'Corey Microbes 0 Animals 0 Jovian 3',
    ]);

    expect(parsed.playerRows).toEqual([
      {
        awardPoints: 22,
        cardPointsAnimals: 2,
        cardPointsJovian: 6,
        cardPointsMicrobes: 4,
        citiesPoints: 10,
        finalMegacredits: 8,
        greeneryPoints: 5,
        milestonePoints: 7,
        playerName: 'Izzy',
        totalPoints: 62,
        trPoints: 18,
      },
      {
        awardPoints: 19,
        cardPointsAnimals: 0,
        cardPointsJovian: 3,
        cardPointsMicrobes: 0,
        citiesPoints: 4,
        finalMegacredits: 3,
        greeneryPoints: 0,
        milestonePoints: 6,
        playerName: 'Corey',
        totalPoints: 45,
        trPoints: 16,
      },
    ]);
  });

  it('skips unsupported OCR lines without inventing player rows', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Final statistics',
        'This line is not a score row',
      ]),
    ).toEqual({
      playerRows: [],
    });
  });

  it('attaches score-source rows that appear before the matching total row', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Izzy Microbes 4 Animals 2 Jovian 6',
        'Izzy 18 5 10 7 22 62 8',
      ]).playerRows[0],
    ).toMatchObject({
      cardPointsAnimals: 2,
      cardPointsJovian: 6,
      cardPointsMicrobes: 4,
      playerName: 'Izzy',
      totalPoints: 62,
    });
  });
});
