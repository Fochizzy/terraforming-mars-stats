import { describe, expect, it } from 'vitest';
import {
  evaluateImportPlayerIdentity,
  findExactImportedSourceCandidates,
  normalizeGuestUsername,
  normalizePrivatePersonalName,
  type ImportPlayerIdentityCandidate,
} from './guest-identity';

const candidates: ImportPlayerIdentityCandidate[] = [
  {
    firstName: null,
    guestUsername: null,
    id: '11111111-1111-4111-8111-111111111111',
    identityMode: null,
    isAccessible: true,
    isLinked: true,
    lastName: null,
    normalizedPersonalName: null,
    normalizedUsername: null,
    publicName: 'registered-user',
  },
  {
    firstName: null,
    guestUsername: 'Mars.Rover',
    id: '22222222-2222-4222-8222-222222222222',
    identityMode: 'username',
    isAccessible: true,
    isLinked: false,
    lastName: null,
    normalizedPersonalName: null,
    normalizedUsername: 'mars-rover',
    publicName: 'Mars.Rover',
  },
  {
    firstName: 'Private',
    guestUsername: null,
    id: '33333333-3333-4333-8333-333333333333',
    identityMode: 'personal_name',
    isAccessible: true,
    isLinked: false,
    lastName: 'Example',
    normalizedPersonalName: 'private example',
    normalizedUsername: null,
    publicName: 'Private Example',
  },
];

describe('guest identity normalization', () => {
  it('keeps username and personal-name semantics separate', () => {
    expect(normalizeGuestUsername(' Mars.Rover ')).toBe('mars-rover');
    expect(normalizePrivatePersonalName(' Mars ', ' Rover ')).toBe(
      'mars rover',
    );
  });

  it('matches imported text through each identity mode without fuzzy matching', () => {
    expect(
      findExactImportedSourceCandidates({
        candidates,
        sourcePlayerText: 'MARS...ROVER',
      }).map((candidate) => candidate.id),
    ).toEqual(['22222222-2222-4222-8222-222222222222']);
    expect(
      findExactImportedSourceCandidates({
        candidates,
        sourcePlayerText: 'PRIVATE, EXAMPLE',
      }).map((candidate) => candidate.id),
    ).toEqual(['33333333-3333-4333-8333-333333333333']);
    expect(
      findExactImportedSourceCandidates({
        candidates,
        sourcePlayerText: 'Private Example Extra',
      }),
    ).toEqual([]);
  });
});

describe('evaluateImportPlayerIdentity', () => {
  it('distinguishes a linked registered player', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          mode: 'existing_player',
          selectedPlayerId: '11111111-1111-4111-8111-111111111111',
          sourcePlayerText: 'Original linked player text',
        },
      }),
    ).toMatchObject({ kind: 'linked_registered_player' });
  });

  it('requires confirmation before reusing an exact username guest', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          createNew: true,
          mode: 'username',
          selectedPlayerId: null,
          sourcePlayerText: 'MARS ROVER',
          username: '  MARS...ROVER ',
        },
      }),
    ).toMatchObject({ kind: 'duplicate_guest_candidate' });
  });

  it('reuses the explicitly confirmed personal-name guest', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          createNew: false,
          firstName: 'PRIVATE',
          lastName: 'EXAMPLE',
          mode: 'personal_name',
          selectedPlayerId: '33333333-3333-4333-8333-333333333333',
          sourcePlayerText: 'Private Example',
        },
      }),
    ).toMatchObject({ kind: 'existing_unlinked_guest' });
  });

  it('distinguishes ambiguous personal-name candidates', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates: [
          ...candidates,
          {
            ...candidates[2],
            id: '44444444-4444-4444-8444-444444444444',
          },
        ],
        value: {
          createNew: false,
          firstName: 'Private',
          lastName: 'Example',
          mode: 'personal_name',
          selectedPlayerId: null,
          sourcePlayerText: 'Private Example',
        },
      }),
    ).toMatchObject({ kind: 'ambiguous_match' });
  });

  it('allows explicit creation only when no exact guest exists', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          createNew: true,
          mode: 'username',
          selectedPlayerId: null,
          sourcePlayerText: 'New Guest',
          username: 'New Guest',
        },
      }),
    ).toEqual({
      kind: 'newly_created_unlinked_guest',
      publicName: 'New Guest',
    });
  });

  it('requires confirmation before a legacy display-label match can be reused', () => {
    const legacyCandidate: ImportPlayerIdentityCandidate = {
      firstName: null,
      guestUsername: null,
      id: '55555555-5555-4555-8555-555555555555',
      identityMode: 'legacy',
      isAccessible: true,
      isLinked: false,
      lastName: null,
      normalizedPersonalName: null,
      normalizedUsername: null,
      publicName: 'Legacy Guest',
    };

    expect(
      evaluateImportPlayerIdentity({
        candidates: [legacyCandidate],
        value: {
          createNew: true,
          firstName: 'Legacy',
          lastName: 'Guest',
          mode: 'personal_name',
          selectedPlayerId: null,
          sourcePlayerText: 'Legacy Guest',
        },
      }),
    ).toMatchObject({ kind: 'duplicate_guest_candidate' });
  });

  it('keeps invalid, inaccessible, and unavailable states distinct', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          createNew: false,
          mode: 'personal_name',
          selectedPlayerId: null,
          sourcePlayerText: 'Missing last name',
          firstName: 'Only',
          lastName: '',
        },
      }),
    ).toMatchObject({ kind: 'invalid_identity_input' });

    expect(
      evaluateImportPlayerIdentity({
        candidates: [{ ...candidates[0], isAccessible: false }],
        value: {
          mode: 'existing_player',
          selectedPlayerId: '11111111-1111-4111-8111-111111111111',
          sourcePlayerText: 'Inaccessible player',
        },
      }),
    ).toMatchObject({ kind: 'inaccessible_identity' });

    expect(
      evaluateImportPlayerIdentity({
        candidates: [],
        value: {
          mode: 'existing_player',
          selectedPlayerId: '11111111-1111-4111-8111-111111111111',
          sourcePlayerText: 'Unavailable player',
        },
      }),
    ).toMatchObject({ kind: 'unavailable_identity' });
  });
});
