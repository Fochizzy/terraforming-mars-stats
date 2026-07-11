import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlossaryContent } from './glossary-content';
import { glossaryCategories, glossarySlugs } from './glossary-data';
import { GlossaryLink } from './glossary-link';

// Anchor targets the glossary page exposes: every term slug plus every
// category id (sections are linkable too). GlossaryLink slugs used elsewhere
// must resolve to one of these.
const anchorIds = new Set<string>([
  ...glossaryCategories.map((category) => category.id),
  ...glossaryCategories.flatMap((category) =>
    category.terms.map((term) => term.slug),
  ),
]);

describe('glossary data', () => {
  it('has unique term slugs across every category', () => {
    const slugs = glossaryCategories.flatMap((category) =>
      category.terms.map((term) => term.slug),
    );

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('never collides a category id with a term slug', () => {
    for (const category of glossaryCategories) {
      expect(glossarySlugs.has(category.id)).toBe(false);
    }
  });

  it('gives every term a non-empty definition', () => {
    for (const category of glossaryCategories) {
      expect(category.terms.length).toBeGreaterThan(0);
      for (const term of category.terms) {
        expect(term.term.length).toBeGreaterThan(0);
        expect(term.definition.length).toBeGreaterThan(0);
      }
    }
  });

  it('defines each of the seven declared play styles', () => {
    const styleSlugs = [
      'style-balanced',
      'style-board-control',
      'style-engine-building',
      'style-jovian-payoff',
      'style-terraform-rush',
      'style-milestone-aggression',
      'style-award-pressure',
    ];

    for (const slug of styleSlugs) {
      expect(glossarySlugs.has(slug)).toBe(true);
    }
  });
});

describe('GlossaryLink', () => {
  it('deep-links to a term anchor', () => {
    render(<GlossaryLink slug="weighted-score">Weighted score</GlossaryLink>);

    expect(
      screen.getByRole('link', { name: /weighted score/i }),
    ).toHaveAttribute('href', '/glossary#weighted-score');
  });

  it('links to the page top when no slug is given', () => {
    render(<GlossaryLink>Full glossary</GlossaryLink>);

    expect(
      screen.getByRole('link', { name: /full glossary/i }),
    ).toHaveAttribute('href', '/glossary');
  });

  it('only points at anchors the glossary page actually renders', () => {
    // Guards against typos in slugs referenced from other features.
    const referencedSlugs = [
      'weighted-score',
      'score-sources',
      'style-agreement',
      'head-to-head',
      'lineup-effects',
      'interaction-insights',
      'optional-data-coverage',
    ];

    for (const slug of referencedSlugs) {
      expect(anchorIds.has(slug)).toBe(true);
    }
  });
});

describe('GlossaryContent', () => {
  it('renders every term with an id anchor for deep linking', () => {
    const { container } = render(<GlossaryContent />);

    for (const category of glossaryCategories) {
      expect(container.querySelector(`#${category.id}`)).not.toBeNull();
      for (const term of category.terms) {
        const node = container.querySelector(`#${CSS.escape(term.slug)}`);
        expect(node).not.toBeNull();
        expect(screen.getByText(term.term)).toBeInTheDocument();
      }
    }
  });
});
