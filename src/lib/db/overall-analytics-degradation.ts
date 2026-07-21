/**
 * Overall scope fans a single page render out across every analytics view, for
 * every group the signed-in user has played in. Collecting those with a plain
 * `Promise.all` makes the whole scope only as available as its slowest view: one
 * rejection discards the other twenty results and the dashboard falls back to
 * "no evidence" everywhere, including sections whose own data loaded fine.
 *
 * A rejected view degrades to no rows for that section alone. The log line names
 * the view so an empty section stays attributable to a failure rather than being
 * mistaken for a genuine empty state — downstream the two are indistinguishable.
 */
export async function loadOverallViewOrEmpty<TRow>(
  view: string,
  rows: Promise<TRow[]>,
): Promise<TRow[]> {
  try {
    return await rows;
  } catch (error) {
    console.error(
      `[analytics] Overall scope dropped "${view}"; substituting no rows`,
      error,
    );
    return [];
  }
}
