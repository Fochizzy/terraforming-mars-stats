import type { OcrImageCrop, OcrPixelData } from './ocr/ocr-ops';

/**
 * The community app paints the endgame score table and the per-player victory
 * point columns as solid colour rectangles on a flat page background, so the
 * regions can be located from pixels rather than from fixed image fractions.
 * Fractions only ever fit the capture they were tuned against: a full-page
 * portrait export and a landscape viewport grab place the same table at wildly
 * different offsets, and a "Global Parameter Contributions" section or a game
 * log panel shifts everything below it.
 */
export type GameResultRegions = {
  /** One rect per player column of the "Victory points details" block. */
  detailColumns: OcrImageCrop[];
  /** The heading strip directly above the score table. */
  scoreTableHeading: OcrImageCrop;
  /**
   * Where the score digits start, i.e. the right edge of the player name cell.
   * Recognising the digits alone avoids the stacked name/corporation lines that
   * derail Tesseract's line finder.
   */
  scoreTableStatsLeft: number | null;
  /** The score table without its icon header row. */
  scoreTableRows: OcrImageCrop[];
};

type Rgb = readonly [number, number, number];

type Band = {
  bottom: number;
  color: Rgb;
  left: number;
  right: number;
  sampleCount: number;
  top: number;
};

const BACKGROUND_TOLERANCE = 14;
const BAND_COLOR_TOLERANCE = 26;
// A solid bar stays one run across the glyphs printed on it, but never across
// the page background, which is what separates two adjacent player columns.
const TEXT_GAP_TOLERANCE = 40;
const MIN_BAND_WIDTH = 36;
const MIN_BAND_HEIGHT = 5;
const MIN_TABLE_WIDTH = 120;
const MAX_TABLE_ROW_GAP = 26;
const TABLE_EDGE_TOLERANCE = 8;
const COLUMN_HEADER_COLOR_TOLERANCE = 34;
const COLUMN_HEADER_TOP_TOLERANCE = 8;
const MIN_COLUMN_HEADER_HEIGHT = 6;
const MAX_COLUMN_HEADER_HEIGHT = 48;
const PANEL_COLOR_TOLERANCE = 18;
const PANEL_ROW_COVERAGE = 0.5;
// The card panel can start well below its header — an efficiency line sits on
// the page background in between — but the header's own bottom edge also reads
// as one panel-coloured row, so a start only counts when it is sustained.
const PANEL_START_RUN = 5;
const PANEL_SEARCH_DEPTH = 160;
const MAX_PANEL_GAP = 12;

function isNear(left: Rgb, right: Rgb, tolerance: number) {
  return (
    Math.abs(left[0] - right[0]) <= tolerance &&
    Math.abs(left[1] - right[1]) <= tolerance &&
    Math.abs(left[2] - right[2]) <= tolerance
  );
}

function quantizeColor(color: Rgb) {
  return ((color[0] >> 4) << 8) | ((color[1] >> 4) << 4) | (color[2] >> 4);
}

function toRect(band: {
  bottom: number;
  left: number;
  right: number;
  top: number;
}): OcrImageCrop {
  return {
    height: band.bottom - band.top + 1,
    left: band.left,
    top: band.top,
    width: band.right - band.left + 1,
  };
}

function createPixelReader(pixels: OcrPixelData) {
  const readColor = (x: number, y: number): Rgb => {
    const offset = (y * pixels.width + x) * 4;

    return [
      pixels.data[offset],
      pixels.data[offset + 1],
      pixels.data[offset + 2],
    ];
  };
  const colorCounts = new Map<number, number>();

  for (let y = 0; y < pixels.height; y += 2) {
    for (let x = 0; x < pixels.width; x += 2) {
      const key = quantizeColor(readColor(x, y));

      colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
    }
  }

  const backgroundKey = [...colorCounts].sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0];

  if (backgroundKey === undefined) {
    return null;
  }

  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let sampleCount = 0;

  for (let y = 0; y < pixels.height; y += 2) {
    for (let x = 0; x < pixels.width; x += 2) {
      const color = readColor(x, y);

      if (quantizeColor(color) !== backgroundKey) {
        continue;
      }

      redTotal += color[0];
      greenTotal += color[1];
      blueTotal += color[2];
      sampleCount += 1;
    }
  }

  const background: Rgb = [
    Math.round(redTotal / sampleCount),
    Math.round(greenTotal / sampleCount),
    Math.round(blueTotal / sampleCount),
  ];

  return {
    isBackground: (x: number, y: number) =>
      isNear(readColor(x, y), background, BACKGROUND_TOLERANCE),
    readColor,
  };
}

