import { describe, expect, it } from 'vitest';
import {
  evaluateExpansionSemantics,
  mapExpansionFacts,
  mapLegacyEvents,
  mapLegacyMapDetection,
  mapLegacyPlacements,
  mapLiveCaptureEvents,
  mapLiveCapturePlacements,
  mapLiveCaptureUnsupportedEvidence,
  type ExpansionFactsRow,
  type LegacyGameLogEventRow,
} from './map-live-capture';
import type {
  LiveCaptureEventRow,
  LiveCapturePlacementRow,
} from './contract';

function liveEventRow(
  overrides: Partial<LiveCaptureEventRow> = {},
): LiveCaptureEventRow {
  return {
    amount: null,
    attribution_status: 'explicit_stable',
    canonical_entity_id: null,
    confidence: 'high',
    coverage_state: 'complete',
    detail: {},
    event_category: 'generation',
    event_sequence: 1,
    event_type: 'generation_started',
    event_uid: 'fp:generation:0001:1',
    game_id: 'game-1',
    game_player_id: null,
    generation_number: 1,
    id: 'evt-1',
    normalized_text: null,
    parameter_type: null,
    parser_run_id: 'run-1',
    player_id: 'player-1',
    provenance: 'live_capture',
    source_line_number: 1,
    source_sha256: 'f'.repeat(64),
    source_text: 'Generation 1',
    value_after: null,
    value_before: null,
    ...overrides,
  };
}

function legacyEventRow(
  overrides: Partial<LegacyGameLogEventRow> = {},
): LegacyGameLogEventRow {
  return {
    board_position: null,
    board_row: null,
    board_space: null,
    colony_id: null,
    confidence_level: 'high',
    event_identity: null,
    event_order: 1,
    event_provenance: 'exported_log',
    event_type: 'generation_started',
    game_player_id: null,
    generation_number: 1,
    map_id: null,
    owner_game_player_id: null,
    owner_player_id: null,
    ownership_state: null,
    parameter_after: null,
    parameter_before: null,
    parameter_steps: null,
    parser_version: null,
    payload: {},
    placement_action: null,
    placement_board: null,
    placement_format: null,
    player_id: null,
    raw_line: 'Generation 1',
    resource_amount: null,
    resource_type: null,
    source_entity: null,
    source_line_number: null,
    source_space_id: null,
    tile_type: null,
    ...overrides,
  };
}

