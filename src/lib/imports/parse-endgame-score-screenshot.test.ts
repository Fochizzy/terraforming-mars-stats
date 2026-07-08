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
    expect(parsed.generationCount).toBeNull();
  });

  it('skips unsupported OCR lines without inventing player rows', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Final statistics',
        'This line is not a score row',
      ]),
    ).toEqual({
      generationCount: null,
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

  it('parses digital endgame rows that include a total card-points column', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Izzy | 18 5 10 7 22 14 76 8',
        'Corey | 16 0 4 6 19 9 54 3',
      ]),
    ).toEqual({
      generationCount: null,
      playerRows: [
        {
          awardPoints: 22,
          cardPointsTotal: 14,
          citiesPoints: 10,
          finalMegacredits: 8,
          greeneryPoints: 5,
          milestonePoints: 7,
          playerName: 'Izzy',
          totalPoints: 76,
          trPoints: 18,
        },
        {
          awardPoints: 19,
          cardPointsTotal: 9,
          citiesPoints: 4,
          finalMegacredits: 3,
          greeneryPoints: 0,
          milestonePoints: 6,
          playerName: 'Corey',
          totalPoints: 54,
          trPoints: 16,
        },
      ],
    });
  });

  it('parses the TM digital victory-breakdown layout with corporation lines split by OCR', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Victory point breakdown after 11 generations',
        'Colette 45 0 12 9 10 47 123 82 1:02:21 168',
        'Manutech',
        'Izzy',
        'Project Workshop 30 5 9 3 5 32 84 43 16:34 163',
        'Corey',
        'Tycho Magnetics 43 10 2 6 10 10 81 64 22:56 120',
      ]),
    ).toEqual({
      generationCount: 11,
      playerRows: [
        {
          awardPoints: 12,
          cardPointsTotal: 47,
          citiesPoints: 10,
          finalMegacredits: 82,
          greeneryPoints: 9,
          milestonePoints: 0,
          playerName: 'Colette',
          totalPoints: 123,
          trPoints: 45,
        },
        {
          awardPoints: 9,
          cardPointsTotal: 32,
          citiesPoints: 5,
          finalMegacredits: 43,
          greeneryPoints: 3,
          milestonePoints: 5,
          playerName: 'Izzy',
          totalPoints: 84,
          trPoints: 30,
        },
        {
          awardPoints: 2,
          cardPointsTotal: 10,
          citiesPoints: 10,
          finalMegacredits: 64,
          greeneryPoints: 6,
          milestonePoints: 10,
          playerName: 'Corey',
          totalPoints: 81,
          trPoints: 43,
        },
      ],
    });
  });

  it('prefers the more internally consistent OCR row when multiple passes disagree', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Victory point breakdown after 11 generations',
        'Colette 45 0 12 9 10 47 22 1:02:21 168',
        'Colette 45 0 12 9 10 47 123 82 1:02:21 168',
      ]),
    ).toEqual({
      generationCount: 11,
      playerRows: [
        {
          awardPoints: 12,
          cardPointsTotal: 47,
          citiesPoints: 10,
          finalMegacredits: 82,
          greeneryPoints: 9,
          milestonePoints: 0,
          playerName: 'Colette',
          totalPoints: 123,
          trPoints: 45,
        },
      ],
    });
  });

  it('parses row-band OCR lines with trailing timer columns and numeric OCR mistakes', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Colette 45 0 12 9 10 47 123 82 1:02:21 168',
        'Izzy 30 5 9 3 5 32 84 43 16:34 163',
        'Corey 43 10 2 6 10 10 Q1 64 22:56 120',
      ]),
    ).toEqual({
      generationCount: null,
      playerRows: [
        {
          awardPoints: 10,
          cardPointsTotal: 47,
          citiesPoints: 12,
          finalMegacredits: 82,
          greeneryPoints: 0,
          milestonePoints: 9,
          playerName: 'Colette',
          totalPoints: 123,
          trPoints: 45,
        },
        {
          awardPoints: 5,
          cardPointsTotal: 32,
          citiesPoints: 9,
          finalMegacredits: 43,
          greeneryPoints: 5,
          milestonePoints: 3,
          playerName: 'Izzy',
          totalPoints: 84,
          trPoints: 30,
        },
        {
          awardPoints: 10,
          cardPointsTotal: 10,
          citiesPoints: 2,
          finalMegacredits: 64,
          greeneryPoints: 10,
          milestonePoints: 6,
          playerName: 'Corey',
          totalPoints: 81,
          trPoints: 43,
        },
      ],
    });
  });

  it('treats seven-value digital rows as card-points plus total when the sum matches', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Izzy 30 5 9 3 5 32 84',
        'Corey 43 10 2 6 10 10 81',
      ]),
    ).toEqual({
      generationCount: null,
      playerRows: [
        {
          awardPoints: 5,
          cardPointsTotal: 32,
          citiesPoints: 9,
          greeneryPoints: 5,
          milestonePoints: 3,
          playerName: 'Izzy',
          totalPoints: 84,
          trPoints: 30,
        },
        {
          awardPoints: 10,
          cardPointsTotal: 10,
          citiesPoints: 2,
          greeneryPoints: 10,
          milestonePoints: 6,
          playerName: 'Corey',
          totalPoints: 81,
          trPoints: 43,
        },
      ],
    });
  });

  it('extracts the played generation count from a victory-point breakdown heading', () => {
    expect(
      parseEndgameScoreScreenshot([
        'Victory point breakdown after 11 generations',
      ]),
    ).toEqual({
      generationCount: 11,
      playerRows: [],
    });
  });
});
