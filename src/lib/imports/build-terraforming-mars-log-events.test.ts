import { describe, expect, it } from 'vitest';
import { buildTerraformingMarsLogEvents } from './build-terraforming-mars-log-events';
import { parseTerraformingMarsExpansionMechanics } from './parse-terraforming-mars-expansion-mechanics';
import { parseTerraformingMarsTileActions } from './parse-terraforming-mars-tile-actions';

const MAP_ID = '00000000-0000-4000-8000-000000000001';

describe('buildTerraformingMarsLogEvents', () => {
  it('preserves line order, generation context, canonical IDs, and raw evidence', () => {
    const exportedLogText = [
      'Good luck Friday!',
      'Generation 1',
      'First player this generation is Friday',
      'Friday played Ecoline',
      'Friday played Asteroid Mining Consortium',
      'Friday claimed Mayor milestone',
      'Friday funded Scientist award',
      'A source line not yet classified',
    ].join('\n');
    const result = buildTerraformingMarsLogEvents({
      exportedLogText,
      mapId: MAP_ID,
      objectiveEvidence: [
        {
          candidateEntityIds: ['milestone-mayor'],
          canonicalId: 'milestone-mayor',
          canonicalName: 'Mayor',
          lineNumber: 6,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'mayor',
          originalLine: 'Friday claimed Mayor milestone',
          originalPlayerValue: 'Friday',
          originalValue: 'Mayor',
          resolution: 'exact',
          source: 'exported_log',
          type: 'milestone',
        },
        {
          candidateEntityIds: ['award-scientist'],
          canonicalId: 'award-scientist',
          canonicalName: 'Scientist',
          lineNumber: 7,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'scientist',
          originalLine: 'Friday funded Scientist award',
          originalPlayerValue: 'Friday',
          originalValue: 'Scientist',
          resolution: 'exact',
          source: 'exported_log',
          type: 'award',
        },
      ],
      playedEntityEvidence: [
        {
          candidateEntityIds: ['corp-ecoline'],
          canonicalId: 'corp-ecoline',
          canonicalName: 'Ecoline',
          entityType: 'corporation',
          lineNumber: 4,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'ecoline',
          originalLine: 'Friday played Ecoline',
          originalPlayerValue: 'Friday',
          originalValue: 'Ecoline',
          promoSetSlug: null,
          resolution: 'exact',
        },
        {
          candidateEntityIds: ['card-amc'],
          canonicalId: 'card-amc',
          canonicalName: 'Asteroid Mining Consortium',
          entityType: 'card',
          lineNumber: 5,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'asteroid mining consortium',
          originalLine: 'Friday played Asteroid Mining Consortium',
          originalPlayerValue: 'Friday',
          originalValue: 'Asteroid Mining Consortium',
          promoSetSlug: null,
          resolution: 'exact',
        },
      ],
    });

    expect(result).toMatchObject({
      lineCount: 8,
      parsedLineCount: 7,
      unparsedLineCount: 1,
    });
    expect(result.events.map((event) => event.event_type)).toEqual([
      'player_identified',
      'generation_started',
      'first_player_selected',
      'corporation_selected',
      'card_played',
      'milestone_claimed',
      'award_funded',
    ]);
    expect(result.events[4]).toMatchObject({
      card_id: 'card-amc',
      event_order: 5,
      generation_number: 1,
      raw_line: 'Friday played Asteroid Mining Consortium',
    });
  });

  it('persists known, special, Moon, removal, and unresolved tile evidence', () => {
    const exportedLogText = [
      'Generation 3',
      'A placed Mining Rights tile at 20',
      'A removed Mining Rights tile at 20',
      'B placed a Mine tile at m03',
      'C placed Unreleased Future Tile tile at 12',
    ].join('\n');
    const tileActions = parseTerraformingMarsTileActions(exportedLogText).actions;
    const result = buildTerraformingMarsLogEvents({
      exportedLogText,
      mapId: MAP_ID,
      objectiveEvidence: [],
      playedEntityEvidence: [],
      tileActions,
    });

    expect(result.events.map((event) => event.event_type)).toEqual([
      'generation_started',
      'tile_placed',
      'tile_removed',
      'tile_placed',
      'tile_placed',
    ]);
    expect(result.events[1]).toMatchObject({
      board_space: '20',
      generation_number: 3,
      review_state: 'not_required',
      tile_type: 'mining_rights',
    });
    expect(result.events[3]).toMatchObject({ board_space: 'm03', tile_type: 'moon_mine' });
    // An unknown tile label is low-confidence evidence that needs review; the
    // review status is never overloaded into the confidence value.
    expect(result.events[4]).toMatchObject({
      confidence_level: 'low',
      review_state: 'needs_review',
    });
  });

  it('persists canonical Venus and Colony fields on typed log events', () => {
    const exportedLogText = [
      'Generation 4',
      'Friday raised the Venus scale 2 steps',
      'Friday spent 3 energy to trade with Luna',
      'Final greenery placement',
      'This game id was typed-expansion-events',
    ].join('\n');
    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText,
      playerResolutions: [
        {
          selectedPlayerId: 'player-friday',
          sourcePlayerText: 'Friday',
        },
      ],
    });

    const result = buildTerraformingMarsLogEvents({
      expansionMechanicEvents: expansion.events,
      exportedLogText,
      mapId: MAP_ID,
      objectiveEvidence: [],
      playedEntityEvidence: [],
    });

    expect(result.events.map((event) => event.event_type)).toEqual([
      'generation_started',
      'venus_scale_increased',
      'colony_traded',
    ]);
    expect(result.events[1]).toMatchObject({
      event_identity: '2:venus_scale_increased:none',
      generation_number: 4,
      parameter_steps: 2,
      player_id: 'player-friday',
      resource_amount: 2,
      resource_type: 'terraform_rating',
    });
    expect(result.events[2]).toMatchObject({
      colony_id: 'luna',
      event_provenance: 'exported_log',
      event_type: 'colony_traded',
      resource_amount: 3,
      resource_type: 'energy',
    });
  });

  it('preserves typed placement identity, coordinates, ownership, and stable attribution', () => {
    const exportedLogText = [
      'Generation 2',
      'Alice placed greenery tile on row 4 position 2',
      'Bob placed ocean tile at 07',
      'Ghost placed city tile at 09',
    ].join('\n');
    const tileActions = parseTerraformingMarsTileActions(exportedLogText).actions;
    const result = buildTerraformingMarsLogEvents({
      exportedLogText,
      mapId: MAP_ID,
      objectiveEvidence: [],
      playedEntityEvidence: [],
      playerResolutions: [
        { selectedPlayerId: 'player-alice', sourcePlayerText: 'Alice' },
        { selectedPlayerId: 'player-bob', sourcePlayerText: 'Bob' },
      ],
      tileActions,
    });

    const [, grid, flat, unresolved] = result.events;

    // Grid coordinates survive exactly and are retained next to the flat space
    // id rather than being discarded after producing a flat id (F-02).
    expect(grid).toMatchObject({
      board_position: 2,
      board_row: 4,
      map_id: MAP_ID,
      owner_game_player_id: null,
      owner_player_id: null,
      ownership_state: 'unknown',
      placement_format: 'grid',
      player_id: 'player-alice',
      source_space_id: '4:2',
    });

    // A flat placement keeps its numeric space id as the original source id.
    expect(flat).toMatchObject({
      board_space: '07',
      owner_player_id: null,
      ownership_state: 'unknown',
      placement_format: 'flat-id',
      player_id: 'player-bob',
      source_space_id: '07',
    });

    // The actor is never treated as ownership, and an unresolved actor stays
    // null instead of being coerced or guessed from nearby log text (F-02).
    expect(unresolved.player_id).toBeNull();
    expect(unresolved.owner_player_id).toBeNull();
    expect(unresolved.ownership_state).toBe('unknown');
  });

  it('produces deterministic, idempotent placement identities', () => {
    const exportedLogText = [
      'Generation 1',
      'Alice placed ocean tile on row 4 position 2',
    ].join('\n');
    const build = () =>
      buildTerraformingMarsLogEvents({
        exportedLogText,
        mapId: MAP_ID,
        objectiveEvidence: [],
        playedEntityEvidence: [],
        tileActions: parseTerraformingMarsTileActions(exportedLogText).actions,
      });

    const first = build().events.find((event) => event.event_type === 'tile_placed');
    const second = build().events.find((event) => event.event_type === 'tile_placed');

    expect(first?.event_identity).toBeTruthy();
    expect(first?.event_identity).toBe(second?.event_identity);
    expect(first?.event_identity).toMatch(/^tile:/);
  });
});