describe('live-capture v2 mapping', () => {
  it('maps a clean attributed event to not_required review with its stored confidence', () => {
    const { events, issues } = mapLiveCaptureEvents([liveEventRow()]);
    expect(issues).toEqual([]);
    expect(events[0]).toMatchObject({
      attributionStatus: 'explicit_stable',
      confidence: 'high',
      eventUid: 'fp:generation:0001:1',
      playerId: 'player-1',
      reviewState: 'not_required',
    });
  });

  it('derives needs_review from unresolved attribution, low confidence, or degraded coverage', () => {
    const { events } = mapLiveCaptureEvents([
      liveEventRow({
        attribution_status: 'explicit_unresolved',
        event_uid: 'e-unresolved',
        player_id: null,
      }),
      liveEventRow({ confidence: 'low', event_uid: 'e-low' }),
      liveEventRow({
        coverage_state: 'unsupported_pattern',
        event_uid: 'e-unsupported',
      }),
      liveEventRow({
        attribution_status: 'unattributed',
        event_uid: 'e-worldgov',
        player_id: null,
      }),
    ]);
    expect(events.map((event) => event.reviewState)).toEqual([
      'needs_review',
      'needs_review',
      'needs_review',
      'not_required',
    ]);
    // Explicitly unattributed movement (World Government) stays unattributed;
    // it is not review-worthy and is never assigned to a nearby player.
    expect(events[3]).toMatchObject({
      attributionStatus: 'unattributed',
      playerId: null,
    });
  });

  it('reports duplicate event identities and out-of-contract values instead of hiding them', () => {
    const { issues } = mapLiveCaptureEvents([
      liveEventRow({ event_uid: 'dup' }),
      liveEventRow({ event_uid: 'dup', event_sequence: 2 }),
      liveEventRow({ confidence: 'certain', event_uid: 'bad-confidence' }),
    ]);
    expect(issues.map((issue) => issue.code).sort()).toEqual([
      'duplicate_event_identity',
      'invalid_row',
    ]);
  });

  it('maps placements, keeping the coarse tile vocabulary and unresolved review flags', () => {
    const row: LiveCapturePlacementRow = {
      attribution_status: 'explicit_stable',
      board_position: 4,
      board_row: 3,
      canonical_board_space_id: '20',
      confidence: 'high',
      event_id: 'evt-1',
      event_sequence: 5,
      game_id: 'game-1',
      game_player_id: 'gp-1',
      generation_number: 2,
      id: 'pl-1',
      map_code: 'tharsis',
      map_id: 'map-1',
      ownership_state: 'owned',
      parser_run_id: 'run-1',
      parser_version: 'tm-data-capture-v2',
      placement_action: 'place',
      placement_uid: 'fp:tile:0005:12',
      player_id: 'player-1',
      provenance: 'live_capture',
      raw_actor_text: 'Player A',
      raw_evidence: 'Player A placed ocean tile at 20',
      source_card_or_action: null,
      tile_type: 'ocean',
      upstream_numeric_space_id: 20,
    };
    const unresolved: LiveCapturePlacementRow = {
      ...row,
      id: 'pl-2',
      placement_uid: 'fp:tile:0006:13',
      tile_type: 'unresolved',
    };
    const { issues, placements } = mapLiveCapturePlacements([row, unresolved]);
    expect(issues).toEqual([]);
    expect(placements[0]).toMatchObject({
      ownershipState: 'owned',
      placementAction: 'place',
      reviewState: 'not_required',
      tileType: 'ocean',
      tileTypeVocabulary: 'capture_coarse_class',
      upstreamNumericSpaceId: 20,
    });
    expect(placements[1].reviewState).toBe('needs_review');
  });

  it('keeps unsupported evidence review-worthy and never a zero or an absence', () => {
    const rows = mapLiveCaptureUnsupportedEvidence([
      {
        game_id: 'game-1',
        id: 'u-1',
        normalized_pattern: '<player> did something novel',
        parser_run_id: 'run-1',
        parser_version: 'tm-data-capture-v2',
        raw_evidence: 'Player A did something novel',
        reason: 'unrecognized_line',
        source_line_number: 7,
      },
    ]);
    expect(rows[0].reviewState).toBe('needs_review');
  });
});

