import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlossaryContent } from './glossary-content';
import {
  glossaryCategories,
  glossaryLinkTargets,
  glossarySlugs,
} from './glossary-data';
import { GlossaryLink } from './glossary-link';
import { GlossaryRichText } from './glossary-rich-text';

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

  it('defines the current analytics and import workflow terms', () => {
    const currentSlugs = [
      'combination-lens',
      'insights-lab',
      'final-terraforming-action',
      'global-parameter-tempo',
      'import-draft',
      'import-evidence',
      'log-derived-card-timing',
      'opening-combo-strength',
      'profile-expansions',
      'score-profile',
      'score-details',
      'style-card-combo',
      'style-science-combo',
      'terraforming-share',
    ];

    for (const slug of currentSlugs) {
      expect(glossarySlugs.has(slug)).toBe(true);
    }
  });

  it('only exposes auto-link targets with rendered glossary anchors', () => {
    for (const target of glossaryLinkTargets) {
      expect(anchorIds.has(target.slug)).toBe(true);
      expect(target.label.trim()).toBe(target.label);
      expect(target.label.length).toBeGreaterThan(0);
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

describe('GlossaryRichText', () => {
  it('links matching terms to their glossary anchors', () => {
    render(
      <p>
        <GlossaryRichText>
          Baseline win rate compares against victory impact from imported game logs.
        </GlossaryRichText>
      </p>,
    );

    expect(
      screen.getByRole('link', { name: /baseline win rate/i }),
    ).toHaveAttribute('href', '/glossary#baseline-win-rate');
    expect(
      screen.getByRole('link', { name: /victory impact/i }),
    ).toHaveAttribute('href', '/glossary#win-rate-delta');
    expect(
      screen.getByRole('link', { name: /imported game logs/i }),
    ).toHaveAttribute('href', '/glossary#game-log');
  });

  it('prefers the longest term match and respects word boundaries', () => {
    render(
      <p>
        <GlossaryRichText>
          Total card points and TR improve; strategy should not link because it only contains tr.
        </GlossaryRichText>
      </p>,
    );

    expect(
      screen.getByRole('link', { name: /total card points/i }),
    ).toHaveAttribute('href', '/glossary#card-points');
    expect(screen.getByRole('link', { name: 'TR' })).toHaveAttribute(
      'href',
      '/glossary#terraform-rating',
    );
    expect(screen.queryByRole('link', { name: /trategy/i })).toBeNull();
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
