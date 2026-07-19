import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ImportMapReferenceCatalog } from '@/lib/db/reference-repo';
import { detectImportBoardMapIndependent } from './detect-import-board-map-independent';
import { parseTerraformingMarsExpansionMechanics } from './parse-terraforming-mars-expansion-mechanics';
import { parseTerraformingMarsLog } from './parse-terraforming-mars-log';
import { parseTerraformingMarsPlayedEntities } from './parse-terraforming-mars-played-entities';
import { parseTerraformingMarsTileActions } from './parse-terraforming-mars-tile-actions';
import { resolveOffReserveOceanEvidence } from './resolve-off-reserve-ocean-evidence';

function fixture(name: string) {
  return readFileSync(
    resolve(process.cwd(), 'src/lib/imports/fixtures', name),
    'utf8',
  );
}

const REAL_EXPORTS = [
  'retained-real-negative-game-2026-07-15.txt',
  'retained-real-grid-placement-2026-07-08.txt',
];

describe('real import fixtures', () => {
  it('never commits the original private player names', () => {
    for (const name of REAL_EXPORTS) {
      expect(fixture(name)).not.toMatch(/\b(izzy|james)\b/i);
    }
  });

  it('preserves grid coordinates from the real grid-placement export', () => {
    const text = fixture('retained-real-grid-placement-2026-07-08.txt');
    const { actions } = parseTerraformingMarsTileActions(text);
    const grid = actions.filter((action) => action.format === 'grid');

    expect(grid.length).toBeGreaterThan(0);
    // Grid coordinates are retained, not discarded after producing a flat id.
    for (const action of grid) {
      expect(action.boardRow).not.toBeNull();
      expect(action.boardPosition).not.toBeNull();
    }

    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
    });
    expect(expansion.sourceCoverage.complete).toBe(true);
    expect(expansion.venusNext.state).toBe('confirmed_absent');
    expect(expansion.colonies.state).toBe('confirmed_absent');
  });

  it('parses flat placements and a negative expansion state from the real negative export', () => {
    const text = fixture('retained-real-negative-game-2026-07-15.txt');
    const { actions } = parseTerraformingMarsTileActions(text);

    expect(actions.some((action) => action.format === 'flat-id')).toBe(true);

    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
    });
    expect(expansion.venusNext.state).toBe('confirmed_absent');
    expect(expansion.colonies.state).toBe('confirmed_absent');
  });

  it('parses Venus and Colony events from the source-backed upstream fragment', () => {
    const text = fixture('upstream-venus-colonies-action-fragment.txt');
    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
    });

    expect(
      expansion.events.some((event) => event.eventType.startsWith('venus_')),
    ).toBe(true);
    expect(
      expansion.events.some((event) => event.eventType.startsWith('colony_')),
    ).toBe(true);
  });
});

const playerResolutions = [
  { selectedPlayerId: '11111111-1111-4111-8111-111111111111', sourcePlayerText: 'Player A' },
  { selectedPlayerId: '22222222-2222-4222-8222-222222222222', sourcePlayerText: 'Player B' },
];

