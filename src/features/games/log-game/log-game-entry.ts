export const LOG_GAME_ENTRY_METHODS = [
  {
    description: 'Enter setup, players, scoring, and game details in the shared form.',
    href: '/log-game',
    id: 'manual',
    label: 'Manual Entry',
  },
  {
    description: 'Upload the game result PDF or end-game screenshot plus the complete exported log, then verify the parsed draft.',
    href: '/log-game/import',
    id: 'import',
    label: 'Import Game',
  },
] as const;

export type LogGameEntryMethod = (typeof LOG_GAME_ENTRY_METHODS)[number]['id'];

export const LOG_GAME_WORKFLOW_STEP_LABELS = {
  setup: 'Setup',
  players: 'Players & Corporations',
  milestones: 'Milestones & Awards',
  scores: 'Final Scores',
  details: 'Styles, Cards & Details',
  review: 'Review',
} as const;

/**
 * Canonical names for the existing route, server-action, and form states.
 * This is a vocabulary shared by UI and documentation, not a second state
 * machine layered over React Hook Form or the server repositories.
 */
export const LOG_GAME_WORKFLOW_STATE_KINDS = [
  'choosing_entry_method',
  'creating_manual_draft',
  'loading_draft',
  'editing_manual_draft',
  'importing',
  'reviewing_imported_data',
  'validating',
  'saving',
  'saved',
  'save_failed',
  'ready_to_finalize',
  'finalizing',
  'finalized',
  'finalization_failed',
  'inaccessible',
  'unavailable',
  'not_found',
] as const;

export type LogGameWorkflowStateKind =
  (typeof LOG_GAME_WORKFLOW_STATE_KINDS)[number];

export const LOG_GAME_WORKFLOW_STATE_LABELS: Record<
  LogGameWorkflowStateKind,
  string
> = {
  choosing_entry_method: 'Choose an entry method',
  creating_manual_draft: 'New manual game',
  loading_draft: 'Loading saved draft',
  editing_manual_draft: 'Resumed saved draft',
  importing: 'Preparing an import draft',
  reviewing_imported_data: 'Reviewing imported data',
  validating: 'Checking required game data',
  saving: 'Saving draft',
  saved: 'Draft saved',
  save_failed: 'Draft save failed',
  ready_to_finalize: 'Ready to finalize',
  finalizing: 'Finalizing game',
  finalized: 'Game finalized',
  finalization_failed: 'Finalization failed',
  inaccessible: 'Draft inaccessible',
  unavailable: 'Game entry unavailable',
  not_found: 'Draft not found',
};

export type LogGameDraftRouteState =
  | { kind: 'new' }
  | { kind: 'resume'; gameId: string }
  | { kind: 'invalid' };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveLogGameDraftRouteState(
  value: string | string[] | undefined,
): LogGameDraftRouteState {
  const candidate = (Array.isArray(value) ? value[0] : value)?.trim();

  if (!candidate) {
    return { kind: 'new' };
  }

  if (!UUID_PATTERN.test(candidate)) {
    return { kind: 'invalid' };
  }

  return { kind: 'resume', gameId: candidate };
}

export function manualEntryHref(gameId?: string) {
  return gameId ? `/log-game?gameId=${encodeURIComponent(gameId)}` : '/log-game';
}
