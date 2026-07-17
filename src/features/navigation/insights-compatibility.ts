export type InsightsSearchParams = Record<string, string | string[] | undefined>;

/** Converts former ignored scope links into canonical Phase 3 route links. */
export function getInsightsCompatibilityDestination(
  searchParams: InsightsSearchParams,
) {
  const scope = Array.isArray(searchParams.scope)
    ? searchParams.scope[0]
    : searchParams.scope;
  const target =
    scope === 'global'
      ? '/insights/global'
      : scope === 'individual'
        ? '/insights/individual'
        : scope === 'group'
          ? '/insights/group'
          : scope === 'compare'
            ? '/compare'
            : null;

  if (!target) {
    return null;
  }

  const preserved = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'scope' || value === undefined) {
      continue;
    }
    for (const entry of Array.isArray(value) ? value : [value]) {
      preserved.append(key, entry);
    }
  }

  const query = preserved.toString();
  return query ? `${target}?${query}` : target;
}