type PixelReader = NonNullable<ReturnType<typeof createPixelReader>>;

function collectRowRuns(input: {
  reader: PixelReader;
  width: number;
  y: number;
}) {
  const runs: Array<{ color: Rgb; left: number; right: number }> = [];
  let x = 0;

  while (x < input.width) {
    if (input.reader.isBackground(x, input.y)) {
      x += 1;
      continue;
    }

    const seedColor = input.reader.readColor(x, input.y);
    let right = x;
    let gap = 0;
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let matchCount = 0;

    for (let scanX = x; scanX < input.width; scanX += 1) {
      if (input.reader.isBackground(scanX, input.y)) {
        break;
      }

      const color = input.reader.readColor(scanX, input.y);

      if (isNear(color, seedColor, BAND_COLOR_TOLERANCE)) {
        right = scanX;
        gap = 0;
        redTotal += color[0];
        greenTotal += color[1];
        blueTotal += color[2];
        matchCount += 1;
        continue;
      }

      gap += 1;

      if (gap > TEXT_GAP_TOLERANCE) {
        break;
      }
    }

    if (right - x + 1 >= MIN_BAND_WIDTH) {
      runs.push({
        color: [
          Math.round(redTotal / matchCount),
          Math.round(greenTotal / matchCount),
          Math.round(blueTotal / matchCount),
        ],
        left: x,
        right,
      });
    }

    x = Math.max(right + 1, x + 1);
  }

  return runs;
}

function collectBands(pixels: OcrPixelData, reader: PixelReader) {
  const openBands: Band[] = [];
  const closedBands: Band[] = [];

  const closeBand = (band: Band) => {
    if (band.bottom - band.top + 1 >= MIN_BAND_HEIGHT) {
      closedBands.push(band);
    }
  };

  for (let y = 0; y < pixels.height; y += 1) {
    const runs = collectRowRuns({ reader, width: pixels.width, y });
    const extendedBands = new Set<Band>();

    for (const run of runs) {
      const matchedBand = openBands.find((band) => {
        if (
          extendedBands.has(band) ||
          !isNear(band.color, run.color, BAND_COLOR_TOLERANCE)
        ) {
          return false;
        }

        const overlap =
          Math.min(band.right, run.right) - Math.max(band.left, run.left) + 1;

        return (
          overlap >=
          0.7 *
            Math.min(band.right - band.left + 1, run.right - run.left + 1)
        );
      });

      if (!matchedBand) {
        const newBand: Band = {
          bottom: y,
          color: run.color,
          left: run.left,
          right: run.right,
          sampleCount: 1,
          top: y,
        };

        openBands.push(newBand);
        extendedBands.add(newBand);
        continue;
      }

      const nextSampleCount = matchedBand.sampleCount + 1;

      matchedBand.bottom = y;
      matchedBand.left = Math.min(matchedBand.left, run.left);
      matchedBand.right = Math.max(matchedBand.right, run.right);
      matchedBand.color = [
        Math.round(
          (matchedBand.color[0] * matchedBand.sampleCount + run.color[0]) /
            nextSampleCount,
        ),
        Math.round(
          (matchedBand.color[1] * matchedBand.sampleCount + run.color[1]) /
            nextSampleCount,
        ),
        Math.round(
          (matchedBand.color[2] * matchedBand.sampleCount + run.color[2]) /
            nextSampleCount,
        ),
      ];
      matchedBand.sampleCount = nextSampleCount;
      extendedBands.add(matchedBand);
    }

    for (let index = openBands.length - 1; index >= 0; index -= 1) {
      const band = openBands[index];

      if (extendedBands.has(band)) {
        continue;
      }

      closeBand(band);
      openBands.splice(index, 1);
    }
  }

  for (const band of openBands) {
    closeBand(band);
  }

  return closedBands.sort((left, right) => left.top - right.top);
}

/**
 * The score table is the topmost run of wide, left-and-right aligned bands.
 * Nothing above it stacks — headings and buttons are isolated — and the tables
 * below it (global parameters, game log) are narrower.
 */
