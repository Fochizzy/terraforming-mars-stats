import type { Metadata } from 'next';

export type RouteMetadataEntry = {
  pathname: string;
  title: string;
  description: string;
};

const BRAND = 'Terraforming Mars Stats';

/**
 * One centralized title/description source per canonical application
 * destination, so the browser tab title, the in-page heading callers already
 * render, and route-context tests never diverge into independent copies.
 * Public landing and authentication/recovery routes are intentionally not
 * registered here: this step preserves their current, unchanged behavior.
 */
export const routeMetadataEntries: readonly RouteMetadataEntry[] = [
  {
    pathname: '/profile',
    title: 'My Profile',
    description:
      'Your identity, recent activity, groups, and data status in TM Stats.',
  },
  {
    pathname: '/log-game',
    title: 'Log a Game',
    description: 'Enter, save as a draft, and finalize a Terraforming Mars game.',
  },
  {
    pathname: '/log-game/import',
    title: 'Log a Game',
    description:
      'Use Import Game to create a reviewable draft from an exported log and end-game screenshot.',
  },
  {
    pathname: '/games',
    title: 'Saved Games',
    description: 'Reopen drafts or review the games saved for this group.',
  },
  {
    pathname: '/saved-games',
    title: 'Saved Games',
    description: 'Reopen drafts or review the games saved for this group.',
  },
  {
    pathname: '/insights',
    title: 'Insights',
    description: 'The working legacy analytics dashboard for this group.',
  },
  {
    pathname: '/insights/global',
    title: 'Global Insights',
    description:
      'The global analytics destination has a stable route and navigation owner. Its real data panels remain with the existing Insights page until their dedicated implementation step.',
  },
  {
    pathname: '/insights/individual',
    title: 'Individual Insights',
    description:
      'The individual analytics destination has a stable route and navigation owner. Player analysis remains on the existing routes until its dedicated implementation step.',
  },
  {
    pathname: '/insights/group',
    title: 'Group Insights',
    description:
      'The group analytics destination has a stable route and navigation owner. The working legacy group dashboard remains available while its sections are moved in later steps.',
  },
  {
    pathname: '/compare',
    title: 'Compare',
    description:
      'The comparison destination has a stable route and navigation owner. Comparison controls and analytics are intentionally deferred until their approved implementation step.',
  },
  {
    pathname: '/improvement',
    title: 'Improvement',
    description:
      'The improvement destination has a stable route and navigation owner. Recommendations and supporting evidence are intentionally deferred until their approved implementation step.',
  },
  {
    pathname: '/leaderboard',
    title: 'Leaderboard',
    description:
      'The leaderboard destination has a stable route and navigation owner. Ranking methodology and live rankings remain deferred until their approved implementation step.',
  },
  {
    pathname: '/cards',
    title: 'Cards',
    description:
      'Search and browse the full Terraforming Mars card catalog by name, number, type, expansion, and tag.',
  },
  {
    pathname: '/glossary',
    title: 'Glossary',
    description: 'Definitions for current and historical TM Stats product terms.',
  },
  {
    pathname: '/group',
    title: 'Group',
    description: 'The working legacy group dashboard for this group.',
  },
  {
    pathname: '/group/players',
    title: 'Players',
    description: 'The shared player roster for this group.',
  },
  {
    pathname: '/group/settings',
    title: 'Group Settings',
    description: 'Group defaults applied to future logged games.',
  },
] as const;

function validateRouteMetadataEntries(entries: readonly RouteMetadataEntry[]) {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.pathname.startsWith('/')) {
      throw new Error(`Route metadata pathname must be absolute: ${entry.pathname}`);
    }

    if (seen.has(entry.pathname)) {
      throw new Error(`Duplicate route metadata pathname: ${entry.pathname}`);
    }

    if (!entry.title.trim()) {
      throw new Error(`Route metadata title is empty: ${entry.pathname}`);
    }

    if (!entry.description.trim()) {
      throw new Error(`Route metadata description is empty: ${entry.pathname}`);
    }

    seen.add(entry.pathname);
  }
}

export function routeMetadataFor(pathname: string): RouteMetadataEntry {
  const entry = routeMetadataEntries.find(
    (candidate) => candidate.pathname === pathname,
  );

  if (!entry) {
    throw new Error(`No route metadata registered for: ${pathname}`);
  }

  return entry;
}

export function pageMetadata(pathname: string): Metadata {
  const entry = routeMetadataFor(pathname);

  return {
    title: `${entry.title} · ${BRAND}`,
    description: entry.description,
  };
}

validateRouteMetadataEntries(routeMetadataEntries);
