const DEFAULT_NEXT_PATH = '/log-game/import';

export function normalizeNextPath(nextPath: string | null | undefined) {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return DEFAULT_NEXT_PATH;
  }

  return nextPath;
}

export function buildAuthCompletePath(nextPath: string) {
  return `/auth/complete?next=${encodeURIComponent(normalizeNextPath(nextPath))}`;
}

export function buildAuthCompleteClaimPath(nextPath: string) {
  return `/claim-player?next=${encodeURIComponent(normalizeNextPath(nextPath))}`;
}

export function buildAuthCallbackUrl(origin: string, nextPath: string) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', normalizeNextPath(nextPath));
  return url.toString();
}
