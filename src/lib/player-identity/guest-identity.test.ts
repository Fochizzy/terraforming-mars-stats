import { describe, expect, it } from 'vitest';
import {
  evaluateImportPlayerIdentity,
  findExactImportedSourceCandidates,
  normalizeGuestUsername,
  normalizePrivatePersonalName,
  type ImportPlayerIdentityCandidate,
} from './guest-identity';

// F-01 privacy boundary: only PUBLIC identity fields ever reach the browser.
// Private first/last names, normalized personal names, and private matching
// keys are never serialized into candidates, so browser-side matching is
// limited to linked players' public usernames. Existing-guest reuse, ambiguity,
// and duplicate detection now happen server-side in resolve_import_guest_identity.
const linkedPlayer: ImportPlayerIdentityCandidate = {
  id: '11111111-1111-4111-8111-111111111111',
  isAccessible: true,
  isLinked: true,
  publicName: 'Mars.Rover',
};

const unlinkedGuest: ImportPlayerIdentityCandidate = {
  // Unlinked guests are only ever labelled with a neutral public label.
  id: '33333333-3333-4333-8333-333333333333',
  isAccessible: true,
  isLinked: false,
  publicName: 'Guest 3A2B7C1D',
};

const candidates = [linkedPlayer, unlinkedGuest];

describe('guest identity normalization', () => {
  it('keeps username and personal-name semantics separate', () => {
    expect(normalizeGuestUsername(' Mars.Rover ')).toBe('mars-rover');
    expect(normalizePrivatePersonalName(' Mars ', ' Rover ')).toBe('mars rover');
  });
});

describe('findExactImportedSourceCandidates', () => {
  it('auto-matches a linked player by public username only', () => {
    expect(
      findExactImportedSourceCandidates({
        candidates,
        sourcePlayerText: 'MARS...ROVER',
      }).map((candidate) => candidate.id),
    ).toEqual([linkedPlayer.id]);
  });

  it('never auto-matches an unlinked guest, even when the public label collides', () => {
    // The browser holds no private matching keys, so an unlinked guest must be
    // resolved server-side rather than silently auto-selected here.
    expect(
      findExactImportedSourceCandidates({
        candidates: [{ ...unlinkedGuest, publicName: 'Mars.Rover' }],
        sourcePlayerText: 'Mars.Rover',
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
          selectedPlayerId: linkedPlayer.id,
          sourcePlayerText: 'Original linked player text',
        },
      }),
    ).toMatchObject({ kind: 'linked_registered_player' });
  });

  it('reuses an explicitly selected existing unlinked guest', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          mode: 'existing_player',
          selectedPlayerId: unlinkedGuest.id,
          sourcePlayerText: 'Original imported guest text',
        },
      }),
    ).toMatchObject({ kind: 'existing_unlinked_guest' });
  });

  it('leaves a new personal-name guest unresolved until creation is confirmed', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          createNew: false,
          firstName: 'Private',
          lastName: 'Example',
          mode: 'personal_name',
          selectedPlayerId: null,
          sourcePlayerText: 'Private Example',
        },
      }),
    ).toMatchObject({ kind: 'unresolved_player' });
  });

  it('creates a new guest with a neutral label and never echoes the private name', () => {
    const state = evaluateImportPlayerIdentity({
      candidates,
      value: {
        createNew: true,
        firstName: 'Private',
        lastName: 'Example',
        mode: 'personal_name',
        selectedPlayerId: null,
        sourcePlayerText: 'Private Example',
      },
    });

    expect(state).toEqual({
      kind: 'newly_created_unlinked_guest',
      publicName: 'New unlinked guest',
    });

    // The entered personal name must never become the public label.
    if (state.kind === 'newly_created_unlinked_guest') {
      expect(state.publicName.toLowerCase()).not.toContain('private');
      expect(state.publicName.toLowerCase()).not.toContain('example');
    }
  });

  it('keeps invalid, inaccessible, and unavailable states distinct', () => {
    expect(
      evaluateImportPlayerIdentity({
        candidates,
        value: {
          createNew: false,
          firstName: 'Only',
          lastName: '',
          mode: 'personal_name',
          selectedPlayerId: null,
          sourcePlayerText: 'Missing last name',
        },
      }),
    ).toMatchObject({ kind: 'invalid_identity_input' });

    expect(
      evaluateImportPlayerIdentity({
        candidates: [{ ...linkedPlayer, isAccessible: false }],
        value: {
          mode: 'existing_player',
          selectedPlayerId: linkedPlayer.id,
          sourcePlayerText: 'Inaccessible player',
        },
      }),
    ).toMatchObject({ kind: 'inaccessible_identity' });

    expect(
      evaluateImportPlayerIdentity({
        candidates: [],
        value: {
          mode: 'existing_player',
          selectedPlayerId: linkedPlayer.id,
          sourcePlayerText: 'Unavailable player',
        },
      }),
    ).toMatchObject({ kind: 'unavailable_identity' });
  });
});
