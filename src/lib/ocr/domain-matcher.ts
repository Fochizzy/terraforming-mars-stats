export type DomainEntityType =
  | 'award'
  | 'card'
  | 'corporation'
  | 'milestone'
  | 'player'
  | 'resource';

export type DomainEntry = {
  aliases?: string[];
  id: string;
  name: string;
  type: DomainEntityType;
};

export type DomainSuggestion = {
  entry: DomainEntry;
  score: number;
};

export type DomainMatch = {
  decision: 'auto_accept' | 'needs_review' | 'unresolved';
  entry: DomainEntry | null;
  margin: number;
  method: 'exact' | 'alias' | 'fuzzy' | 'none';
  normalizedText: string;
  originalText: string;
  score: number;
  suggestions: DomainSuggestion[];
};

export type DomainIndex = ReturnType<typeof buildDomainIndex>;

const OCR_CHARACTER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\|/g, 'l'],
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
];

export function normalizeDomainText(value: string): string {
  let normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  for (const [pattern, replacement] of OCR_CHARACTER_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildDomainIndex(entries: DomainEntry[]) {
  const normalizedEntries = entries.map((entry) => ({
    ...entry,
    aliases: entry.aliases ?? [],
    normalizedName: normalizeDomainText(entry.name),
  }));
  const exact = new Map<string, { entry: DomainEntry; method: 'exact' | 'alias' }>();

  for (const entry of normalizedEntries) {
    exact.set(entry.normalizedName, { entry, method: 'exact' });
    for (const alias of entry.aliases) {
      exact.set(normalizeDomainText(alias), { entry, method: 'alias' });
    }
  }

  return { entries: normalizedEntries, exact };
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost,
      );
    }
    previous = current;
  }

  return previous[right.length];
}

function editSimilarity(left: string, right: string): number {
  const length = Math.max(left.length, right.length);
  return length === 0 ? 1 : 1 - levenshteinDistance(left, right) / length;
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 1 : intersection / union;
}

function similarity(left: string, right: string): number {
  return editSimilarity(left, right) * 0.72 + tokenSimilarity(left, right) * 0.28;
}

export function matchDomainText(input: {
  allowedTypes?: DomainEntityType[];
  index: DomainIndex;
  text: string;
}): DomainMatch {
  const normalizedText = normalizeDomainText(input.text);
  const exact = input.index.exact.get(normalizedText);

  if (exact && (!input.allowedTypes || input.allowedTypes.includes(exact.entry.type))) {
    return {
      decision: 'auto_accept',
      entry: exact.entry,
      margin: 1,
      method: exact.method,
      normalizedText,
      originalText: input.text,
      score: 1,
      suggestions: [{ entry: exact.entry, score: 1 }],
    };
  }

  const suggestions = input.index.entries
    .filter((entry) => !input.allowedTypes || input.allowedTypes.includes(entry.type))
    .map((entry) => ({
      entry,
      score: Math.max(
        similarity(normalizedText, entry.normalizedName),
        ...entry.aliases.map((alias) => similarity(normalizedText, normalizeDomainText(alias))),
      ),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  const best = suggestions[0];
  const margin = best ? best.score - (suggestions[1]?.score ?? 0) : 0;
  const autoAccept = Boolean(best && best.score >= 0.94 && margin >= 0.1);
  const needsReview = Boolean(best && best.score >= 0.78);

  return {
    decision: autoAccept ? 'auto_accept' : needsReview ? 'needs_review' : 'unresolved',
    entry: autoAccept ? best.entry : null,
    margin,
    method: autoAccept ? 'fuzzy' : 'none',
    normalizedText,
    originalText: input.text,
    score: best?.score ?? 0,
    suggestions,
  };
}
