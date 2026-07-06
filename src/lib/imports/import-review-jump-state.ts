export type ImportReviewJumpField = 'awardPoints' | 'cardPointsTotal';

export type ImportReviewJumpTarget = {
  itemLabel: string;
  message: string;
  playerId?: string;
  playerName: string;
  scoreField: ImportReviewJumpField;
};

export type StoredImportReviewJumpState = ImportReviewJumpTarget & {
  gameId: string;
};

const IMPORT_REVIEW_JUMP_STATE_KEY = 'tm.import-review.jump-state';

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

function isImportReviewJumpField(value: unknown): value is ImportReviewJumpField {
  return value === 'awardPoints' || value === 'cardPointsTotal';
}

function parseStoredImportReviewJumpState(
  value: string | null,
): StoredImportReviewJumpState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredImportReviewJumpState>;

    if (
      typeof parsed.gameId !== 'string' ||
      typeof parsed.itemLabel !== 'string' ||
      typeof parsed.message !== 'string' ||
      (parsed.playerId !== undefined && typeof parsed.playerId !== 'string') ||
      typeof parsed.playerName !== 'string' ||
      !isImportReviewJumpField(parsed.scoreField)
    ) {
      return null;
    }

    return parsed as StoredImportReviewJumpState;
  } catch {
    return null;
  }
}

export function saveImportReviewJumpState(state: StoredImportReviewJumpState) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(IMPORT_REVIEW_JUMP_STATE_KEY, JSON.stringify(state));
}

export function readImportReviewJumpState(gameId: string) {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const storedState = parseStoredImportReviewJumpState(
    storage.getItem(IMPORT_REVIEW_JUMP_STATE_KEY),
  );

  if (!storedState || storedState.gameId !== gameId) {
    return null;
  }

  return storedState;
}

export function consumeImportReviewJumpState(gameId: string) {
  const storage = getSessionStorage();
  const storedState = readImportReviewJumpState(gameId);

  if (!storage || !storedState) {
    return null;
  }

  storage.removeItem(IMPORT_REVIEW_JUMP_STATE_KEY);
  return storedState;
}
