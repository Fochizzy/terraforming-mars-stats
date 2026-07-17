import { describe, expect, it } from 'vitest';
import { canonicalRoutePaths } from './app-navigation';
import { pageMetadata, routeMetadataEntries, routeMetadataFor } from './route-metadata';

describe('route metadata', () => {
  it('declares a unique title and description for every registered pathname', () => {
    const pathnames = routeMetadataEntries.map((entry) => entry.pathname);
    expect(new Set(pathnames).size).toBe(pathnames.length);

    for (const entry of routeMetadataEntries) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('registers every canonical destination that owns a real page implementation', () => {
    const registeredPathnames = new Set(
      routeMetadataEntries.map((entry) => entry.pathname),
    );
    const shellAndAppPaths = canonicalRoutePaths.filter(
      (path) =>
        ![
          '/',
          '/login',
          '/forgot-pin',
          '/auth/reset-pin',
        ].includes(path),
    );

    for (const path of shellAndAppPaths) {
      expect(registeredPathnames.has(path)).toBe(true);
    }
  });

  it('produces a page-title and description mapping distinct per route', () => {
    const profile = pageMetadata('/profile');
    const compare = pageMetadata('/compare');

    expect(profile.title).toContain('My Profile');
    expect(compare.title).toContain('Compare');
    expect(profile.title).not.toBe(compare.title);
    expect(profile.description).not.toBe(compare.description);
  });

  it('throws for an unregistered pathname instead of silently falling back', () => {
    expect(() => routeMetadataFor('/not-a-real-route')).toThrow(/No route metadata/);
  });
});
