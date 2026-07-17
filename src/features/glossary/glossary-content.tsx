'use client';

import { useEffect, useState } from 'react';
import {
  glossaryCategories,
  glossaryDefinition,
  glossaryEntryBySlug,
  type GlossaryTerm,
} from './glossary-data';
import { glossarySlugFromHash } from './glossary-destination';
import { GlossaryRichText } from './glossary-rich-text';

function targetLabel(slug: string) {
  return (
    glossaryEntryBySlug(slug)?.term ??
    glossaryCategories.find((category) => category.id === slug)?.title ??
    null
  );
}

function statusLabel(term: GlossaryTerm) {
  return term.semanticStatus === 'established'
    ? 'Current contract'
    : term.semanticStatus === 'provisional'
      ? 'Provisional'
      : term.semanticStatus === 'unavailable'
        ? 'Unavailable'
      : 'Deferred';
}

export function GlossaryContent() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [unavailableSlug, setUnavailableSlug] = useState<string | null>(null);

  useEffect(() => {
    const timers: number[] = [];
    let frame = 0;

    function focusHashTarget() {
      const slug = glossarySlugFromHash(window.location.hash);
      if (!slug) {
        setActiveSlug(null);
        setUnavailableSlug(null);
        return;
      }

      const target = document.getElementById(slug);
      if (!target || !targetLabel(slug)) {
        setActiveSlug(null);
        setUnavailableSlug(slug);
        return;
      }

      setUnavailableSlug(null);
      setActiveSlug(slug);
      frame = window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        target.focus({ preventScroll: true });
      });
      timers.push(
        window.setTimeout(() => {
          if (glossarySlugFromHash(window.location.hash) === slug) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }, 250),
      );
    }

    focusHashTarget();
    window.addEventListener('hashchange', focusHashTarget);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', focusHashTarget);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      return;
    }
    const timer = window.setTimeout(() => setActiveSlug(null), 2400);
    return () => window.clearTimeout(timer);
  }, [activeSlug]);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
        <h2 className="font-serif text-lg font-semibold">Glossary</h2>
        <p className="mt-1 text-sm text-stone-300">
          Plain-language definitions for current and historical TM Stats terms.
          Each entry identifies whether its underlying product contract is current,
          provisional, unavailable, or deferred.
        </p>
        {unavailableSlug ? (
          <p aria-live="polite" className="mt-3 rounded-lg border border-amber-400/50 bg-amber-300/10 p-3 text-sm text-amber-100" role="status">
            The Glossary entry &ldquo;{unavailableSlug}&rdquo; is unavailable.
          </p>
        ) : null}
        {activeSlug && targetLabel(activeSlug) ? (
          <p aria-live="polite" className="sr-only" role="status">
            Showing Glossary entry {targetLabel(activeSlug)}.
          </p>
        ) : null}
        <nav aria-label="Glossary sections" className="mt-4 flex flex-wrap gap-2">
          {glossaryCategories.map((category) => (
            <a
              className="rounded-full border border-stone-700 bg-stone-950/40 px-3 py-1 text-xs text-stone-200 underline decoration-stone-500 underline-offset-2 hover:border-cyan-400 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              href={`#${category.id}`}
              key={category.id}
            >
              {category.title}
            </a>
          ))}
        </nav>
      </section>

      {glossaryCategories.map((category) => (
        <section
          className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4"
          id={category.id}
          key={category.id}
          tabIndex={-1}
        >
          <h2 className="font-serif text-xl font-semibold text-stone-100">
            {category.title}
          </h2>
          <p className="mt-1 text-sm text-stone-300">{category.blurb}</p>
          <dl className="mt-4 grid gap-3">
            {category.terms.map((term) => (
              <div
                aria-labelledby={`glossary-term-${term.slug}`}
                className={
                  activeSlug === term.slug
                    ? 'rounded-xl border-2 border-cyan-300 bg-cyan-300/10 p-4 shadow-[0_0_0_2px_rgba(34,211,238,0.25)]'
                    : 'rounded-xl border border-stone-700 bg-stone-950/60 p-4'
                }
                data-glossary-target={activeSlug === term.slug ? 'true' : undefined}
                id={term.slug}
                key={term.slug}
                tabIndex={-1}
              >
                <dt
                  className="flex flex-wrap items-center gap-2 font-semibold text-stone-100"
                  id={`glossary-term-${term.slug}`}
                >
                  {term.term}
                  <span className="rounded-full border border-stone-600 px-2 py-0.5 text-xs font-medium text-stone-300">
                    {statusLabel(term)}
                  </span>
                </dt>
                <dd className="mt-2 text-sm leading-6 text-stone-300">
                  <GlossaryRichText contextEntrySlug={term.slug}>
                    {glossaryDefinition(term)}
                  </GlossaryRichText>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
