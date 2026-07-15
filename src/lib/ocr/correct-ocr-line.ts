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
  { entityType: 'card', pattern: /^(?<prefix>.*?\bplayed\s+)(?<entity>.+?)(?<suffix>\s*)$/i },
  { entityType: 'corporation', pattern: /^(?<prefix>.*?\b(?:corporation|started as)\s+)(?<entity>.+?)(?<suffix>\s*)$/i },
  { entityType: 'milestone', pattern: /^(?<prefix>.*?\b(?:claimed|funded)\s+(?:the\s+)?)(?<entity>.+?)(?<suffix>\s+milestone\b.*|\s*)$/i },
  { entityType: 'award', pattern: /^(?<prefix>.*?\b(?:funded|won)\s+(?:the\s+)?)(?<entity>.+?)(?<suffix>\s+award\b.*|\s*)$/i },
];

export function extractOcrEntityCandidate(line: string): OcrEntityCandidate | null {
  for (const definition of ENTITY_PATTERNS) {
    const match = definition.pattern.exec(line);
    const groups = match?.groups;
    if (!groups?.entity) continue;

    return {
      entityText: groups.entity.trim(),
      entityType: definition.entityType,
      prefix: groups.prefix ?? '',
      suffix: groups.suffix ?? '',
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
