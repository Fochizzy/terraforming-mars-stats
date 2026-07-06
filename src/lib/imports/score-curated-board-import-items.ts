import { getBoardSpaceMap, type SupportedBoardMapId } from './board-space-maps';
import type { ImportBoardSnapshot } from './build-import-board-snapshot';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedActionGameLogEvent } from './parse-game-log';

type CuratedBoardReviewStatus = 'proved' | 'review_needed';

export type CuratedBoardCardImportItem = {
  cardName: string;
  itemType: 'card';
  mapId: SupportedBoardMapId;
  notes: string[];
  playerName: string;
  points?: number;
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

type CuratedBoardAwardRule =
  | {
      awardName: string;
      mode: 'review_needed';
      reviewNote: string;
    }
  | {
      awardName: string;
      mode: 'tile_count';
      tileKind: string;
    };

const curatedBoardAwardRulesByMap: Record<
  SupportedBoardMapId,
  CuratedBoardAwardRule[]
> = {
  tharsis: [
    {
      awardName: 'Landlord',
      mode: 'review_needed',
      reviewNote:
        'Landlord still needs targeted ocean-adjacency confirmation before importing winners.',
    },
  ],
  hellas: [
    {
      awardName: 'Cultivator',
      mode: 'tile_count',
      tileKind: 'greenery',
    },
  ],
  elysium: [
    {
      awardName: 'Desert Settler',
      mode: 'review_needed',
      reviewNote:
        'Desert Settler still needs targeted area confirmation before importing winners.',
    },
    {
      awardName: 'Estate Dealer',
      mode: 'review_needed',
      reviewNote:
        'Estate Dealer still needs targeted ocean-adjacency confirmation before importing winners.',
    },
  ],
};

function normalizeName(value: string) {
  return normalizePlayerAlias(value);
}

function buildCommercialDistrictItems(input: {
  boardSnapshot: ImportBoardSnapshot;
  events: ParsedActionGameLogEvent[];
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
          sourceType: 'log_and_board',
          status: 'review_needed',
        },
      ];
    }

    const adjacentCityCount = spaceDefinition.neighbors.reduce((count, neighborId) => {
      const occupant = input.boardSnapshot.spaces[neighborId];
      return normalizeName(occupant?.tileKind ?? '') === normalizeName('city')
        ? count + 1
        : count;
    }, 0);

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
        sourceType: 'log_and_board',
        status: 'proved',
      },
    ];
  });
}

function buildAwardResultMap(events: ParsedActionGameLogEvent[]) {
  const awardNames = new Set<string>();

  for (const event of events) {
    if (event.eventType === 'award_result') {
      awardNames.add(normalizeName(event.award));
    }
  }

  return awardNames;
}

function getRankedTileCounts(input: {
  events: ParsedActionGameLogEvent[];
  tileKind: string;
}) {
  const countsByPlayerName = new Map<string, number>();

  for (const event of input.events) {
    if (
      event.eventType === 'tile_placed' &&
      normalizeName(event.tile) === normalizeName(input.tileKind)
    ) {
      countsByPlayerName.set(
        event.actor,
        (countsByPlayerName.get(event.actor) ?? 0) + 1,
      );
    }
  }

  return [...countsByPlayerName.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function buildAwardItems(input: {
  events: ParsedActionGameLogEvent[];
  mapId: SupportedBoardMapId;
}): CuratedBoardAwardImportItem[] {
  const rulesByName = new Map(
    curatedBoardAwardRulesByMap[input.mapId].map((rule) => [
      normalizeName(rule.awardName),
      rule,
    ] as const),
  );
  const awardResults = buildAwardResultMap(input.events);

  return input.events.flatMap<CuratedBoardAwardImportItem>((event) => {
    if (
      event.eventType !== 'award_funded' ||
      awardResults.has(normalizeName(event.award))
    ) {
      return [];
    }

    const rule = rulesByName.get(normalizeName(event.award));

    if (!rule) {
      return [];
    }

    if (rule.mode === 'review_needed') {
      return [
        {
          awardName: rule.awardName,
          fundedByPlayerName: event.actor,
          itemType: 'award',
          mapId: input.mapId,
          notes: [rule.reviewNote],
          sourceType: 'log',
          status: 'review_needed',
        },
      ];
    }

    const rankedCounts = getRankedTileCounts({
      events: input.events,
      tileKind: rule.tileKind,
    });

    if (rankedCounts.length === 0 || rankedCounts[0]?.[1] == null) {
      return [
        {
          awardName: rule.awardName,
          fundedByPlayerName: event.actor,
          itemType: 'award',
          mapId: input.mapId,
          notes: [
            `${rule.awardName} was funded, but the imported log did not prove any ${rule.tileKind} placements.`,
          ],
          sourceType: 'log',
          status: 'review_needed',
        },
      ];
    }

    const topCount = rankedCounts[0][1];
    const firstPlacePlayerNames = rankedCounts
      .filter(([, count]) => count === topCount)
      .map(([playerName]) => playerName);
    const secondPlaceCount =
      firstPlacePlayerNames.length === 1
        ? rankedCounts.find(([, count]) => count < topCount)?.[1]
        : undefined;
    const secondPlacePlayerNames =
      secondPlaceCount == null
        ? []
        : rankedCounts
            .filter(([, count]) => count === secondPlaceCount)
            .map(([playerName]) => playerName);

    return [
      {
        awardName: rule.awardName,
        firstPlacePlayerNames,
        fundedByPlayerName: event.actor,
        itemType: 'award',
        mapId: input.mapId,
        notes: [
          `${rule.awardName} used ${rule.tileKind} placements from the imported log: ${rankedCounts
            .map(([playerName, count]) => `${playerName} ${count}`)
            .join(', ')}.`,
        ],
        secondPlacePlayerNames,
        sourceType: 'log',
        status: 'proved',
      },
    ];
  });
}

export function scoreCuratedBoardImportItems(input: {
  boardSnapshot: ImportBoardSnapshot;
  events: ParsedActionGameLogEvent[];
  mapId: SupportedBoardMapId;
}): CuratedBoardImportItem[] {
  return [
    ...buildCommercialDistrictItems({
      boardSnapshot: input.boardSnapshot,
      events: input.events,
    }),
    ...buildAwardItems({
      events: input.events,
      mapId: input.mapId,
    }),
  ];
}
