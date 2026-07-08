export function isUnauthenticatedAuthError(error: unknown): boolean {
  const namedError =
    error && typeof error === 'object' && 'name' in error
      ? (error as { name?: unknown })
      : null;

  if (namedError === null) {
    return false;
  }

  return (
    namedError.name === 'AuthSessionMissingError' ||
    namedError.name === 'AuthApiError'
  );
}
