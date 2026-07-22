// Fixture-to-persistence bridge (audit F-09/H4).
//
// Drives the REAL production import entry point (createImportDraft — the
// same orchestration the deployed server action binds) for one
// synthetic-but-format-faithful fixture per mechanic category, with
// recording dependencies at the database boundary, then emits a SQL script
// that replays the captured persistence payloads through the REAL
// replace_game_log_events RPC and expansion-fact upsert inside the
// disposable PostgreSQL harness. fixture-assertions.sql then asserts the
// persisted rows. Chain per fixture:
//   real action entry → original-byte hashing → real parsers → real event
//   builder → real RPC → database assertions.
//
// The conflicting-evidence record is the one documented deviation: explicit
// absent-option evidence is not constructible through the action's trusted
// inputs today (the only trusted option source, the result PDF, only ever
// asserts presence), so that record enters at the parser/fact-builder layer
// and persists through the same fact path.
//
// Run via run.sh with:
//   FIXTURE_OUT_SQL, THARSIS_MAP_ID, GROUP_ID, USER_ID, PLAYER_A_ID, PLAYER_B_ID

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createImportDraft } from '@/app/(app)/log-game/import/create-import-draft';
import type { CreateImportDraftInput } from '@/lib/imports/build-import-draft';
import {
  buildGameExpansionFactInput,
  parseTerraformingMarsExpansionMechanics,
} from '@/lib/imports/parse-terraforming-mars-expansion-mechanics';
import type { ImportedPlayerResolution } from '@/lib/player-identity/guest-identity';

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

const OUT_SQL = env('FIXTURE_OUT_SQL');
const THARSIS_MAP_ID = env('THARSIS_MAP_ID');
const GROUP_ID = env('GROUP_ID');
const USER_ID = env('USER_ID');
const PLAYER_A_ID = env('PLAYER_A_ID');
const PLAYER_B_ID = env('PLAYER_B_ID');

// Deterministic ids shared with seed.sql.
const CARD_ARTIFICIAL_LAKE = 'f1c0a11e-0000-4000-8000-000000000116';
const CARD_SPONSORS = 'f1c0a11e-0000-4000-8000-000000000201';
const CARD_MINING_COLONY = 'f1c0a11e-0000-4000-8000-000000000202';
const MILESTONE_MAYOR = 'a1b20001-a1b2-4001-8001-000000000001';
const AWARD_BANKER = 'a1b20002-a1b2-4002-8002-000000000002';
// Canonical objective rows seeded by seed.sql / the alias migration.
const MILESTONE_T_COLLECTOR = '36eff4af-3a88-4fea-80cd-20f2180baf3c';
const MILESTONE_V_SPACEFARER = '4ef30867-fd6d-4560-bf48-6ed740d69916';
const AWARD_T_POLITICIAN = 'ccb8a36c-c4fb-4cb6-a989-313880892879';
const AWARD_A_ENGINEER = '02d084b4-3856-444d-80cb-71b6fc800ef7';

const fixturesDir = resolve(process.cwd(), 'src/lib/imports/fixtures');
const fixtureText = (name: string) =>
  readFileSync(resolve(fixturesDir, name), 'utf8');

// The reference audit requires a fixed map to carry exactly five milestones
// and five awards, so the catalog completes Tharsis with two filler
// objectives per kind (catalog-only; events never reference objective ids).
const MILESTONE_FILLER_1 = 'a1b20003-a1b2-4003-8003-000000000003';
const MILESTONE_FILLER_2 = 'a1b20004-a1b2-4004-8004-000000000004';
const AWARD_FILLER_1 = 'a1b20005-a1b2-4005-8005-000000000005';
const AWARD_FILLER_2 = 'a1b20006-a1b2-4006-8006-000000000006';

