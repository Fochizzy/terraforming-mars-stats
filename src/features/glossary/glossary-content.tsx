'use client';

import { useEffect, useState } from 'react';
import { glossaryCategories } from './glossary-data';

function slugFromHash(hash: string): string {
  return hash.replace(/^#/, '');
}

export function GlossaryContent() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    // Scroll the linked term into view and flag it so it can pulse. This runs
    // on first load (deep link) and whenever the hash changes while on the page.
    const timers: number[] = [];

    function focusHashTerm() {
      const slug = slugFromHash(window.location.hash);

      if (!slug) {
        return;
      }

      const target = document.getElementById(slug);

      if (!target) {
        return;
      }

      setActiveSlug(slug);
      // Snap straight to the term — no smooth animation. The instant jump is
      // reliable even for far-down terms, where a long smooth scroll can be
      // undone by the router's own scroll handling.
      target.scrollIntoView({ behavior: 'auto', block: 'start' });

      // Re-assert the position shortly after, in case a late layout shift (e.g.
      // the header image loading) or the router's scroll restoration nudged it.
      timers.push(
        window.setTimeout(() => {
          if (slugFromHash(window.location.hash) !== slug) {
            return;
          }

          if (Math.abs(target.getBoundingClientRect().top) > 80) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }, 250),
      );
    }

    focusHashTerm();
    window.addEventListener('hashchange', focusHashTerm);

    return () => {
      window.removeEventListener('hashchange', focusHashTerm);
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      return;
    }

    // Let the highlight fade after a moment so repeat visits re-trigger it.
    const timer = window.setTimeout(() => setActiveSlug(null), 2400);

    return () => window.clearTimeout(timer);
  }, [activeSlug]);

  return (
    <div className="flex flex-col gap-4">
      <section className="tm-panel">
        <h2 className="tm-panel-title text-lg font-semibold">Glossary</h2>
        <p className="tm-panel-caption mt-1 text-sm">
          Plain-language definitions for every metric, play style, and game term
          used across the stats. Jump to a section, or follow a highlighted term
          from any chart to land right on its definition.
        </p>
        <nav aria-label="Glossary sections" className="tm-glossary-jump-nav">
          {glossaryCategories.map((category) => (
            <a
              className="tm-glossary-jump"
              href={`#${category.id}`}
              key={category.id}
            >
              {category.title}
            </a>
          ))}
        </nav>
      </section>

      {glossaryCategories.map((category) => (
        <section className="tm-panel" id={category.id} key={category.id}>
          <h2 className="tm-panel-title text-lg font-semibold">{category.title}</h2>
          <p className="tm-panel-caption mt-1 text-sm">{category.blurb}</p>
          <dl className="mt-4 grid gap-3">
            {category.terms.map((term) => (
              <div
                className={`tm-glossary-term${
                  activeSlug === term.slug ? ' tm-glossary-term--active' : ''
                }`}
                id={term.slug}
                key={term.slug}
              >
                <dt className="tm-data-label">{term.term}</dt>
                <dd className="tm-muted-copy mt-1 text-sm">{term.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
