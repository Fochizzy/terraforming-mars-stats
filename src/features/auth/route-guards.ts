export const protectedPrefixes = [
  '/profile',
  '/group',
  '/insights',
  '/log-game',
  '/games',
  '/saved-games',
  '/compare',
  '/improvement',
  '/leaderboard',
  '/cards',
  '/glossary',
] as const;

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
