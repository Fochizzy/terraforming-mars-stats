import {
  glossaryTermRegistry,
  type GlossaryLinkTarget,
  type GlossaryTermRegistry,
} from './glossary-registry';

export type GlossaryTextPart =
  | { kind: 'text'; value: string }
  | { kind: 'match'; value: string; target: GlossaryLinkTarget };

export type GlossaryMatchOptions = {
  excludedSlugs?: readonly string[];
  linkedSlugs?: Set<string>;
  maxLinks?: number;
  registry?: GlossaryTermRegistry;
};

const wordCharacter = /[\p{L}\p{N}]/u;
const urlPattern = /(?:https?:\/\/|www\.)[^\s<]+/giu;

function isBoundary(value: string, index: number) {
  return index < 0 || index >= value.length || !wordCharacter.test(value[index]);
}

function isUrlRange(value: string, index: number) {
  for (const match of value.matchAll(urlPattern)) {
    const start = match.index ?? -1;
    const end = start + match[0].length;
    if (index >= start && index < end) {
      return true;
    }
  }
  return false;
}

function matchesAt(text: string, index: number, target: GlossaryLinkTarget) {
  const end = index + target.label.length;
  return (
    isBoundary(text, index - 1) &&
    isBoundary(text, end) &&
    text.slice(index, end).toLocaleLowerCase() === target.normalizedLabel
  );
}

export function matchGlossaryTerms(
  text: string,
  options: GlossaryMatchOptions = {},
): GlossaryTextPart[] {
  const registry = options.registry ?? glossaryTermRegistry;
  const excludedSlugs = new Set(options.excludedSlugs ?? []);
  const linkedSlugs = options.linkedSlugs ?? new Set<string>();
  const maxLinks = options.maxLinks ?? 6;
  const parts: GlossaryTextPart[] = [];
  let textStart = 0;
  let index = 0;

  while (index < text.length && linkedSlugs.size < maxLinks) {
    if (isUrlRange(text, index)) {
      index += 1;
      continue;
    }

    const target = registry.targets.find(
      (candidate) =>
        !excludedSlugs.has(candidate.slug) &&
        !linkedSlugs.has(candidate.slug) &&
        matchesAt(text, index, candidate),
    );

    if (!target) {
      index += 1;
      continue;
    }

    if (textStart < index) {
      parts.push({ kind: 'text', value: text.slice(textStart, index) });
    }
    const end = index + target.label.length;
    parts.push({
      kind: 'match',
      value: text.slice(index, end),
      target,
    });
    linkedSlugs.add(target.slug);
    index = end;
    textStart = end;
  }

  if (textStart < text.length) {
    parts.push({ kind: 'text', value: text.slice(textStart) });
  }

  return parts.length > 0 ? parts : [{ kind: 'text', value: text }];
}
