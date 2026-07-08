export function normalizeSelectedExpansionCodes(expansionCodes: string[]) {
  return [...new Set(['base', ...expansionCodes.filter(Boolean)])];
}
