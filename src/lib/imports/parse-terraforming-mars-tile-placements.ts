/**
 * Parses board tile placements out of an exported Terraforming Mars game log.
 *
 * The upstream export is rendered log text (not a structured game object), and
 * its placement wording has changed across application versions. Two formats are
 * currently supported, both observed in real exports:
 *
 *   - newer:  `Corey placed ocean tile at 34`            (flat board space id)
 *   - older:  `Izzy placed ocean tile on row 2 position 6` (grid coordinates)
 *
 * Both resolve to the same flat space id (`03`..`63`, the ids used in
 * {@link ./map-ocean-fingerprints}): a space id is the 1-based reading-order
 * position on the fixed 61-hex grid (row widths 5,6,7,8,9,8,7,6,5) plus 2, and
 * `row R position P` is 1-based on that same grid.
 *
 * Ocean placements are the primary signal for identifying the map; other tile
 * kinds are retained for board interpretation (a greenery or city on an
 * ocean-eligible hex is legal via specific cards). Because the upstream wording
 * can change again, this parser is deliberately narrow and is guarded by retained
 * real-log fixtures rather than treated as permanent. See the export-format
 * governance in docs/redesign/MASTER-RULES.md.
 */

export type ImportTileKind = 'ocean' | 'greenery' | 'city' | 'special';

export type ImportTilePlacement = {
  /** 1-based line number in the exported log. */
  lineNumber: number;
  /** Player name exactly as written before "placed". */
  actor: string;
  /** Normalized tile classification. */
  tileKind: ImportTileKind;
  /** Raw tile phrase from the log (`ocean`, `city`, `Mining Rights`, ...). */
  rawTileType: string;
  /** Board space id, zero-padded to two digits (`03`..`63`). */
  spaceId: string;
  /** Which export wording produced this placement. */
  format: 'flat-id' | 'grid';
};

export type ImportTilePlacementSet = {
  placements: ImportTilePlacement[];
  /** Distinct ocean-tile space ids, ascending — the map-identification signal. */
  oceanSpaceIds: string[];
  lineCount: number;
};

const ROW_WIDTHS = [5, 6, 7, 8, 9, 8, 7, 6, 5];
const ROW_START_ORDINAL: number[] = (() => {
  const starts: number[] = [];
  let sum = 0;
  for (const width of ROW_WIDTHS) {
    starts.push(sum);
    sum += width;
  }
  return starts;
})();

/**
 * Converts the older `row R position P` grid notation (both 1-based) to the flat
 * space id string (`03`..`63`). Returns null for coordinates outside the grid.
 */
export function rowPositionToSpaceId(row: number, position: number): string | null {
  const rowIndex = row - 1;
  if (rowIndex < 0 || rowIndex >= ROW_WIDTHS.length) return null;
  if (position < 1 || position > ROW_WIDTHS[rowIndex]) return null;
  const ordinal = ROW_START_ORDINAL[rowIndex] + position;
  return String(ordinal + 2).padStart(2, '0');
}

// Some exports prefix each line with an index marker like `[12/48]: `.
function stripExporterPrefix(line: string): string {
  return line.replace(/^\s*\[\d+\/\d+\]:\s*/, '').trim();
}

// `<actor> placed <tile> tile <at NN | on row R position P>`. The tile phrase is
// lazy so it stops at " tile ", leaving multi-word specials (e.g. "Mining
// Rights") intact. "placed land claim on row ..." has no "tile" and is ignored.
const PLACEMENT_PATTERN =
  /^(.+?)\s+placed\s+(.+?)\s+tile\s+(?:at\s+(\d{1,2})|on\s+row\s+(\d+)\s+position\s+(\d+))\b/i;

function classifyTile(rawTileType: string): ImportTileKind {
  const normalized = rawTileType.trim().toLowerCase();
  if (normalized === 'ocean') return 'ocean';
  if (normalized === 'city') return 'city';
  if (normalized === 'greenery') return 'greenery';
  return 'special';
}

export function parseTerraformingMarsTilePlacements(
  exportedLogText: string,
): ImportTilePlacementSet {
  const lines = exportedLogText.trim()
    ? exportedLogText.trim().split(/\r?\n/)
    : [];
  const placements: ImportTilePlacement[] = [];

  lines.forEach((rawLine, index) => {
    const line = stripExporterPrefix(rawLine);
    const match = PLACEMENT_PATTERN.exec(line);
    if (!match) return;

    const isFlatId = match[3] !== undefined;
    const spaceId = isFlatId
      ? match[3].padStart(2, '0')
      : rowPositionToSpaceId(Number(match[4]), Number(match[5]));
    if (spaceId === null) return;

    placements.push({
      lineNumber: index + 1,
      actor: match[1].trim(),
      rawTileType: match[2].trim(),
      tileKind: classifyTile(match[2]),
      spaceId,
      format: isFlatId ? 'flat-id' : 'grid',
    });
  });

  const oceanSpaceIds = [
    ...new Set(
      placements
        .filter((placement) => placement.tileKind === 'ocean')
        .map((placement) => placement.spaceId),
    ),
  ].sort();

  return { placements, oceanSpaceIds, lineCount: lines.length };
}
