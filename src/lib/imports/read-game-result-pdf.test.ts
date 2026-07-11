import { describe, expect, it } from 'vitest';

import {
  buildTestPdf,
  type TestPdfPage,
  type TestPdfTextRun,
} from './fixtures/build-test-pdf';
import { parseEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import { readGameResultPdf } from './read-game-result-pdf';

const SCORE_CELL_X = [400, 470, 540, 610, 680, 750];
const SCORE_TOTAL_X = 804;
const BADGE_X = [77, 372, 667, 962];
const TEXT_X = [105, 400, 695, 990];
const HEADER_X = [178, 459, 757, 1044];
const HEADER_Y = 1779;
const FIRST_ENTRY_Y = 1809;
const ROW_HEIGHT = 27;

function scoreRow(input: {
  corporations: string[];
  nameY: number;
  playerName: string;
  values: number[];
}): TestPdfTextRun[] {
  const components = input.values.slice(0, 6);
  const total = input.values[6];

  return [
    { size: 40, text: input.playerName, x: 194, y: input.nameY },
    ...components.map((value, index) => ({
      text: String(value),
      x: SCORE_CELL_X[index],
      y: input.nameY + 13,
    })),
    { size: 20, text: String(total), x: SCORE_TOTAL_X, y: input.nameY + 16 },
    ...input.corporations.map((corporation, index) => ({
      text: corporation,
      x: 140,
      y: input.nameY + 30 + index * 30,
    })),
  ];
}

/** A detail row: `[column index, text]` pairs placed at the badge or text x. */
function detailRow(
  rowIndex: number,
  cells: Array<{ column: number; points?: number; text: string }>,
): TestPdfTextRun[] {
  const y = FIRST_ENTRY_Y + rowIndex * ROW_HEIGHT;

  return cells.flatMap((cell) => [
    ...(cell.points === undefined
      ? []
      : [
          {
            text: String(cell.points),
            // Negative badges are drawn slightly further left.
            x: cell.points < 0 ? BADGE_X[cell.column] - 2 : BADGE_X[cell.column],
            y,
          },
        ]),
    { text: cell.text, x: TEXT_X[cell.column], y },
  ]);
}

const MEGACREDITS_X = 911;
const TIMER_X = 964;
const TIMER_MINUTES_X = 996;
const TRAILING_X = 1043;

/**
 * The dimmed cells the results table prints after the total: megacredits, the
 * elapsed time (drawn as two runs) and a trailing count. Chrome composites them
 * separately, so they arrive through a form XObject.
 */
function dimmedRow(input: {
  megacredits: number;
  nameY: number;
  timer: [string, string];
  trailing: number;
}): TestPdfTextRun[] {
  const y = input.nameY + 13;

  return [
    { text: String(input.megacredits), x: MEGACREDITS_X, y },
    { text: input.timer[0], x: TIMER_X, y },
    { text: input.timer[1], x: TIMER_MINUTES_X, y },
    { text: String(input.trailing), x: TRAILING_X, y },
  ];
}

// The total column lands within a couple of points of the second detail
// column's text x (400), so its numbers can be mistaken for a wrapped line.
const GLOBAL_PARAMETER_X = [181, 249, 322, 402];

function globalParameterRow(input: {
  name: string;
  values: number[];
  y: number;
}): TestPdfTextRun[] {
  return [
    { text: input.name, x: 76, y: input.y },
    ...input.values.map((value, index) => ({
      text: String(value),
      x: GLOBAL_PARAMETER_X[index],
      // The total is drawn a few points lower than the three components.
      y: index === 3 ? input.y + 3 : input.y,
    })),
  ];
}

function buildGameResultPdf(
  options: { withDimmedColumns?: boolean } = {},
): Uint8Array {
  const scoreTablePage: TestPdfPage = {
    formRuns: options.withDimmedColumns
      ? [
          ...dimmedRow({ megacredits: 88, nameY: 431, timer: ['15:', '44'], trailing: 117 }),
          ...dimmedRow({ megacredits: 98, nameY: 514, timer: ['17:', '45'], trailing: 114 }),
          ...dimmedRow({ megacredits: 58, nameY: 627, timer: ['16:', '26'], trailing: 116 }),
          ...dimmedRow({ megacredits: 60, nameY: 710, timer: ['39:', '44'], trailing: 141 }),
        ]
      : undefined,
    runs: [
      { size: 40, text: 'Izzy won!', x: 737, y: 264 },
      ...scoreRow({
        corporations: ['TerraLabs Research'],
        nameY: 431,
        playerName: 'Izzy',
        values: [28, 0, 10, 5, 11, 28, 82],
      }),
      ...scoreRow({
        corporations: ['Saturn Systems', 'Tycho Magnetics'],
        nameY: 514,
        playerName: 'James',
        values: [36, 5, 7, 2, 6, 22, 78],
      }),
      ...scoreRow({
        corporations: ['Bio-Sol'],
        nameY: 627,
        playerName: 'Corey',
        values: [37, 0, 7, 6, 0, 24, 74],
      }),
      ...scoreRow({
        corporations: ['Agricola Inc', 'Playwrights'],
        nameY: 710,
        playerName: 'Colette',
        values: [36, 10, 2, 3, 0, 9, 60],
      }),
    ],
  };

  const detailPage: TestPdfPage = {
    runs: [
      { text: 'Not affiliated with FryxGames.', x: 24, y: 31 },
      ...['Izzy', 'James', 'Corey', 'Colette'].map((name, index) => ({
        text: name,
        x: HEADER_X[index],
        y: HEADER_Y,
      })),
      ...detailRow(0, [
        { column: 0, points: 1, text: 'AI Central' },
        { column: 1, points: 2, text: '16 Psyche' },
        { column: 2, points: 1, text: 'Bio-Sol' },
        { column: 3, points: 1, text: 'Agricola Inc' },
      ]),
      ...detailRow(1, [
        { column: 0, points: 4, text: 'Neptunian Power' },
        { column: 1, points: -2, text: 'Nuclear Zone' },
        { column: 2, points: 5, text: 'Decomposers' },
        { column: 3, points: 2, text: 'Ants' },
      ]),
      // Wrapped continuation lines carry no badge.
      ...detailRow(2, [{ column: 0, text: 'Consultants' }]),
      ...detailRow(3, [
        { column: 0, points: -5, text: 'Vermin' },
        { column: 1, points: 5, text: 'Claimed Specialist' },
      ]),
      // A run of only spaces must not be mistaken for a continuation.
      ...detailRow(4, [
        { column: 0, text: '   ' },
        { column: 1, text: 'milestone' },
      ]),
      ...detailRow(5, [
        { column: 0, points: 5, text: '1st place for Estate' },
        { column: 3, points: 2, text: '2nd place for Benefactor' },
      ]),
      ...detailRow(6, [
        { column: 0, text: 'Dealer award (funded by' },
        { column: 3, text: 'award (funded by Colette)' },
      ]),
      ...detailRow(7, [{ column: 0, text: 'Izzy)' }]),
      // A blank spacer separates the cards from the milestones and awards, so
      // rows 8 and 9 are skipped entirely.
      ...detailRow(10, [
        { column: 0, points: 5, text: 'Claimed Ecologist' },
        { column: 1, points: 5, text: '1st place for Industrialist' },
      ]),
      ...detailRow(11, [
        { column: 0, text: 'milestone' },
        { column: 1, text: 'award (funded by James)' },
      ]),
      // The global parameter table sits far below the detail block, headed by
      // icons plus a single "Total" text column, and is ordered by turn order.
      { text: 'Total', x: 404, y: 2726 },
      ...globalParameterRow({ name: 'James', values: [6, 1, 6, 13], y: 2791 }),
      ...globalParameterRow({ name: 'Colette', values: [7, 2, 3, 12], y: 2841 }),
      ...globalParameterRow({ name: 'Izzy', values: [1, 5, 0, 6], y: 2891 }),
      ...globalParameterRow({ name: 'Corey', values: [5, 6, 0, 11], y: 2941 }),
    ],
  };

  const boardPage: TestPdfPage = {
    runs: [
      { text: 'GEN:', x: 229, y: 4335 },
      ...Array.from({ length: 10 }, (_value, index) => ({
        text: String(index + 1),
        x: 299 + index * 30,
        y: 4335,
      })),
    ],
  };

  return buildTestPdf([scoreTablePage, detailPage, boardPage]);
}

describe('readGameResultPdf', () => {
  it('reads the score table, naming each row from the text above its cells', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.endgameLines).toEqual([
      'Izzy 28 0 10 5 11 28 82',
      'James 36 5 7 2 6 22 78',
      'Corey 37 0 7 6 0 24 74',
      'Colette 36 10 2 3 0 9 60',
    ]);
  });

  // A player who merges corporations (Merger / Double Down) prints several
  // corporation names, and the numeric cells centre against that stack, so a
  // corporation prints between the player name and the cells. The nearest text
  // above the cells is then the corporation, not the player.
  it('names a merged-corporation row from the known player names', async () => {
    const nameY = 514;
    const pdf = buildTestPdf([
      {
        runs: [
          { size: 40, text: 'Izzy', x: 194, y: nameY },
          // First corporation lands above the numeric cells.
          { text: 'PolderTECH Dutch', x: 140, y: nameY + 30 },
          ...[36, 5, 9, 7, 14, 12].map((value, index) => ({
            text: String(value),
            x: SCORE_CELL_X[index],
            y: nameY + 43,
          })),
          { size: 20, text: '83', x: SCORE_TOTAL_X, y: nameY + 46 },
          // The remaining corporations land below, as usual.
          { text: 'Steelaris', x: 140, y: nameY + 60 },
          { text: 'Curiosity II', x: 140, y: nameY + 90 },
        ],
      },
    ]);

    // Without the log's names the nearest text above the cells wins, which is
    // the corporation printed between the name and the numbers.
    const withoutHints = await readGameResultPdf(pdf);
    expect(withoutHints.endgameLines).toEqual([
      'PolderTECH Dutch 36 5 9 7 14 12 83',
    ]);

    const withHints = await readGameResultPdf(pdf, {
      expectedPlayerNames: ['Izzy', 'Colette', 'Corey'],
    });
    expect(withHints.endgameLines).toEqual(['Izzy 36 5 9 7 14 12 83']);
  });

  it('reads the megacredits the table dims after the total', async () => {
    const read = await readGameResultPdf(
      buildGameResultPdf({ withDimmedColumns: true }),
    );

    // The elapsed time and the trailing count sit further right and are cut.
    expect(read.endgameLines).toEqual([
      'Izzy 28 0 10 5 11 28 82 88',
      'James 36 5 7 2 6 22 78 98',
      'Corey 37 0 7 6 0 24 74 58',
      'Colette 36 10 2 3 0 9 60 60',
    ]);
  });

  it('carries the dimmed megacredits through to the parsed rows', async () => {
    const read = await readGameResultPdf(
      buildGameResultPdf({ withDimmedColumns: true }),
    );
    const parsed = parseEndgameScoreScreenshot(read.endgameLines, {
      generationCount: read.generationCount,
      layout: read.endgameLayout,
    });

    expect(
      parsed.playerRows.map((row) => [row.playerName, row.finalMegacredits]),
    ).toEqual([
      ['Izzy', 88],
      ['James', 98],
      ['Corey', 58],
      ['Colette', 60],
    ]);
    expect(parsed.playerRows[0]).toMatchObject({
      totalPoints: 82,
      trPoints: 28,
    });
  });

  it('reports the victory breakdown layout and the generation count', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.endgameLayout).toBe('victory_breakdown');
    expect(read.generationCount).toBe(10);
  });

  it('feeds the endgame parser rows whose components sum to the total', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());
    const parsed = parseEndgameScoreScreenshot(read.endgameLines, {
      generationCount: read.generationCount,
      layout: read.endgameLayout,
    });

    expect(parsed.generationCount).toBe(10);
    expect(parsed.playerRows).toHaveLength(4);
    expect(parsed.playerRows[0]).toEqual({
      awardPoints: 10,
      cardPointsAnimals: undefined,
      cardPointsJovian: undefined,
      cardPointsMicrobes: undefined,
      cardPointsTotal: 28,
      citiesPoints: 11,
      finalMegacredits: undefined,
      greeneryPoints: 5,
      milestonePoints: 0,
      playerName: 'Izzy',
      totalPoints: 82,
      trPoints: 28,
    });
    expect(parsed.playerRows[3]).toMatchObject({
      awardPoints: 2,
      cardPointsTotal: 9,
      citiesPoints: 0,
      greeneryPoints: 3,
      milestonePoints: 10,
      playerName: 'Colette',
    });
  });

  it('splits the score details into one column per player', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.scoreDetailsColumns.map((column) => column.textLines[0])).toEqual(
      ['Izzy', 'James', 'Corey', 'Colette'],
    );
  });

  it('joins wrapped entries and moves the points token to the end', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.scoreDetailsColumns[0].textLines).toEqual([
      'Izzy',
      'AI Central 1',
      'Neptunian Power Consultants 4',
      'Vermin -5',
      '1st place for Estate Dealer award 5',
      '(funded by Izzy)',
      'Claimed Ecologist milestone 5',
    ]);
  });

  it('keeps the funder on its own line so the award parser can read it', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.scoreDetailsColumns[3].textLines).toEqual([
      'Colette',
      'Agricola Inc 1',
      'Ants 2',
      '2nd place for Benefactor award 2',
      '(funded by Colette)',
    ]);
  });

  it('keeps negative card points and claimed milestones', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.scoreDetailsColumns[1].textLines).toEqual([
      'James',
      '16 Psyche 2',
      'Nuclear Zone -2',
      'Claimed Specialist milestone 5',
      '1st place for Industrialist award 5',
      '(funded by James)',
    ]);
  });

  // The game prints milestones and awards last, after a blank spacer row. A
  // vertical cut ends the block at that spacer and loses every claim.
  it('reads the milestones and awards printed below a blank spacer row', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());
    const [izzy, james] = read.scoreDetailsColumns;

    expect(izzy.textLines).toContain('Claimed Ecologist milestone 5');
    expect(james.textLines).toContain('1st place for Industrialist award 5');
    expect(james.textLines).toContain('(funded by James)');
  });

  // The global parameter table's total column all but touches the second
  // column's text x, so its numbers must not be appended to the award above it.
  it('does not append the global parameter totals to the entry above them', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    for (const column of read.scoreDetailsColumns) {
      for (const line of column.textLines) {
        expect(line).not.toMatch(/award \d+ \d+$/);
        expect(line).not.toMatch(/\b(?:13|12|11)\b/);
      }
    }
  });

  it('keeps the global parameter table out of the score detail columns', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    for (const column of read.scoreDetailsColumns) {
      expect(column.textLines.join('\n')).not.toMatch(/13/);
    }
  });

  it('reads each player global parameter contribution', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.globalParameters).toEqual([
      { oceans: 6, oxygen: 1, playerName: 'James', temperature: 6, total: 13 },
      { oceans: 3, oxygen: 2, playerName: 'Colette', temperature: 7, total: 12 },
      { oceans: 0, oxygen: 5, playerName: 'Izzy', temperature: 1, total: 6 },
      { oceans: 0, oxygen: 6, playerName: 'Corey', temperature: 5, total: 11 },
    ]);
  });

  it('sums the global parameter columns to a fully terraformed Mars', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());
    const rows = read.globalParameters ?? [];
    const sum = (pick: (row: (typeof rows)[number]) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);

    expect(sum((row) => row.temperature)).toBe(19);
    expect(sum((row) => row.oxygen)).toBe(14);
    expect(sum((row) => row.oceans)).toBe(9);
  });

  it('skips global parameter rows whose columns do not sum to the total', async () => {
    const pdf = buildTestPdf([
      {
        runs: [
          ...scoreRow({
            corporations: ['TerraLabs Research'],
            nameY: 431,
            playerName: 'Izzy',
            values: [28, 0, 10, 5, 11, 28, 82],
          }),
        ],
      },
      { runs: globalParameterRow({ name: 'Izzy', values: [1, 5, 0, 9], y: 2891 }) },
    ]);

    await expect(readGameResultPdf(pdf)).resolves.toMatchObject({
      globalParameters: [],
    });
  });

  it('does not mistake the GEN row for a global parameter row', async () => {
    const read = await readGameResultPdf(buildGameResultPdf());

    expect(read.globalParameters?.map((row) => row.playerName)).not.toContain(
      'GEN:',
    );
    expect(read.generationCount).toBe(10);
  });

  it('throws when the first page has no score table', async () => {
    const pdf = buildTestPdf([{ runs: [{ text: 'Go to main page', x: 10, y: 20 }] }]);

    await expect(readGameResultPdf(pdf)).rejects.toThrow(
      /could not find the victory point table/i,
    );
  });
});
