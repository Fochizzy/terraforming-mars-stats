import type { CardScoringReference as CardScoringReferenceRecord } from '@/lib/db/reference-repo';

export type CardScoringCategory = 'animals' | 'jovian' | 'microbes' | 'other';

export type CardScoringRulePayload =
  | {
      mode: 'none';
    }
  | {
      category: CardScoringCategory;
      mode: 'resource_count';
      pointsPerSet: number;
      resourceType: string;
      scope: 'card';
      setSize: number;
    }
  | {
      category: CardScoringCategory;
      mode: 'tag_count';
      pointsPerSet: number;
      scope: 'self';
      setSize: number;
      tag: string;
    }
  | {
      category: CardScoringCategory;
      mode: 'tile_count';
      pointsPerSet: number;
      scope: 'self';
      setSize: number;
      tileType: string;
    };

export type VariableCardScoringRulePayload = Exclude<
  CardScoringRulePayload,
  { mode: 'none' }
>;

export type ResolvedCardScoringRule = VariableCardScoringRulePayload & {
  confidence: number;
  humanSummary: string;
  sourceType: 'curated' | 'ocr';
};

export type CardScoringRuleResolution =
  | {
      rule: ResolvedCardScoringRule;
      status: 'resolved';
    }
  | {
      confidence: number;
      humanSummary: string;
      sourceType: 'curated' | 'ocr';
      status: 'no_scoring';
    }
  | {
      reason: string;
      status: 'review';
    };

export type CardScoreEvidence = {
  boardStateTextLines: string[];
  cardId: string;
  cardName: string;
  playerName: string;
  resourceCountsByType: Record<string, number>;
  selfTagCounts: Record<string, number>;
  selfTileCounts: Record<string, number>;
  sourceTags: string[];
};

export type ImportCalculatedCardScore = {
  cardId: string;
  cardName: string;
  category: CardScoringCategory;
  evidenceSummary: string;
  humanSummary: string;
  points: number;
  sourceType: 'curated' | 'ocr';
};

export type ImportPendingCardScore = {
  cardId: string;
  cardName: string;
  reason: string;
};

export type ImportPlayerCardScoringSummary = {
  autoScoredCards: ImportCalculatedCardScore[];
  pendingCards: ImportPendingCardScore[];
  playerName: string;
  totals: {
    animals: number;
    complete: boolean;
    jovian: number;
    microbes: number;
    other: number;
    total: number;
  };
};

export type CardScoringReference = CardScoringReferenceRecord;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isCategory(value: unknown): value is CardScoringCategory {
  return (
    value === 'animals' ||
    value === 'jovian' ||
    value === 'microbes' ||
    value === 'other'
  );
}

export function isCardScoringRulePayload(
  value: unknown,
): value is CardScoringRulePayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const rule = value as Record<string, unknown>;

  if (rule.mode === 'none') {
    return true;
  }

  if (
    rule.mode === 'resource_count' &&
    rule.scope === 'card' &&
    isCategory(rule.category) &&
    isPositiveInteger(rule.pointsPerSet) &&
    isPositiveInteger(rule.setSize) &&
    isNonEmptyString(rule.resourceType)
  ) {
    return true;
  }

  if (
    rule.mode === 'tag_count' &&
    rule.scope === 'self' &&
    isCategory(rule.category) &&
    isPositiveInteger(rule.pointsPerSet) &&
    isPositiveInteger(rule.setSize) &&
    isNonEmptyString(rule.tag)
  ) {
    return true;
  }

  if (
    rule.mode === 'tile_count' &&
    rule.scope === 'self' &&
    isCategory(rule.category) &&
    isPositiveInteger(rule.pointsPerSet) &&
    isPositiveInteger(rule.setSize) &&
    isNonEmptyString(rule.tileType)
  ) {
    return true;
  }

  return false;
}
