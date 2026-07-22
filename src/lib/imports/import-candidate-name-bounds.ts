/**
 * How many players a Terraforming Mars game can have in this product.
 *
 * This is not a UI convention. It is enforced twice, independently, and a draft
 * that exceeds it cannot be finalized:
 *
 * - `public.games.player_count integer not null check (player_count between 1
 *   and 5)` — supabase/migrations/20260703120000_create_core_tables.sql
 * - `logGameDraftSchema.playerCount: z.number().min(1).max(5)` —
 *   src/lib/validation/log-game.ts, and `buildImportDraft` derives
 *   `playerCount` from `selectedPlayerIds.length`, so a sixth participant fails
 *   validation before it reaches the database.
 *
 * Bounding the import matcher's candidate input to this number therefore
 * rejects nothing a legitimate import could have saved.
 */
export const MAX_IMPORT_PLAYERS = 5;

/**
 * The backstop on the array that actually reaches the security-definer name
 * matcher.
 *
 * It is deliberately looser than `MAX_IMPORT_PLAYERS`, because one player can
 * legitimately be named twice by the evidence: the end-game score table carries
 * the in-game name ("Izzy") while the score-details resolver echoes back the
 * participants-field spelling for the same person ("Izzy Hodnett"). Both
 * spellings land in the review model, so the matcher can legitimately be asked
 * about two names per player. Each contributing source is still bounded at
 * `MAX_IMPORT_PLAYERS` individually.
 */
export const MAX_IMPORT_CANDIDATE_NAMES = MAX_IMPORT_PLAYERS * 2;

/**
 * Mirrors `MAX_MATCH_CANDIDATE_LENGTH`, the bound the coarse matcher RPC
 * enforces on each element of `p_imported_names`.
 */
export const MAX_IMPORT_CANDIDATE_NAME_LENGTH = 128;

export type ImportCandidateNameChannel =
  | 'game_log'
  | 'matcher'
  | 'participants'
  | 'screenshot_score_details'
  | 'screenshot_score_table';

type ChannelBound = {
  /** The most distinct names this channel may carry. */
  limit: number;
  /** Completes "<subject> …" in a message the importer can act on. */
  subject: string;
};

const CHANNEL_BOUNDS: Record<ImportCandidateNameChannel, ChannelBound> = {
  game_log: {
    limit: MAX_IMPORT_PLAYERS,
    subject: 'The exported game log',
  },
  matcher: {
    limit: MAX_IMPORT_CANDIDATE_NAMES,
    subject: 'This import',
  },
  participants: {
    limit: MAX_IMPORT_PLAYERS,
    subject: 'The participants field',
  },
  screenshot_score_details: {
    limit: MAX_IMPORT_PLAYERS,
    subject: 'The uploaded score details',
  },
  screenshot_score_table: {
    limit: MAX_IMPORT_PLAYERS,
    subject: 'The uploaded game result',
  },
};

/**
 * The distinct names a channel is really asking about, counted exactly the way
 * the matcher wrapper counts them: trimmed, blanks dropped, duplicates
 * collapsed. A name repeated by two evidence lines is one question, not two.
 */
export function collectDistinctCandidateNames(names: readonly string[]) {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

/**
 * Reject a candidate-name list that no real game could have produced.
 *
 * Every list here is browser-supplied — the participants textarea, the pasted
 * game log, and the client-posted OCR payload are all caller-controlled — and
 * each name the matcher answers confirms whether a supplied private name
 * belongs to a real identity. Bounding the list to what a game can contain is
 * what keeps that from being a bulk enumeration channel.
 *
 * This throws rather than truncating on purpose. Silently dropping the tail
 * would hide a genuine evidence problem from a legitimate importer, who would
 * then see a game saved with the wrong players instead of an error they can fix.
 */
export function assertImportCandidateNamesWithinBounds(
  names: readonly string[],
  channel: ImportCandidateNameChannel,
) {
  const { limit, subject } = CHANNEL_BOUNDS[channel];
  const distinctNames = collectDistinctCandidateNames(names);

  if (distinctNames.length > limit) {
    throw new Error(
      `${subject} names ${distinctNames.length} players, but a Terraforming Mars game has at most ${MAX_IMPORT_PLAYERS}. Check that this evidence belongs to a single game before continuing.`,
    );
  }

  const overlongName = distinctNames.find(
    (name) => name.length > MAX_IMPORT_CANDIDATE_NAME_LENGTH,
  );

  if (overlongName) {
    throw new Error(
      `${subject} contains a player name longer than ${MAX_IMPORT_CANDIDATE_NAME_LENGTH} characters. Shorten or remove it before continuing.`,
    );
  }

  return distinctNames;
}
