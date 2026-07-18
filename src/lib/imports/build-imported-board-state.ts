import type { ImportTileAction } from './parse-terraforming-mars-tile-actions';

export type ImportedBoardConflict = {
  action: ImportTileAction;
  existingAction: ImportTileAction | null;
  reason: 'placement_without_removal' | 'removal_mismatch' | 'removal_without_tile';
};

export type ImportedBoardSpace = {
  board: ImportTileAction['board'];
  currentTile: ImportTileAction | null;
  history: ImportTileAction[];
  spaceId: string;
};

export type ImportedBoardState = {
  actionCount: number;
  conflicts: ImportedBoardConflict[];
  occupiedSpaces: ImportedBoardSpace[];
  spaces: ImportedBoardSpace[];
  unknownTileTypeCount: number;
};

function spaceKey(action: ImportTileAction) {
  return `${action.board}:${action.spaceId}`;
}

function sameTile(left: ImportTileAction, right: ImportTileAction) {
  if (left.canonicalTileCode && right.canonicalTileCode) {
    return left.canonicalTileCode === right.canonicalTileCode;
  }
  return left.rawTileType.toLowerCase() === right.rawTileType.toLowerCase();
}

export function buildImportedBoardState(
  tileActions: readonly ImportTileAction[],
): ImportedBoardState {
  const spacesByKey = new Map<string, ImportedBoardSpace>();
  const conflicts: ImportedBoardConflict[] = [];
  const actions = [...tileActions].sort(
    (left, right) => left.lineNumber - right.lineNumber,
  );

  for (const action of actions) {
    const key = spaceKey(action);
    const space = spacesByKey.get(key) ?? {
      board: action.board,
      currentTile: null,
      history: [],
      spaceId: action.spaceId,
    };

    if (action.action === 'placed') {
      if (space.currentTile) {
        conflicts.push({
          action,
          existingAction: space.currentTile,
          reason: 'placement_without_removal',
        });
      }
      space.currentTile = action;
    } else if (!space.currentTile) {
      conflicts.push({
        action,
        existingAction: null,
        reason: 'removal_without_tile',
      });
    } else if (!sameTile(space.currentTile, action)) {
      conflicts.push({
        action,
        existingAction: space.currentTile,
        reason: 'removal_mismatch',
      });
    } else {
      space.currentTile = null;
    }

    space.history.push(action);
    spacesByKey.set(key, space);
  }

  const spaces = [...spacesByKey.values()].sort(
    (left, right) =>
      left.board.localeCompare(right.board) || left.spaceId.localeCompare(right.spaceId),
  );
  return {
    actionCount: actions.length,
    conflicts,
    occupiedSpaces: spaces.filter((space) => space.currentTile !== null),
    spaces,
    unknownTileTypeCount: actions.filter((action) => !action.isKnownTileType).length,
  };
}
