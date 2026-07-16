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
  evidence: CardScoreEvidence;
  rule: ResolvedCardScoringRule;
}) {
  switch (input.rule.mode) {
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
      const tagCount =
        input.evidence.selfTagCounts[normalizeEvidenceToken(input.rule.tag)] ?? 0;
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
