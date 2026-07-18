import { z } from 'zod';
import {
  normalizeUsername,
  usernameHandleSchema,
} from '@/features/auth/username-auth';

export const GUEST_IDENTITY_MODES = ['username', 'personal_name'] as const;
export type GuestIdentityMode = (typeof GUEST_IDENTITY_MODES)[number];

export const IMPORT_PLAYER_RESOLUTION_STATES = [
  'linked_registered_player',
  'existing_unlinked_guest',
  'newly_created_unlinked_guest',
  'unresolved_player',
  'ambiguous_match',
  'invalid_identity_input',
  'duplicate_guest_candidate',
  'inaccessible_identity',
  'unavailable_identity',
] as const;
export type ImportPlayerResolutionStateKind =
  (typeof IMPORT_PLAYER_RESOLUTION_STATES)[number];

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

const personalNameComponentSchema = z
  .string()
  .transform(collapseWhitespace)
  .refine((value) => /\p{L}/u.test(value), {
    message: 'Enter a name using letters.',
  });

const importSourcePlayerTextSchema = z
  .string()
  .transform(collapseWhitespace)
  .refine((value) => value.length > 0, {
    message: 'Enter the original imported player text.',
  });

export const importPlayerIdentityInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('existing_player'),
    sourcePlayerText: importSourcePlayerTextSchema,
    selectedPlayerId: z.string().uuid('Select an available player.'),
    valueSource: z.enum(['imported', 'user_corrected']).default('user_corrected'),
  }),
  z.object({
    createNew: z.boolean().default(false),
    mode: z.literal('username'),
    selectedPlayerId: z.string().uuid().nullable().default(null),
    sourcePlayerText: importSourcePlayerTextSchema,
    username: usernameHandleSchema,
    valueSource: z.enum(['imported', 'user_corrected']).default('user_corrected'),
  }),
  z.object({
    createNew: z.boolean().default(false),
    firstName: personalNameComponentSchema,
    lastName: personalNameComponentSchema,
    mode: z.literal('personal_name'),
    selectedPlayerId: z.string().uuid().nullable().default(null),
    sourcePlayerText: importSourcePlayerTextSchema,
    valueSource: z.enum(['imported', 'user_corrected']).default('user_corrected'),
  }),
]);

export type ImportPlayerIdentityInput = z.output<
  typeof importPlayerIdentityInputSchema
>;
export type ImportPlayerIdentityDraftInput = z.input<
  typeof importPlayerIdentityInputSchema
>;

export const importedPlayerResolutionSchema = z.object({
  decision: z.enum(['linked', 'reused', 'created']),
  identityMode: z.enum(['existing_player', ...GUEST_IDENTITY_MODES]),
  normalizedImportedValue: z.string().nullable(),
  parserIdentity: z.enum([
    'manual-web-import-v1',
    'terraforming-mars-exported-log-v1',
  ]),
  selectedPlayerId: z.string().uuid(),
  sourceFormat: z.enum([
    'manual_web_import',
    'terraforming_mars_exported_log',
  ]),
  sourcePlayerText: z.string().min(1),
  state: z.enum([
    'linked_registered_player',
    'existing_unlinked_guest',
    'newly_created_unlinked_guest',
  ]),
  valueSource: z.enum(['imported', 'user_corrected']),
});

export type ImportedPlayerResolution = z.output<
  typeof importedPlayerResolutionSchema
>;

export type ImportPlayerIdentityCandidate = {
  firstName: string | null;
  guestUsername: string | null;
  id: string;
  identityMode: GuestIdentityMode | 'legacy' | null;
  isAccessible: boolean;
  isLinked: boolean;
  lastName: string | null;
  normalizedPersonalName: string | null;
  normalizedUsername: string | null;
  publicName: string;
};

export type ImportPlayerResolutionState =
  | {
      kind: 'linked_registered_player' | 'existing_unlinked_guest';
      player: ImportPlayerIdentityCandidate;
    }
  | {
      kind: 'newly_created_unlinked_guest';
      publicName: string;
    }
  | {
      kind: 'ambiguous_match';
      candidates: ImportPlayerIdentityCandidate[];
    }
  | {
      kind: 'duplicate_guest_candidate';
      candidate: ImportPlayerIdentityCandidate;
    }
  | {
      kind: 'invalid_identity_input';
      message: string;
    }
  | {
      kind: 'unresolved_player';
      message: string;
    }
  | {
      kind: 'inaccessible_identity' | 'unavailable_identity';
      message: string;
    };

export function normalizeGuestUsername(value: string) {
  return normalizeUsername(value);
}

