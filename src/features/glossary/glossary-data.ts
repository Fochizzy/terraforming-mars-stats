export type GlossarySemanticStatus =
  | 'established'
  | 'provisional'
  | 'unavailable'
  | 'deferred';

export type GlossaryTerm = {
  slug: string;
  term: string;
  aliases: readonly string[];
  definition?: string;
  semanticStatus?: GlossarySemanticStatus;
};

export type GlossaryCategory = {
  id: string;
  title: string;
  blurb: string;
  terms: readonly GlossaryTerm[];
};

function established(
  slug: string,
  term: string,
  aliases: readonly string[] = [],
  definition?: string,
): GlossaryTerm {
  return { slug, term, aliases, definition, semanticStatus: 'established' };
}

function provisional(
  slug: string,
  term: string,
  aliases: readonly string[] = [],
  definition?: string,
): GlossaryTerm {
  return { slug, term, aliases, definition, semanticStatus: 'provisional' };
}

function deferred(
  slug: string,
  term: string,
  aliases: readonly string[] = [],
): GlossaryTerm {
  return { slug, term, aliases, semanticStatus: 'deferred' };
}

function unavailable(
  slug: string,
  term: string,
  aliases: readonly string[] = [],
  definition?: string,
): GlossaryTerm {
  return { slug, term, aliases, definition, semanticStatus: 'unavailable' };
}

