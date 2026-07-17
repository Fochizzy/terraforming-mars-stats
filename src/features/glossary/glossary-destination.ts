export const GLOSSARY_ROUTE = '/glossary';

export function glossaryDestination(slug?: string) {
  return slug
    ? `${GLOSSARY_ROUTE}#${encodeURIComponent(slug)}`
    : GLOSSARY_ROUTE;
}

export function glossarySlugFromHash(hash: string): string | null {
  const value = hash.replace(/^#/, '');
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
