# Terraforming Mars Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public homepage to match the approved Terraforming Mars mockup using `assets/banner.png`, a real in-page tab strip, and lightweight anchored preview sections while keeping the `/login` CTA intact.

**Architecture:** Keep the redesign isolated to the public landing page by updating `src/app/page.tsx`, extending `src/app/globals.css` with landing-page-only classes, and expanding `src/app/page.test.tsx` to lock the hero, anchor navigation, and section structure. Use a small in-file data model for nav items and preview sections instead of importing signed-in app components.

**Tech Stack:** Next.js App Router, React 19, Tailwind utilities, global CSS, Vitest, Testing Library

---

## File Structure

### Modify

1. `src/app/page.tsx`
   Purpose: render the hero module, attached anchor navigation strip, CTA, and the anchored preview sections using `assets/banner.png`.
2. `src/app/page.test.tsx`
   Purpose: verify the hero CTA, tab strip labels, section anchors, and section headings.
3. `src/app/globals.css`
   Purpose: define the landing-page-specific hero, nav strip, preview section, and CTA styling.

### Reuse

1. `assets/banner.png`
   Purpose: provide the approved hero artwork.

---

### Task 1: Lock the landing-page structure with a failing test

**Files:**
- Modify: `src/app/page.test.tsx`
- Exercise: `src/app/page.tsx`

- [ ] **Step 1: Write the failing test**

Replace the current single-assertion test with coverage for the approved homepage structure:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

const sectionNames = [
  'Overview',
  'Corporations',
  'Cards',
  'Projects',
  'Milestones',
  'Stats',
  'Tools',
] as const;

