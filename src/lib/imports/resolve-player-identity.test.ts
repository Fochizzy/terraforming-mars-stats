import { describe, expect, it } from 'vitest';
import type { ImportPlayerLinkCandidate } from './resolve-import-player-links';
import {
  resolveEffectivePlayerIdentity,
  resolvePlayerIdentityDefault,
} from './resolve-player-identity';

function buildCandidate(
  overrides: Partial<ImportPlayerLinkCandidate>,
): ImportPlayerLinkCandidate {
  return {
    displayName: 'Roster Name',
    gamesPlayed: 0,
    id: 'player-1',
    matchReason: 'exact',
    ...overrides,
  };
}

describe('resolvePlayerIdentityDefault', () => {
  it('uses the candidate display name for username, and no candidate-derived full name', () => {
    // The public candidate DTO carries no private full name field, so the
    // default full name is always empty regardless of the candidate.
    expect(
      resolvePlayerIdentityDefault({
        candidate: buildCandidate({ displayName: 'James Hodnett' }),
        importedName: 'James',
      }),
    ).toEqual({ fullName: '', username: 'James Hodnett' });

    expect(
      resolvePlayerIdentityDefault({
        candidate: buildCandidate({ displayName: 'Corey' }),
        importedName: 'Cor',
      }),
    ).toEqual({ fullName: '', username: 'Corey' });

    expect(
      resolvePlayerIdentityDefault({ candidate: null, importedName: 'Newbie' }),
    ).toEqual({ fullName: '', username: 'Newbie' });
  });
});

describe('resolveEffectivePlayerIdentity', () => {
  it('uses the reviewer override when present, falling back per field', () => {
    const candidate = buildCandidate({ displayName: 'James Hodnett' });

    expect(
      resolveEffectivePlayerIdentity({
        candidate,
        importedName: 'James',
        override: { username: 'rev-2' },
      }),
    ).toEqual({ fullName: '', username: 'rev-2' });

    // Full name has no candidate-derived default, so a reviewer-typed
    // override is the only way it's ever populated.
    expect(
      resolveEffectivePlayerIdentity({
        candidate,
        importedName: 'James',
        override: { fullName: 'Manually Typed Name', username: '' },
      }),
    ).toEqual({ fullName: 'Manually Typed Name', username: '' });
  });
});
