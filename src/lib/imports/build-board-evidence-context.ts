import type { ImportBoardSnapshot } from './build-import-board-snapshot';
import {
  getBoardSpaceMap,
  type SupportedBoardMapId,
} from './board-space-maps';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { BoardSpaceConfirmation } from './read-board-screenshot-space-confirmations';

type BoardEvidenceStatus = 'proved' | 'review_needed' | 'conflict';

type MatchingTileQueryResult = {
  count: number;
  notes: string[];
  requestedSpaceIds: string[];
  status: BoardEvidenceStatus;
};

type PlacedTileQueryResult =
  | {
      notes: string[];
      spaceId: string;
      status: 'proved';
      tileKind: string;
    }
  | {
      notes: string[];
      requestedSpaceIds: string[];
      status: 'review_needed' | 'conflict';
    };

export type BoardEvidenceContext = {
  countAdjacentMatchingTiles(query: {
    spaceId: string;
    tileKinds: string[];
  }): MatchingTileQueryResult;
  countOwnedMatchingTiles(query: {
    playerName: string;
    tileKinds: string[];
  }): {
    count: number;
    notes: string[];
    status: 'proved';
  };
  getSpacesInRegion(regionId: string): string[];
  mapId: SupportedBoardMapId;
  resolvePlacedTileByCard(query: {
    cardName: string;
    playerName: string;
  }): PlacedTileQueryResult;
};

function normalizeName(value: string) {
  return normalizePlayerAlias(value);
}

const explicitCityTileNames = new Set(
  ['city', 'Capital', 'Noctis City'].map((tileName) => normalizeName(tileName)),
);

function isMatchingTileKind(tileKind: string, expectedTileKinds: string[]) {
  const normalizedTileKind = normalizeName(tileKind);

  return expectedTileKinds.some(
    (expectedTileKind) => {
      const normalizedExpectedTileKind = normalizeName(expectedTileKind);

      if (normalizedExpectedTileKind === normalizeName('city')) {
        return explicitCityTileNames.has(normalizedTileKind);
      }

      return normalizedExpectedTileKind === normalizedTileKind;
    },
  );
}

function isMatchingConfirmedTile(
  confirmation: BoardSpaceConfirmation,
  tileKinds: string[],
) {
  return (
    confirmation.status === 'confirmed' &&
    isMatchingTileKind(confirmation.tileKind, tileKinds)
  );
}

export function buildBoardEvidenceContext(input: {
  boardSnapshot: ImportBoardSnapshot;
  screenshotConfirmations?: Record<string, BoardSpaceConfirmation>;
}): BoardEvidenceContext {
  const boardSpaceMap = getBoardSpaceMap(input.boardSnapshot.mapId);

  return {
    countAdjacentMatchingTiles(query) {
      const spaceDefinition = boardSpaceMap.spaces[query.spaceId];

      if (!spaceDefinition) {
        return {
          count: 0,
          notes: [
            `Space ${query.spaceId} is outside supported board coverage for ${input.boardSnapshot.mapId}.`,
          ],
          requestedSpaceIds: [],
          status: 'review_needed',
        };
      }

      if (
        !Array.isArray(spaceDefinition.neighbors) ||
        spaceDefinition.neighbors.length === 0
      ) {
        return {
          count: 0,
          notes: [
            `Space ${query.spaceId} does not yet have trusted adjacency coverage for ${input.boardSnapshot.mapId}.`,
          ],
          requestedSpaceIds: [],
          status: 'review_needed',
        };
      }

      const requestedSpaceIds: string[] = [];
      let count = 0;
      let usedScreenshotConfirmation = false;

      for (const neighborId of spaceDefinition.neighbors) {
        const occupant = input.boardSnapshot.spaces[neighborId];

        if (occupant && isMatchingTileKind(occupant.tileKind, query.tileKinds)) {
          count += 1;
          continue;
        }

        if (occupant) {
          continue;
        }

        const confirmation = input.screenshotConfirmations?.[neighborId];

        if (!confirmation || confirmation.status === 'inconclusive') {
          requestedSpaceIds.push(neighborId);
          continue;
        }

        if (confirmation.status === 'conflict') {
          return {
            count,
            notes: [
              `Adjacent spaces for ${query.spaceId} had conflicting screenshot evidence.`,
            ],
            requestedSpaceIds: [neighborId],
            status: 'conflict',
          };
        }

        if (confirmation.tileKind === 'unknown') {
          requestedSpaceIds.push(neighborId);
          continue;
        }

        usedScreenshotConfirmation = true;

        if (isMatchingConfirmedTile(confirmation, query.tileKinds)) {
          count += 1;
        }
      }

      if (requestedSpaceIds.length > 0) {
        return {
          count,
          notes: [
            `Adjacent spaces ${requestedSpaceIds.join(', ')} still need confirmation.`,
          ],
          requestedSpaceIds,
          status: 'review_needed',
        };
      }

      return {
        count,
        notes: usedScreenshotConfirmation
          ? [
              `Adjacent query for ${query.spaceId} was completed with targeted screenshot confirmation.`,
            ]
          : [],
        requestedSpaceIds: [],
        status: 'proved',
      };
    },
    countOwnedMatchingTiles(query) {
      const count = Object.values(input.boardSnapshot.spaces).filter(
        (occupant) =>
          normalizeName(occupant.ownerPlayerName) ===
            normalizeName(query.playerName) &&
          isMatchingTileKind(occupant.tileKind, query.tileKinds),
      ).length;

      return {
        count,
        notes: [],
        status: 'proved',
      };
    },
    getSpacesInRegion(regionId) {
      return boardSpaceMap.regions[regionId] ?? [];
    },
    mapId: input.boardSnapshot.mapId,
    resolvePlacedTileByCard(query) {
      const matches = Object.entries(input.boardSnapshot.spaces).filter(
        ([, occupant]) =>
          normalizeName(occupant.ownerPlayerName) ===
            normalizeName(query.playerName) &&
          normalizeName(occupant.sourceCardName ?? '') ===
            normalizeName(query.cardName),
      );

      if (matches.length !== 1) {
        return {
          notes: [
            `${query.cardName} could not be linked safely to a placed tile from the imported log.`,
          ],
          requestedSpaceIds: [],
          status: 'review_needed',
        };
      }

      const [spaceId, occupant] = matches[0];

      return {
        notes: [],
        spaceId,
        status: 'proved',
        tileKind: occupant.tileKind,
      };
    },
  };
}
