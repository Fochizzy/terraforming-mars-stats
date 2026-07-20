import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTABLE_PLACEMENT_ACTIONS,
  buildTileActorIndex,
  resolveTileEventAttributions,
} from './resolve-tile-event-attribution';

const PLAYER_A = '11111111-1111-4111-8111-111111111111';
const PLAYER_B = '22222222-2222-4222-8222-222222222222';
const OTHER_GAME_PLAYER = '33333333-3333-4333-8333-333333333333';

const GAME_PLAYER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GAME_PLAYER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function participantMap() {
  return new Map([
    [PLAYER_A, GAME_PLAYER_A],
    [PLAYER_B, GAME_PLAYER_B],
  ]);
}

describe('buildTileActorIndex', () => {
  it('indexes each resolved source text by its normalized alias', () => {
    const index = buildTileActorIndex([
      { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
      { selected_player_id: PLAYER_B, source_player_text: 'James' },
    ]);

    expect(index.get('corey')).toBe(PLAYER_A);
    expect(index.get('james')).toBe(PLAYER_B);
  });

  it('marks an actor that resolves to two different players as ambiguous', () => {
    const index = buildTileActorIndex([
      { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
      { selected_player_id: PLAYER_B, source_player_text: 'corey' },
    ]);

    expect(index.get('corey')).toBeNull();
  });

  it('keeps a repeated identical resolution unambiguous', () => {
    const index = buildTileActorIndex([
      { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
      { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
    ]);

    expect(index.get('corey')).toBe(PLAYER_A);
  });

  it('ignores resolutions missing either side of the evidence', () => {
    const index = buildTileActorIndex([
      { selected_player_id: null, source_player_text: 'Corey' },
      { selected_player_id: PLAYER_A, source_player_text: '   ' },
      { selected_player_id: PLAYER_B, source_player_text: null },
    ]);

    expect(index.size).toBe(0);
  });
});

describe('resolveTileEventAttributions', () => {
  it('attributes an event whose actor resolves exactly', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
      ]),
      events: [{ actorText: 'Corey', eventId: 'event-1' }],
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions).toEqual([
      { eventId: 'event-1', gamePlayerId: GAME_PLAYER_A, playerId: PLAYER_A },
    ]);
  });

  it('leaves an unattributed actor alone rather than guessing', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
      ]),
      events: [{ actorText: 'Someone Else', eventId: 'event-1' }],
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions).toEqual([]);
  });

  it('leaves an ambiguous actor unattributed', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
        { selected_player_id: PLAYER_B, source_player_text: 'Corey' },
      ]),
      events: [{ actorText: 'Corey', eventId: 'event-1' }],
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions).toEqual([]);
  });

  it('never attributes a player who is not a participant of this game', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: OTHER_GAME_PLAYER, source_player_text: 'Visitor' },
      ]),
      events: [{ actorText: 'Visitor', eventId: 'event-1' }],
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions).toEqual([]);
  });

  it('ignores events carrying no actor evidence', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
      ]),
      events: [
        { actorText: null, eventId: 'event-1' },
        { actorText: '   ', eventId: 'event-2' },
      ],
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions).toEqual([]);
  });

  it('resolves the same input to the same output on a retry', () => {
    const actorIndex = buildTileActorIndex([
      { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
    ]);
    const events = [{ actorText: 'Corey', eventId: 'event-1' }];
    const gamePlayerIdByPlayerId = participantMap();

    const first = resolveTileEventAttributions({
      actorIndex,
      events,
      gamePlayerIdByPlayerId,
    });
    const second = resolveTileEventAttributions({
      actorIndex,
      events,
      gamePlayerIdByPlayerId,
    });

    expect(second).toEqual(first);
  });

  it('attributes a draft import once participants exist at finalization', () => {
    const actorIndex = buildTileActorIndex([
      { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
    ]);
    const events = [{ actorText: 'Corey', eventId: 'event-1' }];

    // At draft time the game has no `game_players` rows yet.
    expect(
      resolveTileEventAttributions({
        actorIndex,
        events,
        gamePlayerIdByPlayerId: new Map(),
      }),
    ).toEqual([]);

    // Finalization supplies them, and the same evidence now resolves.
    expect(
      resolveTileEventAttributions({
        actorIndex,
        events,
        gamePlayerIdByPlayerId: participantMap(),
      }),
    ).toEqual([
      { eventId: 'event-1', gamePlayerId: GAME_PLAYER_A, playerId: PLAYER_A },
    ]);
  });

  it('matches actor text across casing and punctuation-as-separator differences', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: PLAYER_A, source_player_text: "O'Brien" },
      ]),
      // `normalizePlayerAlias` turns punctuation into a separator, so
      // "O'Brien", "o brien" and "O-BRIEN" all normalize to "o brien".
      events: [{ actorText: 'O-BRIEN', eventId: 'event-1' }],
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions).toHaveLength(1);
    expect(attributions[0]?.playerId).toBe(PLAYER_A);
  });

  it('does not match when punctuation removal would be required', () => {
    // "obrien" normalizes to "obrien", not "o brien". Treating those as equal
    // would be fuzzy matching, which attribution must never do.
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: PLAYER_A, source_player_text: "O'Brien" },
      ]),
      events: [{ actorText: 'obrien', eventId: 'event-1' }],
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions).toEqual([]);
  });

  it('attributes every canonical placement action identically', () => {
    const actorIndex = buildTileActorIndex([
      { selected_player_id: PLAYER_A, source_player_text: 'Corey' },
    ]);

    const attributions = resolveTileEventAttributions({
      actorIndex,
      events: ATTRIBUTABLE_PLACEMENT_ACTIONS.map((action) => ({
        actorText: 'Corey',
        eventId: `event-${action}`,
      })),
      gamePlayerIdByPlayerId: participantMap(),
    });

    expect(attributions.map((row) => row.eventId)).toEqual(
      ATTRIBUTABLE_PLACEMENT_ACTIONS.map((action) => `event-${action}`),
    );
  });
});
