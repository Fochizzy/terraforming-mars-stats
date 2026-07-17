export const protectedPrefixes = [
  '/profile',
  '/group',
  '/insights',
  '/log-game',
  '/cards',
  '/glossary',
] as const;

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
