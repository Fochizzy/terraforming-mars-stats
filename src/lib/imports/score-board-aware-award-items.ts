import type { BoardEvidenceContext } from './build-board-evidence-context';
import type { SupportedBoardMapId } from './board-space-maps';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedActionGameLogEvent } from './parse-game-log';
import type { CuratedBoardAwardImportItem } from './score-curated-board-import-items';

type BoardAwareAwardRule =
  | {
      awardName: string;
      mode: 'review_needed';
      requestedAdjacentTileKinds?: string[];
      reviewNote: string;
    }
  | {
      awardName: string;
      mode: 'tile_count';
      tileKinds: string[];
    };

export type BoardAwareAwardImportItem = CuratedBoardAwardImportItem & {
  requestedSpaceIds?: string[];
};

const boardAwareAwardRulesByMap: Record<
  SupportedBoardMapId,
  BoardAwareAwardRule[]
> = {
  tharsis: [
    {
      awardName: 'Landlord',
      mode: 'review_needed',
      requestedAdjacentTileKinds: ['ocean'],
      reviewNote:
        'Landlord still needs targeted ocean-adjacency confirmation before importing winners.',
    },
  ],
  hellas: [
    {
      awardName: 'Cultivator',
      mode: 'tile_count',
      tileKinds: ['greenery'],
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
      requestedAdjacentTileKinds: ['ocean'],
      reviewNote:
        'Estate Dealer still needs targeted ocean-adjacency confirmation before importing winners.',
    },
  ],
  // The additional maps have no tile-count-by-kind awards: their board-relevant
  // awards use position or adjacency-VP semantics (e.g. Edgedancer = edge tiles,
  // Tourist = empty spaces adjacent to your tiles, Urbanist = city-adjacency VP)
  // that fall outside this schema, and the rest are production/card/colony based
  // (e.g. Botanist = plant production, Cosmic Settler = cities off Mars). All of
  // these are read from the endgame score table instead, so no board-aware rule
  // applies here. (Commercial District card scoring still runs on every map.)
  amazonis_planitia: [],
  arabia_terra: [],
  terra_cimmeria: [],
  vastitas_borealis: [],
  utopia_planitia: [],
};

function normalizeName(value: string) {
  return normalizePlayerAlias(value);
}

function buildExplicitAwardResultNames(events: ParsedActionGameLogEvent[]) {
  return new Set(
    events
      .filter((event) => event.eventType === 'award_result')
      .map((event) => normalizeName(event.award)),
  );
}

