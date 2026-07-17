# TM Stats Analytics Inventory

## Card Acquisition and Conversion

### Core recorded values

- Cards purchased per player per game
- Cards purchased per player and generation
- Cards seen per player per game
- Cards seen per player and generation
- Cards acquired into hand from all sources
- Cards played
- Cards remaining in hand at game end
- Recorded generations

### Derived metrics

- Cards purchased per generation
- Cards seen per generation
- Purchase conversion
- Purchased hand share
- Hand utilization
- End-hand carryover
- Cards purchased relative to table average
- Cards seen relative to table average

### Outcome comparisons

Compare each eligible metric with:

- Win rate
- Final score
- Placement
- Win-point differential
- Overall point differential
- Game length
- Generation count

### Segmentation

Support segmentation by:

- Player
- Group
- Corporation
- Prelude
- Corporation–Prelude pairing
- Player count
- Map
- Expansion configuration
- Drafting
- Game-length band
- Generation-count band

### Required analytical views

#### Global Insights

- Cards purchased versus win rate
- Cards seen versus win rate
- Purchase conversion versus win rate
- Distribution by game context
- Corporation and Prelude differences

#### Individual Insights

- Personal purchase pace
- Personal seen pace
- Purchase conversion
- Group and global baselines
- Outcome ranges
- Generation timeline

#### Group Insights

- Member comparisons
- Group purchase distribution
- Conversion versus outcome
- Lineup and context differences

#### Compare

- Purchased cards per game
- Cards seen per game
- Purchase conversion
- Purchased hand share
- Hand utilization
- End-hand carryover

#### Improvement

- Evidence-based purchase-volume ranges
- Purchase-conversion trends
- Excess end-hand carryover
- Progress over time

### Data-quality requirements

- Distinguish missing from zero.
- Do not infer Cards Seen from Cards Purchased.
- Do not sum hand-size snapshots as total acquisitions.
- Do not reconstruct generation data from final totals.
- Show eligible games and coverage percentage.
- Show minimum sample thresholds.
- Label low-coverage results.
- Use observational language.

Phase 2, Step 2.3 adds shared contracts for these requirements:
`AnalyticsMetricResult`, `AnalyticsSample`, `AnalyticsCoverageEvaluation`, and
`AnalyticsEligibilityResult` distinguish loading, query error, unavailable
capability, insufficient evidence, observed zero, missing values, partial
values, unknown coverage, structured exclusions, and minimum-sample states.
This inventory still does not approve formulas, thresholds, repository queries,
schema changes, or production page integration.

Phase 2, Step 2.4 implements only the already-approved pure definitions in
`CANONICAL-ANALYTICS-DEFINITIONS.md`: distinct recorded card facts, four
card-acquisition rates with separately labeled ratio-of-totals and
median-per-player-game variants, and sole-winner Win Point Differential against
the highest non-winner. It does not add capture coverage, queries, schema, or
page integration; tied-first numeric differential remains unresolved.

Phase 2, Step 2.5 implements only a normalized finalized-game result source
slice: authenticated group pages and one RLS-readable game, with stable IDs,
bounded ordering, final score/winner observations, missing-field coverage, and
native/imported provenance. A pure adapter supplies the Step 2.4 Win Point
Differential input without duplicating its formula. It does not create or infer
any card-acquisition or generation-level observation, and it does not migrate a
production analytics consumer. See
`ANALYTICS-REPOSITORY-QUERY-CONTRACTS.md`.

### Cards Seen coverage dimensions

Cards Seen coverage must distinguish which opportunity sources were recorded:

- Starting-card offers
- Research-phase offers
- Draft opportunities
- Cards drawn through effects
- Cards inspected through effects
- Other cards received into hand

Do not label a game as having full Cards Seen coverage when only one or some
of these sources were recorded.

Supported coverage labels include:

- Full opportunity coverage
- Research-only coverage
- Draft-only coverage
- Purchased-card coverage only
- Partial event coverage
- No Cards Seen coverage
