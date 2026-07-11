export function normalizePlayerAlias(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * A separator-free comparison key: every non-alphanumeric character is removed
 * rather than collapsed to a space. This lets a spaced or punctuated rendering
 * of a handle ("Suzy the Gnat") match the concatenated account username it was
 * derived from ("Suzythegnat"), which the space-preserving normalizer cannot.
 */
export function compactPlayerAlias(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