describe('HomePage', () => {
  it('renders the hero CTA and homepage anchor navigation', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', {
      name: /terraforming mars stats/i,
    });
    const signInLink = screen.getByRole('link', {
      name: /sign in to your group/i,
    });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('sr-only');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/login');

    for (const sectionName of sectionNames) {
      const anchor = screen.getByRole('link', { name: sectionName });
      const sectionHeading = screen.getByRole('heading', {
        name: sectionName,
      });

      expect(anchor).toHaveAttribute(
        'href',
        `#${sectionName.toLowerCase()}`,
      );
      expect(sectionHeading).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm.cmd test -- src/app/page.test.tsx
```

Expected: `FAIL` because the current homepage does not render the seven anchor links or the matching section headings.

- [ ] **Step 3: Commit the red test**

```bash
git add src/app/page.test.tsx
git commit -m "test: cover homepage anchor navigation"
```

---

### Task 2: Implement the hero layout and anchored sections

**Files:**
- Modify: `src/app/page.tsx`
- Exercise: `src/app/page.test.tsx`
- Reuse: `assets/banner.png`

- [ ] **Step 1: Write the minimal homepage composition**

Update `src/app/page.tsx` to import the approved asset, define the landing-page sections in one place, and render the hero plus section anchors:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import bannerImage from '../../assets/banner.png';

const homepageSections = [
  {
    id: 'overview',
    title: 'Overview',
    description:
      "Track finished games, expansion mixes, maps, winners, and your group's shifting meta in one place.",
    highlights: ['Finished games', 'Player rosters', 'Meta snapshots'],
  },
  {
    id: 'corporations',
    title: 'Corporations',
    description:
      'Compare corporation results, favorite picks, and the matchups that keep showing up at your table.',
    highlights: ['Win rates', 'Favorite picks', 'Table trends'],
  },
  {
    id: 'cards',
    title: 'Cards',
    description:
      'Explore imported card evidence, pattern-heavy plays, and the engines that keep deciding close games.',
    highlights: ['Imported evidence', 'Key cards', 'Engine patterns'],
  },
  {
    id: 'projects',
    title: 'Projects',
    description:
      'Jump from clean game logging into saved drafts, reopened results, and shared group workflows.',
    highlights: ['Draft saves', 'Result edits', 'Group logging'],
  },
  {
    id: 'milestones',
    title: 'Milestones',
    description:
      'See who closes maps best with milestone timing, award pressure, and map-aware scoring swings.',
    highlights: ['Map-aware awards', 'Milestone timing', 'Scoring swings'],
  },
  {
    id: 'stats',
    title: 'Stats',
    description:
      'Read score trends, leaderboard movement, and long-term group patterns without leaving the theme.',
    highlights: ['Trend lines', 'Leaderboards', 'Group patterns'],
  },
  {
    id: 'tools',
    title: 'Tools',
    description:
      'Use imports, roster tools, and admin helpers that make the app practical for a recurring play group.',
    highlights: ['Imports', 'Roster tools', 'Group settings'],
  },
];

export default function HomePage() {
  return (
    <main className="tm-app-shell tm-landing-page">
      <section className="tm-landing-hero-shell">
        <h1 className="sr-only">Terraforming Mars Stats</h1>
        <div className="tm-landing-hero-module">
          <div className="tm-landing-banner-frame">
            <Image
              alt="Terraforming Mars Statistics"
              className="tm-landing-banner-image"
              priority
              src={bannerImage}
            />
          </div>
          <nav
            aria-label="Homepage sections"
            className="tm-landing-tab-strip"
          >
            {homepageSections.map((section) => (
              <a
                key={section.id}
                className="tm-landing-tab-link"
                href={`#${section.id}`}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
        <p className="tm-body-copy tm-landing-hero-copy">
          Log finished games, compare corporations and preludes, and see how
          your group&apos;s meta changes over time.
        </p>
        <Link
          className="tm-button-primary tm-landing-hero-cta"
          href="/login"
        >
          Sign in to your group
        </Link>
      </section>

      <section className="tm-landing-section-list">
        {homepageSections.map((section) => (
          <section
            id={section.id}
            key={section.id}
            className="tm-panel tm-landing-section-card"
          >
            <p className="tm-display-eyebrow">Mission Control</p>
            <h2 className="tm-display-title tm-landing-section-title">
              {section.title}
            </h2>
            <p className="tm-body-copy tm-landing-section-copy">
              {section.description}
            </p>
            <div className="tm-landing-highlight-row">
              {section.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="tm-landing-highlight-chip"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Run the landing-page test**

Run:

```bash
npm.cmd test -- src/app/page.test.tsx
```

Expected: the test still fails because the new layout has not yet received the mockup-specific styling and spacing hooks in `globals.css`, or because any ids/hrefs/titles still need alignment.

- [ ] **Step 3: Adjust the page markup only if the failure points to mismatched labels or ids**

Keep changes minimal. The goal is for the rendered links and headings to match the test exactly:

```tsx
href={`#${section.id}`}
id={section.id}
title={section.title}
```

- [ ] **Step 4: Commit the structural implementation**

```bash
git add src/app/page.tsx
git commit -m "feat: add homepage hero structure"
```

---

### Task 3: Add the landing-page styling and verify green

**Files:**
- Modify: `src/app/globals.css`
- Verify: `src/app/page.tsx`
- Verify: `src/app/page.test.tsx`

- [ ] **Step 1: Add landing-page-specific styles**

Append landing-page classes that shape the mockup-like shell, attached tab strip, large CTA, and preview cards:

```css
html {
  scroll-behavior: smooth;
}

@layer components {
  .tm-landing-page {
    @apply px-4 py-10 sm:px-6 lg:px-8;
  }

  .tm-landing-hero-shell {
    @apply mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-6 pb-16 pt-6;
  }

  .tm-landing-hero-module {
    @apply overflow-hidden rounded-[2rem];
    background: rgba(7, 10, 15, 0.82);
    box-shadow:
      0 30px 70px rgba(3, 4, 8, 0.55),
      inset 0 1px 0 rgba(255, 231, 200, 0.08);
    border: 1px solid rgba(214, 130, 66, 0.18);
  }

  .tm-landing-banner-frame {
    @apply overflow-hidden;
    background: #050608;
  }

  .tm-landing-banner-image {
    @apply block h-auto w-full;
  }

  .tm-landing-tab-strip {
    @apply flex items-center gap-0 overflow-x-auto px-4 py-4 sm:px-6;
    background: linear-gradient(180deg, rgba(25, 15, 10, 0.96), rgba(14, 11, 10, 0.98));
    border-top: 1px solid rgba(214, 130, 66, 0.2);
    scrollbar-width: none;
  }

  .tm-landing-tab-strip::-webkit-scrollbar {
    display: none;
  }

  .tm-landing-tab-link {
    @apply shrink-0 border-r px-4 py-1 text-[0.68rem] sm:px-5;
    border-color: rgba(214, 130, 66, 0.24);
    color: #d7c2a7;
    font-family: var(--tm-font-display);
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .tm-landing-tab-link:last-child {
    border-right: none;
  }

  .tm-landing-tab-link:hover,
  .tm-landing-tab-link:focus-visible {
    color: #f6e4ca;
    outline: none;
  }

  .tm-landing-hero-copy {
    @apply max-w-4xl text-lg;
    color: #f0dec8;
  }

  .tm-landing-hero-cta {
    @apply w-full px-8 py-5 text-base sm:text-lg;
    border-radius: 999px;
  }

  .tm-landing-section-list {
    @apply mx-auto flex max-w-6xl flex-col gap-5 pb-20;
  }

  .tm-landing-section-card {
    @apply scroll-mt-28 px-5 py-5 sm:px-6;
  }

  .tm-landing-section-title {
    @apply mt-2 text-2xl sm:text-3xl;
  }

  .tm-landing-section-copy {
    @apply mt-3 max-w-3xl text-base;
  }

  .tm-landing-highlight-row {
    @apply mt-5 flex flex-wrap gap-3;
  }

  .tm-landing-highlight-chip {
    @apply inline-flex rounded-full border px-4 py-2 text-xs;
    background: rgba(240, 106, 50, 0.12);
    border-color: rgba(221, 161, 93, 0.28);
    color: #f2dbc0;
    font-family: var(--tm-font-display);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}
```

- [ ] **Step 2: Run the landing-page test and confirm green**

Run:

```bash
npm.cmd test -- src/app/page.test.tsx
```

Expected: `PASS` with the homepage hero CTA, anchor strip, and section headings all present.

- [ ] **Step 3: Run one broader homepage-focused test pass**

Run:

```bash
npm.cmd test -- src/app/page.test.tsx src/app/(auth)/login/page.test.tsx
```

Expected: both landing and login tests pass, confirming the CTA target and public entry flow remain intact.

- [ ] **Step 4: Commit the styling and green verification state**

```bash
git add src/app/globals.css src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: redesign homepage landing experience"
```

---

## Self-Review

### Spec Coverage

The plan covers:

1. `assets/banner.png` hero usage in Task 2
2. real homepage anchor navigation in Tasks 1 and 2
3. lightweight anchored preview sections in Task 2
4. mockup-style layout and CTA styling in Task 3
5. narrow file scope in the File Structure section
6. verification of hero, anchors, and CTA behavior in Tasks 1 and 3

### Placeholder Scan

The plan avoids `TODO`, `TBD`, and vague “add tests later” instructions. Each task includes file paths, commands, and concrete code.

### Type and Naming Consistency

The plan uses the same section ids, titles, and href format across the test, page markup, and CSS assumptions:

1. ids are lowercase section names
2. titles remain title case
3. anchor hrefs use `#${section.id}`

---

Plan complete and saved to `docs/superpowers/plans/2026-07-08-terraforming-mars-homepage-redesign-implementation.md`. Proceeding with inline execution in this session because the user explicitly asked to implement immediately.
