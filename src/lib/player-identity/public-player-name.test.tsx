import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { routeMetadataEntries } from '@/lib/navigation/route-metadata';
import {
  PUBLIC_PLAYER_FALLBACK,
  resolvePublicPlayerName,
  serializePublicPlayerIdentity,
} from './public-player-name';

const PRIVATE_FULL_NAME = 'Known Private Example';

describe('public player-name privacy contract', () => {
  it('resolves a claimed player only to the registered username', () => {
    expect(
      resolvePublicPlayerName({
        kind: 'linked_claimed_player',
        registeredUsername: 'public-handle',
      }),
    ).toBe('public-handle');
  });

  it('uses a neutral fallback and never a private full-name fallback', () => {
    expect(
      resolvePublicPlayerName({
        kind: 'linked_claimed_player',
        registeredUsername: null,
        fullName: PRIVATE_FULL_NAME,
      } as never),
    ).toBe(PUBLIC_PLAYER_FALLBACK);
  });

  it('omits private fields from DTO, JSON, hydration-like data, and rendered source', () => {
    const identity = serializePublicPlayerIdentity({
      playerId: '11111111-1111-4111-8111-111111111111',
      source: {
        kind: 'linked_claimed_player',
        registeredUsername: 'public-handle',
        fullName: PRIVATE_FULL_NAME,
        firstName: 'Known',
        lastName: 'Example',
      } as never,
    });
    const serialized = JSON.stringify(identity);
    const renderedSource = renderToString(<p>{identity.displayName}</p>);

    render(<p>{identity.displayName}</p>);

    expect(identity).toEqual({
      displayName: 'public-handle',
      playerId: '11111111-1111-4111-8111-111111111111',
    });
    expect(serialized).not.toContain(PRIVATE_FULL_NAME);
    expect(renderedSource).not.toContain(PRIVATE_FULL_NAME);
    expect(screen.queryByText(PRIVATE_FULL_NAME)).not.toBeInTheDocument();
  });

  it('keeps private names out of route and social metadata', () => {
    expect(JSON.stringify(routeMetadataEntries)).not.toContain(PRIVATE_FULL_NAME);
  });
});
