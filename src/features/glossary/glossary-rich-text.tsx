import type { ReactNode } from 'react';
import { glossaryLinkTargets } from './glossary-data';
import { GlossaryLink } from './glossary-link';

type GlossaryRichTextOptions = {
  excludedSlugs?: string[];
  maxLinks?: number;
};

type GlossaryRichTextProps = GlossaryRichTextOptions & {
  children: string;
};

const WORD_CHARACTER = /[A-Za-z0-9]/;

function isBoundary(text: string, index: number) {
  if (index < 0 || index >= text.length) {
    return true;
  }

  return !WORD_CHARACTER.test(text[index] ?? '');
}

function matchesAt(text: string, index: number, label: string) {
  if (!isBoundary(text, index - 1)) {
    return false;
  }

  if (!isBoundary(text, index + label.length)) {
    return false;
  }

  return text.slice(index, index + label.length).toLowerCase() === label.toLowerCase();
}

function findMatch(
  text: string,
  index: number,
  options: Required<GlossaryRichTextOptions>,
  linkedSlugs: ReadonlySet<string>,
) {
  for (const target of glossaryLinkTargets) {
    if (linkedSlugs.has(target.slug) || options.excludedSlugs.includes(target.slug)) {
      continue;
    }

    if (matchesAt(text, index, target.label)) {
      return target;
    }
  }

  return null;
}

export function renderGlossaryRichText(
  text: string,
  options: GlossaryRichTextOptions = {},
): ReactNode[] {
  const resolvedOptions = {
    excludedSlugs: options.excludedSlugs ?? [],
    maxLinks: options.maxLinks ?? 6,
  };
  const linkedSlugs = new Set<string>();
  const parts: ReactNode[] = [];
  let plainTextStart = 0;
  let index = 0;
  let key = 0;

  while (index < text.length) {
    if (linkedSlugs.size >= resolvedOptions.maxLinks) {
      break;
    }

    const match = findMatch(text, index, resolvedOptions, linkedSlugs);

    if (!match) {
      index += 1;
      continue;
    }

    if (plainTextStart < index) {
      parts.push(text.slice(plainTextStart, index));
    }

    const label = text.slice(index, index + match.label.length);
    parts.push(
      <GlossaryLink key={`glossary-link-${key}`} slug={match.slug}>
        {label}
      </GlossaryLink>,
    );
    linkedSlugs.add(match.slug);
    key += 1;
    index += match.label.length;
    plainTextStart = index;
  }

  if (plainTextStart < text.length) {
    parts.push(text.slice(plainTextStart));
  }

  return parts.length > 0 ? parts : [text];
}

export function GlossaryRichText({
  children,
  excludedSlugs,
  maxLinks,
}: GlossaryRichTextProps) {
  return <>{renderGlossaryRichText(children, { excludedSlugs, maxLinks })}</>;
}
