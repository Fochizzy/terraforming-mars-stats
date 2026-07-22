/**
 * Attribution for the import player-name matcher.
 *
 * `match_import_player_names` is a security-definer RPC: it reads
 * `players.full_name`, `players.username` and the saved import aliases, none of
 * which the Data API exposes, and answers whether a supplied name belongs to a
 * real identity. Until now a successful call left no application-level trace —
 * only failures were written to the console — so a caller probing the matcher
 * was indistinguishable from silence. That is backwards: a probe succeeds.
 *
 * Every invocation is recorded here, success and failure alike.
 *
 * PRIVACY CONTRACT — this record carries counts and opaque ids only.
 * The candidate names, the matched public labels, and every private identity
 * value (full name, username, alias text) are deliberately absent. Logging them
 * would turn the log stream into a second disclosure surface for exactly the
 * data the matcher RPC exists to keep out of client payloads. Anything added to
 * `ImportMatcherAuditRecord` must satisfy the same rule.
 */

export const IMPORT_MATCHER_AUDIT_EVENT = 'import.player_name_match';

/** Which caller asked. Every call site names itself so probes are locatable. */
export type ImportMatcherSource =
  | 'import_analyze'
  | 'log_game_player_resolution'
  | 'roster_display_name_fallback'
  | 'unspecified';

export type ImportMatcherOutcome =
  /** The RPC ran and answered. */
  | 'matched'
  /** The request never reached the RPC — it exceeded the candidate bounds. */
  | 'rejected'
  /** The RPC was attempted and errored. */
  | 'failed';

export type ImportMatcherAuditRecord = {
  candidateNameCount: number;
  /** A PostgREST code or an `Error.name`. Never an error message: those can
   * quote the offending argument, which would leak a candidate name. */
  errorCode: string | null;
  event: typeof IMPORT_MATCHER_AUDIT_EVENT;
  groupId: string;
  matchCount: number;
  outcome: ImportMatcherOutcome;
  source: ImportMatcherSource;
  /** Null only when the session could not be resolved; the invocation is still
   * recorded rather than dropped. */
  userId: string | null;
};

/**
 * Reduce a failure to a code. Messages are excluded on purpose — a PostgREST
 * error can quote the argument that caused it, and that argument is a candidate
 * name.
 */
export function describeMatcherFailureCode(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;

    if (typeof code === 'string' && code.trim()) {
      return code.trim();
    }
  }

  if (error instanceof Error && error.name) {
    return error.name;
  }

  return null;
}

export function logImportMatcherInvocation(
  record: Omit<ImportMatcherAuditRecord, 'event'>,
) {
  const auditRecord: ImportMatcherAuditRecord = {
    ...record,
    event: IMPORT_MATCHER_AUDIT_EVENT,
  };

  // A single serialized line so Cloudflare Workers observability can index it
  // and so a reviewer can see at a glance that no free text rides along.
  console.info(JSON.stringify(auditRecord));

  return auditRecord;
}
