import { describe, expect, it } from 'vitest';
import { createGlossaryTermRegistry } from './glossary-registry';
import { matchGlossaryTerms } from './glossary-matching';

const registry = createGlossaryTermRegistry({
  definitions: [
    { entrySlug: 'score', canonicalTerm: 'Score', aliases: [] },
    { entrySlug: 'total-score', canonicalTerm: 'Total Score', aliases: [] },
    { entrySlug: 'tr', canonicalTerm: 'TR', aliases: [] },
  ],
  knownEntrySlugs: ['score', 'total-score', 'tr'],
});

function matches(text: string, options = {}) {
  return matchGlossaryTerms(text, { registry, ...options }).filter(
    (part) => part.kind === 'match',
  );
}

describe('matchGlossaryTerms', () => {
  it('uses word boundaries, preserves casing, and prefers the longest valid term', () => {
    expect(matches('TOTAL score, then TR.')).toEqual([
      expect.objectContaining({ value: 'TOTAL score', target: expect.objectContaining({ slug: 'total-score' }) }),
      expect.objectContaining({ value: 'TR', target: expect.objectContaining({ slug: 'tr' }) }),
    ]);
    expect(matches('strategy and TRee')).toHaveLength(0);
  });

  it('does not match inside URLs and skips ambiguous registry labels', () => {
    expect(matches('See https://example.test/Total-Score and www.example.test/TR.')).toHaveLength(0);

    const ambiguous = createGlossaryTermRegistry({
      definitions: [
        { entrySlug: 'one', canonicalTerm: 'One', aliases: ['same'] },
        { entrySlug: 'two', canonicalTerm: 'Two', aliases: ['same'] },
      ],
      knownEntrySlugs: ['one', 'two'],
    });
    expect(
      matchGlossaryTerms('same', { registry: ambiguous }).filter(
        (part) => part.kind === 'match',
      ),
    ).toHaveLength(0);
  });

  it('links each destination once, observes a link cap, and honors self exclusions', () => {
    expect(matches('Score, score, and TR.', { maxLinks: 1 })).toEqual([
      expect.objectContaining({ target: expect.objectContaining({ slug: 'score' }) }),
    ]);
    expect(matches('Score and TR.', { excludedSlugs: ['score'] })).toEqual([
      expect.objectContaining({ target: expect.objectContaining({ slug: 'tr' }) }),
    ]);
  });
});