describe('legacy import mapping', () => {
  it('splits pre-migration overloaded reviewed confidence exactly like the migration', () => {
    const { events } = mapLegacyEvents([
      legacyEventRow({
        confidence_level: 'reviewed',
        event_order: 10,
        event_type: 'milestone_claimed',
        payload: { resolution: 'corrected' },
      }),
      legacyEventRow({
        colony_id: null,
        confidence_level: 'reviewed',
        event_order: 11,
        event_type: 'colony_traded',
        payload: { canonical_colony_name: 'Atlantis' },
      }),
    ]);
    expect(events[0]).toMatchObject({
      confidence: 'high',
      reviewState: 'reviewed',
    });
    expect(events[1]).toMatchObject({
      confidence: 'low',
      reviewState: 'needs_review',
    });
  });

  it('uses the stored review_state when the split migration has been applied', () => {
    const { events } = mapLegacyEvents([
      legacyEventRow({
        confidence_level: 'low',
        event_order: 12,
        review_state: 'rejected',
      }),
    ]);
    expect(events[0]).toMatchObject({
      confidence: 'low',
      reviewState: 'rejected',
    });
  });

  it('derives attribution without fabricating a player', () => {
    const { events } = mapLegacyEvents([
      legacyEventRow({ event_order: 1, player_id: 'player-1' }),
      legacyEventRow({
        event_order: 2,
        payload: { attribution: 'world_government' },
      }),
      legacyEventRow({ event_order: 3, payload: { actor: 'Unmatched Name' } }),
      legacyEventRow({ event_order: 4, payload: {} }),
    ]);
    expect(events.map((event) => event.attributionStatus)).toEqual([
      'explicit_stable',
      'unattributed',
      'explicit_unresolved',
      'not_applicable',
    ]);
    expect(events[1].playerId).toBeNull();
  });

  it('maps typed tile events to canonical placements without discarding grid coordinates', () => {
    const { issues, placements } = mapLegacyPlacements([
      legacyEventRow({
        board_position: 4,
        board_row: 3,
        board_space: '21',
        event_identity: 'tile:5:placed:mars:21:city',
        event_order: 5,
        event_type: 'tile_placed',
        map_id: 'map-1',
        ownership_state: 'unknown',
        payload: { actor: 'Player A' },
        placement_action: 'placed',
        placement_board: 'mars',
        placement_format: 'grid',
        player_id: 'player-1',
        raw_line: 'Player A placed City tile on row 3 position 4',
        source_line_number: 5,
        source_space_id: '3:4',
        tile_type: 'city',
      }),
      legacyEventRow({
        board_space: 'm03',
        event_identity: 'tile:6:removed:moon:m03:moon_mine',
        event_order: 6,
        event_type: 'tile_removed',
        ownership_state: 'explicit_owner',
        owner_player_id: 'player-2',
        placement_action: 'removed',
        placement_board: 'moon',
        placement_format: 'flat-id',
        tile_type: 'moon_mine',
      }),
    ]);
    expect(issues).toEqual([]);
    expect(placements[0]).toMatchObject({
      boardPosition: 4,
      boardRow: 3,
      canonicalBoardSpaceId: '21',
      ownershipState: 'unknown',
      placementAction: 'place',
      rawActorText: 'Player A',
      tileType: 'city',
      tileTypeVocabulary: 'upstream_tile_code',
      upstreamNumericSpaceId: 21,
    });
    expect(placements[1]).toMatchObject({
      ownerPlayerId: 'player-2',
      ownershipState: 'owned',
      placementAction: 'remove',
      upstreamNumericSpaceId: null,
    });
  });

  it('maps the persisted confidence-summary map block without inventing detection facts', () => {
    const detection = mapLegacyMapDetection({
      map: {
        board_conflicts: [],
        candidates: [{ code: 'elysium' }, { code: 'tharsis' }],
        detected_map_id: 'map-e',
        detected_state: 'confident',
        map_source: 'oceans',
        objective_configuration: 'board_defined',
        ocean_space_ids: ['12', '13'],
        selected_map_id: 'map-e',
      },
    });
    expect(detection).toMatchObject({
      candidateMapCodes: ['elysium', 'tharsis'],
      detectedMapId: 'map-e',
      detectionState: 'confident',
      randomizedObjectives: false,
      reviewState: 'not_required',
    });
    expect(mapLegacyMapDetection(null)).toBeNull();
  });
});

describe('expansion semantics through the adapter', () => {
  const factsRow: ExpansionFactsRow = {
    backfill_version: null,
    backfilled_at: null,
    colonies_state: 'confirmed_absent',
    colony_built_count: 0,
    colony_trade_count: 0,
    detection_provenance: {},
    final_venus_scale: null,
    parser_version: 'terraforming-mars-venus-colonies-v1',
    source_coverage: {},
    source_game_log_import_id: null,
    venus_event_count: 0,
    venus_next_state: 'confirmed_absent',
  };

  it('accepts a clean confirmed-absent game with null final Venus and no events', () => {
    expect(
      evaluateExpansionSemantics({
        events: [],
        facts: mapExpansionFacts(factsRow),
      }),
    ).toEqual([]);
  });

  it('surfaces a semantic violation instead of silently reinterpreting absence with events', () => {
    const { events } = mapLegacyEvents([
      legacyEventRow({
        event_identity: '3:venus_scale_increased:none',
        event_order: 3,
        event_type: 'venus_scale_increased',
        payload: { actor: 'Player A' },
      }),
    ]);
    const issues = evaluateExpansionSemantics({
      events,
      facts: mapExpansionFacts(factsRow),
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.code === 'semantic_violation')).toBe(
      true,
    );
  });
});