describe('synthetic-but-format-faithful full-export fixtures', () => {
  it('Venus-only full export: Venus confirmed present, Colonies confirmed absent', () => {
    const text = fixture('synthetic-venus-only-full-export.txt');
    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
      playerResolutions,
    });

    expect(expansion.sourceCoverage.complete).toBe(true);
    expect(expansion.venusNext.state).toBe('confirmed_present');
    expect(expansion.colonies.state).toBe('confirmed_absent');
    expect(expansion.finalVenusScale).toBeNull();

    const worldGovernment = expansion.events.find(
      (event) => event.attribution === 'world_government',
    );
    expect(worldGovernment).toMatchObject({
      eventType: 'venus_scale_increased',
      playerId: null,
      trEffect: 0,
    });
    const attributedRaise = expansion.events.find(
      (event) =>
        event.attribution === 'player' &&
        event.eventType === 'venus_scale_increased' &&
        event.actor === 'Player A',
    );
    expect(attributedRaise?.playerId).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(
      expansion.events.some((event) => event.eventType === 'venus_scale_decreased'),
    ).toBe(true);
  });

  it('Colonies-only full export: construction, paid trade, free trade, and track movement', () => {
    const text = fixture('synthetic-colonies-only-full-export.txt');
    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
      playerResolutions,
    });

    expect(expansion.sourceCoverage.complete).toBe(true);
    expect(expansion.colonies.state).toBe('confirmed_present');
    expect(expansion.venusNext.state).toBe('confirmed_absent');

    const built = expansion.events.find(
      (event) => event.eventType === 'colony_built',
    );
    expect(built).toMatchObject({ colonyId: 'luna', reviewState: 'not_required' });
    const paidTrade = expansion.events.find(
      (event) =>
        event.eventType === 'colony_traded' && event.paymentAmount !== null,
    );
    expect(paidTrade).toMatchObject({
      colonyId: 'ganymede',
      paymentAmount: 3,
      paymentResource: 'energy',
    });
    expect(
      expansion.events.some((event) => event.eventType === 'colony_setup_added'),
    ).toBe(true);
    expect(
      expansion.events.some(
        (event) => event.eventType === 'colony_track_increased',
      ),
    ).toBe(true);
  });

  it('Venus and Colonies full export: both confirmed present with deterministic rerun identities', () => {
    const text = fixture('synthetic-venus-colonies-full-export.txt');
    const first = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
      playerResolutions,
    });
    const rerun = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
      playerResolutions,
    });

    expect(first.venusNext.state).toBe('confirmed_present');
    expect(first.colonies.state).toBe('confirmed_present');
    expect(first.duplicateEventCount).toBe(0);
    expect(first.events.map((event) => event.eventIdentity)).toEqual(
      rerun.events.map((event) => event.eventIdentity),
    );
  });

  it('conflicting evidence: explicit absent option evidence with positive Venus events', () => {
    const text = fixture('synthetic-venus-only-full-export.txt');
    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
      optionEvidence: {
        colonies: null,
        originalEvidence: 'Exported game options record venusNextExtension: false.',
        source: 'exported_game_options',
        venusNext: false,
      },
      playerResolutions,
    });

    expect(expansion.venusNext.state).toBe('conflicting_evidence');
    // Conflicting evidence never collapses into absence or a zero-activity claim.
    expect(expansion.events.length).toBeGreaterThan(0);
  });

  it('unsupported wording stays unsupported for a complete log instead of becoming absence', () => {
    const text = fixture('synthetic-unsupported-venus-colonies-full-export.txt');
    const expansion = parseTerraformingMarsExpansionMechanics({
      exportedLogText: text,
      playerResolutions,
    });

    expect(expansion.sourceCoverage.complete).toBe(true);
    expect(expansion.venusNext.state).toBe('unsupported_log_pattern');
    expect(expansion.colonies.state).toBe('unsupported_log_pattern');
    expect(expansion.events).toHaveLength(0);
    expect(expansion.venusNext.unsupportedLineNumbers.length).toBeGreaterThan(0);
    expect(expansion.colonies.unsupportedLineNumbers.length).toBeGreaterThan(0);
  });

  it('off-reserve ocean full export: the verified exception prevents a false map conflict', () => {
    const text = fixture('synthetic-off-reserve-ocean-full-export.txt');
    const tileActionSet = parseTerraformingMarsTileActions(text);
    expect(tileActionSet.oceanSpaceIds.sort()).toEqual(['07', '08', '13']);

    const catalog = {
      cards: [
        {
          cardName: 'Artificial Lake',
          cardNumber: '116',
          expansionCode: 'base',
          id: 'card-artificial-lake',
          promoSetSlug: null,
        },
      ],
      corporations: [],
      entityAliases: [],
      preludes: [],
    };
    const playedEntities = parseTerraformingMarsPlayedEntities({
      catalog: catalog as never,
      exportedLogText: text,
    });
    const offReserve = resolveOffReserveOceanEvidence({
      cards: catalog.cards,
      playedEntityEvidence: playedEntities.evidence,
      tileActions: tileActionSet.actions,
    });
    // Artificial Lake (upstream 116) links to Player A's next ocean at 08,
    // which is not one of Tharsis's reserved ocean spaces.
    expect(offReserve.exceptionSpaceIds).toEqual(['08']);

    const mapCatalog: ImportMapReferenceCatalog = {
      aliases: [],
      allAwards: [],
      allMilestones: [],
      awards: [],
      maps: [{ code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' }],
      milestones: [],
    };
    const withException = detectImportBoardMapIndependent({
      catalog: mapCatalog,
      objectiveConfiguration: 'board_defined',
      objectiveEvidence: [],
      oceanSpaceIds: tileActionSet.oceanSpaceIds,
      offReserveOceanExceptionSpaceIds: offReserve.exceptionSpaceIds,
    });
    expect(withException.kind).toBe('confident');
    expect(withException.detectedMapCode).toBe('tharsis');

    const withoutException = detectImportBoardMapIndependent({
      catalog: mapCatalog,
      objectiveConfiguration: 'board_defined',
      objectiveEvidence: [],
      oceanSpaceIds: tileActionSet.oceanSpaceIds,
      offReserveOceanExceptionSpaceIds: [],
    });
    expect(withoutException.kind).not.toBe('confident');
  });

  it('printed objective aliases resolve through the persisted catalogue without fuzzy matching', () => {
    const text = fixture('synthetic-printed-alias-objectives-full-export.txt');
    const catalog: ImportMapReferenceCatalog = {
      aliases: [
        {
          aliasText: 'Collector',
          entityId: 'milestone-t-collector',
          entityType: 'milestone',
        },
        {
          aliasText: 'Vastitas Spacefarer',
          entityId: 'milestone-v-spacefarer',
          entityType: 'milestone',
        },
        {
          aliasText: 'Politician',
          entityId: 'award-t-politician',
          entityType: 'award',
        },
      ],
      allAwards: [{ id: 'award-t-politician', name: 'T. Politician' }],
      allMilestones: [
        { id: 'milestone-t-collector', name: 'T. Collector' },
        { id: 'milestone-v-spacefarer', name: 'V. Spacefarer' },
      ],
      awards: [
        {
          awardId: 'award-t-politician',
          awardName: 'T. Politician',
          mapId: 'map-tharsis',
        },
      ],
      maps: [{ code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' }],
      milestones: [
        {
          mapId: 'map-tharsis',
          milestoneId: 'milestone-t-collector',
          milestoneName: 'T. Collector',
        },
        {
          mapId: 'map-tharsis',
          milestoneId: 'milestone-v-spacefarer',
          milestoneName: 'V. Spacefarer',
        },
      ],
    };
    const parse = parseTerraformingMarsLog({
      catalog: catalog as never,
      exportedLogText: text,
      screenshotOcrText: null,
    });

    const byValue = new Map(
      parse.map.evidence.map((evidence) => [evidence.originalValue, evidence]),
    );
    expect(byValue.get('Collector')).toMatchObject({
      canonicalId: 'milestone-t-collector',
      resolution: 'alias',
    });
    expect(byValue.get('Vastitas Spacefarer')).toMatchObject({
      canonicalId: 'milestone-v-spacefarer',
      resolution: 'alias',
    });
    expect(byValue.get('Politician')).toMatchObject({
      canonicalId: 'award-t-politician',
      resolution: 'alias',
    });
    // No fuzzy matching: an unrecognized printed value stays unknown.
    expect(byValue.get('Completely Unknown Objective')).toMatchObject({
      canonicalId: null,
      resolution: 'unknown',
    });
  });
});