const referenceCatalog = {
  aliases: [
    { aliasText: 'Collector', entityId: MILESTONE_T_COLLECTOR, entityType: 'milestone' },
    { aliasText: 'Vastitas Spacefarer', entityId: MILESTONE_V_SPACEFARER, entityType: 'milestone' },
    { aliasText: 'Politician', entityId: AWARD_T_POLITICIAN, entityType: 'award' },
  ],
  allAwards: [
    { id: AWARD_BANKER, name: 'Banker' },
    { id: AWARD_T_POLITICIAN, name: 'T. Politician' },
    { id: AWARD_A_ENGINEER, name: 'A. Engineer' },
    { id: AWARD_FILLER_1, name: 'Scientist' },
    { id: AWARD_FILLER_2, name: 'Thermalist' },
  ],
  allMilestones: [
    { id: MILESTONE_MAYOR, name: 'Mayor' },
    { id: MILESTONE_T_COLLECTOR, name: 'T. Collector' },
    { id: MILESTONE_V_SPACEFARER, name: 'V. Spacefarer' },
    { id: MILESTONE_FILLER_1, name: 'Gardener' },
    { id: MILESTONE_FILLER_2, name: 'Builder' },
  ],
  awards: [
    { awardId: AWARD_BANKER, awardName: 'Banker', mapId: THARSIS_MAP_ID },
    { awardId: AWARD_T_POLITICIAN, awardName: 'T. Politician', mapId: THARSIS_MAP_ID },
    { awardId: AWARD_A_ENGINEER, awardName: 'A. Engineer', mapId: THARSIS_MAP_ID },
    { awardId: AWARD_FILLER_1, awardName: 'Scientist', mapId: THARSIS_MAP_ID },
    { awardId: AWARD_FILLER_2, awardName: 'Thermalist', mapId: THARSIS_MAP_ID },
  ],
  cards: [
    { cardName: 'Artificial Lake', cardNumber: '116', expansionCode: 'base', id: CARD_ARTIFICIAL_LAKE, promoSetSlug: null },
    { cardName: 'Sponsors', cardNumber: '201', expansionCode: 'base', id: CARD_SPONSORS, promoSetSlug: null },
    { cardName: 'Mining Colony', cardNumber: '202', expansionCode: 'colonies', id: CARD_MINING_COLONY, promoSetSlug: null },
  ],
  corporations: [],
  entityAliases: [],
  maps: [{ code: 'tharsis', id: THARSIS_MAP_ID, name: 'Tharsis' }],
  milestones: [
    { mapId: THARSIS_MAP_ID, milestoneId: MILESTONE_MAYOR, milestoneName: 'Mayor' },
    { mapId: THARSIS_MAP_ID, milestoneId: MILESTONE_T_COLLECTOR, milestoneName: 'T. Collector' },
    { mapId: THARSIS_MAP_ID, milestoneId: MILESTONE_V_SPACEFARER, milestoneName: 'V. Spacefarer' },
    { mapId: THARSIS_MAP_ID, milestoneId: MILESTONE_FILLER_1, milestoneName: 'Gardener' },
    { mapId: THARSIS_MAP_ID, milestoneId: MILESTONE_FILLER_2, milestoneName: 'Builder' },
  ],
  preludes: [],
};

const scoreRow = (name: string, normalized: string) => ({
  awardPoints: 0,
  cardPointsAnimals: null,
  cardPointsJovian: null,
  cardPointsMicrobes: null,
  cardPointsTotal: 10,
  citiesPoints: 2,
  finalMegacredits: 20,
  greeneryPoints: 3,
  milestonePoints: 5,
  normalizedPlayerName: normalized,
  originalPlayerName: name,
  sourceWords: [],
  status: 'exact_base_layout' as const,
  totalPoints: 55,
  trPoints: 35,
  unsupportedComponentCount: 0,
});

const playerIdentities = [
  {
    mode: 'existing_player' as const,
    selectedPlayerId: PLAYER_A_ID,
    sourcePlayerText: 'Player A',
    valueSource: 'imported' as const,
  },
  {
    mode: 'existing_player' as const,
    selectedPlayerId: PLAYER_B_ID,
    sourcePlayerText: 'Player B',
    valueSource: 'imported' as const,
  },
];

