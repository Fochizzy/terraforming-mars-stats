# Terraforming Mars Stats App Design

Date: 2026-07-03

## Overview

This app is a phone-first Terraforming Mars statistics tracker for a small group of friends. It supports shared access, post-game manual entry, individual and group analytics, optional global aggregate analytics, playstyle analysis, visual graphs, and an optional card-reference layer backed by a cached card catalog.

The app is designed around one main principle: logging a finished game must stay fast enough that people will actually use it. Structured setup data is captured where comparison matters, while score entry remains focused on endgame results instead of full turn-by-turn or full deck tracking.

## Product Goals

1. Let a group log a completed game in a few minutes from a phone.
2. Preserve enough structure to analyze corporations, preludes, maps, expansions, player count, milestones, awards, score composition, playstyle, and winners.
3. Provide meaningful personal, group, and global aggregate insights.
4. Support optional card evidence without making card tagging mandatory.
5. Keep shared data secure and group-scoped by default.

## Non-Goals

1. The app does not track every action, generation-by-generation economy, or every card played.
2. The app does not attempt rules enforcement during live play.
3. The app does not use GitHub as the primary runtime image host.
4. The app does not expose identifiable cross-group data without opt-in.

## Primary Users

1. A small recurring group of friends who play Terraforming Mars together.
2. A primary logger who may record games on behalf of the table.
3. Individual players who want personal performance and playstyle stats.

## Core User Experience

### Default Landing Page

The default post-login landing page is `My Player Profile`.

This screen highlights:

1. Personal win rate
2. Average placement
3. Recent games and recent form
4. Favorite corporations and preludes
5. Personal playstyle summary
6. Personal score-composition graph
7. Compact winners snapshot for the current group and global aggregate

### Primary Navigation

The app has four top-level destinations:

1. `My Profile`
2. `Log Game`
3. `Group`
4. `Insights`

## Supported Rules Scope

The app supports full expansion-aware game logging from the start, with per-game expansion selections and group defaults.

Tracked setup scope includes:

1. Base game
2. Prelude
3. Venus Next
4. Colonies
5. Turmoil
6. Additional maps and map-linked milestones and awards
7. Future expansion-ready catalog structure

The app stores actual expansions used per game, not just group preferences.

## Auth, Access, and Sharing

### Auth Model

Use Supabase Auth for signed-in users.

### Group Model

All gameplay data lives inside a `group`.

Each group has members with roles:

1. `owner`
2. `editor`
3. `viewer`

### RLS Strategy

All exposed tables use Row Level Security.

Policies are based on group membership:

1. Members can read only data from their groups.
2. Editors and owners can create and update games and player stats in their groups.
3. Owners manage group settings, membership, and global analytics opt-in.

### Global Aggregate Analytics

Global analytics are supported, but only through opt-in group participation.

Rules:

1. Global analytics are aggregate-only.
2. No identifiable cross-group player detail is exposed.
3. Group owners can enable or disable participation.
4. Historical group game data can contribute only while the group is opted in.

## Data Model

### Core Tables

1. `users`
2. `groups`
3. `group_members`
4. `group_settings`
5. `players`
6. `games`
7. `game_players`

### Reference Catalog Tables

1. `expansions`
2. `maps`
3. `corporations`
4. `preludes`
5. `milestones`
6. `awards`
7. `cards`
8. `style_definitions`

### Join Tables

1. `group_default_expansions`
2. `game_expansions`
3. `game_player_preludes`
4. `map_milestones`
5. `map_awards`
6. `game_milestones`
7. `game_awards`
8. `game_player_declared_styles`
9. `game_player_inferred_styles`
10. `game_player_key_cards`

### Group Settings

`group_settings` stores:

1. group name and presentation settings
2. default map, if desired
3. global analytics participation flag
4. image/reference preferences

`group_default_expansions` stores the default expansion profile for the group.

When a new game is created:

1. the group default expansion set is preselected
2. the logger can change it for that game
3. the actual game still stores its own `game_expansions` rows

### Players

`players` are group-level recurring player profiles.

