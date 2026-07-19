import {
  findTerraformingMarsTileType,
  type ImportTileBoard,
  type ImportTileKind,
} from './terraforming-mars-tile-types';

export type ImportTileActionKind = 'placed' | 'removed';
export type ImportTileActionFormat = 'flat-id' | 'grid';

export type ImportTileAction = {
  action: ImportTileActionKind;
  actor: string;
  board: ImportTileBoard;
  boardPosition: number | null;
  boardRow: number | null;
  canonicalTileCode: string | null;
  canonicalTileName: string | null;
  format: ImportTileActionFormat;
  isKnownTileType: boolean;
  lineNumber: number;
  rawTileType: string;
  spaceId: string;
  tileKind: ImportTileKind;
};

export type ImportTileActionSet = {
  actions: ImportTileAction[];
  lineCount: number;
  oceanSpaceIds: string[];
  placements: ImportTileAction[];
  removals: ImportTileAction[];
  unknownTileTypeCount: number;
};

const ROW_WIDTHS = [5, 6, 7, 8, 9, 8, 7, 6, 5];
const ROW_START_ORDINAL = ROW_WIDTHS.map((_, index) =>
  ROW_WIDTHS.slice(0, index).reduce((sum, width) => sum + width, 0),
);

export function rowPositionToSpaceId(row: number, position: number) {
  const rowIndex = row - 1;
  if (rowIndex < 0 || rowIndex >= ROW_WIDTHS.length) return null;
  if (position < 1 || position > ROW_WIDTHS[rowIndex]) return null;
  return String(ROW_START_ORDINAL[rowIndex] + position + 2).padStart(2, '0');
}

function stripExporterPrefix(line: string) {
  return line.replace(/^\s*\[\d+\/\d+\]:\s*/, '').trim();
}

const PLACEMENT_PATTERN =
  /^(.+?)\s+placed\s+(?:an?\s+)?(.+?)\s+tile\s+(?:at\s+([mM]?\d{1,2})|on\s+row\s+(\d+)\s+position\s+(\d+))\b/i;
const REMOVAL_PATTERN =
  /^(.+?)\s+removed\s+(?:an?\s+)?(.+?)(?:\s+tile)?\s+(?:at\s+([mM]?\d{1,2})|on\s+row\s+(\d+)\s+position\s+(\d+))\b/i;

function resolveSpace(match: RegExpExecArray) {
  if (match[3] !== undefined) {
    const rawSpace = match[3];
    const board: ImportTileBoard = /^m/i.test(rawSpace) ? 'moon' : 'mars';
    const digits = rawSpace.replace(/^m/i, '');
    return {
      board,
      boardPosition: null,
      boardRow: null,
      format: 'flat-id' as const,
      spaceId: board === 'moon' ? `m${digits.padStart(2, '0')}` : digits.padStart(2, '0'),
    };
  }
  const spaceId = rowPositionToSpaceId(Number(match[4]), Number(match[5]));
  return spaceId
    ? {
        board: 'mars' as const,
        boardPosition: Number(match[5]),
        boardRow: Number(match[4]),
        format: 'grid' as const,
        spaceId,
      }
    : null;
}

function toAction(input: {
  action: ImportTileActionKind;
  lineNumber: number;
  match: RegExpExecArray;
}): ImportTileAction | null {
  const space = resolveSpace(input.match);
  if (!space) return null;
  const rawTileType = input.match[2].trim();
  const definition = findTerraformingMarsTileType(rawTileType);
  return {
    action: input.action,
    actor: input.match[1].trim(),
    board: space.board,
    boardPosition: space.boardPosition,
    boardRow: space.boardRow,
    canonicalTileCode: definition?.canonicalCode ?? null,
    canonicalTileName: definition?.canonicalName ?? null,
    format: space.format,
    isKnownTileType: definition !== null,
    lineNumber: input.lineNumber,
    rawTileType,
    spaceId: space.spaceId,
    tileKind: definition?.kind ?? 'special',
  };
}

export function parseTerraformingMarsTileActions(
  exportedLogText: string,
): ImportTileActionSet {
  const lines = exportedLogText.trim()
    ? exportedLogText.trim().split(/\r?\n/)
    : [];
  const actions: ImportTileAction[] = [];

  lines.forEach((rawLine, index) => {
    const line = stripExporterPrefix(rawLine);
    const placement = PLACEMENT_PATTERN.exec(line);
    const removal = placement ? null : REMOVAL_PATTERN.exec(line);
    const action = placement
      ? toAction({ action: 'placed', lineNumber: index + 1, match: placement })
      : removal
        ? toAction({ action: 'removed', lineNumber: index + 1, match: removal })
        : null;
    if (action) actions.push(action);
  });

  const placements = actions.filter((action) => action.action === 'placed');
  const removals = actions.filter((action) => action.action === 'removed');
  const oceanSpaceIds = [
    ...new Set(
      placements
        .filter(
          (action) =>
            action.board === 'mars' && action.canonicalTileCode === 'ocean',
        )
        .map((action) => action.spaceId),
    ),
  ].sort();

  return {
    actions,
    lineCount: lines.length,
    oceanSpaceIds,
    placements,
    removals,
    unknownTileTypeCount: actions.filter((action) => !action.isKnownTileType).length,
  };
}