const playerResolutions: ImportedPlayerResolution[] = [
  {
    decision: 'linked',
    identityMode: 'existing_player',
    parserIdentity: 'terraforming-mars-exported-log-v1',
    selectedPlayerId: PLAYER_A_ID,
    sourceFormat: 'terraforming_mars_exported_log',
    sourcePlayerText: 'Player A',
    state: 'linked_registered_player',
    valueSource: 'imported',
  },
  {
    decision: 'linked',
    identityMode: 'existing_player',
    parserIdentity: 'terraforming-mars-exported-log-v1',
    selectedPlayerId: PLAYER_B_ID,
    sourceFormat: 'terraforming_mars_exported_log',
    sourcePlayerText: 'Player B',
    state: 'linked_registered_player',
    valueSource: 'imported',
  },
];

type Captured = {
  events: unknown[];
  expansionFacts: Record<string, unknown>;
  rawLogText: string;
  sourceEvidence: {
    originalByteLength: number;
    originalSha256: string;
    parserRunIdentity: string;
  };
  summary: Record<string, unknown>;
  parserVersion: string;
};

async function runActionForFixture(input: {
  file: string;
  objectiveCorrections?: Array<{
    canonicalId: string;
    lineNumber: number;
    type: 'award' | 'milestone';
  }>;
}): Promise<Captured> {
  const text = fixtureText(input.file);
  const captured: Partial<Captured> = {};

  if (process.env['FIXTURE_DEBUG']) {
    const { parseTerraformingMarsLog } = await import(
      '@/lib/imports/parse-terraforming-mars-log'
    );
    const { parseTerraformingMarsTileActions } = await import(
      '@/lib/imports/parse-terraforming-mars-tile-actions'
    );
    const { detectImportBoardMapIndependent } = await import(
      '@/lib/imports/detect-import-board-map-independent'
    );
    const debugParse = parseTerraformingMarsLog({
      catalog: referenceCatalog as never,
      exportedLogText: text.trim(),
      screenshotOcrText: null,
    });
    const debugTiles = parseTerraformingMarsTileActions(text.trim());
    const debugDetect = detectImportBoardMapIndependent({
      catalog: referenceCatalog as never,
      objectiveConfiguration: 'board_defined',
      objectiveEvidence: debugParse.map.evidence,
      oceanSpaceIds: debugTiles.oceanSpaceIds,
      offReserveOceanExceptionSpaceIds: [],
    });
    console.error(`[debug ${input.file}]`, {
      blockingIssues: debugParse.referenceAudit.blockingIssues,
      detect: {
        candidates: debugDetect.candidates,
        kind: debugDetect.kind,
        message: debugDetect.message,
      },
      oceans: debugTiles.oceanSpaceIds,
    });
  }

  const values: CreateImportDraftInput = {
    endgameScreenshot: null,
    exportedGameLog: text,
    generationCount: 3,
    mapId: THARSIS_MAP_ID,
    objectiveConfiguration: 'board_defined',
    objectiveCorrections: input.objectiveCorrections ?? [],
    playedOn: '2026-07-19',
    playerCount: 2,
    playerIdentities,
    scoreRows: [scoreRow('Player A', 'player a'), scoreRow('Player B', 'player b')],
  };

  const result = await createImportDraft(values, {
    attachImportIdentityStaging: async () => true,
    correctAndSaveOcrText: async () => {
      throw new Error('OCR must not run for these fixtures');
    },
    discardImportIdentityStaging: async () => undefined,
    findDuplicateGameLogImportSources: async () => ({
      deployedRpcDetected: false,
      matches: [],
    }),
    getGroupSettings: async () => ({
      defaultGuaranteedMergerOffer: true,
      defaultMapId: null,
      defaultPromoSetSlugs: [],
      globalAnalyticsEnabled: false,
      groupId: GROUP_ID,
      groupName: 'Executable Fixture Group',
    }),
    listImportGameReferenceCatalog: async () => referenceCatalog as never,
    markGameLogImportRunComplete: async () => undefined,
    requireCurrentGroupContext: async () => ({
      groupId: GROUP_ID,
      groupName: 'Executable Fixture Group',
      role: 'editor',
      userId: USER_ID,
    }),
    stageImportPlayerIdentityEvidence: async () => 'recorded-staging',
    resolveImportPlayerIdentities: async () => playerResolutions,
    revalidatePath: () => undefined,
    saveDraftGame: async () => ({ gameId: 'recorded-draft' }),
    saveGameExpansionFacts: async (factsInput) => {
      captured.expansionFacts = factsInput.facts as never;
      return undefined as never;
    },
    saveGameLogImport: async (importInput) => {
      captured.rawLogText = importInput.rawLogText;
      captured.sourceEvidence = importInput.sourceEvidence as never;
      captured.summary = importInput.parseMetadata
        ?.confidenceSummary as never;
      captured.parserVersion =
        importInput.parseMetadata?.parserVersion ?? 'unknown';
      return { id: 'recorded-import', screenshotObjectPath: null };
    },
    saveParsedGameLogEvents: async (eventsInput) => {
      captured.events = eventsInput.events as never;
      return [] as never;
    },
  });

  if (result.status !== 'success') {
    throw new Error(
      `Fixture ${input.file} did not import successfully: ${JSON.stringify(result)}`,
    );
  }
  if (
    captured.events === undefined ||
    captured.expansionFacts === undefined ||
    captured.rawLogText === undefined ||
    captured.sourceEvidence === undefined
  ) {
    throw new Error(`Fixture ${input.file} did not reach every persistence boundary`);
  }
  if (captured.rawLogText !== text) {
    throw new Error(
      `Fixture ${input.file}: stored text does not match the submitted original`,
    );
  }
  return captured as Captured;
}

