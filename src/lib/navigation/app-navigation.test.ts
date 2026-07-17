import { describe, expect, it } from 'vitest';
import {
  activeNavigationId,
  appNavigationItems,
  canonicalRoutePaths,
  navigationItemsFor,
  validateNavigationItems,
  type NavigationItem,
} from './app-navigation';

describe('Phase 3 navigation contract', () => {
  it('declares unique canonical routes and navigation IDs in deterministic order', () => {
    expect(new Set(canonicalRoutePaths).size).toBe(canonicalRoutePaths.length);
    expect(appNavigationItems.map((item) => item.id)).toEqual([
      'log-game',
      'profile',
      'global-insights',
      'individual-insights',
      'group-insights',
      'compare',
      'improvement',
      'leaderboard',
      'games',
      'cards',
      'glossary',
      'group-settings',
    ]);
    expect(() => validateNavigationItems(appNavigationItems)).not.toThrow();
  });

  it('rejects duplicate IDs, duplicate paths, and invalid matching modes', () => {
    const duplicateId = [
      appNavigationItems[0],
      { ...appNavigationItems[0], href: '/profile' },
    ] as const;
    const duplicatePath = [
      appNavigationItems[0],
      { ...appNavigationItems[1], id: 'profile-copy', href: '/log-game' },
    ] as const;
    const invalidMatch = [
      { ...appNavigationItems[0], match: 'contains' },
    ] as unknown as readonly NavigationItem[];

    expect(() => validateNavigationItems(duplicateId)).toThrow(/IDs must be unique/);
    expect(() => validateNavigationItems(duplicatePath)).toThrow(/paths must be unique/);
    expect(() => validateNavigationItems(invalidMatch)).toThrow(/match mode is invalid/);
  });

  it('keeps exact, nested, query, and fragment active matching deterministic', () => {
    expect(activeNavigationId('/cards?tag=space')).toBe('cards');
    expect(activeNavigationId('/glossary#observed-zero')).toBe('glossary');
    expect(activeNavigationId('/profile/preferences')).toBe('profile');
    expect(activeNavigationId('/insights/individual?player=player-1')).toBe(
      'individual-insights',
    );
    expect(activeNavigationId('/insights/group')).toBe('group-insights');
    expect(activeNavigationId('/insights/global')).toBe('global-insights');
    expect(activeNavigationId('/group')).toBe('group-insights');
    expect(activeNavigationId('/profiles')).toBeUndefined();
  });

  it('filters group-required destinations before client navigation is rendered', () => {
    expect(
      navigationItemsFor('primary', {
        authenticated: false,
        hasActiveGroup: false,
      }),
    ).toEqual([]);
    expect(
      navigationItemsFor('utility', {
        authenticated: true,
        hasActiveGroup: false,
      }).map((item) => item.id),
    ).toEqual(['glossary']);
    expect(
      navigationItemsFor('primary', {
        authenticated: true,
        hasActiveGroup: true,
      }).map((item) => item.id),
    ).toHaveLength(8);
  });

  it('has only one primary destination set — no separate mobile surface exists to diverge from it', () => {
    const context = { authenticated: true, hasActiveGroup: true };
    expect(
      navigationItemsFor('primary', context).map((item) => item.id),
    ).toEqual([
      'log-game',
      'profile',
      'global-insights',
      'individual-insights',
      'group-insights',
      'compare',
      'improvement',
      'leaderboard',
    ]);
  });
});
