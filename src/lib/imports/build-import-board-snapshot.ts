import type { ParsedActionGameLogEvent } from './parse-game-log';
import {
  getBoardSpaceMap,
  type SupportedBoardMapId,
} from './board-space-maps';

export type ImportBoardOccupant = {
  confidence: 'high' | 'medium';
  notes: string[];
  ownerPlayerName: string;
  sourceCardName: string | null;
  sourceType: 'log_explicit' | 'log_inferred';
  tileKind: string;
};

export type ImportBoardSnapshot = {
  mapId: SupportedBoardMapId;
  spaces: Record<string, ImportBoardOccupant>;
};

export function buildImportBoardSnapshot(input: {
  events: ParsedActionGameLogEvent[];
  mapId: SupportedBoardMapId;
}): ImportBoardSnapshot {
  const boardSpaceMap = getBoardSpaceMap(input.mapId);

  const spaces: Record<string, ImportBoardOccupant> = {};

  for (const event of input.events) {
    if (event.eventType !== 'tile_placed') {
      continue;
    }

    const notes =
      boardSpaceMap.spaces[event.space] == null
        ? [
            `Space ${event.space} is outside curated board coverage for ${boardSpaceMap.mapId}.`,
          ]
        : [];

    spaces[event.space] = {
      confidence: event.tile.toLowerCase() === 'city' ? 'medium' : 'high',
      notes,
      ownerPlayerName: event.actor,
      sourceCardName:
        event.tile.toLowerCase() === 'city' ||
        event.tile.toLowerCase() === 'greenery' ||
        event.tile.toLowerCase() === 'ocean'
          ? null
          : event.tile,
      sourceType: 'log_explicit',
      tileKind: event.tile,
    };
  }

  return {
    mapId: input.mapId,
    spaces,
  };
}
