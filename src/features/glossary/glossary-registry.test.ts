import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_GLOSSARY_ENTRY_SLUGS,
  glossaryTerms,
} from './glossary-data';
import {
  createGlossaryTermRegistry,
  glossaryTermRegistry,
} from './glossary-registry';

describe('glossary registry', () => {
  it('preserves every approved historical entry identity', () => {
    const currentSlugs = new Set(glossaryTerms.map((term) => term.slug));

    expect(HISTORICAL_GLOSSARY_ENTRY_SLUGS).toHaveLength(125);
    expect(HISTORICAL_GLOSSARY_ENTRY_SLUGS.every((slug) => currentSlugs.has(slug))).toBe(true);
    expect(glossaryTerms.length).toBeGreaterThan(125);
  });

  it('keeps only documented historical ambiguous aliases out of automatic links', () => {
    expect(
      glossaryTermRegistry.issues.filter(
        (issue) => issue.code === 'ambiguous-alias',
      ),
    ).toEqual([
      {
        code: 'ambiguous-alias',
        label: 'opening combo',
        slugs: ['corp-prelude-pairing', 'opening-combo-strength'],
      },
      {
        code: 'ambiguous-alias',
        label: 'score edge',
        slugs: ['lead-pressure', 'score-margin'],
      },
    ]);
    expect(
      glossaryTermRegistry.issues.filter(
        (issue) => issue.code === 'duplicate-alias',
      ),
    ).toHaveLength(9);
    expect(
      glossaryTermRegistry.issues.some(
        (issue) => issue.code === 'empty-alias' || issue.code === 'missing-entry',
      ),
    ).toBe(false);
    expect(glossaryTermRegistry.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'win-rate', label: 'Win Rate' }),
        expect.objectContaining({ slug: 'card-database', label: 'Card Database' }),
      ]),
    );
  });

  it('reports all invalid registry states and returns deterministic targets', () => {
    const registry = createGlossaryTermRegistry({
      definitions: [
        { entrySlug: 'one', canonicalTerm: 'Short', aliases: ['shared', ''] },
        { entrySlug: 'one', canonicalTerm: 'Longest Name', aliases: ['one-only'] },
        { entrySlug: 'two', canonicalTerm: 'Other', aliases: ['shared'] },
        { entrySlug: 'missing', canonicalTerm: 'Missing', aliases: [] },
      ],
      knownEntrySlugs: ['one', 'two'],
    });

    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-slug', slugs: ['one'] }),
        expect.objectContaining({ code: 'empty-alias', slugs: ['one'] }),
        expect.objectContaining({ code: 'ambiguous-alias', label: 'shared' }),
        expect.objectContaining({ code: 'missing-entry', slugs: ['missing'] }),
      ]),
    );
    expect(registry.targets.map((target) => target.label)).toEqual([
      'Longest Name',
      'one-only',
      'Other',
      'Short',
    ]);
  });
});
