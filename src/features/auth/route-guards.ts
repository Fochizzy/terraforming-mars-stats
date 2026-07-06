export const protectedPrefixes = [
  '/claim-player',
  '/profile',
  '/group',
  '/insights',
  '/log-game',
] as const;

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
