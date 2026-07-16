import type { BoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';
import type {
  CardScoreEvidence,
  ResolvedCardScoringRule,
} from './card-scoring-types';

function normalizeEvidenceToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function scoreBySets(input: {
  itemCount: number;
  itemLabel: string;
  pointsPerSet: number;
  setSize: number;
}) {
  const points =
    Math.floor(input.itemCount / input.setSize) * input.pointsPerSet;

  return {
    evidenceSummary: `${input.itemCount} ${input.itemLabel} => ${points} VP`,
    points,
  };
}

export function scoreCardFromEvidence(input: {
  boardEvidenceContext?: BoardEvidenceContext;
  evidence: CardScoreEvidence;
  rule: ResolvedCardScoringRule;
}) {
  switch (input.rule.mode) {
    case 'adjacent_tile_count_from_placed_tile': {
      const boardEvidenceContext = input.boardEvidenceContext;

      if (!boardEvidenceContext) {
        return {
          reason: `${input.evidence.cardName} needs board evidence before it can be scored.`,
          requestedSpaceIds: [],
          reviewKind: 'board_evidence' as const,
          status: 'review' as const,
        };
      }

      const placedTile = boardEvidenceContext.resolvePlacedTileByCard({
        cardName: input.evidence.cardName,
        playerName: input.evidence.playerName,
      });

      if (placedTile.status !== 'proved') {
        return {
          reason:
            placedTile.notes[0] ??
            `${input.evidence.cardName} could not be linked safely to a placed tile.`,
          requestedSpaceIds: placedTile.requestedSpaceIds,
          reviewKind: 'board_evidence' as const,
          status: 'review' as const,
        };
      }

      const adjacentTiles = boardEvidenceContext.countAdjacentMatchingTiles({
        spaceId: placedTile.spaceId,
        tileKinds: input.rule.adjacentTileKinds,
      });

      if (adjacentTiles.status !== 'proved') {
        return {
          reason:
            adjacentTiles.requestedSpaceIds.length > 0
              ? `${input.evidence.cardName} still needs board confirmation for spaces ${adjacentTiles.requestedSpaceIds.join(', ')}.`
              : (adjacentTiles.notes[0] ??
                `${input.evidence.cardName} still needs board confirmation before it can be scored.`),
          requestedSpaceIds: adjacentTiles.requestedSpaceIds,
          reviewKind: 'board_evidence' as const,
          status: 'review' as const,
        };
      }

      const scored = scoreBySets({
        itemCount: adjacentTiles.count,
        itemLabel: `${input.rule.adjacentTileKinds.join('/')} tiles`,
        pointsPerSet: input.rule.pointsPerSet,
        setSize: input.rule.setSize,
      });

      return {
        category: input.rule.category,
        evidenceSummary: `${input.evidence.cardName} at space ${placedTile.spaceId} had ${adjacentTiles.count} adjacent ${input.rule.adjacentTileKinds.join('/')} tiles => ${scored.points} VP`,
        points: scored.points,
        status: 'scored' as const,
      };
    }
    case 'resource_count': {
      const resourceCount =
        input.evidence.resourceCountsByType[
          normalizeEvidenceToken(input.rule.resourceType)
        ] ?? 0;
      const scored = scoreBySets({
        itemCount: resourceCount,
        itemLabel: input.rule.resourceType,
        pointsPerSet: input.rule.pointsPerSet,
        setSize: input.rule.setSize,
      });

      return {
        category: input.rule.category,
        evidenceSummary: scored.evidenceSummary,
        points: scored.points,
        status: 'scored' as const,
      };
    }
    case 'tag_count': {
      const tagKey = normalizeEvidenceToken(input.rule.tag);
      const tagCount = input.evidence.selfTagCounts[tagKey];

      if (typeof tagCount !== 'number') {
        return {
          reason: `${input.evidence.cardName} needs trusted ${input.rule.tag} tag evidence before it can be scored.`,
          status: 'review' as const,
        };
      }

      const scored = scoreBySets({
        itemCount: tagCount,
        itemLabel: `${input.rule.tag} tags`,
        pointsPerSet: input.rule.pointsPerSet,
        setSize: input.rule.setSize,
      });

      return {
        category: input.rule.category,
        evidenceSummary: scored.evidenceSummary,
        points: scored.points,
        status: 'scored' as const,
      };
    }
    case 'tile_count': {
      const tileCount =
        input.evidence.selfTileCounts[normalizeEvidenceToken(input.rule.tileType)] ??
        0;
      const scored = scoreBySets({
        itemCount: tileCount,
        itemLabel: `${input.rule.tileType} tiles`,
        pointsPerSet: input.rule.pointsPerSet,
        setSize: input.rule.setSize,
      });

      return {
        category: input.rule.category,
        evidenceSummary: scored.evidenceSummary,
        points: scored.points,
        status: 'scored' as const,
      };
    }
    default: {
      const exhaustiveCheck: never = input.rule;
      return exhaustiveCheck;
    }
  }
}
