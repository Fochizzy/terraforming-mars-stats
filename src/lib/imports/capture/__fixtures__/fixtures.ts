// Sanitized capture fixtures.
//
// Provenance and privacy: retained production exports were inspected read-only
// to learn the exact upstream line grammar (e.g. "<player> placed <tile> tile at
// NN", "<player> played <cost> <card>", "Generation N", "<player> passed",
// World Government global-parameter lines, and the Venus scale raise wording).
// An earlier revision of this header claimed that no retained production export
// contained Venus gameplay; that was wrong. At least one retained export does
// record Venus scale raises, so the Venus wording below is modelled on observed
// upstream phrasing rather than invented. No Colonies gameplay has been observed
// in a retained export, so those scenarios remain wholly invented. Every fixture
// below is format-faithful but fully sanitized: fictional player names
// (Ada/Bruno/Cira/Deb), no real player names, and no production identifiers or
// UUIDs. Each fixture records its source, export shape, and expected canonical
// result.

export type CaptureFixture = {
  expected: {
    coloniesState: string;
    finalVenusScale: number | null;
    notableEventTypes: string[];
    venusState: string;
  };
  exportDate: string;
  id: string;
  log: string;
  sanitization: string;
  scenario: string;
  source: string;
  upstreamVersion: string;
};

// A complete base-game export (no Venus, no Colonies). Faithful to the observed
// production "at NN" flat board format and "played <cost> <card>" grammar.
const BASE_NO_EXPANSIONS = [
  'Generation 1',
  'Ada played 16 Psyche',
  'Bruno played 12 Research Outpost',
  'Ada placed city tile at 19',
  'Bruno placed greenery tile at 20',
  'Ada claimed Builder milestone',
  'Bruno funded Banker award',
  'Ada passed',
  'Bruno passed',
  'Generation 2',
  'Bruno played 8 Space Elevator',
  'Bruno placed ocean tile at 44',
  'Ada acted as World Government and increased oxygen level',
  'Bruno won first place on Banker award',
  'Ada won second place on Banker award',
  'Bruno passed',
  'Ada passed',
].join('\n');

// Venus Next present: an explicit option, attributed and World-Government
// (unattributed) Venus raises, and a final Venus scale snapshot.
const VENUS_ONLY = [
  'venusNextExtension: true',
  'coloniesExtension: false',
  'Generation 1',
  'Ada played 20 Deuterium Export',
  'Ada increased Venus scale 2 step(s)',
  'Bruno acted as World Government and increased Venus scale 1 step(s)',
  'Ada placed city tile at 19',
  'Ada passed',
  'Bruno passed',
  'Generation 2',
  'Bruno increased Venus scale 2 step(s)',
  'Bruno passed',
  'Ada passed',
  'venus scale is 10',
].join('\n');

// Colonies present: build + trade + multiple colony actions.
const COLONIES_ONLY = [
  'coloniesExtension: true',
  'venusNextExtension: false',
  'Generation 1',
  'Ada built a colony on Titan',
  'Bruno built a colony on Enceladus',
  'Ada spent 9 MC to trade with Titan',
  'Ada placed greenery tile at 12',
  'Ada passed',
  'Bruno passed',
  'Generation 2',
  'Bruno traded with Enceladus',
  'Bruno built a colony on Titan',
  'Bruno passed',
  'Ada passed',
].join('\n');

// Both expansions present together.
const VENUS_AND_COLONIES = [
  'venusNextExtension: true',
  'coloniesExtension: true',
  'Generation 1',
  'Ada increased Venus scale 2 step(s)',
  'Bruno built a colony on Titan',
  'Bruno spent 9 MC to trade with Titan',
  'Ada placed ocean tile at 44',
  'Ada passed',
  'Bruno passed',
  'Generation 2',
  'Bruno increased Venus scale 1 step(s)',
  'Bruno passed',
  'Ada passed',
  'venus scale is 6',
].join('\n');

// Row/position board format plus an off-reserve ocean placement (row 5).
const ROW_POSITION_BOARD = [
  'Generation 1',
  'Ada placed city tile on row 3 position 4',
  'Bruno placed greenery tile on row 4 position 2',
  'Ada placed ocean tile on row 5 position 5',
  'Ada passed',
  'Bruno passed',
  'Generation 2',
  'Bruno passed',
  'Ada passed',
].join('\n');

// Venus raises in the observed upstream "removed an asteroid resource to
// increase Venus scale N step" wording, with no Venus option line and no
// terminal Venus scale summary. This is the shape that previously produced zero
// Venus events, because the raise wording matched no typed pattern and the
// generic Venus branch suppressed the evidence on account of the step digit.
const VENUS_ASTEROID_RAISES = [
  'Generation 1',
  'Ada played 16 Psyche',
  'Ada removed an asteroid resource to increase Venus scale 1 step',
  'Bruno played 12 Research Outpost',
  'Bruno removed an asteroid resource to increase Venus scale 1 step',
  'Ada placed city tile at 19',
  'Ada removed an asteroid resource to increase Venus scale 1 step',
  'Ada passed',
  'Bruno passed',
  'Generation 2',
  'Bruno removed an asteroid resource to increase Venus scale 1 step',
  'Ada removed an asteroid resource to increase Venus scale 1 step',
  'Bruno placed greenery tile at 20',
  'Bruno removed an asteroid resource to increase Venus scale 1 step',
  'Ada removed an asteroid resource to increase Venus scale 1 step',
  'Bruno passed',
  'Ada passed',
  'Generation 3',
  'Ada removed an asteroid resource to increase Venus scale 1 step',
  'Cira acted as World Government and removed an asteroid resource to increase Venus scale 1 step',
  'Ada passed',
  'Bruno passed',
].join('\n');

