import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTABLE_PLACEMENT_ACTIONS,
  buildTileActorIndex,
  resolveTileEventAttributions,
} from './resolve-tile-event-attribution';

describe('buildTileActorIndex', () => {
  it('indexes a confirmed resolution by its normalized source text', () => {
    const index = buildTileActorIndex([
      { selected_player_id: 'player-1', source_player_text: ' Izzy ' },
    ]);

    expect(index.get('izzy')).toBe('player-1');
  });

  it('marks an actor that resolves to two different players as ambiguous', () => {
    const index = buildTileActorIndex([
      { selected_player_id: 'player-1', source_player_text: 'James' },
      { selected_player_id: 'player-2', source_player_text: 'james' },
    ]);

    expect(index.get('james')).toBeNull();
  });

  it('keeps a repeated identical resolution unambiguous', () => {
    const index = buildTileActorIndex([
      { selected_player_id: 'player-1', source_player_text: 'Izzy' },
      { selected_player_id: 'player-1', source_player_text: 'izzy' },
    ]);

    expect(index.get('izzy')).toBe('player-1');
  });

  it('ignores resolutions with no source text or no selected player', () => {
    const index = buildTileActorIndex([
      { selected_player_id: null, source_player_text: 'Izzy' },
      { selected_player_id: 'player-2', source_player_text: '   ' },
      { selected_player_id: 'player-3' },
      {},
    ]);

    expect(index.size).toBe(0);
  });
});

describe('resolveTileEventAttributions', () => {
  const participants = new Map([
    ['player-izzy', 'gp-izzy'],
    ['player-guest', 'gp-guest'],
  ]);

  it('attributes an event whose actor resolves exactly to a game participant', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: 'player-izzy', source_player_text: 'Izzy' },
      ]),
      events: [{ actorText: 'Izzy', eventId: 'event-1' }],
      gamePlayerIdByPlayerId: participants,
    });

    expect(attributions).toEqual([
      { eventId: 'event-1', gamePlayerId: 'gp-izzy', playerId: 'player-izzy' },
    ]);
  });

  it('attributes an unlinked guest through the same exact evidence as anyone else', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: 'player-guest', source_player_text: 'Jenna' },
      ]),
      events: [{ actorText: 'Jenna', eventId: 'event-2' }],
      gamePlayerIdByPlayerId: participants,
    });

    expect(attributions).toEqual([
      {
        eventId: 'event-2',
        gamePlayerId: 'gp-guest',
        playerId: 'player-guest',
      },
    ]);
  });

  it('leaves an ambiguous actor unattributed', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: 'player-izzy', source_player_text: 'James' },
        { selected_player_id: 'player-guest', source_player_text: 'James' },
      ]),
      events: [{ actorText: 'James', eventId: 'event-3' }],
      gamePlayerIdByPlayerId: participants,
    });

    expect(attributions).toEqual([]);
  });

  it('leaves an unknown actor unattributed', () => {
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: 'player-izzy', source_player_text: 'Izzy' },
      ]),
      events: [
        { actorText: 'Morgan', eventId: 'event-4' },
        { actorText: null, eventId: 'event-5' },
        { actorText: '   ', eventId: 'event-6' },
      ],
      gamePlayerIdByPlayerId: participants,
    });

    expect(attributions).toEqual([]);
  });

  it('never writes a player who is not a participant of this game, even under the same name', () => {
    // The same human name confirmed in an unrelated game resolves to a player
    // id that is not part of this game's participant map, so it must not be
    // written here.
    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        {
          selected_player_id: 'player-from-other-game',
          source_player_text: 'Izzy',
        },
      ]),
      events: [{ actorText: 'Izzy', eventId: 'event-7' }],
      gamePlayerIdByPlayerId: participants,
    });

    expect(attributions).toEqual([]);
  });

  it('resolves deterministically for every supported placement action vocabulary entry', () => {
    // The action filter lives in the finalize query; this pins the vocabulary
    // itself so a constraint change has to be considered here deliberately.
    expect([...ATTRIBUTABLE_PLACEMENT_ACTIONS]).toEqual(['placed', 'removed']);

    const events = ATTRIBUTABLE_PLACEMENT_ACTIONS.map((action, index) => ({
      actorText: 'Izzy',
      eventId: `event-${action}-${index}`,
    }));

    const attributions = resolveTileEventAttributions({
      actorIndex: buildTileActorIndex([
        { selected_player_id: 'player-izzy', source_player_text: 'Izzy' },
      ]),
      events,
      gamePlayerIdByPlayerId: participants,
    });

    expect(attributions).toHaveLength(ATTRIBUTABLE_PLACEMENT_ACTIONS.length);
    expect(new Set(attributions.map((entry) => entry.playerId))).toEqual(
      new Set(['player-izzy']),
    );
  });
});