function findScoreTableBands(bands: Band[]) {
  const stacks: Band[][] = [];

  for (const band of bands) {
    if (band.right - band.left + 1 < MIN_TABLE_WIDTH) {
      continue;
    }

    const stack = stacks.find((candidate) => {
      const last = candidate[candidate.length - 1];

      return (
        Math.abs(last.left - band.left) <= TABLE_EDGE_TOLERANCE &&
        Math.abs(last.right - band.right) <= TABLE_EDGE_TOLERANCE &&
        band.top - last.bottom <= MAX_TABLE_ROW_GAP &&
        band.top >= last.bottom - 2
      );
    });

    if (stack) {
      stack.push(band);
    } else {
      stacks.push([band]);
    }
  }

  return stacks.find((stack) => stack.length >= 2) ?? null;
}

function findColumnHeaderBands(input: {
  bands: Band[];
  playerRowBands: Band[];
  tableBottom: number;
}) {
  const candidates = input.bands.filter((band) => {
    const height = band.bottom - band.top + 1;

    return (
      band.top > input.tableBottom &&
      height >= MIN_COLUMN_HEADER_HEIGHT &&
      height <= MAX_COLUMN_HEADER_HEIGHT &&
      band.right - band.left + 1 >= MIN_BAND_WIDTH &&
      input.playerRowBands.some((row) =>
        isNear(row.color, band.color, COLUMN_HEADER_COLOR_TOLERANCE),
      )
    );
  });
  const groups: Band[][] = [];

  for (const band of candidates) {
    const group = groups.find(
      (candidate) =>
        Math.abs(candidate[0].top - band.top) <= COLUMN_HEADER_TOP_TOLERANCE,
    );

    if (group) {
      group.push(band);
    } else {
      groups.push([band]);
    }
  }

  const headerGroup = groups.sort(
    (left, right) => right.length - left.length || left[0].top - right[0].top,
  )[0];

  return headerGroup?.sort((left, right) => left.left - right.left) ?? [];
}

function findPanelColor(input: {
  header: Band;
  height: number;
  reader: PixelReader;
}) {
  const counts = new Map<number, { color: Rgb; count: number }>();
  const bottom = Math.min(input.height, input.header.bottom + 400);

  for (let y = input.header.bottom + 1; y < bottom; y += 1) {
    for (let x = input.header.left; x <= input.header.right; x += 1) {
      if (input.reader.isBackground(x, y)) {
        continue;
      }

      const color = input.reader.readColor(x, y);
      const key = quantizeColor(color);
      const existing = counts.get(key);

      counts.set(key, { color, count: (existing?.count ?? 0) + 1 });
    }
  }

  return (
    [...counts.values()].sort((left, right) => right.count - left.count)[0]
      ?.color ?? null
  );
}

function measureColumn(input: {
  header: Band;
  height: number;
  reader: PixelReader;
}): OcrImageCrop {
  const panelColor = findPanelColor(input);
  const headerRect = toRect(input.header);

  if (!panelColor) {
    return headerRect;
  }

  const columnWidth = input.header.right - input.header.left + 1;
  const isPanelRow = (y: number) => {
    let hits = 0;

    for (let x = input.header.left; x <= input.header.right; x += 1) {
      if (isNear(input.reader.readColor(x, y), panelColor, PANEL_COLOR_TOLERANCE)) {
        hits += 1;
      }
    }

    return hits >= PANEL_ROW_COVERAGE * columnWidth;
  };
  const isSustainedPanelStart = (y: number) => {
    for (let offset = 0; offset < PANEL_START_RUN; offset += 1) {
      if (!isPanelRow(y + offset)) {
        return false;
      }
    }

    return true;
  };

  const searchBottom = Math.min(
    input.height - PANEL_START_RUN,
    input.header.bottom + PANEL_SEARCH_DEPTH,
  );
  let panelStart = -1;

  for (let y = input.header.bottom + 1; y < searchBottom; y += 1) {
    if (isSustainedPanelStart(y)) {
      panelStart = y;
      break;
    }
  }

  if (panelStart < 0) {
    return headerRect;
  }

  let panelBottom = panelStart;
  let gap = 0;

  for (let y = panelStart + 1; y < input.height; y += 1) {
    if (isPanelRow(y)) {
      panelBottom = y;
      gap = 0;
      continue;
    }

    gap += 1;

    if (gap > MAX_PANEL_GAP) {
      break;
    }
  }

  return toRect({
    bottom: panelBottom,
    left: input.header.left,
    right: input.header.right,
    top: input.header.top,
  });
}

const MIN_GUTTER_WIDTH = 6;
const ROW_INK_TOLERANCE = 34;
const MAX_STATS_LEFT_RATIO = 0.6;
const MAX_STATS_LEFT_SPREAD = 12;