A player may optionally link to an auth user, but does not need to.

This supports:

1. one person logging games for everyone
2. recurring named player statistics
3. personal profile views for signed-in players

### Games

`games` stores:

1. `group_id`
2. `played_on`
3. `map_id`
4. `player_count`
5. `generation_count`
6. `notes`

`game_expansions` stores which expansions were active for that specific game.

### Game Player Rows

Each `game_players` row represents one player's final result in one game.

It stores:

1. `game_id`
2. `player_id`
3. `corporation_id`
4. `placement`
5. `is_winner`
6. `total_points`
7. `final_megacredits`
8. `cities_points`
9. `greenery_points`
10. `card_points_total`
11. `card_points_microbes`
12. `card_points_animals`
13. `tr_points`
14. `milestone_points`
15. `award_points`
16. derived or validated `other_card_points`

`game_player_preludes` supports one or more preludes per player.

### Winner and Tiebreak Logic

Placement is based on:

1. `total_points` descending
2. `final_megacredits` descending as the tiebreaker

`placement` and `is_winner` are stored explicitly for fast analytics, but validated from score data.

## Milestones and Awards

Milestones and awards are treated as explicit, map-aware records, not only as score totals.

### Milestones

`map_milestones` defines which milestones are valid for each map.

`game_milestones` stores actual milestone wins:

1. `game_id`
2. `milestone_id`
3. `winner_game_player_id`

This supports map-specific milestone analytics such as who wins a specific milestone most often.

### Awards

`map_awards` defines which awards are valid for each map.

`game_awards` stores actual award outcomes:

1. `game_id`
2. `award_id`
3. `place`
4. `winner_game_player_id`

This model supports first and second place and can represent ties without losing the explicit award result.

`milestone_points` and `award_points` stay on `game_players` for quick totals, but must be validated against the milestone and award rows.

## Logging Flow

The logging flow is a phone-first stepper.

### Step 1: Game Setup

Collect:

1. group
2. date played
3. map
4. player count
5. expansions used
6. generation count

Default expansions come from the group's saved default profile.

### Step 2: Players

Collect:

1. selected players from saved profiles
2. corporation for each player
3. prelude selection for each player

### Step 3: Milestones and Awards

Show only the milestones and awards valid for the selected map.

Collect:

1. which milestones were claimed
2. who won each claimed milestone
3. which awards were funded
4. who placed first and second on each funded award

### Step 4: Final Scores

Collect for each player:

1. cities
2. greenery
3. total card points
4. microbe card points
5. animal card points
6. Terraform Rating points
7. milestone points
8. award points
9. total points
10. final megacredits

The app derives `other_card_points = card_points_total - card_points_microbes - card_points_animals`.

### Step 5: Optional Playstyle and Key Cards

Collect optional inputs:

1. declared playstyle
2. up to two declared playstyle modifiers
3. optional key cards from the card catalog

### Step 6: Review

Show compact player summaries and block or warn on inconsistencies:

1. milestone rows not matching milestone points
2. award rows not matching award points
3. invalid map-linked selections
4. impossible tiebreak ordering
5. invalid card-point subtotals

## Playstyle System

Playstyle is a first-class feature with two parallel systems:

1. `inferred style`
2. `declared style`

### Inferred Style

The system computes:

1. one primary inferred style
2. up to two inferred modifiers
3. an inference confidence level

Inference uses:

1. score composition
2. generation count
3. winner status
4. final megacredits
5. corporation and preludes
6. expansions used
7. map
8. milestones and awards
9. optional key cards

### Declared Style

Declared style is optional.

It stores:

1. one primary declared style
2. up to two declared modifiers

### Style Definitions

All styles are explicitly defined in `style_definitions`.

The starting style set is:

1. `terraform_rush`: prioritizes raising global parameters and ending the game faster
2. `board_control`: relies on tile placement, adjacency, cities, and greeneries
3. `card_vp_engine`: wins through a large share of endgame card points
4. `economy_engine`: builds production or scaling economy first, then converts late
5. `balanced`: no single scoring lane clearly dominates the final profile
6. `science_combo`: centers on science-tag chains and science-driven synergies
7. `jovian_payoff`: centers on Jovian tags and Jovian payoff cards
8. `space_economy`: centers on space tags, titanium use, and space-card tempo
9. `plant_greenery`: centers on plant production and greenery conversion
10. `city_building`: centers on buildings, steel use, and city infrastructure
11. `microbe_engine`: microbes are a central engine or scoring lane
12. `animal_engine`: animals are a central engine or scoring lane
13. `floater_venus`: floaters, Venus tags, or Venus progression are central
14. `trade_colonies`: colony placement and trade actions are central
15. `politics_turmoil`: delegates, party influence, and Turmoil interactions are central
16. `milestone_race`: early milestone acquisition is central to the plan
17. `award_closer`: awards are a major part of the finishing plan
18. `heat_temperature`: heat production and temperature pressure are central
19. `events_tempo`: event-card bursts and tempo swings are central

These definitions are locked application concepts, not ad hoc user labels.

## Card Catalog and Images

### Card Catalog Role

The card catalog is optional evidence and reference support, not mandatory game logging.

It powers:

1. card search and browse
2. corporation and prelude detail views
3. optional key-card tagging
4. style evidence views

### Metadata Fields

Each `cards` row stores:

1. source card id
2. card number
3. card name
4. card type
5. expansion code
6. expansion name
7. source image URL
8. source attribution
9. sync metadata

### Image Strategy

Cache both:

1. thumbnail images
2. full-size images

Image storage is app-controlled and served from Supabase Storage, not from the upstream site at runtime.

### Source Strategy

The Hadronikle catalog is treated as an upstream reference source for import and sync, not a hard runtime dependency.

The import process:

1. fetches card metadata
2. caches full-size images
3. generates or stores thumbnails
4. updates local card records
5. never mutates historical game logs

### GitHub Usage Boundary

GitHub may store:

1. import scripts
2. sync manifests
3. metadata snapshots

GitHub is not the primary runtime image host because repository size, file limits, and LFS bandwidth/storage constraints make it a poor long-term image-serving layer for this use case.

## Analytics Model

Analytics are split across personal, group, and global aggregate scopes.

### Personal Analytics

Each player profile shows:

1. win rate
2. average placement
3. podium rate
4. average score
5. average winning score
6. final megacredit tiebreak trends
7. score-source composition
8. best corporations
9. best preludes
10. best corporation plus prelude pairings
11. strongest maps
12. strongest expansion mixes
13. strongest player counts
14. milestone tendencies
15. award tendencies
16. inferred style profile
17. declared style profile where available
18. key-card evidence where available
19. personal trends over time

### Group Analytics

Each group view shows:

1. total games played
2. recent activity
3. preferred maps
4. preferred expansions
5. default expansion profile versus overrides
6. most-picked corporations
7. most-picked preludes
8. average generations
9. average winning score
10. tiebreak frequency by final megacredits
11. most-claimed milestones
12. most-funded awards
13. most successful playstyles
14. meta shifts over time
15. group winners leaderboard

### Global Aggregate Analytics

Global analytics show only aggregate patterns, never raw identifiable player detail across groups.

Global aggregate views can show:

1. corporation win rates
2. prelude win rates
3. winning playstyles
4. winning score ranges
5. map-level performance
6. expansion mix effects
7. milestone and award correlations with winning
8. key cards associated with winning styles

## Statistics to Support

### Outcome Statistics

1. win rate
2. average placement
3. podium rate
4. average winning score
5. average final megacredit tiebreak amount

### Score Composition Statistics

1. average cities points
2. average greenery points
3. average TR points
4. average milestone points
5. average award points
6. average total card points
7. average microbe card points
8. average animal card points
9. average other card points

### Corporation and Prelude Statistics

1. play rate
2. win rate
3. average score
4. average placement
5. score-source mix
6. best maps
7. best player counts
8. best expansion mixes
9. best pairings

### Milestone and Award Statistics