function buildRankedOwnedTileCounts(input: {
  boardEvidenceContext: BoardEvidenceContext;
  events: ParsedActionGameLogEvent[];
  participantNames?: string[];
  tileKinds: string[];
}) {
  const playerNamesByNormalizedName = new Map<string, string>();

  for (const participantName of input.participantNames ?? []) {
    playerNamesByNormalizedName.set(normalizeName(participantName), participantName);
  }

  for (const event of input.events) {
    if (
      event.eventType !== 'tile_placed' ||
      !input.tileKinds.some(
        (tileKind) => normalizeName(tileKind) === normalizeName(event.tile),
      )
    ) {
      continue;
    }

    const normalizedActorName = normalizeName(event.actor);

    if (!playerNamesByNormalizedName.has(normalizedActorName)) {
      playerNamesByNormalizedName.set(normalizedActorName, event.actor);
    }
  }

  return [...playerNamesByNormalizedName.values()]
    .map((playerName) => ({
      count: input.boardEvidenceContext.countOwnedMatchingTiles({
        playerName,
        tileKinds: input.tileKinds,
      }).count,
      playerName,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.playerName.localeCompare(right.playerName),
    );
}

function buildRequestedAdjacentSpaceIds(input: {
  boardEvidenceContext: BoardEvidenceContext;
  events: ParsedActionGameLogEvent[];
  tileKinds: string[];
}) {
  const requestedSpaceIds = new Set<string>();

  for (const event of input.events) {
    if (event.eventType !== 'tile_placed') {
      continue;
    }

    const adjacentQuery = input.boardEvidenceContext.countAdjacentMatchingTiles({
      spaceId: event.space,
      tileKinds: input.tileKinds,
    });

    for (const requestedSpaceId of adjacentQuery.requestedSpaceIds) {
      requestedSpaceIds.add(requestedSpaceId);
    }
  }

  return [...requestedSpaceIds].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  );
}

export function scoreBoardAwareAwardItems(input: {
  boardEvidenceContext: BoardEvidenceContext;
  events: ParsedActionGameLogEvent[];
  mapId: SupportedBoardMapId;
  participantNames?: string[];
}) {
  const rulesByName = new Map(
    boardAwareAwardRulesByMap[input.mapId].map((rule) => [
      normalizeName(rule.awardName),
      rule,
    ] as const),
  );
  const explicitAwardResultNames = buildExplicitAwardResultNames(input.events);

  return input.events.flatMap<BoardAwareAwardImportItem>((event) => {
    if (
      event.eventType !== 'award_funded' ||
      explicitAwardResultNames.has(normalizeName(event.award))
    ) {
      return [];
    }

    const rule = rulesByName.get(normalizeName(event.award));

    if (!rule) {
      return [];
    }

    if (rule.mode === 'review_needed') {
      const requestedSpaceIds = rule.requestedAdjacentTileKinds
        ? buildRequestedAdjacentSpaceIds({
            boardEvidenceContext: input.boardEvidenceContext,
            events: input.events,
            tileKinds: rule.requestedAdjacentTileKinds,
          })
        : [];

      return [
        {
          awardName: rule.awardName,
          fundedByPlayerName: event.actor,
          itemType: 'award',
          mapId: input.mapId,
          notes: [rule.reviewNote],
          requestedSpaceIds,
          sourceType: 'log',
          status: 'review_needed',
        },
      ];
    }

    const rankedCounts = buildRankedOwnedTileCounts({
      boardEvidenceContext: input.boardEvidenceContext,
      events: input.events,
      participantNames: input.participantNames,
      tileKinds: rule.tileKinds,
    });

    if (rankedCounts.length === 0 || rankedCounts[0]?.count == null) {
      return [
        {
          awardName: rule.awardName,
          fundedByPlayerName: event.actor,
          itemType: 'award',
          mapId: input.mapId,
          notes: [
            `${rule.awardName} was funded, but the imported log did not prove any ${rule.tileKinds.join('/')} ownership from board evidence.`,
          ],
          sourceType: 'log',
          status: 'review_needed',
        },
      ];
    }

    const topCount = rankedCounts[0].count;

    if (topCount === 0) {
      return [
        {
          awardName: rule.awardName,
          fundedByPlayerName: event.actor,
          itemType: 'award',
          mapId: input.mapId,
          notes: [
            `${rule.awardName} was funded, but the imported log did not prove any ${rule.tileKinds.join('/')} ownership from board evidence.`,
          ],
          sourceType: 'log',
          status: 'review_needed',
        },
      ];
    }

    const firstPlacePlayerNames = rankedCounts
      .filter((entry) => entry.count === topCount)
      .map((entry) => entry.playerName);
    const secondPlaceCount =
      firstPlacePlayerNames.length === 1
        ? rankedCounts.find((entry) => entry.count < topCount)?.count
        : undefined;
    const secondPlacePlayerNames =
      secondPlaceCount == null
        ? []
        : rankedCounts
            .filter((entry) => entry.count === secondPlaceCount)
            .map((entry) => entry.playerName);

    return [
      {
        awardName: rule.awardName,
        firstPlacePlayerNames,
        fundedByPlayerName: event.actor,
        itemType: 'award',
        mapId: input.mapId,
        notes: [
          `${rule.awardName} used board-owned ${rule.tileKinds.join('/')} counts: ${rankedCounts
            .map((entry) => `${entry.playerName} ${entry.count}`)
            .join(', ')}.`,
        ],
        secondPlacePlayerNames,
        sourceType: 'log',
        status: 'proved',
      },
    ];
  });
}
