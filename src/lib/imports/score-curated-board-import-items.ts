import { getBoardSpaceMap, type SupportedBoardMapId } from './board-space-maps';
import type { ImportBoardSnapshot } from './build-import-board-snapshot';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedActionGameLogEvent } from './parse-game-log';
import type {
  BoardSpaceConfirmation,
  BoardScreenshotTileKind,
} from './read-board-screenshot-space-confirmations';

type CuratedBoardReviewStatus = 'proved' | 'review_needed';

export type CuratedBoardCardImportItem = {
  cardName: string;
  itemType: 'card';
  mapId: SupportedBoardMapId;
  notes: string[];
  playerName: string;
  points?: number;
  requestedSpaceIds?: string[];
  sourceType: 'log_and_board';
  status: CuratedBoardReviewStatus;
};

export type CuratedBoardAwardImportItem = {
  awardName: string;
  firstPlacePlayerNames?: string[];
  fundedByPlayerName: string;
  itemType: 'award';
  mapId: SupportedBoardMapId;
  notes: string[];
  secondPlacePlayerNames?: string[];
  sourceType: 'log';
  status: CuratedBoardReviewStatus;
};

export type CuratedBoardImportItem =
  | CuratedBoardCardImportItem
  | CuratedBoardAwardImportItem;

const explicitCityTileNames = new Set(
  ['city', 'Capital', 'Noctis City'].map((tileName) => normalizePlayerAlias(tileName)),
);

function normalizeName(value: string) {
  return normalizePlayerAlias(value);
}

function isCityTileName(tileName: string | null | undefined) {
  return tileName != null && explicitCityTileNames.has(normalizeName(tileName));
}

function isConfirmedNonCityTileKind(tileKind: BoardScreenshotTileKind) {
  return (
    tileKind === 'empty' ||
    tileKind === 'greenery' ||
    tileKind === 'ocean' ||
    tileKind === 'occupied_other'
  );
}

function buildCommercialDistrictItems(input: {
  boardSnapshot: ImportBoardSnapshot;
  events: ParsedActionGameLogEvent[];
  screenshotConfirmations?: Record<string, BoardSpaceConfirmation>;
}): CuratedBoardCardImportItem[] {
  const boardSpaceMap = getBoardSpaceMap(input.boardSnapshot.mapId);

  return input.events.flatMap<CuratedBoardCardImportItem>((event) => {
    if (
      event.eventType !== 'card_played' ||
      normalizeName(event.card) !== normalizeName('Commercial District')
    ) {
      return [];
    }

    const matchingSpaces = Object.entries(input.boardSnapshot.spaces).filter(
      ([, occupant]) =>
        normalizeName(occupant.ownerPlayerName) === normalizeName(event.actor) &&
        normalizeName(occupant.sourceCardName ?? '') ===
          normalizeName('Commercial District'),
    );

    if (matchingSpaces.length !== 1) {
      return [
        {
          cardName: 'Commercial District',
          itemType: 'card',
          mapId: input.boardSnapshot.mapId,
          notes: [
            'The city placement from Commercial District could not be linked safely from the imported log.',
          ],
          playerName: event.actor,
          requestedSpaceIds: [],
          sourceType: 'log_and_board',
          status: 'review_needed',
        },
      ];
    }

    const [spaceId] = matchingSpaces[0];
    const spaceDefinition = boardSpaceMap.spaces[spaceId];

    if (!spaceDefinition) {
      return [
        {
          cardName: 'Commercial District',
          itemType: 'card',
          mapId: input.boardSnapshot.mapId,
          notes: [
            `Commercial District was linked to space ${spaceId}, but that space is outside curated adjacency coverage for ${input.boardSnapshot.mapId}.`,
          ],
          playerName: event.actor,
          requestedSpaceIds: [],
          sourceType: 'log_and_board',
          status: 'review_needed',
        },
      ];
    }

    if (
      !Array.isArray(spaceDefinition.neighbors) ||
      spaceDefinition.neighbors.length === 0
    ) {
      return [
        {
          cardName: 'Commercial District',
          itemType: 'card',
          mapId: input.boardSnapshot.mapId,
          notes: [
            `Commercial District was linked to space ${spaceId}, but that space does not yet have trusted adjacency coverage for ${input.boardSnapshot.mapId}.`,
          ],
          playerName: event.actor,
          requestedSpaceIds: [],
          sourceType: 'log_and_board',
          status: 'review_needed',
        },
      ];
    }

    const requestedSpaceIds: string[] = [];
    let adjacentCityCount = 0;

    for (const neighborId of spaceDefinition.neighbors) {
      const occupant = input.boardSnapshot.spaces[neighborId];

      if (isCityTileName(occupant?.tileKind)) {
        adjacentCityCount += 1;
        continue;
      }

      if (occupant) {
        continue;
      }

      const confirmation = input.screenshotConfirmations?.[neighborId];

      if (
        !confirmation ||
        confirmation.status === 'conflict' ||
        confirmation.status === 'inconclusive' ||
        confirmation.tileKind === 'unknown'
      ) {
        requestedSpaceIds.push(neighborId);
        continue;
      }

      if (confirmation.tileKind === 'city') {
        adjacentCityCount += 1;
        continue;
      }

      if (isConfirmedNonCityTileKind(confirmation.tileKind)) {
        continue;
      }

      requestedSpaceIds.push(neighborId);
    }

    if (requestedSpaceIds.length > 0) {
      return [
        {
          cardName: 'Commercial District',
          itemType: 'card',
          mapId: input.boardSnapshot.mapId,
          notes: [
            `Commercial District at space ${spaceId} still needs confirmation for adjacent spaces ${requestedSpaceIds.join(', ')}.`,
          ],
          playerName: event.actor,
          requestedSpaceIds,
          sourceType: 'log_and_board',
          status: 'review_needed',
        },
      ];
    }

    return [
      {
        cardName: 'Commercial District',
        itemType: 'card',
        mapId: input.boardSnapshot.mapId,
        notes: [
          `Commercial District at space ${spaceId} had ${adjacentCityCount} adjacent city tiles in curated board coverage.`,
        ],
        playerName: event.actor,
        points: adjacentCityCount,
        requestedSpaceIds,
        sourceType: 'log_and_board',
        status: 'proved',
      },
    ];
  });
}

export function scoreCuratedBoardImportItems(input: {
  boardSnapshot: ImportBoardSnapshot;
  events: ParsedActionGameLogEvent[];
  mapId: SupportedBoardMapId;
  participantNames?: string[];
  screenshotConfirmations?: Record<string, BoardSpaceConfirmation>;
}): CuratedBoardImportItem[] {
  return buildCommercialDistrictItems({
    boardSnapshot: input.boardSnapshot,
    events: input.events,
    screenshotConfirmations: input.screenshotConfirmations,
  });
}
