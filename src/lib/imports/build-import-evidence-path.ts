function slugifyPathSegment(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return slug || 'evidence';
}

export function buildImportEvidencePath(input: {
  fileName: string;
  gameId: string;
}) {
  const uniquePrefix = crypto.randomUUID().toLowerCase();
  const safeFileName = slugifyPathSegment(input.fileName);

  return `${input.gameId}/${uniquePrefix}-${safeFileName}`;
}
