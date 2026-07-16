import {
  getCardScoringRuleCache,
  upsertCardScoringRuleCache,
} from '@/lib/db/card-scoring-rule-cache-repo';
import { getCuratedCardScoringRule } from './curated-card-scoring-rules';
import {
  isCardScoringRulePayload,
  type CardScoringReference,
  type CardScoringRuleResolution,
  type ResolvedCardScoringRule,
} from './card-scoring-types';
import { parseOcrCardRule } from './parse-ocr-card-rule';

function toRulePayload(rule: ResolvedCardScoringRule) {
  const { confidence, humanSummary, sourceType, ...payload } = rule;

  void confidence;
  void humanSummary;
  void sourceType;

  return payload;
}

function buildCachedResolution(input: {
  confidence: number;
  humanSummary: string;
  rulePayload: unknown;
  sourceType: 'curated' | 'ocr';
}): CardScoringRuleResolution | null {
  if (!isCardScoringRulePayload(input.rulePayload)) {
    return null;
  }

  if (input.rulePayload.mode === 'none') {
    return {
      confidence: input.confidence,
      humanSummary: input.humanSummary,
      sourceType: input.sourceType,
      status: 'no_scoring',
    };
  }

  return {
    rule: {
      ...input.rulePayload,
      confidence: input.confidence,
      humanSummary: input.humanSummary,
      sourceType: input.sourceType,
    },
    status: 'resolved',
  };
}

export async function resolveCardScoringRule(input: {
  card: CardScoringReference;
  ocrTextLines?: string[];
  readOcrTextLines?: (card: CardScoringReference) => Promise<string[]>;
}): Promise<CardScoringRuleResolution> {
  const curatedRule = getCuratedCardScoringRule(input.card);

  if (curatedRule) {
    return {
      rule: curatedRule,
      status: 'resolved',
    };
  }

  const cachedRule = await getCardScoringRuleCache(input.card.id);

  if (cachedRule) {
    const cachedResolution = buildCachedResolution({
      confidence: cachedRule.confidence,
      humanSummary: cachedRule.humanSummary,
      rulePayload: cachedRule.rulePayload,
      sourceType: cachedRule.sourceType,
    });

    if (cachedResolution) {
      return cachedResolution;
    }
  }

  let ocrTextLines = input.ocrTextLines;

  if (!ocrTextLines) {
    if (!input.readOcrTextLines) {
      return {
        reason: `Unable to read ${input.card.cardName} for OCR rule parsing.`,
        status: 'review',
      };
    }

    try {
      ocrTextLines = await input.readOcrTextLines(input.card);
    } catch {
      return {
        reason: `Unable to read ${input.card.cardName} for OCR rule parsing.`,
        status: 'review',
      };
    }
  }

  const parsedRule = parseOcrCardRule({
    cardName: input.card.cardName,
    textLines: ocrTextLines,
  });

  if (parsedRule.status === 'resolved') {
    const rule = {
      ...parsedRule.payload,
      confidence: parsedRule.confidence,
      humanSummary: parsedRule.humanSummary,
      sourceType: 'ocr' as const,
    };

    await upsertCardScoringRuleCache({
      cardId: input.card.id,
      confidence: parsedRule.confidence,
      humanSummary: parsedRule.humanSummary,
      ocrEngineVersion: 'tesseract.js-v7',
      rulePayload: toRulePayload(rule),
      sourceType: 'ocr',
    });

    return {
      rule,
      status: 'resolved',
    };
  }

  if (parsedRule.status === 'no_scoring') {
    await upsertCardScoringRuleCache({
      cardId: input.card.id,
      confidence: parsedRule.confidence,
      humanSummary: parsedRule.humanSummary,
      ocrEngineVersion: 'tesseract.js-v7',
      rulePayload: { mode: 'none' },
      sourceType: 'ocr',
    });

    return {
      confidence: parsedRule.confidence,
      humanSummary: parsedRule.humanSummary,
      sourceType: 'ocr',
      status: 'no_scoring',
    };
  }

  return parsedRule;
}
