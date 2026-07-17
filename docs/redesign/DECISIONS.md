# TM Stats Redesign Decisions

## Approved product structure

The application will have eight primary pages:

1. Log a Game
2. My Profile
3. Global Insights
4. Individual Insights
5. Group Insights
6. Compare
7. Improvement
8. Leaderboard

## Production graphics

Existing Supabase-hosted tag icons, point-source graphics, and corporation
logos must be integrated throughout the application.

## Temporal game data

The game log supports:

- Cards bought by player and generation
- Terraforming Rating by player and generation

Explicit zero values must remain distinct from missing observations.

## Win point differential

Winner margin is measured against the highest non-winning final score.

Tied first-place games require explicit handling and must not be silently
treated as ordinary positive-margin wins.

## Agent workflow

- One phase or substep at a time
- Clean commit before switching agents
- State and handoff documentation required
- Incoming agent verifies the previous commit before editing

## Card acquisition and conversion metrics

### Cards purchased

The number of cards a player paid to add to their hand.

Cards purchased must remain distinct from:

- Cards seen
- Cards drawn
- Cards received
- Cards played
- Cards discarded
- Cards retained at game end

### Cards seen

The number of distinct card opportunities genuinely presented to a player.

Cards seen may include separately recorded:

- Starting-card offers
- Research-phase offers
- Draft cards received
- Cards drawn through effects
- Cards inspected through effects

A card must not be counted as seen merely because it was purchased.

The same physical or logical card opportunity must not be counted more than
once unless the underlying game event genuinely presents it again.

### Purchase conversion

Purchase Conversion = Cards Purchased / Cards Seen

This metric is unavailable when Cards Seen is missing or zero.

Missing Cards Seen data must not be treated as zero.

### Hand acquisitions

Total Hand Acquisitions means cards entering the player's hand from all
recorded sources.

This may include:

- Purchased cards
- Cards drawn through effects
- Cards received through other game effects

### Purchased hand share

Purchased Hand Share =
Cards Purchased / Total Hand Acquisitions

### Hand utilization

Hand Utilization =
Cards Played / Total Hand Acquisitions

### End-hand carryover

End-Hand Carryover =
Cards Remaining at Game End / Total Hand Acquisitions

### Aggregation rules

For multi-game summaries, expose both:

- Ratio of totals
- Median per-game rate

Do not silently average percentages.

### Interpretation rules

Relationships between card acquisition behavior and outcomes are
observational associations.

Do not describe cards purchased, cards seen, or purchase conversion as
causing wins.

Relevant context includes:

- Number of generations
- Player count
- Drafting
- Expansion configuration
- Corporation
- Prelude
- Player strength
- Opponent strength

### Repeated card exposure

Cards Seen counts card opportunities, not unique card names.

Seeing the same named card in two separate legitimate offers, draws, or
inspection events counts as two card opportunities.

Seeing a card in one offer and then purchasing that same offered card counts
as one opportunity, not two.

A card must not be counted again merely because it remains visible, remains
in hand, or appears later in a game summary.
