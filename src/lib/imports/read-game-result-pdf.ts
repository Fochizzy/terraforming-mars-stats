import {
  extractPdfTextPages,
  type PdfTextItem,
  type PdfTextPage,
} from './pdf/extract-pdf-text';
import type {
  GameResultGlobalParameters,
  ReadGameResultScreenshotResult,
} from './read-game-result-screenshot';

/**
 * Reads the game result PDF printed from the browser ("Save as PDF" on the
 * endgame results page) into the same shape the screenshot OCR reader emits, so
 * the rest of the import pipeline is unchanged.
 *
 * The PDF carries a text layer with exact glyph positions, so the score table
 * and the per-player score details are recovered by geometry rather than by
 * recognising pixels:
 *
 *   page 1  score table       player name + 7 victory point columns
 *   page 2+ score details     four columns of "<points> <card>" entries
 *           global parameters player name + temperature, oxygen, oceans, total
 *   last    board + game log  the "GEN: 1 2 …" row gives the generation count
 */

type PdfToken = {
  endX: number;
  text: string;
  x: number;
  y: number;
};

type PdfRow = {
  tokens: PdfToken[];
  y: number;
};

/** Glyphs closer than this belong to the same word run; the PDF draws spaces. */
const TOKEN_GAP = 1;
const ROW_TOLERANCE = 4;
/** TR, milestones, awards, greenery, cities, cards, total. */
const SCORE_COLUMN_COUNT = 7;
/**
 * The results table dims a megacredits column after the total, then a timer and
 * a generation count. Only the megacredits are wanted, and the timer's minutes
 * read as a number, so the row is cut immediately after it.
 */
const MEGACREDITS_COLUMN_COUNT = 1;
const SCORE_ROW_TOLERANCE = 6;
/** The score table draws the total slightly below the component cells. */
const NAME_ABOVE_MARGIN = 5;
/** Entry point badges sit ~28pt left of the entry text; negatives shift left. */
const BADGE_TOLERANCE = 14;
/** Detail rows are ~27pt apart; the stats table below them is far further. */
const DETAIL_BLOCK_MAX_ROW_GAP = 60;
const NUMBER_PATTERN = /^-?\d+$/;
const GENERATION_LABEL_PATTERN = /^GEN\b/i;
const FUNDED_BY_FRAGMENT_PATTERN = /\(\s*funded\s+by\s+[^)]*\)/i;

function isNumberToken(token: PdfToken) {
  return NUMBER_PATTERN.test(token.text);
}

/**
 * Merges the per-glyph draws of a single visual line into word runs. Glyphs of
 * one run share an exact baseline, so they are grouped on `y` before merging.
 */
