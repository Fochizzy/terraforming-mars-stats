import type {
  CardScoringRulePayload,
  VariableCardScoringRulePayload,
} from './card-scoring-types';

type ParsedOcrCardRuleResult =
  | {
      confidence: number;
      humanSummary: string;
      payload: VariableCardScoringRulePayload;
      status: 'resolved';
    }
  | {
      confidence: number;
      humanSummary: string;
      status: 'no_scoring';
    }
  | {
      reason: string;
      status: 'review';
    };

type OcrRuleMatch = {
  confidence: number;
  humanSummary: string;
  payload: VariableCardScoringRulePayload;
};

function normalizeRuleTextLines(textLines: string[]) {
  return [...new Set(
    textLines
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  )];
}

function payloadSignature(payload: CardScoringRulePayload) {
  return JSON.stringify(payload);
}

function buildScoringSummary(
  pointsPerSet: number,
  setSize: number,
  noun: string,
  suffix: string,
) {
  const pointLabel = pointsPerSet === 1 ? '1 VP' : `${pointsPerSet} VP`;
  const countLabel =
    setSize === 1 ? noun : `${setSize} ${noun}${noun.endsWith('s') ? '' : 's'}`;
  return `${pointLabel} per ${countLabel}${suffix}`;
}

function buildResourceMatches(ruleText: string): OcrRuleMatch[] {
  const matches = [
    ...ruleText.matchAll(
      /(\d+)\s*v\.?\s*p\.?\s*(?:for|per)?\s*(?:every|each)?\s*(?:(\d+)\s*)?(animal|microbe)s?\b(?:[^.]{0,48})(?:on this card|here|on card)/gi,
    ),
  ];

  return matches.flatMap((match) => {
    const pointsPerSet = Number(match[1] ?? '');
    const setSize = Number(match[2] ?? '1');
    const resourceType = match[3]?.toLowerCase();

    if (!pointsPerSet || !setSize || !resourceType) {
      return [];
    }

    return [{
      confidence: 0.89,
      humanSummary: buildScoringSummary(
        pointsPerSet,
        setSize,
        resourceType,
        ' on this card',
      ),
      payload: {
        category: resourceType === 'animal' ? 'animals' : 'microbes',
        mode: 'resource_count',
        pointsPerSet,
        resourceType,
        scope: 'card',
        setSize,
      },
    }];
  });
}

function buildTagMatches(ruleText: string): OcrRuleMatch[] {
  const matches = [
    ...ruleText.matchAll(
      /(\d+)\s*v\.?\s*p\.?\s*(?:for|per)?\s*(?:every|each)?\s*(?:(\d+)\s*)?([a-z]+)\s*tags?\b(?:[^.]{0,48})(?:you have|in play|you own)/gi,
    ),
  ];

  return matches.flatMap((match) => {
    const pointsPerSet = Number(match[1] ?? '');
    const setSize = Number(match[2] ?? '1');
    const tag = match[3]?.toLowerCase();

    if (!pointsPerSet || !setSize || !tag) {
      return [];
    }

    return [{
      confidence: 0.86,
      humanSummary: buildScoringSummary(
        pointsPerSet,
        setSize,
        `${tag} tag`,
        ' you have',
      ),
      payload: {
        category: tag === 'jovian' ? 'jovian' : 'other',
        mode: 'tag_count',
        pointsPerSet,
        scope: 'self',
        setSize,
        tag,
      },
    }];
  });
}

function buildTileMatches(ruleText: string): OcrRuleMatch[] {
  const matches = [
    ...ruleText.matchAll(
      /(\d+)\s*v\.?\s*p\.?\s*(?:for|per)?\s*(?:every|each)?\s*(?:(\d+)\s*)?(city|greenery)\s*tiles?\b/gi,
    ),
  ];

  return matches.flatMap((match) => {
    const pointsPerSet = Number(match[1] ?? '');
    const setSize = Number(match[2] ?? '1');
    const tileType = match[3]?.toLowerCase();

    if (!pointsPerSet || !setSize || !tileType) {
      return [];
    }

    return [{
      confidence: 0.82,
      humanSummary: buildScoringSummary(
        pointsPerSet,
        setSize,
        `${tileType} tile`,
        '',
      ),
      payload: {
        category: 'other',
        mode: 'tile_count',
        pointsPerSet,
        scope: 'self',
        setSize,
        tileType,
      },
    }];
  });
}

export function parseOcrCardRule(input: {
  cardName: string;
  textLines: string[];
}): ParsedOcrCardRuleResult {
  const normalizedTextLines = normalizeRuleTextLines(input.textLines);
  const ruleText = normalizedTextLines.join(' ').toLowerCase();

  if (normalizedTextLines.length === 0) {
    return {
      reason: `No OCR text was extracted for ${input.cardName}.`,
      status: 'review',
    };
  }

  if (!/\b(vp|victory points?)\b/i.test(ruleText)) {
    return {
      confidence: 0.65,
      humanSummary: 'No endgame VP rule detected in the card text.',
      status: 'no_scoring',
    };
  }

  const candidateMatches = [
    ...buildResourceMatches(ruleText),
    ...buildTagMatches(ruleText),
    ...buildTileMatches(ruleText),
  ];
  const uniqueMatches = [
    ...new Map(
      candidateMatches.map((match) => [payloadSignature(match.payload), match]),
    ).values(),
  ];

  if (uniqueMatches.length === 1) {
    return {
      confidence: uniqueMatches[0].confidence,
      humanSummary: uniqueMatches[0].humanSummary,
      payload: uniqueMatches[0].payload,
      status: 'resolved',
    };
  }

  if (uniqueMatches.length > 1) {
    return {
      reason: `Multiple endgame scoring formulas were detected for ${input.cardName}.`,
      status: 'review',
    };
  }

  return {
    reason: `OCR found VP text for ${input.cardName}, but the scoring rule was not clear enough to normalize.`,
    status: 'review',
  };
}
