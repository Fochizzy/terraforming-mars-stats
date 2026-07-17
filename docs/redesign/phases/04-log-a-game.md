# Phase 4 — Log a Game

## Card acquisition data capture

The Log a Game workflow must support card-acquisition data only when the
underlying recording method can provide it accurately.

### Candidate values

- Cards purchased by player and generation
- Cards seen by player and generation
- Cards drawn through effects
- Cards entering hand through other sources
- Cards played
- Cards remaining at game end

### Capture principles

- Preserve missing versus explicit zero.
- Do not require unavailable historical data.
- Do not infer Cards Seen from Cards Purchased.
- Do not infer Cards Played from final hand size.
- Do not infer total acquisitions by summing hand snapshots.
- Record the source and coverage of imported values.
- Validate nonnegative integer counts.
- Prevent duplicate generation records.
- Preserve draft editing and game-finalization behavior.

### Preferred data model

The audit must determine whether to use:

- Generation-level aggregate records
- Individual card-acquisition events
- A hybrid approach

Individual events are preferred when card identity, acquisition source, and
timing are available.

Generation-level aggregates may be used when only counts are recorded.

### Review screen

Before finalization, show per player and generation:

- Cards purchased
- Cards seen
- Other cards acquired
- Cards played, when available
- Missing-data indicators

### Acceptance criteria

- Explicit zero remains zero.
- Missing remains missing.
- Imports disclose field coverage.
- Totals reconcile with generation records when both exist.
- Existing games remain valid without the new fields.
- Tests cover missing, zero, partial, and duplicate records.
