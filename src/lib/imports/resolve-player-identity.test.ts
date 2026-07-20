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
    linkedFullName: null,
    linkedUsername: null,
    matchReason: 'exact',
    ...overrides,
  };
}

describe('resolvePlayerIdentityDefault', () => {
  it('prefers the candidate username, then display name, then imported name', () => {
    expect(
      resolvePlayerIdentityDefault({
        candidate: buildCandidate({
          displayName: 'James Hodnett',
          linkedFullName: 'James Hodnett',
          linkedUsername: 'RevLoki',
        }),
        importedName: 'James',
      }),
    ).toEqual({ fullName: 'James Hodnett', username: 'RevLoki' });

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
    const candidate = buildCandidate({
      linkedFullName: 'James Hodnett',
      linkedUsername: 'RevLoki',
    });

    expect(
      resolveEffectivePlayerIdentity({
        candidate,
        importedName: 'James',
        override: { username: 'rev-2' },
      }),
    ).toEqual({ fullName: 'James Hodnett', username: 'rev-2' });

    expect(
      resolveEffectivePlayerIdentity({
        candidate,
        importedName: 'James',
        override: { fullName: '', username: '' },
      }),
    ).toEqual({ fullName: '', username: '' });
  });
});