// Unsupported Venus wording that must be retained, not silently dropped or
// treated as authoritative absence.
const UNSUPPORTED_VENUS_WORDING = [
  'Generation 1',
  'Ada triggered the venus tracker somehow',
  'Ada played 16 Psyche',
  'Ada passed',
  'Bruno passed',
  'Generation 2',
  'Bruno passed',
  'Ada passed',
].join('\n');

export const captureFixtures: CaptureFixture[] = [
  {
    expected: {
      coloniesState: 'confirmed_absent',
      finalVenusScale: null,
      notableEventTypes: [
        'card_played', 'tile_placed', 'milestone_claimed', 'award_funded',
        'award_result', 'generation_started', 'player_passed',
      ],
      venusState: 'confirmed_absent',
    },
    exportDate: '2026-07-18',
    id: 'base_no_expansions',
    log: BASE_NO_EXPANSIONS,
    sanitization: 'fictional names; reconstructed from observed production export grammar; no real names or ids',
    scenario: 'Full base-game export, no Venus or Colonies',
    source: 'synthetic-format-faithful',
    upstreamVersion: 'tfm-web-log',
  },
  {
    expected: {
      coloniesState: 'confirmed_absent',
      finalVenusScale: 10,
      notableEventTypes: ['venus_raised', 'card_played', 'generation_started'],
      venusState: 'confirmed_present',
    },
    exportDate: '2026-07-18',
    id: 'venus_only',
    log: VENUS_ONLY,
    sanitization: 'fictional names; Venus content reproduced in sanitized form from observed upstream wording',
    scenario: 'Venus only, attributed + unattributed raises, final scale',
    source: 'synthetic-format-faithful',
    upstreamVersion: 'tfm-web-log',
  },
  {
    expected: {
      coloniesState: 'confirmed_present',
      finalVenusScale: null,
      notableEventTypes: ['built_colony', 'traded_with_colony', 'generation_started'],
      venusState: 'confirmed_absent',
    },
    exportDate: '2026-07-18',
    id: 'colonies_only',
    log: COLONIES_ONLY,
    sanitization: 'fictional names; synthetic Colonies content',
    scenario: 'Colonies only, build + trade + multiple actions',
    source: 'synthetic-format-faithful',
    upstreamVersion: 'tfm-web-log',
  },
  {
    expected: {
      coloniesState: 'confirmed_present',
      finalVenusScale: 6,
      notableEventTypes: ['venus_raised', 'built_colony', 'traded_with_colony'],
      venusState: 'confirmed_present',
    },
    exportDate: '2026-07-18',
    id: 'venus_and_colonies',
    log: VENUS_AND_COLONIES,
    sanitization: 'fictional names; synthetic Venus + Colonies content',
    scenario: 'Venus and Colonies together',
    source: 'synthetic-format-faithful',
    upstreamVersion: 'tfm-web-log',
  },
  {
    expected: {
      coloniesState: 'confirmed_absent',
      finalVenusScale: null,
      notableEventTypes: ['tile_placed'],
      venusState: 'confirmed_absent',
    },
    exportDate: '2026-07-18',
    id: 'row_position_board',
    log: ROW_POSITION_BOARD,
    sanitization: 'fictional names; synthetic row/position placements',
    scenario: 'Row/position board format + off-reserve ocean',
    source: 'synthetic-format-faithful',
    upstreamVersion: 'tfm-web-log',
  },
  {
    expected: {
      coloniesState: 'confirmed_absent',
      finalVenusScale: null,
      notableEventTypes: [
        'venus_raised', 'card_played', 'tile_placed', 'generation_started',
        'player_passed',
      ],
      venusState: 'confirmed_present',
    },
    exportDate: '2026-07-21',
    id: 'venus_asteroid_raises',
    log: VENUS_ASTEROID_RAISES,
    sanitization: 'fictional names; observed upstream Venus raise wording, no real names or ids',
    scenario: 'Venus raises via asteroid removal; no option line, no terminal scale',
    source: 'synthetic-format-faithful',
    upstreamVersion: 'tfm-web-log',
  },
  {
    expected: {
      coloniesState: 'confirmed_absent',
      finalVenusScale: null,
      notableEventTypes: ['card_played'],
      venusState: 'unsupported_log_pattern',
    },
    exportDate: '2026-07-18',
    id: 'unsupported_venus_wording',
    log: UNSUPPORTED_VENUS_WORDING,
    sanitization: 'fictional names; synthetic unsupported wording',
    scenario: 'Unsupported Venus wording retained as evidence',
    source: 'synthetic-format-faithful',
    upstreamVersion: 'tfm-web-log',
  },
];

export function getFixture(id: string): CaptureFixture {
  const fixture = captureFixtures.find((entry) => entry.id === id);
  if (!fixture) {
    throw new Error(`Unknown capture fixture: ${id}`);
  }
  return fixture;
}
