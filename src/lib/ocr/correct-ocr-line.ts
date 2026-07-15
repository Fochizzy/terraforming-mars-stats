import {
  type DomainEntityType,
  type DomainIndex,
  type DomainMatch,
  matchDomainText,
} from './domain-matcher';

export type OcrEntityCandidate = {
  entityText: string;
  entityType: DomainEntityType;
  prefix: string;
  suffix: string;
};

export type CorrectedOcrLine = {
  correctedText: string;
  match: DomainMatch | null;
  originalText: string;
};

const ENTITY_PATTERNS: Array<{
  entityType: DomainEntityType;
  pattern: RegExp;
}> = [
  { entityType: 'card', pattern: /^(.*?\bplayed\s+)(.+?)(\s*)$/i },
  { entityType: 'corporation', pattern: /^(.*?\b(?:corporation|started as)\s+)(.+?)(\s*)$/i },
  { entityType: 'milestone', pattern: /^(.*?\b(?:claimed|funded)\s+(?:the\s+)?)(.+?)(\s+milestone\b.*|\s*)$/i },
  { entityType: 'award', pattern: /^(.*?\b(?:funded|won)\s+(?:the\s+)?)(.+?)(\s+award\b.*|\s*)$/i },
];

export function extractOcrEntityCandidate(line: string): OcrEntityCandidate | null {
  for (const definition of ENTITY_PATTERNS) {
    const match = definition.pattern.exec(line);
    if (!match?.[2]) continue;

    return {
      entityText: match[2].trim(),
      entityType: definition.entityType,
      prefix: match[1] ?? '',
      suffix: match[3] ?? '',
    };
  }

  return null;
}

export function correctOcrLine(input: {
  index: DomainIndex;
  line: string;
}): CorrectedOcrLine {
  const candidate = extractOcrEntityCandidate(input.line);
  if (!candidate) {
    return { correctedText: input.line, match: null, originalText: input.line };
  }

  const match = matchDomainText({
    allowedTypes: [candidate.entityType],
    index: input.index,
    text: candidate.entityText,
  });

  if (match.decision !== 'auto_accept' || !match.entry) {
    return { correctedText: input.line, match, originalText: input.line };
  }

  return {
    correctedText: `${candidate.prefix}${match.entry.name}${candidate.suffix}`,
    match,
    originalText: input.line,
  };
}

export function correctOcrText(input: {
  index: DomainIndex;
  text: string;
}) {
  const lines = input.text.split(/\r?\n/).map((line, lineIndex) => ({
    lineIndex,
    ...correctOcrLine({ index: input.index, line }),
  }));

  return {
    correctedText: lines.map((line) => line.correctedText).join('\n'),
    lines,
    needsReview: lines.filter((line) => line.match?.decision === 'needs_review'),
    unresolved: lines.filter((line) => line.match?.decision === 'unresolved'),
  };
}