function buildTokens(items: PdfTextItem[]): PdfToken[] {
  const byBaseline = new Map<number, PdfTextItem[]>();

  for (const item of items) {
    const baseline = Math.round(item.y * 100) / 100;
    const existing = byBaseline.get(baseline);

    if (existing) {
      existing.push(item);
      continue;
    }

    byBaseline.set(baseline, [item]);
  }

  const tokens: PdfToken[] = [];

  for (const [baseline, baselineItems] of byBaseline) {
    const sorted = [...baselineItems].sort((left, right) => left.x - right.x);
    let current: PdfToken | null = null;

    for (const item of sorted) {
      if (current && item.x - current.endX < TOKEN_GAP) {
        current.text += item.text;
        current.endX = item.x + item.width;
        continue;
      }

      if (current) {
        tokens.push(current);
      }

      current = {
        endX: item.x + item.width,
        text: item.text,
        x: item.x,
        y: baseline,
      };
    }

    if (current) {
      tokens.push(current);
    }
  }

  return tokens
    .map((token) => ({ ...token, text: token.text.trim() }))
    .filter((token) => token.text.length > 0)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function buildRows(tokens: PdfToken[], tolerance: number): PdfRow[] {
  const rows: PdfRow[] = [];

  for (const token of tokens) {
    const row = rows.at(-1);

    if (row && Math.abs(token.y - row.y) <= tolerance) {
      row.tokens.push(token);
      continue;
    }

    rows.push({ tokens: [token], y: token.y });
  }

  return rows.map((row) => ({
    tokens: [...row.tokens].sort((left, right) => left.x - right.x),
    y: row.y,
  }));
}

type ScoreTableRow = {
  playerName: string;
  values: number[];
};

/**
 * Each table row draws its player name above a run of numeric cells, with the
 * corporation names below. Clustering the numeric cells and then reaching for
 * the nearest text above them keeps multi-corporation rows from being mistaken
 * for the player.
 */
function readScoreTable(page: PdfTextPage): ScoreTableRow[] {
  const tokens = buildTokens(page.items);
  const numberRows = buildRows(tokens.filter(isNumberToken), SCORE_ROW_TOLERANCE)
    .filter((row) => row.tokens.length >= SCORE_COLUMN_COUNT);

  return numberRows.flatMap((row) => {
    const cells = row.tokens.slice(
      0,
      SCORE_COLUMN_COUNT + MEGACREDITS_COLUMN_COUNT,
    );
    const firstCellX = Math.min(...cells.map((cell) => cell.x));
    const rowTop = Math.min(...cells.map((cell) => cell.y));
    const nameToken = tokens
      .filter(
        (token) =>
          !isNumberToken(token) &&
          token.x < firstCellX &&
          token.y < rowTop - NAME_ABOVE_MARGIN,
      )
      .at(-1);

    if (!nameToken) {
      return [];
    }

    return [
      {
        playerName: nameToken.text,
        values: cells.map((cell) => Number(cell.text)),
      },
    ];
  });
}

function findGenerationCount(pages: PdfTextPage[]) {
  for (const page of pages) {
    for (const row of buildRows(buildTokens(page.items), ROW_TOLERANCE)) {
      if (!row.tokens.some((token) => GENERATION_LABEL_PATTERN.test(token.text))) {
        continue;
      }

      const generations = row.tokens
        .filter(isNumberToken)
        .map((token) => Number(token.text));

      if (generations.length > 0) {
        return Math.max(...generations);
      }
    }
  }

  return null;
}

type DetailColumn = {
  badgeX: number;
  leftBound: number;
  playerName: string;
  rightBound: number;
};

function findDetailColumns(input: {
  playerNames: string[];
  rows: PdfRow[];
}): { columns: DetailColumn[]; headerIndex: number } | null {
  const normalized = input.playerNames.map((name) => name.toLowerCase());

  for (const [index, row] of input.rows.entries()) {
    const matched = row.tokens.filter((token) =>
      normalized.includes(token.text.toLowerCase()),
    );

    if (matched.length < 2) {
      continue;
    }

    const lefts = matched.map((token) => token.x);
    const columns = matched.map((token, columnIndex) => ({
      badgeX: Number.POSITIVE_INFINITY,
      leftBound:
        columnIndex === 0
          ? Number.NEGATIVE_INFINITY
          : (lefts[columnIndex - 1] + lefts[columnIndex]) / 2,
      playerName: token.text,
      rightBound:
        columnIndex === matched.length - 1
          ? Number.POSITIVE_INFINITY
          : (lefts[columnIndex] + lefts[columnIndex + 1]) / 2,
    }));

    return { columns, headerIndex: index };
  }

  return null;
}

function collectDetailBlockRows(rows: PdfRow[], headerIndex: number) {
  const blockRows: PdfRow[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const previous = blockRows.at(-1) ?? rows[headerIndex];

    if (rows[index].y - previous.y > DETAIL_BLOCK_MAX_ROW_GAP) {
      break;
    }

    blockRows.push(rows[index]);
  }

  return blockRows;
}

type DetailEntry = {
  points: number;
  textParts: string[];
};

function buildColumnTextLines(input: {
  blockRows: PdfRow[];
  column: DetailColumn;
}) {
  const columnRows = input.blockRows
    .map((row) =>
      row.tokens.filter(
        (token) =>
          token.x >= input.column.leftBound && token.x < input.column.rightBound,
      ),
    )
    .filter((tokens) => tokens.length > 0);
  const badgeX = Math.min(
    ...columnRows.flatMap((tokens) =>
      isNumberToken(tokens[0]) ? [tokens[0].x] : [],
    ),
  );
  const entries: DetailEntry[] = [];

  for (const tokens of columnRows) {
    const [first, ...rest] = tokens;

    if (isNumberToken(first) && first.x <= badgeX + BADGE_TOLERANCE) {
      entries.push({
        points: Number(first.text),
        textParts: rest.map((token) => token.text),
      });
      continue;
    }

    entries.at(-1)?.textParts.push(...tokens.map((token) => token.text));
  }

  return entries.flatMap((entry) => {
    const text = entry.textParts.join(' ').replace(/\s+/g, ' ').trim();

    if (!text) {
      return [];
    }

    const fragment = FUNDED_BY_FRAGMENT_PATTERN.exec(text);

    // The screenshot reader sees "(funded by X)" on its own wrapped line, and
    // the score details parser reads the funder from the line after the award.
    // Splitting it back out keeps the points token at the end of the award line.
    if (fragment) {
      const withoutFragment = text
        .replace(fragment[0], ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return [`${withoutFragment} ${entry.points}`, fragment[0]];
    }

    return [`${text} ${entry.points}`];
  });
}

function readScoreDetailColumns(input: {
  pages: PdfTextPage[];
  playerNames: string[];
}) {
  const tokens = input.pages.flatMap((page) => buildTokens(page.items));
  const rows = buildRows(
    tokens.sort((left, right) => left.y - right.y || left.x - right.x),
    ROW_TOLERANCE,
  );
  const located = findDetailColumns({ playerNames: input.playerNames, rows });

  if (!located) {
    return [];
  }

  const blockRows = collectDetailBlockRows(rows, located.headerIndex);

  return located.columns.map((column) => ({
    textLines: [
      column.playerName,
      ...buildColumnTextLines({ blockRows, column }),
    ],
  }));
}

const GLOBAL_PARAMETER_COLUMN_COUNT = 4;

/**
 * The global parameter table sits below the score details, headed by icons the
 * text layer cannot see. Rows are identified structurally instead: one player
 * name followed by temperature, oxygen, oceans and their total. Requiring the
 * three columns to sum to the printed total is what separates this table from
 * the other numeric rows in the document.
 */
function readGlobalParameters(input: {
  pages: PdfTextPage[];
  playerNames: string[];
}): GameResultGlobalParameters[] {
  const normalized = input.playerNames.map((name) => name.toLowerCase());
  const tokens = input.pages
    .flatMap((page) => buildTokens(page.items))
    .sort((left, right) => left.y - right.y || left.x - right.x);

  return buildRows(tokens, ROW_TOLERANCE).flatMap((row) => {
    const names = row.tokens.filter((token) =>
      normalized.includes(token.text.toLowerCase()),
    );
    const numbers = row.tokens.filter(isNumberToken);

    if (names.length !== 1 || numbers.length !== GLOBAL_PARAMETER_COLUMN_COUNT) {
      return [];
    }

    const [temperature, oxygen, oceans, total] = numbers.map((token) =>
      Number(token.text),
    );

    if (temperature + oxygen + oceans !== total) {
      return [];
    }

    return [{ oceans, oxygen, playerName: names[0].text, temperature, total }];
  });
}

export async function readGameResultPdf(
  bytes: Uint8Array,
): Promise<ReadGameResultScreenshotResult> {
  const pages = await extractPdfTextPages(bytes);
  const [scorePage, ...remainingPages] = pages;

  if (!scorePage) {
    throw new Error('This PDF has no pages to read.');
  }

  const scoreTable = readScoreTable(scorePage);

  if (scoreTable.length === 0) {
    throw new Error(
      'We could not find the victory point table on the first page of this PDF. Export it from the game result page with the browser print dialog.',
    );
  }

  const playerNames = scoreTable.map((row) => row.playerName);

  return {
    endgameLayout: 'victory_breakdown',
    endgameLines: scoreTable.map(
      (row) => `${row.playerName} ${row.values.join(' ')}`,
    ),
    generationCount: findGenerationCount(pages),
    globalParameters: readGlobalParameters({
      pages: remainingPages,
      playerNames,
    }),
    scoreDetailsColumns: readScoreDetailColumns({
      pages: remainingPages,
      playerNames,
    }),
  };
}