function findRowBackgroundColor(input: {
  reader: PixelReader;
  row: OcrImageCrop;
}) {
  const counts = new Map<number, { color: Rgb; count: number }>();

  for (let y = input.row.top; y < input.row.top + input.row.height; y += 1) {
    for (let x = input.row.left; x < input.row.left + input.row.width; x += 1) {
      const color = input.reader.readColor(x, y);
      const key = quantizeColor(color);
      const existing = counts.get(key);

      counts.set(key, { color, count: (existing?.count ?? 0) + 1 });
    }
  }

  return (
    [...counts.values()].sort((left, right) => right.count - left.count)[0]
      ?.color ?? null
  );
}

/**
 * The name cell is separated from the first score column by the widest gap of
 * bare row background. Column gaps further right are narrower, and the row's
 * own left margin is skipped.
 */
function findRowStatsLeft(input: { reader: PixelReader; row: OcrImageCrop }) {
  const rowColor = findRowBackgroundColor(input);

  if (!rowColor) {
    return null;
  }

  const right = input.row.left + input.row.width;
  const hasInk = (x: number) => {
    for (let y = input.row.top; y < input.row.top + input.row.height; y += 1) {
      if (!isNear(input.reader.readColor(x, y), rowColor, ROW_INK_TOLERANCE)) {
        return true;
      }
    }

    return false;
  };
  const searchRight = input.row.left + input.row.width * MAX_STATS_LEFT_RATIO;
  let best: { start: number; width: number } | null = null;
  let gutterStart = -1;

  for (let x = input.row.left; x <= right; x += 1) {
    if (x < right && !hasInk(x)) {
      if (gutterStart < 0) {
        gutterStart = x;
      }

      continue;
    }

    if (gutterStart < 0) {
      continue;
    }

    const width = x - gutterStart;
    // Skip the row's left margin: it is a gutter, but not a column separator.
    const isLeftMargin = gutterStart <= input.row.left + 2;

    if (
      !isLeftMargin &&
      width >= MIN_GUTTER_WIDTH &&
      x <= searchRight &&
      (!best || width > best.width)
    ) {
      best = { start: gutterStart, width };
    }

    gutterStart = -1;
  }

  return best ? best.start + best.width : null;
}

function findScoreTableStatsLeft(input: {
  reader: PixelReader;
  rows: OcrImageCrop[];
}) {
  const boundaries = input.rows.flatMap((row) => {
    const statsLeft = findRowStatsLeft({ reader: input.reader, row });

    return statsLeft === null ? [] : [statsLeft];
  });

  if (boundaries.length !== input.rows.length || boundaries.length === 0) {
    return null;
  }

  // Every row shares one name column, so the per-row readings must agree.
  const smallest = Math.min(...boundaries);
  const largest = Math.max(...boundaries);

  return largest - smallest <= MAX_STATS_LEFT_SPREAD ? largest : null;
}

export function locateGameResultRegions(
  pixels: OcrPixelData,
): GameResultRegions | null {
  if (!pixels.width || !pixels.height) {
    return null;
  }

  const reader = createPixelReader(pixels);

  if (!reader) {
    return null;
  }

  const bands = collectBands(pixels, reader);
  const tableBands = findScoreTableBands(bands);

  if (!tableBands) {
    return null;
  }

  // The first band is the table's icon header row; every player row follows it.
  const [tableHeaderBand, ...playerRowBands] = tableBands;
  const headingHeight = Math.min(
    tableHeaderBand.top,
    Math.max(2 * (tableHeaderBand.bottom - tableHeaderBand.top + 1), 24),
  );
  const columnHeaderBands = findColumnHeaderBands({
    bands,
    playerRowBands,
    tableBottom: tableBands[tableBands.length - 1].bottom,
  });
  const scoreTableRows = playerRowBands.map(toRect);

  return {
    detailColumns: columnHeaderBands.map((header) =>
      measureColumn({ header, height: pixels.height, reader }),
    ),
    scoreTableHeading: {
      height: Math.max(1, headingHeight),
      left: tableHeaderBand.left,
      top: Math.max(0, tableHeaderBand.top - headingHeight),
      width: tableHeaderBand.right - tableHeaderBand.left + 1,
    },
    scoreTableRows,
    scoreTableStatsLeft: findScoreTableStatsLeft({
      reader,
      rows: scoreTableRows,
    }),
  };
}
