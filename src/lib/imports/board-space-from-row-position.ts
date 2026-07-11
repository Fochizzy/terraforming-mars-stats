// Newer game logs describe tile placements as "on row R position P" instead of
// the older "at NN" space id. Both describe the same board, so we convert the
// row/position form back to the source app's space id to keep every downstream
// consumer (board snapshot, curated scoring, the heatmap) on one numbering.
//
// The board is nine staggered rows numbered top-to-bottom, left-to-right:
export const BOARD_ROW_LENGTHS = [5, 6, 7, 8, 9, 8, 7, 6, 5] as const;

// The source app numbers every board space "01".."63"; the first two ids are
// the off-planet spaces (Phobos/Ganymede), so the first on-planet hex — row 1,
// position 1 — is "03". Verified against Tharsis/Hellas/Elysium ocean spaces:
// (cumulative top-to-bottom index) + 2 reproduces the stored "at NN" ids.
export const OFF_PLANET_SPACE_COUNT = 2;

// Ids are stored zero-padded to two digits ("03", "27") to match the raw logs.
function padSpaceId(spaceNumber: number): string {
  return String(spaceNumber).padStart(2, '0');
}

export function boardSpaceFromRowPosition(
  row: number,
  position: number,
): string | null {
  if (!Number.isInteger(row) || !Number.isInteger(position)) {
    return null;
  }

  const rowLength = BOARD_ROW_LENGTHS[row - 1];
  if (rowLength === undefined || position < 1 || position > rowLength) {
    return null;
  }

  let cumulativeIndex = position;
  for (let priorRow = 0; priorRow < row - 1; priorRow += 1) {
    cumulativeIndex += BOARD_ROW_LENGTHS[priorRow];
  }

  return padSpaceId(cumulativeIndex + OFF_PLANET_SPACE_COUNT);
}