export const glossaryCategories: readonly GlossaryCategory[] = [
  {
    id: 'standings',
    title: 'Ranking & Standings',
    blurb: 'Terms used when reading recorded results, placement, and samples.',
    terms: [
      deferred('weighted-score', 'Weighted Score', [
        'weighted leaderboard',
        'weighted leaderboard form',
      ]),
      established(
        'win-rate',
        'Win Rate',
        ['win rates'],
        'The share of eligible finalized player-game results recorded as wins. The population, winner handling, and coverage must be named by the metric that displays it.',
      ),
      established(
        'average-placement',
        'Average Placement',
        ['avg place', 'average place'],
        'The average of recorded finishing placements for an explicitly identified eligible set of finalized games. Lower placement numbers indicate a higher finish.',
      ),
      established(
        'average-score',
        'Average Score',
        ['avg score', 'average VP', 'avg VP'],
        'The average recorded final victory-point total for an explicitly identified eligible set of finalized player-game results.',
      ),
      deferred('score-margin', 'Score Margin', [
        'average point margin',
        'avg margin',
        'score edge',
        'score differential',
      ]),
      established(
        'finish-distribution',
        'Finish Distribution',
        [],
        'A count or share of recorded placements, shown with its population and any tie treatment.',
      ),
      established(
        'sample-size',
        'Sample Size',
        ['samples', 'sample floor'],
        'The candidate, eligible, included, and excluded observations behind a metric. A displayed count must not stand in for coverage or a minimum-sample decision.',
      ),
      deferred('confidence', 'Confidence'),
      provisional(
        'trend-over-time',
        'Trend Over Time',
        ['trend lines', 'trend line', 'score trends'],
        'A chronological view of recorded observations. It is available only when the source, coverage, and aggregation contract for the displayed metric are supported.',
      ),
      deferred('play-rate', 'Play Rate', [
        'playrate',
        'global playrate',
        'your playrate',
        'played rate',
      ]),
      deferred('win-rate-delta', 'Win Rate Delta', [
        'delta',
        'win-rate lift',
        'win rate lift',
        'victory impact',
        'loss impact',
      ]),
      deferred('score-deviation', 'Score Deviation', ['Score SD', 'score SD']),
      established(
        'win-point-differential',
        'Win Point Differential',
        ['win point margin', 'winner margin'],
        'For a qualifying sole winner, final score minus the highest final score among non-winners. Tied-first games remain indeterminate unless a later approved policy defines a numeric result.',
      ),
    ],
  },
  {
    id: 'scope-views',
    title: 'Scope & Views',
    blurb: 'Historical navigation and view terms retained for compatible links.',
    terms: [
      deferred('scope', 'Scope (Overall vs Selected Group)', [
        'Insight scope',
        'Selected Group',
      ]),
      deferred('player-focus', 'Player Focus'),
      deferred('insights-lab', 'Insights Lab', [
        'Group Insights Lab',
        'Individual Insights Lab',
      ]),
      deferred('combination-lens', 'Combination Lens', [
        'combination view',
        'selected mix',
      ]),
      deferred('overall-view', 'Overall', ['overall record', 'cross-group lens']),
      deferred('shared-games', 'Shared Games'),
      deferred('personal-vs-global', 'Your Games vs All Recorded Games', [
        'Your Games',
        'All Recorded Games',
        'personal games',
      ]),
      deferred('global-statistics', 'Global Statistics', [
        'Global Meta Snapshot',
        'global meta',
        'app-wide page',
      ]),
      deferred('insight-card', 'Insight Card'),
      deferred('score-source-radar', 'Score Source Radar', [
        'score-source radar',
        'score source patterns',
      ]),
      deferred('score-profile', 'Score Profile', [
        'Group Score Profile',
        'Overall Score Profile',
        'Combination Score Profile',
      ]),
    ],
  },
  {
    id: 'play-styles',
    title: 'Play Styles',
    blurb: 'Plain-language names for recorded or inferred strategic archetypes.',
    terms: [
      provisional('play-style', 'Play Style', [
        'play styles',
        'style identity',
        'style profile',
      ], 'A recorded or inferred strategic archetype. A label is not causal evidence and the current product must identify its source and coverage.'),
      provisional('declared-style', 'Declared Style', [], 'An optional style label recorded by a player for a game. Absence is not a statement that a player had no strategy.'),
      provisional('inferred-style', 'Inferred Style', [], 'A derived style label based on a documented rule. It remains distinct from a player-declared style and must retain its provenance.'),
      provisional('style-agreement', 'Style Agreement', [], 'A comparison between recorded declared and inferred style labels when both are available. Its rule and coverage must be identified by the metric that uses it.'),
      provisional('style-modifier', 'Style Modifier', [], 'An optional secondary style label that describes a supporting plan.'),
      established('style-balanced', 'Balanced (style)', [], 'A descriptive style that spreads scoring across more than one route rather than concentrating on one source.'),
      established('style-board-control', 'Board Control (style)', [], 'A descriptive style focused on board placement, adjacency, and competition for map spaces.'),
      established('style-engine-building', 'Engine Building (style)', ['Engine Builder', 'engine builder'], 'A descriptive style that develops repeatable production, discounts, or effects before converting them into later value.'),
      established('style-jovian-payoff', 'Jovian Payoff (style)', [], 'A descriptive style built around Jovian tags and cards whose value can scale with them.'),
      established('style-terraform-rush', 'Terraform Rush (style)', ['Terraforming Rush', 'terraforming rush'], 'A descriptive style focused on advancing global parameters quickly.'),
      established('style-milestone-aggression', 'Milestone Aggression (style)', ['Milestone Race', 'milestone race'], 'A descriptive style focused on claiming milestones before opponents.'),
      established('style-award-pressure', 'Award Pressure (style)', [], 'A descriptive style focused on funding or leading awards.'),
      established('style-award-closer', 'Award Closer (style)', [], 'A descriptive style focused on converting award standings into end-game points.'),
      established('style-card-combo', 'Card Combo (style)', [], 'A descriptive style focused on interacting project-card effects.'),
      established('style-card-vp-engine', 'Card VP Engine (style)', ['Card Victory Point Engine'], 'A descriptive style focused on building card-based victory-point value.'),
      established('style-city-building', 'City Building (style)', [], 'A descriptive style focused on city placement and adjacency value.'),
      established('style-economy-engine', 'Economy Engine (style)', [], 'A descriptive style focused on production, discounts, and money flow.'),
      established('style-plant-greenery', 'Plant Greenery (style)', [], 'A descriptive style focused on plant production and greenery placement.'),
      established('style-science-combo', 'Science Combo (style)', [], 'A descriptive style focused on science tags and science-gated card effects.'),
      established('style-space-economy', 'Space Economy (style)', [], 'A descriptive style focused on space tags, titanium, and space-card discounts.'),
      deferred('style-effectiveness', 'Style Effectiveness', ['style fit', 'style outcomes']),
    ],
  },
  {
    id: 'score-sources',
    title: 'Score Sources',
    blurb: 'Recorded final-score components. They are not temporal gameplay facts.',
    terms: [
      established('victory-points', 'Victory Points (VP)', ['victory point', 'VP'], 'The recorded final points used to determine a finalized game result.'),
      established('terraform-rating', 'Terraform Rating (TR)', ['TR', 'tr points', 'terraform rating points'], 'In this application, TR points are a recorded final-score component. They are not a player final Terraforming Rating or a per-generation timeline.'),
      established('card-points', 'Card Points', ['card scoring', 'total card points'], 'Recorded final card-point totals. This source remains distinct from card offers, purchases, draws, plays, or cards remaining in hand.'),
      established('other-card-points', 'Other Card Points', ['other card'], 'Recorded card-driven victory points that fall outside the separately recorded card-score components.'),
      established('greenery-points', 'Greenery Points', ['greenery scoring', 'greeneries'], 'Recorded final-score points attributed to greenery.'),
      established('city-points', 'City Points', ['cities points', 'cities'], 'Recorded final-score points attributed to cities.'),
      established('milestone-points', 'Milestone Points', ['milestone scoring'], 'Recorded final-score points attributed to milestones.'),
      established('award-points', 'Award Points', ['award scoring'], 'Recorded final-score points attributed to awards.'),
      established('jovian-points', 'Jovian Points', [], 'A nullable recorded card-score component. Missing observations must remain distinct from observed zero.'),
      established('microbe-points', 'Microbe Points', [], 'A nullable recorded card-score component. Missing observations must remain distinct from observed zero.'),
      established('animal-points', 'Animal Points', [], 'A nullable recorded card-score component. Missing observations must remain distinct from observed zero.'),
    ],
  },
  {
    id: 'coverage',
    title: 'Data Coverage',
    blurb: 'Terms for evidence, provenance, and the distinction between zero and missing.',
    terms: [
      established('finalized-game', 'Finalized Game', ['finalized games', 'finished game', 'finished games', 'finalized results'], 'A game recorded with finalized status. A finalized game can still have partial or unavailable data for a particular metric.'),
      established('optional-data-coverage', 'Optional Data Coverage', ['coverage', 'optional-data coverage'], 'A statement of which eligible observations are available, partial, unavailable, or unknown for a specific metric.'),
      established('full-card-breakdown-coverage', 'Full Card Breakdown Coverage', [], 'Coverage for recorded final card-score components. It does not establish card acquisition, card-play, or opportunity coverage.'),
      established('microbe-coverage', 'Microbe Coverage', [], 'Coverage for the nullable microbe-points component; missing is not converted to zero.'),
      established('animal-coverage', 'Animal Coverage', [], 'Coverage for the nullable animal-points component; missing is not converted to zero.'),
      established('jovian-coverage', 'Jovian Coverage', [], 'Coverage for the nullable Jovian-points component; missing is not converted to zero.'),
      provisional('declared-style-coverage', 'Declared Style Coverage', [], 'Coverage for optional declared-style observations. A missing label does not prove a player used no style.'),
      provisional('key-card-coverage', 'Key-Card Coverage', ['key card coverage'], 'Coverage for optional selected key-card records. It is not evidence that every card played or acquired was captured.'),
      established('game-log', 'Game Log', ['exported game log', 'imported game logs', 'imported logs', 'log evidence'], 'Raw or imported game-log material. Absent event evidence means unrecorded, not an observed zero or negative fact.'),
      established('import-evidence', 'Import Evidence', ['result evidence', 'game result evidence', 'combined result screenshot', 'game-result image'], 'Reviewable evidence attached to an import. Evidence remains distinct from fully structured, verified gameplay facts.'),
      established('score-details', 'Score Details', ['score detail', 'victory point breakdown', 'score breakdown', 'point breakdown'], 'Recorded final score-component details. The availability of a component is reported separately from its numeric value.'),
      established('ocr', 'OCR', ['browser OCR', 'server-side OCR'], 'Optical character recognition used to prefill reviewable import data. OCR output requires review and does not become a fact solely because it was extracted.'),
      established('import-draft', 'Import Draft', ['import draft', 'saved import draft', 'Confirm Import Draft'], 'An editable saved import record that preserves source evidence and unresolved fields for review.'),
      established('saved-game', 'Saved Game', ['saved games', 'Review Saved Games', 'saved draft', 'saved drafts'], 'A saved draft or finalized game record. Its state must remain distinct from loading, unauthorized, unavailable, and empty results.'),
      unavailable('cards-purchased', 'Cards Purchased', ['card purchases'], 'The current redesign has no approved source for card-purchase events. Final score components, key-card selections, imported evidence, and catalog records must not be used to infer this count.'),
      unavailable('cards-seen', 'Cards Seen', ['cards offered', 'card offers'], 'The current redesign has no approved complete offer or draw source. A catalog record or optional imported evidence does not establish that a player saw a card.'),
      unavailable('cards-drawn', 'Cards Drawn', ['card draws'], 'The current redesign has no approved complete card-draw event source. This value must remain unavailable rather than inferred from another card metric.'),
      unavailable('cards-received', 'Cards Received', ['card received'], 'The current redesign has no approved complete source for cards received from effects, drafting, or other acquisition paths.'),
      unavailable('cards-played', 'Cards Played', ['played cards'], 'Optional key-card records and import evidence are not a complete card-play event stream. A complete cards-played metric is therefore unavailable.'),
      unavailable('cards-remaining', 'Cards Remaining', ['cards in hand'], 'The current redesign has no approved final-hand or card-inventory source, so cards remaining is unavailable.'),
      established('metric-availability', 'Metric Availability', [], 'The supported, partial, unavailable, loading, error, or insufficient-evidence state of a metric. Availability is not the same thing as a displayed number.'),
      established('observed-zero', 'Observed Zero', ['explicit zero'], 'A recorded zero observation. It remains distinct from missing, unavailable, partial, or query-error states.'),
    ],
  },
  {
    id: 'insight-views',
    title: 'Insight Views',
    blurb: 'Historical analytical view names retained for compatible links.',
    terms: [
      deferred('head-to-head', 'Head-to-Head', ['head-to-head lens', 'head-to-head snapshot', 'head-to-head records']),
      deferred('lineup-effects', 'Lineup Effects'),
      deferred('interaction-insights', 'Interaction Insights', ['interaction pairings']),
      deferred('milestone-economics', 'Milestone Economics'),
      deferred('award-economics', 'Award Economics'),
      deferred('card-outcomes', 'Card Outcomes', ['Most-Played Card Outcomes', 'card outcome views', 'card plays']),
      deferred('tag-outcomes', 'Tag Outcomes'),
      deferred('game-pace', 'Game Pace', ['pace', 'tempo']),
      deferred('board-heatmap', 'Board Heatmap'),
      deferred('placement-distribution', 'Placement Distribution'),
      deferred('table-size', 'Table Size', ['table-size meta', 'table size']),
      deferred('game-length', 'Game Length', ['generation length', 'generation length fit']),
      deferred('map-performance', 'Map Performance', ['map meta', 'map-specific strengths']),
      deferred('meta-winners-draggers', 'Meta Winners & Draggers', ['Meta Winners and Draggers', 'meta signals', 'overperformer', 'dragger']),
      deferred('tempo-profile', 'Tempo Profile', ['tempo metrics', 'fast games', 'long games']),
      deferred('terraforming-share', 'Terraforming Share', ['global-parameter actions', 'terraforming actions']),
      deferred('objective-conversion', 'Objective Conversion', ['objective records', 'conversion rate', 'sniped']),
      deferred('map-table-meta', 'Map & Table-Size Meta', ['Map and Table-Size Meta']),
      deferred('opening-combo-strength', 'Opening Combo Strength', ['opening combo', 'Best opener', 'Trap opener', 'High variance']),
      deferred('log-derived-card-timing', 'Log-Derived Card Timing', ['card timing', 'early win', 'late win']),
      deferred('final-terraforming-action', 'Final Terraforming Action', ['final action', 'final actions', 'final-action win rate', 'common finisher']),
      deferred('expanded-individual-metrics', 'Expanded Individual Metrics', ['individual metrics', 'player-specific lenses']),
      deferred('lead-pressure', 'Lead Pressure', ['lead rate', 'score edge', 'avg winning lead', 'avg chase gap']),
      deferred('phase-tempo', 'Phase Tempo', ['opening tempo', 'midgame tempo', 'endgame tempo']),
      deferred('global-parameter-tempo', 'Global Parameter Tempo', ['global parameter tempo', 'parameter tempo']),
      deferred('resource-removal', 'Resource Removal', ['resource removal profile']),
      deferred('score-pace', 'Score Pace', ['points per generation', 'pts/gen']),
      deferred('profile-expansions', 'Profile Expansions', ['profile model', 'expansion profile']),
    ],
  },
  {
    id: 'selection-stats',
    title: 'Corporations, Preludes & Selection',
    blurb: 'Reference and selection terms; outcome claims require a supported metric contract.',
    terms: [
      deferred('corporation-selection', 'Selection Stats', ['Corporation & Prelude Performance', 'Corporation & Prelude Stats', 'global value summary', 'selection stats']),
      provisional('plays', 'Plays', ['games played', 'play count'], 'A count of explicitly recorded, eligible appearances. The entity, source, and coverage must be identified.'),
      deferred('baseline-win-rate', 'Baseline Win Rate', ['baseline', 'baseline win rate']),
      deferred('corp-prelude-pairing', 'Corporation + Prelude Pairing', ['corporation-and-prelude pairings', 'corporation and prelude pairings', 'starting package', 'opening combo']),
      deferred('award-funding-roi', 'Award Funding ROI', ['ROI', 'funder ROI']),
      established('merger', 'Merger', [], 'The Merger Prelude is identified by stable source identities and a canonical Prelude alias. A missing event never proves that the variant was unavailable or unselected.'),
      established('merger-impact', 'Merger Impact', ['Merger win rate', 'Non-Merger win rate'], 'Merger reporting distinguishes usage rate, availability rate, and selection rate given availability. Guaranteed, random, other, and unknown offer sources remain separate.'),
      deferred('corporation-matchup', 'Corporation Matchup', ['Corporation Matchups']),
      deferred('tags-in-wins', 'Tags in Wins vs Losses', ['tag trends', 'Most Prevalent Tag Trends', 'tags in wins']),
      deferred('point-source-share', 'Point-Source Share', ['Where Points Come From', 'share of VP', 'score-source share']),
      established('merger-availability', 'Merger Availability', [], 'The share of eligible player-games known to have been offered Merger. A saved guaranteed-offer snapshot records availability; unknown evidence remains unknown.'),
      established('merger-conditional-selection-rate', 'Conditional Selection Rate', ['selection given availability'], 'For Merger, selection rate given availability is the share of eligible player-games with a known Merger offer in which Merger was selected. Unknown offers remain outside that denominator.'),
    ],
  },
  {
    id: 'game-concepts',
    title: 'Game Concepts',
    blurb: 'Plain-language Terraforming Mars vocabulary used by the application.',
    terms: [
      established('generation', 'Generation', ['generations', 'average generation', 'avg gen'], 'One round of Terraforming Mars. A final generation count does not reconstruct per-generation player facts.'),
      established('global-parameters', 'Global Parameters', ['oxygen', 'temperature', 'oceans'], 'The oxygen, temperature, and ocean tracks advanced during Terraforming Mars.'),
      established('production', 'Production', [], 'A player resource income that can recur between generations.'),
      established('project-resources', 'Project Resources', ['microbes', 'animals', 'floaters'], 'Resources placed on specific cards rather than a player general supply.'),
      established('tag', 'Tag', ['tags', 'card tag', 'card tags'], 'A printed card classification such as space, building, science, microbe, or Jovian.'),
      established('standard-project', 'Standard Project', ['standard projects'], 'A fixed action available without requiring a particular project card.'),
      established('milestone', 'Milestone', [], 'A limited achievement claimed during a game for end-game points.'),
      established('award', 'Award', [], 'A category funded during a game and scored from final standings.'),
      established('corporation', 'Corporation', ['corporations', 'corp'], 'A chosen starting company with resources and an ability.'),
      established('prelude', 'Prelude', ['preludes'], 'A one-time opening card from the Prelude expansion.'),
      established('greenery', 'Greenery', ['greenery tile', 'greenery tiles'], 'A greenery tile placed on the board.'),
      established('ocean', 'Ocean', ['ocean tile', 'ocean tiles'], 'An ocean tile placed on reserved ocean spaces.'),
      established('city-tile', 'City Tile', ['city tiles'], 'A city tile placed on the board.'),
      provisional('key-card', 'Key Card', ['key cards', 'loss-correlated cards', 'most-played cards'], 'A card optionally selected as meaningful to a player game. It is not a complete play, acquisition, or opportunity record.'),
      established('map', 'Map', ['maps', 'board map'], 'The Terraforming Mars board selected for a game.'),
      established('expansion', 'Expansion', ['expansions', 'required expansions'], 'An add-on set of cards, rules, or setup options.'),
      established('card-database', 'Card Database', ['card catalog', 'Card Lookup', 'Search Card Database'], 'The authenticated catalog browser for real card records, including stored identity, printed metadata, and available card art.'),
      established('player-profile', 'Player Profile', ['saved player profile', 'profile analytics', 'player roster', 'roster player'], 'An application record for a saved player, scoped to its group unless a supported reader states otherwise.'),
    ],
  },
];