function expectState(
  file: string,
  facts: Record<string, unknown>,
  key: 'coloniesState' | 'venusNextState',
  expected: string,
) {
  if (facts[key] !== expected) {
    throw new Error(
      `Fixture ${file}: expected ${key}=${expected}, got ${String(facts[key])}`,
    );
  }
}

function sqlText(tag: string, text: string) {
  if (text.includes(`$${tag}$`)) {
    throw new Error(`Dollar-quote tag collision for ${tag}`);
  }
  return `$${tag}$${text}$${tag}$`;
}

type EmittedFixture = {
  captured: Captured;
  expectations: Record<string, unknown>;
  gameId: string;
  importId: string;
  key: string;
};

async function main() {
  const emitted: EmittedFixture[] = [];
  let index = 0;

  const register = async (input: {
    expect: (captured: Captured) => Record<string, unknown>;
    file: string;
    key: string;
    objectiveCorrections?: Array<{
      canonicalId: string;
      lineNumber: number;
      type: 'award' | 'milestone';
    }>;
  }) => {
    index += 1;
    const captured = await runActionForFixture(input);
    const suffix = String(index).padStart(2, '0');
    emitted.push({
      captured,
      expectations: input.expect(captured),
      gameId: `fabf00${suffix}-0000-4000-8000-00000000f00${suffix.slice(-1)}`,
      importId: `fabf00${suffix}-1111-4111-8111-00000000f00${suffix.slice(-1)}`,
      key: input.key,
    });
  };

  await register({
    expect: (captured) => {
      const facts = captured.expansionFacts;
      expectState(
        'synthetic-venus-only-full-export.txt',
        facts,
        'venusNextState',
        'confirmed_present',
      );
      expectState(
        'synthetic-venus-only-full-export.txt',
        facts,
        'coloniesState',
        'confirmed_absent',
      );
      if (facts['finalVenusScale'] !== null) {
        throw new Error('venus fixture: final Venus scale must stay null');
      }
      return { has_wg_unattributed: true };
    },
    file: 'synthetic-venus-only-full-export.txt',
    key: 'venus_only',
  });

  await register({
    expect: (captured) => {
      const facts = captured.expansionFacts;
      expectState(
        'synthetic-colonies-only-full-export.txt',
        facts,
        'coloniesState',
        'confirmed_present',
      );
      expectState(
        'synthetic-colonies-only-full-export.txt',
        facts,
        'venusNextState',
        'confirmed_absent',
      );
      if ((facts['colonyBuiltCount'] as number) < 1) {
        throw new Error('colonies fixture: expected at least one colony build');
      }
      if ((facts['colonyTradeCount'] as number) < 1) {
        throw new Error('colonies fixture: expected at least one colony trade');
      }
      return {};
    },
    file: 'synthetic-colonies-only-full-export.txt',
    key: 'colonies_only',
  });

  await register({
    expect: (captured) => {
      const grid = (captured.events as Array<Record<string, unknown>>).filter(
        (event) => event['placement_format'] === 'grid',
      );
      if (grid.length !== 5) {
        throw new Error(`grid fixture: expected 5 grid placements, got ${grid.length}`);
      }
      return { grid_placements: 5 };
    },
    file: 'synthetic-grid-placement-full-export.txt',
    key: 'grid_placement',
  });

  await register({
    expect: (captured) => {
      const oceanAt08 = (
        captured.events as Array<Record<string, unknown>>
      ).find(
        (event) =>
          event['event_type'] === 'tile_placed' &&
          event['board_space'] === '08',
      );
      if (oceanAt08?.['source_entity'] !== CARD_ARTIFICIAL_LAKE) {
        throw new Error(
          'off-reserve fixture: the exception ocean must record its source card',
        );
      }
      return { exception_source_card: CARD_ARTIFICIAL_LAKE };
    },
    file: 'synthetic-off-reserve-ocean-full-export.txt',
    key: 'off_reserve_exception',
  });

  await register({
    expect: (captured) => {
      const objectiveEvents = (
        captured.events as Array<Record<string, unknown>>
      ).filter(
        (event) =>
          event['event_type'] === 'milestone_claimed' ||
          event['event_type'] === 'award_funded',
      );
      if (objectiveEvents.length !== 4) {
        throw new Error(
          `alias fixture: expected 4 objective events, got ${objectiveEvents.length}`,
        );
      }
      const reviewed = objectiveEvents.filter(
        (event) => event['review_state'] === 'reviewed',
      );
      if (reviewed.length !== 1) {
        throw new Error(
          'alias fixture: exactly the importer-corrected objective must be reviewed',
        );
      }
      return { reviewed_objective_events: 1 };
    },
    file: 'synthetic-printed-alias-objectives-full-export.txt',
    key: 'printed_alias',
    objectiveCorrections: [
      { canonicalId: AWARD_A_ENGINEER, lineNumber: 11, type: 'award' },
    ],
  });

  await register({
    expect: (captured) => {
      const facts = captured.expansionFacts;
      expectState(
        'synthetic-unsupported-venus-colonies-full-export.txt',
        facts,
        'venusNextState',
        'unsupported_log_pattern',
      );
      expectState(
        'synthetic-unsupported-venus-colonies-full-export.txt',
        facts,
        'coloniesState',
        'unsupported_log_pattern',
      );
      return {};
    },
    file: 'synthetic-unsupported-venus-colonies-full-export.txt',
    key: 'unsupported_pattern',
  });

  // Conflicting evidence (documented deviation — parser/fact layer): the
  // venus-positive log against explicit absent option evidence.
  const conflictingParse = parseTerraformingMarsExpansionMechanics({
    exportedLogText: fixtureText('synthetic-venus-only-full-export.txt').trim(),
    optionEvidence: {
      colonies: false,
      originalEvidence:
        'Synthetic explicit-option evidence: Venus Next and Colonies disabled.',
      source: 'result_pdf_global_parameters',
      venusNext: false,
    },
    playerResolutions: playerResolutions.map(
      ({ selectedPlayerId, sourcePlayerText }) => ({
        selectedPlayerId,
        sourcePlayerText,
      }),
    ),
  });
  const conflictingFacts = buildGameExpansionFactInput(conflictingParse);
  if (conflictingFacts.venusNextState !== 'conflicting_evidence') {
    throw new Error(
      `conflicting record: expected conflicting_evidence, got ${conflictingFacts.venusNextState}`,
    );
  }
  if (conflictingFacts.finalVenusScale !== null) {
    throw new Error('conflicting record: final Venus scale must stay null');
  }

  // ---- Emit the SQL ----
  const lines: string[] = [];
  lines.push('-- GENERATED by build-fixture-payloads.ts — do not edit.');
  lines.push('-- Applies the captured production-action persistence payloads');
  lines.push('-- through the real RPC; fixture-assertions.sql verifies the rows.');
  lines.push('create schema if not exists harness;');
  lines.push(`create table if not exists harness.fixture_expectations (
  fixture_key text primary key,
  game_id uuid not null,
  import_id uuid not null,
  original_sha256 text not null,
  original_byte_length integer not null,
  parser_run_identity text not null,
  venus_state text not null,
  colonies_state text not null,
  venus_event_count integer not null,
  colony_built_count integer not null,
  colony_trade_count integer not null,
  final_venus_is_null boolean not null,
  total_events integer not null,
  needs_review_events integer not null,
  reviewed_events integer not null,
  grid_placements integer not null,
  has_wg_unattributed boolean not null,
  exception_source_card uuid
);`);
  lines.push('truncate harness.fixture_expectations;');

  for (const fixture of emitted) {
    const events = fixture.captured.events as Array<Record<string, unknown>>;
    const facts = fixture.captured.expansionFacts;
    const needsReview = events.filter(
      (event) => event['review_state'] === 'needs_review',
    ).length;
    const reviewed = events.filter(
      (event) => event['review_state'] === 'reviewed',
    ).length;
    const grid = events.filter(
      (event) => event['placement_format'] === 'grid',
    ).length;

    lines.push(`
-- ===== fixture: ${fixture.key} =====
insert into harness.fixture_expectations values (
  '${fixture.key}', '${fixture.gameId}', '${fixture.importId}',
  '${fixture.captured.sourceEvidence.originalSha256}',
  ${fixture.captured.sourceEvidence.originalByteLength},
  '${fixture.captured.sourceEvidence.parserRunIdentity}',
  '${String(facts['venusNextState'])}', '${String(facts['coloniesState'])}',
  ${Number(facts['venusEventCount'])}, ${Number(facts['colonyBuiltCount'])},
  ${Number(facts['colonyTradeCount'])},
  ${facts['finalVenusScale'] === null ? 'true' : 'false'},
  ${events.length}, ${needsReview}, ${reviewed}, ${grid},
  ${fixture.expectations['has_wg_unattributed'] === true ? 'true' : 'false'},
  ${
    fixture.expectations['exception_source_card']
      ? `'${String(fixture.expectations['exception_source_card'])}'`
      : 'null'
  }
);

insert into public.games (
  id, group_id, played_on, player_count, generation_count, map_id,
  created_by_user_id, updated_by_user_id
) values (
  '${fixture.gameId}', '${GROUP_ID}', '2026-07-19', 2, 3, '${THARSIS_MAP_ID}',
  '${USER_ID}', '${USER_ID}'
);

insert into public.game_log_imports (
  id, game_id, created_by_user_id, raw_log_text, parser_version,
  detected_source, original_source_sha256, original_source_byte_length,
  parser_run_identity, confidence_summary
) values (
  '${fixture.importId}', '${fixture.gameId}', '${USER_ID}',
  ${sqlText(`src_${fixture.key}`, fixture.captured.rawLogText)},
  '${fixture.captured.parserVersion}',
  'terraforming_mars_exported_log',
  '${fixture.captured.sourceEvidence.originalSha256}',
  ${fixture.captured.sourceEvidence.originalByteLength},
  '${fixture.captured.sourceEvidence.parserRunIdentity}',
  ${sqlText(
    `sum_${fixture.key}`,
    JSON.stringify({
      run: { state: 'persisting' },
      source: fixture.captured.summary['source'],
    }),
  )}::jsonb
);

begin;
select set_config('request.jwt.claim.sub', '${USER_ID}', true);
set local role authenticated;
select count(*) from public.replace_game_log_events(
  '${fixture.importId}'::uuid,
  ${sqlText(`ev_${fixture.key}`, JSON.stringify(events))}::jsonb
);
reset role;
commit;

insert into public.game_expansion_facts (
  game_id, source_game_log_import_id, venus_next_state, colonies_state,
  detection_provenance, parser_version, source_coverage, final_venus_scale,
  venus_event_count, colony_built_count, colony_trade_count
) values (
  '${fixture.gameId}', '${fixture.importId}',
  '${String(facts['venusNextState'])}', '${String(facts['coloniesState'])}',
  ${sqlText(
    `prov_${fixture.key}`,
    JSON.stringify(facts['detectionProvenance'] ?? {}),
  )}::jsonb,
  '${String(facts['parserVersion'])}',
  ${sqlText(
    `cov_${fixture.key}`,
    JSON.stringify(facts['sourceCoverage'] ?? {}),
  )}::jsonb,
  ${facts['finalVenusScale'] === null ? 'null' : Number(facts['finalVenusScale'])},
  ${Number(facts['venusEventCount'])}, ${Number(facts['colonyBuiltCount'])},
  ${Number(facts['colonyTradeCount'])}
)
on conflict (game_id) do update set
  venus_next_state = excluded.venus_next_state,
  colonies_state = excluded.colonies_state,
  final_venus_scale = excluded.final_venus_scale,
  venus_event_count = excluded.venus_event_count,
  colony_built_count = excluded.colony_built_count,
  colony_trade_count = excluded.colony_trade_count;

update public.game_log_imports
set confidence_summary = jsonb_set(confidence_summary, '{run,state}', '"complete"')
where id = '${fixture.importId}';`);
  }

  // Conflicting-evidence record (facts-only, documented deviation above).
  lines.push(`
-- ===== fixture: conflicting_evidence (parser/fact layer) =====
insert into harness.fixture_expectations values (
  'conflicting_evidence',
  'fabf0099-0000-4000-8000-00000000f099',
  'fabf0099-1111-4111-8111-00000000f099',
  'n/a', 0, 'n/a',
  '${conflictingFacts.venusNextState}', '${conflictingFacts.coloniesState}',
  ${conflictingFacts.venusEventCount}, ${conflictingFacts.colonyBuiltCount},
  ${conflictingFacts.colonyTradeCount},
  ${conflictingFacts.finalVenusScale === null ? 'true' : 'false'},
  0, 0, 0, 0, false, null
);

insert into public.games (
  id, group_id, played_on, player_count, generation_count, map_id,
  created_by_user_id, updated_by_user_id
) values (
  'fabf0099-0000-4000-8000-00000000f099', '${GROUP_ID}', '2026-07-19', 2, 3,
  '${THARSIS_MAP_ID}', '${USER_ID}', '${USER_ID}'
);

insert into public.game_expansion_facts (
  game_id, venus_next_state, colonies_state, detection_provenance,
  parser_version, source_coverage, final_venus_scale, venus_event_count,
  colony_built_count, colony_trade_count
) values (
  'fabf0099-0000-4000-8000-00000000f099',
  '${conflictingFacts.venusNextState}', '${conflictingFacts.coloniesState}',
  ${sqlText('prov_conflict', JSON.stringify(conflictingFacts.detectionProvenance ?? {}))}::jsonb,
  '${conflictingFacts.parserVersion}',
  ${sqlText('cov_conflict', JSON.stringify(conflictingFacts.sourceCoverage ?? {}))}::jsonb,
  null,
  ${conflictingFacts.venusEventCount}, ${conflictingFacts.colonyBuiltCount},
  ${conflictingFacts.colonyTradeCount}
);`);

  writeFileSync(OUT_SQL, `${lines.join('\n')}\n`, 'utf8');
  console.log(
    `fixture bridge: captured ${emitted.length} action-driven fixtures + 1 parser-layer record → ${OUT_SQL}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
