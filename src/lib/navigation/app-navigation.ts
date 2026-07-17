export type NavigationVisibility = 'public' | 'authenticated';
export type NavigationMatch = 'exact' | 'prefix';
/**
 * One website navigation architecture at every viewport width. `primary`
 * destinations render in the same ordered list from 390px through desktop
 * widths (the row scrolls horizontally at narrow widths). `utility`
 * destinations render as a visible bar at desktop widths and collapse into a
 * single semantic overflow menu at narrow widths. Neither surface is a
 * separate mobile destination set.
 */
export type NavigationSurface = 'primary' | 'utility';

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  visibility: NavigationVisibility;
  requiresGroup?: boolean;
  match: NavigationMatch;
  surfaces: readonly NavigationSurface[];
  activePaths?: readonly string[];
  prominent?: boolean;
};

export type NavigationContext = {
  authenticated: boolean;
  hasActiveGroup: boolean;
};

const navigationSurfaces: readonly NavigationSurface[] = ['primary', 'utility'];

/**
 * The Phase 3 route contract. Entries without a feature implementation are
 * explicit route shells, never implied future links.
 */
export const canonicalRoutePaths = [
  '/',
  '/login',
  '/forgot-pin',
  '/auth/reset-pin',
  '/profile',
  '/log-game',
  '/log-game/import',
  '/games',
  '/insights',
  '/insights/global',
  '/insights/individual',
  '/insights/group',
  '/compare',
  '/improvement',
  '/leaderboard',
  '/cards',
  '/glossary',
  '/group',
  '/group/players',
  '/group/settings',
] as const;

export const appNavigationItems: readonly NavigationItem[] = [
  {
    id: 'log-game',
    label: 'Log a Game',
    href: '/log-game',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
    prominent: true,
  },
  {
    id: 'profile',
    label: 'My Profile',
    href: '/profile',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
  },
  {
    id: 'global-insights',
    label: 'Global Insights',
    href: '/insights/global',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
    activePaths: ['/insights/global', '/insights'],
  },
  {
    id: 'individual-insights',
    label: 'Individual Insights',
    href: '/insights/individual',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
  },
  {
    id: 'group-insights',
    label: 'Group Insights',
    href: '/insights/group',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
    activePaths: ['/insights/group', '/group'],
  },
  {
    id: 'compare',
    label: 'Compare',
    href: '/compare',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
  },
  {
    id: 'improvement',
    label: 'Improvement',
    href: '/improvement',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    href: '/leaderboard',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['primary'],
  },
  {
    id: 'games',
    label: 'Games',
    href: '/games',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['utility'],
    activePaths: ['/games', '/saved-games'],
  },
  {
    id: 'cards',
    label: 'Cards',
    href: '/cards',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'prefix',
    surfaces: ['utility'],
  },
  {
    id: 'glossary',
    label: 'Glossary',
    href: '/glossary',
    visibility: 'authenticated',
    match: 'exact',
    surfaces: ['utility'],
  },
  {
    id: 'group-settings',
    label: 'Group Settings',
    href: '/group/settings',
    visibility: 'authenticated',
    requiresGroup: true,
    match: 'exact',
    surfaces: ['utility'],
  },
] as const;

function normalizePathname(pathname: string) {
  const normalized = pathname.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') ?? '';
  return normalized || '/';
}

function activePathsFor(item: NavigationItem) {
  return item.activePaths ?? [item.href];
}

function matchSpecificity(item: NavigationItem, pathname: string) {
  if (item.match !== 'exact' && item.match !== 'prefix') {
    return -1;
  }

  const normalizedPathname = normalizePathname(pathname);
  return activePathsFor(item).reduce((specificity, activePath) => {
    const normalizedActivePath = normalizePathname(activePath);
    const matches =
      item.match === 'exact'
        ? normalizedPathname === normalizedActivePath
        : normalizedPathname === normalizedActivePath ||
          normalizedPathname.startsWith(`${normalizedActivePath}/`);

    return matches ? Math.max(specificity, normalizedActivePath.length) : specificity;
  }, -1);
}

export function validateNavigationItems(items: readonly NavigationItem[]) {
  const ids = new Set<string>();
  const canonicalPaths = new Set<string>();

  for (const item of items) {
    if (!item.id || ids.has(item.id)) {
      throw new Error(`Navigation item IDs must be unique: ${item.id || '(empty)'}`);
    }

    if (!item.href.startsWith('/')) {
      throw new Error(`Navigation href must be an absolute application path: ${item.href}`);
    }

    if (canonicalPaths.has(item.href)) {
      throw new Error(`Navigation canonical paths must be unique: ${item.href}`);
    }

    if (!canonicalRoutePaths.includes(item.href as (typeof canonicalRoutePaths)[number])) {
      throw new Error(`Navigation href has no declared canonical route: ${item.href}`);
    }

    if (item.match !== 'exact' && item.match !== 'prefix') {
      throw new Error(`Navigation match mode is invalid: ${String(item.match)}`);
    }

    if (item.surfaces.length === 0 || item.surfaces.some((surface) => !navigationSurfaces.includes(surface))) {
      throw new Error(`Navigation surfaces are invalid: ${item.id}`);
    }

    ids.add(item.id);
    canonicalPaths.add(item.href);
  }
}

export function navigationItemsFor(
  surface: NavigationSurface,
  context: NavigationContext,
) {
  return appNavigationItems.filter(
    (item) =>
      item.surfaces.includes(surface) &&
      (item.visibility === 'public' || context.authenticated) &&
      (!item.requiresGroup || context.hasActiveGroup),
  );
}

export function activeNavigationId(
  pathname: string,
  items: readonly NavigationItem[] = appNavigationItems,
) {
  return items.reduce<{ id: string; specificity: number; order: number } | null>(
    (best, item, order) => {
      const specificity = matchSpecificity(item, pathname);

      if (specificity < 0) {
        return best;
      }

      if (!best || specificity > best.specificity) {
        return { id: item.id, specificity, order };
      }

      return best;
    },
    null,
  )?.id;
}

validateNavigationItems(appNavigationItems);