export const HISTORICAL_GLOSSARY_ENTRY_SLUGS = [
  'weighted-score', 'win-rate', 'average-placement', 'average-score', 'score-margin', 'finish-distribution', 'sample-size', 'confidence', 'trend-over-time', 'play-rate', 'win-rate-delta', 'score-deviation',
  'scope', 'player-focus', 'insights-lab', 'combination-lens', 'overall-view', 'shared-games', 'personal-vs-global', 'global-statistics', 'insight-card', 'score-source-radar', 'score-profile',
  'play-style', 'declared-style', 'inferred-style', 'style-agreement', 'style-modifier', 'style-balanced', 'style-board-control', 'style-engine-building', 'style-jovian-payoff', 'style-terraform-rush', 'style-milestone-aggression', 'style-award-pressure', 'style-award-closer', 'style-card-combo', 'style-card-vp-engine', 'style-city-building', 'style-economy-engine', 'style-plant-greenery', 'style-science-combo', 'style-space-economy', 'style-effectiveness',
  'victory-points', 'terraform-rating', 'card-points', 'other-card-points', 'greenery-points', 'city-points', 'milestone-points', 'award-points', 'jovian-points', 'microbe-points', 'animal-points',
  'finalized-game', 'optional-data-coverage', 'full-card-breakdown-coverage', 'microbe-coverage', 'animal-coverage', 'jovian-coverage', 'declared-style-coverage', 'key-card-coverage', 'game-log', 'import-evidence', 'score-details', 'ocr', 'import-draft', 'saved-game',
  'head-to-head', 'lineup-effects', 'interaction-insights', 'milestone-economics', 'award-economics', 'card-outcomes', 'tag-outcomes', 'game-pace', 'board-heatmap', 'placement-distribution', 'table-size', 'game-length', 'map-performance', 'meta-winners-draggers', 'tempo-profile', 'terraforming-share', 'objective-conversion', 'map-table-meta', 'opening-combo-strength', 'log-derived-card-timing', 'final-terraforming-action', 'expanded-individual-metrics', 'lead-pressure', 'phase-tempo', 'global-parameter-tempo', 'resource-removal', 'score-pace', 'profile-expansions',
  'corporation-selection', 'plays', 'baseline-win-rate', 'corp-prelude-pairing', 'award-funding-roi', 'merger', 'merger-impact', 'corporation-matchup', 'tags-in-wins', 'point-source-share',
  'generation', 'global-parameters', 'production', 'project-resources', 'tag', 'standard-project', 'milestone', 'award', 'corporation', 'prelude', 'greenery', 'ocean', 'city-tile', 'key-card', 'map', 'expansion', 'card-database', 'player-profile',
] as const;

export const glossaryTerms = glossaryCategories.flatMap((category) =>
  category.terms.map((term) => ({ ...term, categoryId: category.id })),
);

export function glossaryDefinition(term: GlossaryTerm): string {
  if (term.definition) {
    return term.definition;
  }

  return term.semanticStatus === 'deferred'
    ? 'This historical term remains linkable for compatibility, but the current redesign has no approved formula, route contract, or data-capability definition for it yet.'
    : 'This term is retained for compatibility while its current product contract is being verified.';
}

export function glossaryEntryBySlug(slug: string) {
  return glossaryTerms.find((term) => term.slug === slug) ?? null;
}
