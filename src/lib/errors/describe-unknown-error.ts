import { ZodError } from 'zod';

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

function humanizeFieldName(segment: string) {
  const spaced = segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();

  return spaced.length > 0 ? spaced : segment;
}

function describeZodIssue(issue: ZodError['issues'][number]) {
  const fieldSegment = [...issue.path]
    .reverse()
    .find((segment): segment is string => typeof segment === 'string');
  const field = fieldSegment ? humanizeFieldName(fieldSegment) : 'value';

  if (issue.code === 'too_small' && 'minimum' in issue) {
    return `${field} must be at least ${issue.minimum}`;
  }

  if (issue.code === 'too_big' && 'maximum' in issue) {
    return `${field} must be at most ${issue.maximum}`;
  }

  return `${field}: ${issue.message}`;
}

function describeZodError(error: ZodError, fallbackMessage: string) {
  const descriptions = [
    ...new Set(error.issues.map((issue) => describeZodIssue(issue))),
  ];

  if (descriptions.length === 0) {
    return fallbackMessage;
  }

  const shown = descriptions.slice(0, 3).join('; ');
  const remainder = descriptions.length - 3;

  return `Check these values: ${shown}${remainder > 0 ? `; and ${remainder} more` : ''}.`;
}

export function describeUnknownError(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof ZodError) {
    return describeZodError(error, fallbackMessage);
  }

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
