import {
  BOARD_ROW_LENGTHS,
  boardSpaceFromRowPosition,
} from './board-space-from-row-position';

// Every official Mars map shares the same 61-hex board, so adjacency is pure,
// map-independent geometry. Rather than hand-maintain a staggered-offset lookup
// (which is error prone at the row-width transitions), we place each hex at its
// real centre and treat two hexes as neighbours when their centres are one hex
// apart. This reproduces the correct 2-6 neighbours for every space.
//
// The horizontal step between columns is one hex width; adjacent rows are offset
// by half a hex horizontally and one row height vertically. With a hex width of
// 2 units and a row height that keeps neighbouring-row centres ~2 units away, a
// simple distance threshold cleanly separates the six neighbours (distance ~2)
// from the next-nearest hexes (distance >= ~3).
const HEX_WIDTH = 2;
const ROW_HEIGHT = 1.732; // sqrt(3): flat-topped hex row spacing for width 2.
const NEIGHBOR_DISTANCE_LIMIT = HEX_WIDTH * 1.2;

type HexCell = {
  cx: number;
  cy: number;
  spaceId: string;
};

function buildHexCells(): HexCell[] {
  const cells: HexCell[] = [];

  BOARD_ROW_LENGTHS.forEach((rowLength, rowIndex) => {
    // Centre each row so shorter rows are indented by half a hex per missing
    // column, matching the staggered board.
    const rowStartX = ((9 - rowLength) * HEX_WIDTH) / 2;

    for (let column = 0; column < rowLength; column += 1) {
      const spaceId = boardSpaceFromRowPosition(rowIndex + 1, column + 1);

      if (spaceId == null) {
        continue;
      }

      cells.push({
        cx: rowStartX + column * HEX_WIDTH,
        cy: rowIndex * ROW_HEIGHT,
        spaceId,
      });
    }
  });

  return cells;
}

export function buildBoardHexAdjacency(): Record<string, string[]> {
  const cells = buildHexCells();
  const adjacency: Record<string, string[]> = {};

  for (const cell of cells) {
    adjacency[cell.spaceId] = cells
      .filter((other) => {
        if (other.spaceId === cell.spaceId) {
          return false;
        }

        return Math.hypot(other.cx - cell.cx, other.cy - cell.cy) <
          NEIGHBOR_DISTANCE_LIMIT;
      })
      .map((other) => other.spaceId)
      .sort((left, right) => Number(left) - Number(right));
  }

  return adjacency;
}