1. claim frequency
2. win correlation
3. per-map milestone success
4. per-map award success
5. which players or styles convert specific milestones and awards most effectively

### Style Statistics

1. style frequency
2. style win rate
3. style performance by player count
4. style performance by map
5. style performance by expansion mix
6. style score fingerprints
7. declared versus inferred agreement
8. key cards associated with each style

### Tempo and Game-Length Statistics

1. average generation count
2. win rate by short, medium, or long games
3. style distribution by game length
4. corporation performance by game length

## Visual Graphs

The app should prioritize graphs that remain readable on a phone.

Recommended visual types:

1. stacked bar charts for score composition
2. line charts for trends over time
3. ranked bar charts for win rates and play rates
4. heatmaps for corporation versus map and corporation versus player count
5. scatter plots for generation count versus total points
6. comparison bars for winners versus non-winners

Graph design rules:

1. default to one clear question per chart
2. include sample size on views that may be misread
3. allow filters for player, group, map, expansion mix, player count, corporation, prelude, and style

## Reliability Rules

The app must avoid overstating weak data.

Rules:

1. Every major insight shows sample size.
2. Ranking and correlation views use minimum sample thresholds.
3. Small-sample results are visually marked as low-confidence.
4. Inferred style without card evidence is marked lower confidence than declared style with key-card support.

## Privacy and Data Boundaries

1. Group data is private to the group by default.
2. Global analytics are aggregate-only and opt-in.
3. Card cache and reference data are system-managed, not user-editable during ordinary usage.
4. The app supports personal profiles without requiring every named player to sign in.

## Technical Platform Direction

Use Supabase for:

1. authentication
2. Postgres database
3. Row Level Security
4. Storage for card thumbnails and full-size images

The app will be built as a phone-first web application with responsive screens and a strong mobile logging flow.

## Implementation Priorities

### V1 Must Include

1. auth and group model
2. player profiles
3. group default expansion profile
4. per-game setup logging
5. score entry with final megacredits and generation count
6. explicit milestone and award recording
7. individual stats
8. group stats
9. global aggregate winner stats with opt-in
10. visual graphs
11. inferred styles
12. optional declared styles
13. optional key-card tagging
14. cached card metadata and image pipeline

### V1 Can Be Lightweight In

1. advanced style inference formulas
2. heavy admin sync tooling
3. deep card-reference browsing polish

Those items must be functional, but they do not need extensive polish before the core logging and analytics loop works.

## Final Design Decisions

1. Manual post-game entry only for v1
2. Phone-first interface
3. Shared-group access with Supabase auth
4. Full expansion-aware support from the start
5. Hybrid catalog-first setup data with simple numeric final scoring
6. Group default expansions with per-game overrides
7. Final megacredits tracked as tiebreak data
8. Winners and placements tracked explicitly
9. Milestones and awards recorded as explicit map-aware outcomes
10. Generation count logged for every game
11. Both inferred and optional declared styles supported
12. Styles are fixed definitions, not freeform labels
13. Optional key cards supported from a cached catalog
14. Cached thumbnails and full-size card images supported
15. Individual, group, and opt-in global analytics all supported
16. My player profile is the default landing page

## External References

1. Hadronikle Terraforming Mars card database: https://tm.hadronikle.com/
2. Hadronikle catalog repository: https://github.com/hadronikle/Complete-Terraforming-Mars-Card-Database
3. Terraforming Mars Prelude rulebook: https://cdn.1j1ju.com/medias/6e/a5/22-terraforming-mars-prelude-rulebook.pdf
4. Terraforming Mars Venus Next rulebook: https://cdn.1j1ju.com/medias/6f/8f/c8-terraforming-mars-venus-next-rulebook.pdf
5. Terraforming Mars Colonies rulebook: https://cdn.1j1ju.com/medias/55/6a/42-terraforming-mars-colonies-rulebook.pdf
6. GitHub large file guidance: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
7. Git LFS billing: https://docs.github.com/en/billing/concepts/product-billing/git-lfs
8. GitHub Pages overview: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