export function normalizePrivatePersonalName(
  firstName: string,
  lastName: string,
) {
  return collapseWhitespace(`${firstName} ${lastName}`)
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function findExactImportedSourceCandidates(input: {
  candidates: ImportPlayerIdentityCandidate[];
  sourcePlayerText: string;
}) {
  const normalizedPersonalName = normalizePrivatePersonalName(
    input.sourcePlayerText,
    '',
  );
  const normalizedUsername = normalizeGuestUsername(input.sourcePlayerText);

  return input.candidates.filter((candidate) => {
    const candidateUsername =
      candidate.normalizedUsername ??
      (candidate.guestUsername
        ? normalizeGuestUsername(candidate.guestUsername)
        : null);
    const candidatePersonalName =
      candidate.normalizedPersonalName ??
      (candidate.firstName && candidate.lastName
        ? normalizePrivatePersonalName(candidate.firstName, candidate.lastName)
        : null);

    if (candidate.isLinked || candidate.identityMode === 'username') {
      return (
        candidateUsername === normalizedUsername ||
        (!candidateUsername &&
          normalizeGuestUsername(candidate.publicName) === normalizedUsername)
      );
    }

    if (candidate.identityMode === 'personal_name') {
      return candidatePersonalName === normalizedPersonalName;
    }

    if (candidate.identityMode === 'legacy') {
      return (
        candidateUsername === normalizedUsername ||
        candidatePersonalName === normalizedPersonalName ||
        normalizeGuestUsername(candidate.publicName) === normalizedUsername ||
        normalizePrivatePersonalName(candidate.publicName, '') ===
          normalizedPersonalName
      );
    }

    return (
      candidateUsername === normalizedUsername ||
      candidatePersonalName === normalizedPersonalName
    );
  });
}

function selectedCandidateState(
  candidate: ImportPlayerIdentityCandidate | undefined,
): ImportPlayerResolutionState {
  if (!candidate) {
    return {
      kind: 'unavailable_identity',
      message: 'That player is no longer available.',
    };
  }

  if (!candidate.isAccessible) {
    return {
      kind: 'inaccessible_identity',
      message: 'That player is not available in the active group.',
    };
  }

  return candidate.isLinked
    ? { kind: 'linked_registered_player', player: candidate }
    : { kind: 'existing_unlinked_guest', player: candidate };
}

export function evaluateImportPlayerIdentity(input: {
  candidates: ImportPlayerIdentityCandidate[];
  value: ImportPlayerIdentityDraftInput;
}): ImportPlayerResolutionState {
  const parsed = importPlayerIdentityInputSchema.safeParse(input.value);

  if (!parsed.success) {
    return {
      kind: 'invalid_identity_input',
      message:
        parsed.error.issues[0]?.message ?? 'Enter a valid player identity.',
    };
  }

  if (parsed.data.mode === 'existing_player') {
    return selectedCandidateState(
      input.candidates.find(
        (candidate) => candidate.id === parsed.data.selectedPlayerId,
      ),
    );
  }

  const normalizedValue =
    parsed.data.mode === 'username'
      ? normalizeGuestUsername(parsed.data.username)
      : normalizePrivatePersonalName(
          parsed.data.firstName,
          parsed.data.lastName,
        );
  const exactCandidates = input.candidates.filter((candidate) => {
    if (candidate.isLinked) {
      return false;
    }

    if (parsed.data.mode === 'username') {
      return (
        candidate.normalizedUsername === normalizedValue ||
        (candidate.identityMode === 'legacy' &&
          normalizeGuestUsername(candidate.publicName) === normalizedValue)
      );
    }

    return (
      candidate.normalizedPersonalName === normalizedValue ||
      (candidate.identityMode === 'legacy' &&
        normalizePrivatePersonalName(candidate.publicName, '') ===
          normalizedValue)
    );
  });

  if (parsed.data.selectedPlayerId) {
    const selected = exactCandidates.find(
      (candidate) => candidate.id === parsed.data.selectedPlayerId,
    );
    return selectedCandidateState(selected);
  }

  if (exactCandidates.length > 1) {
    return { kind: 'ambiguous_match', candidates: exactCandidates };
  }

  if (exactCandidates[0]) {
    return {
      kind: 'duplicate_guest_candidate',
      candidate: exactCandidates[0],
    };
  }

  if (!parsed.data.createNew) {
    return {
      kind: 'unresolved_player',
      message: 'Confirm creation of a new unlinked guest.',
    };
  }

  return {
    kind: 'newly_created_unlinked_guest',
    publicName:
      parsed.data.mode === 'username'
        ? parsed.data.username
        : `${parsed.data.firstName} ${parsed.data.lastName}`,
  };
}
