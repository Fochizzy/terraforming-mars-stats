function readStringField(
  error: Record<string, unknown>,
  key: string,
): string | null {
  const value = error[key];

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function describeUnknownError(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== 'object') {
    return fallbackMessage;
  }

  const normalizedError = error as Record<string, unknown>;
  const message = readStringField(normalizedError, 'message');
  const details = readStringField(normalizedError, 'details');
  const hint = readStringField(normalizedError, 'hint');
  const code = readStringField(normalizedError, 'code');

  if (!message && !details && !hint && !code) {
    return fallbackMessage;
  }

  return [
    message,
    details && details !== message ? details : null,
    hint ? `Hint: ${hint}` : null,
    code ? `Code: ${code}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

export function serializeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (!error || typeof error !== 'object') {
    return error;
  }

  const normalizedError = error as Record<string, unknown>;

  return {
    code: normalizedError.code ?? null,
    details: normalizedError.details ?? null,
    error_description: normalizedError.error_description ?? null,
    hint: normalizedError.hint ?? null,
    message: normalizedError.message ?? null,
    name: normalizedError.name ?? null,
  };
}
