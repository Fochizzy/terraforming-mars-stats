# Terraforming Mars Stats App Design

Date: 2026-07-03

## Overview

This app is a phone-first Terraforming Mars statistics tracker for a small group of friends. It supports shared access, post-game manual entry, an optional in-app web import page for pasted exported game logs and endgame result screenshots, cloud-backed saved data, individual and group analytics, optional global aggregate analytics, playstyle analysis, visual graphs, and an optional card-reference layer backed by a cached card catalog.

The app is designed around one main principle: logging a finished game must stay fast enough that people will actually use it. Structured setup data is captured where comparison matters, while score entry remains focused on endgame results instead of mandatory manual turn-by-turn entry. When digital evidence is available, a pasted game log and an exact endgame results screenshot can be imported into Supabase and parsed by the app as optional enrichment and score-entry assist layers.

## Product Goals

1. Let a group log a completed game in a few minutes from a phone.
2. Preserve enough structure to analyze corporations, preludes, maps, expansions, player count, milestones, awards, score composition, playstyle, and winners.
3. Provide meaningful personal, group, and global aggregate insights.
4. Support optional card evidence without making card tagging mandatory.
5. Keep shared data secure and group-scoped by default.
6. Feel recognizably Terraforming Mars in color, typography, and UI tone rather than like a generic stats dashboard.
7. Store saved gameplay, profile, settings, and catalog data in the cloud rather than relying on device-local persistence.
8. Support an optional web page where a user can paste an exported game log, add an endgame results screenshot, save both to Supabase, and let the app parse them into editable numeric and event-level data.

## Non-Goals

1. The app does not require manual turn-by-turn entry for every game, and it does not depend on imported logs for baseline winner and score analytics.
2. The app does not attempt rules enforcement during live play.
3. The app does not use GitHub as the primary runtime image host.
4. The app does not expose identifiable cross-group data without opt-in.
5. The app is not local-first for canonical saved data.
6. The app does not attempt perfect replay reconstruction, exact hidden-hand tracking, or full engine-state simulation from imported logs in v1.
7. The app does not try to support arbitrary tabletop photos or many unrelated screenshot layouts in v1; it targets one known digital endgame screen layout first.

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

### Chart and Graph Surfaces

Charts and graphs are not limited to one analytics page. They appear in three primary places:

1. `My Profile`: personal trend charts, score-composition charts, head-to-head charts, and personal style comparison charts
2. `Group`: group meta charts, winners charts, lineup-change charts, and group playstyle charts
3. `Insights`: a dedicated comparison and exploration surface with filters, larger charts, cross-player comparisons, and cross-group aggregate charts

The `Insights` area is the full chart lab, but both `My Profile` and `Group` should surface the highest-value charts directly instead of forcing users into a separate analytics page for everything.

### Visual Design Direction

The app should be visually appealing and should deliberately echo the board game's visual language instead of using a generic analytics dashboard style.

The interface should take inspiration from the game's core aesthetic cues:

1. warm Mars reds, rusts, copper, and dusty orange tones
2. dark space-toned backgrounds and panels
3. strong contrast accent colors for oceans, greenery, heat, and corporate UI elements
4. bold sci-fi display typography for titles and section headers
5. cleaner supporting text for dense stats and tables
6. card-like panels and plaque-like framing inspired by board and card components

The goal is not to reproduce the board game one-to-one. The goal is to make the app feel unmistakably Terraforming Mars while remaining readable and modern on a phone.

The approved intensity for the visual system is `medium`.

That means:

1. the app should feel clearly game-inspired at a glance
2. headers, panels, navigation, charts, and stat cards should use visible thematic framing
3. forms and score-entry controls should stay cleaner and more data-first than the surrounding chrome
4. textures and metallic framing should be noticeable but restrained enough that the app still reads quickly on a phone

Charts, filters, and profile cards should all inherit this same visual system so analytics still feel like part of the game world.

Visual system requirements:

1. Use a license-compatible display font for titles and major numeric callouts that evokes the game's sci-fi header style.
2. Use a cleaner, highly readable companion font for dense tables, filters, and form controls.
3. Build the palette around Mars rust, copper, dust orange, deep space charcoal, muted metallic neutrals, ocean blue, and greenery accents.
4. Treat gameplay colors as semantic accents, so greenery, ocean, heat, TR, milestones, and awards can be recognized quickly in charts and summaries.
5. Use card-like surfaces, framed stat modules, and subtle metallic or plaque-inspired separators instead of flat generic dashboard cards.
6. Avoid a plain default mobile-app look; the app should feel thematic even when the user is just viewing tables or entering scores.

## Supported Rules Scope

The app supports full expansion-aware game logging from the start, with per-game expansion selections and group defaults.

Tracked setup scope includes:

1. Base game
2. Prelude
3. Venus Next
4. Colonies
5. Turmoil
6. Promo cards and promo corporations
7. Additional maps and map-linked milestones and awards
8. Future expansion-ready catalog structure

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

### Cloud Storage Direction

Saved application data is cloud-backed by default.

This includes:

1. groups and memberships
2. player profiles
3. game logs and score rows
4. group defaults and settings
5. catalog metadata and overrides
6. card images and thumbnails
7. derived analytics materializations when used

Device-local storage must not be the system of record for any saved gameplay or profile data.

If the app later uses local device storage at all, it should be limited to temporary UI state, short-lived caches, or in-progress drafts that sync to the cloud and are never treated as the canonical saved copy.

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
8. `game_revisions`
9. `game_log_imports`
10. `game_log_events`
11. `game_result_screenshot_imports`
12. `player_import_aliases`

### Reference Catalog Tables

1. `expansions`
2. `maps`
3. `corporations`
4. `preludes`
5. `milestones`
6. `awards`
7. `promo_sets`
8. `cards`
9. `style_definitions`
10. `catalog_snapshots`

### Join Tables

1. `group_default_expansions`
2. `group_default_promo_sets`
3. `game_expansions`
4. `game_promo_sets`
5. `game_player_preludes`
6. `map_milestones`
7. `map_awards`
8. `game_milestones`
9. `game_awards`
10. `game_player_declared_styles`
11. `game_player_inferred_styles`
12. `game_player_key_cards`

### Group Settings

`group_settings` stores:

1. group name and presentation settings
2. default map, if desired
3. global analytics participation flag
4. image/reference preferences

`group_default_expansions` stores the default expansion profile for the group.
`group_default_promo_sets` stores the default promo-year or promo-edition profile for the group.

When a new game is created:

1. the group default expansion set is preselected
2. the group default promo-set selection is preselected
3. the logger can change both for that game
4. the actual game still stores its own `game_expansions` and `game_promo_sets` rows

### Players

`players` are group-level recurring player profiles.

A player may optionally link to an auth user, but does not need to.

This supports:

1. one person logging games for everyone
2. recurring named player statistics
3. personal profile views for signed-in players

### Player Import Aliases

Imported evidence must link back to the correct saved player profiles inside the group.

`player_import_aliases` stores:

1. `player_id`
2. `source_type` such as `game_log` or `screenshot_ocr`
3. `alias_text`
4. normalized alias text for matching
5. `created_at`

This supports:

1. repeated imports where exported names differ slightly from saved display names
2. screenshot OCR variants such as punctuation, spacing, or recognition mistakes
3. safer future auto-matching after a user confirms that an imported name belongs to a specific player profile

### Games

`games` stores:

1. `group_id`
2. `played_on`
3. `map_id`
4. `player_count`
5. `generation_count`
6. nullable `source_game_id`
7. `status` (`draft` or `finalized`)
8. nullable `catalog_snapshot_id`
9. `created_by_user_id`
10. `updated_by_user_id`
11. nullable `finalized_at`
12. nullable `finalized_by_user_id`
13. `notes`

`game_expansions` stores which expansions were active for that specific game.
`game_promo_sets` stores which promo years or promo editions were active for that specific game.

### Game Lifecycle and Edit History

Games support a lightweight lifecycle:

1. `draft`: an in-progress cloud-saved log that can be resumed later
2. `finalized`: a completed game that counts in default analytics and leaderboards

Editors and owners may update finalized games, but those edits must not silently overwrite history.

`game_revisions` stores:

1. `game_id`
2. revision timestamp
3. editor user id
4. revision reason or note when provided
5. a coarse full-game snapshot payload for audit and recovery

V1 does not need field-level diff visualization. A revision-snapshot model is sufficient as long as finalized game edits are traceable.

Draft games are excluded from official statistics by default unless a user explicitly asks to view draft or incomplete data.

### Imported Game Logs

Imported game logs are optional evidence attached to a game, not a replacement for the manual finalized result.

`game_log_imports` stores:

1. `game_id`
2. `raw_log_text`
3. `parser_version`
4. `parse_status` such as `parsed`, `partial`, or `failed`
5. `detected_source`
6. `confidence_summary`
7. `line_count`
8. `unparsed_line_count`
9. `created_by_user_id`
10. `created_at`
11. nullable `parsed_at`

`game_log_events` stores normalized parsed events:

1. `game_log_import_id`
2. nullable `game_player_id`
3. nullable `generation_number`
4. `event_order`
5. `event_type`
6. nullable `card_id`
7. nullable `resource_type`
8. nullable `resource_amount`
9. nullable `tile_type`
10. nullable `board_space`
11. `confidence_level`
12. `raw_line`
13. `payload jsonb`
14. `created_at`
15. nullable `line_classification` such as `event`, `context`, `draw_info`, `chatty_filler`, or `ignored_noise`

These tables support:

1. storing the pasted source text in Supabase for traceability
2. reparsing older imports when the parser improves
3. preserving unresolved, contextual, or intentionally ignored lines without inventing false certainty
4. running optional imported-log analytics only on the games that have coverage

### Imported Endgame Result Screenshots

Endgame result screenshots are optional OCR-assisted score-entry evidence attached to a game.

`game_result_screenshot_imports` stores:

1. `game_id`
2. `storage_object_path`
3. `ocr_engine_version`
4. `parse_status` such as `parsed`, `partial`, or `failed`
5. `detected_layout`
6. `confidence_summary`
7. `extracted_fields jsonb`
8. `created_by_user_id`
9. `created_at`
10. nullable `parsed_at`

These rows support:

1. storing the screenshot in Supabase Storage for audit and review
2. OCR-assisted prefilling of endgame score fields and score-source breakdown fields when the supported layout shows them
3. reparsing older screenshots when OCR or layout rules improve
4. cross-checking screenshot-derived score fields against pasted-log or manual entry
5. cross-checking OCR-detected player names against saved player profiles and confirmed aliases

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
11. nullable `card_points_microbes`
12. nullable `card_points_animals`
13. nullable `card_points_jovian`
14. `tr_points`
15. `milestone_points`
16. `award_points`
17. nullable derived `other_card_points`

`game_player_preludes` supports one or more preludes per player.

### Winner and Tiebreak Logic

Placement is based on:

1. `total_points` descending
2. `final_megacredits` descending as the tiebreaker

If both `total_points` and `final_megacredits` are equal, the result is a true tie.

True-tie rules:

1. tied players share the same placement
2. tied first-place players are all stored as winners
3. no arbitrary hidden ordering is introduced for analytics or UI display
4. win differential across a true tie boundary is zero
5. leaderboard differential logic must preserve ties instead of forcing a false margin

`placement` and `is_winner` are stored explicitly for fast analytics, but validated from score data and tie rules.

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
3. `funded_by_game_player_id`
4. `place`
5. `winner_game_player_id`

This model supports explicit award funding history, first and second place, and ties without losing the explicit award result.

`milestone_points` and `award_points` stay on `game_players` for quick totals, but must be validated against the milestone and award rows.

## Logging Flow

The logging flow is a phone-first stepper.

### Optional Web Import Page

Inside the authenticated app, users can open a dedicated web page to paste an exported game log and add an endgame screenshot.

This page should:

1. accept a full text paste of a known export format
2. accept an upload or paste of one known digital endgame results screen layout
3. save the raw text and screenshot evidence to Supabase immediately
4. run the text parser and screenshot OCR server-side in the app
5. cross-check overlapping fields such as player names, corporation names, generation count, total score, and final megacredits
6. show a structured review screen before the user relies on imported data
7. let the user edit confirmed numeric fields and continue into the normal log-game flow with the parsed evidence attached to the game
8. require explicit player-profile resolution when any imported participant name is ambiguous or unmatched
9. classify each game-log line as actionable event, useful context, draw-only information, or ignorable filler so noisy text does not break the import

The web import page is an enhancement layer, not a separate product. It should feel like part of the `Log Game` experience rather than a disconnected admin tool.

### Step 1: Game Setup

Before entering details, the logger can choose a starting mode:

1. new game from group defaults
2. duplicate the setup from a previous game in the same group
3. import game evidence from the in-app web import page

When duplicating a previous game setup, the app should copy setup-level context such as:

1. map
2. player count
3. expansions
4. promo sets
5. selected players

Corporations, preludes, milestones, awards, scores, winners, and notes should not be copied automatically into the new game result.

When importing game evidence, the app should:

1. create or attach a draft game
2. store the raw pasted log and screenshot evidence in Supabase
3. parse the log line by line into normalized events
4. OCR the screenshot into candidate numeric score fields
5. match player names against selected players
6. match corporation names and card names against the catalog where possible
7. cross-check overlapping fields from the screenshot and the pasted log
8. prefill only the fields the parser or OCR can justify with high confidence
9. show unresolved or low-confidence matches for review instead of silently guessing
10. let the user confirm or correct every imported player-to-profile link before finalization
11. ignore or separately label non-analytic filler text such as greetings, perspective-specific prompts, and client chatter when it does not affect the final dataset

Collect:

1. group
2. date played
3. map
4. player count
5. expansions used
6. promo years or promo editions used
7. generation count

Default expansions come from the group's saved default profile.
Default promo selections come from the group's saved default promo profile.

New logs should save as cloud-backed drafts until they are finalized.

### Step 2: Players

Collect:

1. selected players from saved profiles
2. corporation for each player
3. prelude selection for each player

When imported evidence is present:

1. each imported participant must link to exactly one group player profile before the game can finalize
2. exact display-name matches may auto-link
3. normalized or alias-based matches may be suggested but must remain reviewable
4. ambiguous matches must require explicit user confirmation
5. the user may save a confirmed alias for future imports

### Step 3: Milestones and Awards

Show only the milestones and awards valid for the selected map.

Collect:

1. which milestones were claimed
2. who won each claimed milestone
3. which awards were funded
4. who funded each funded award
5. who placed first and second on each funded award

### Step 4: Final Scores

Collect for each player:

1. cities
2. greenery
3. total card points
4. optional microbe card points
5. optional animal card points
6. optional Jovian points
7. Terraform Rating points
8. milestone points
9. award points
10. total points
11. final megacredits

`Total card points` is required.

The microbe, animal, and Jovian card-point breakdowns are optional enrichment fields for better analytics and style inference.

The app derives `other_card_points = card_points_total - card_points_microbes - card_points_animals - card_points_jovian` only when all three optional card subfields are present. Otherwise `other_card_points` remains null.

An imported endgame screenshot may prefill:

1. player names
2. likely corporation names
3. generation count
4. TR points
5. milestone points
6. award points
7. greenery points
8. cities points
9. total card points
10. total points
11. final megacredits
12. winner and placement inferred from total points and final megacredits

When the supported screenshot layout includes a score-source breakdown screen, OCR should also attempt to prefill:

1. cities points
2. greenery points
3. TR points
4. milestone points
5. award points
6. total card points
7. microbe card points when explicitly shown
8. animal card points when explicitly shown
9. Jovian card points when explicitly shown
10. other visible point-source rows that map directly to the finalized score schema

An imported endgame screenshot does not by itself prove:

1. which specific milestones were claimed
2. who funded each award
3. who placed first and second on each award
4. preludes, expansion mix, or map
5. styles or key cards
6. microbe, animal, or Jovian sub-breakdowns unless the supported screenshot explicitly shows them in a stable OCR-friendly layout

### Step 5: Optional Playstyle and Key Cards

Collect optional inputs:

1. declared playstyle
2. up to two declared playstyle modifiers
3. optional key cards from the card catalog

### Step 6: Review

Show compact player summaries and block or warn on inconsistencies:

1. milestone rows not matching milestone points
2. award rows not matching award points
3. missing award funders on funded awards
4. invalid map-linked selections
5. impossible tiebreak ordering
6. invalid optional card-point subtotals when breakdown data is entered
7. data-coverage summary for optional fields used by later analytics

From review, the logger can either:

1. finalize the game
2. save the draft and return later

Finalizing the game should stamp the current catalog snapshot reference and make the game eligible for default leaderboards and stats.

### Imported Evidence Reliability Rules

Imported logs and screenshots are treated as evidence streams with explicit confidence, not as unquestioned truth.

Rules:

1. manual finalized results remain authoritative for winners, placements, scores, milestones, awards, and official leaderboard inclusion
2. every parsed event stores a confidence level such as `high`, `medium`, `low`, or `unparsed`
3. every OCR-derived score field stores confidence and remains user-editable before import
4. import review must surface matched players, ambiguous player matches, unmatched names, matched cards, unmatched cards, suspicious encoding, OCR ambiguities, and skipped lines
5. imported-log analytics must be labeled with visible coverage counts so they are not mistaken for all finalized games
6. the raw source text and screenshot asset must be retained so old imports can be reparsed when the parser improves
7. v1 should parse one known export format and one known endgame screenshot layout well rather than pretending to support every source loosely
8. when screenshot-derived scores and pasted-log-derived evidence conflict, the review screen must surface the mismatch instead of choosing silently
9. no import may finalize until every imported participant is linked to the intended saved player profile
10. filler text in the log must be classified and ignored or downgraded deliberately rather than counted as hard parser failures
11. perspective-dependent lines such as `You drew ...` may be retained as low-authority context, but they must not override player-scoped factual events unless the parser can resolve perspective safely

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

### Style Comparison

The app compares declared and inferred styles whenever both exist.

It should track:

1. exact primary-style agreement rate
2. partial agreement rate when modifiers overlap
3. mismatch frequency
4. performance when declared and inferred styles agree
5. performance when declared and inferred styles disagree
6. most common declared-to-inferred translations

This comparison should be visible at the personal, group, and global aggregate levels.

### Best Style

`Best style` is a first-class analytic, but it must be defined carefully.

By default, `best style` means the style with the strongest outcome under a minimum sample threshold using:

1. win rate as the primary metric
2. average placement as the first secondary metric
3. average score as the second secondary metric

The app should support `best style` views for:

1. a player
2. a group
3. a corporation
4. a prelude
5. a map
6. a player-count slice
7. a global aggregate view

If sample size is too small, the app should not claim a best style and should instead show the top candidate styles with low-confidence markers.

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

The catalog must include all supported promo cards and promo corporations.

### Promo Set Model

Promos must be organized into explicit promo sets so users can work with them by year or edition instead of by individual card only.

Each `promo_sets` row stores:

1. promo set name
2. promo year
3. promo edition or release label
4. display order
5. source attribution

Each promo card or promo corporation should link to its `promo_set_id`.

### Promo Selection UX

Promo selection is part of game setup and group defaults.

The app should allow users to:

1. select promo content by year
2. select promo content by promo edition or release bundle
3. select all cards in a promo set with one action
4. clear all cards in a promo set with one action
5. save a default promo-set profile for a group

This means the app supports both:

1. granular promo-set selection
2. bulk select-all behavior for a full promo year or edition

### Promo Browsing UX

Users must be able to open a promo year or promo edition and browse that promo set directly.

Inside a promo-set detail view, the app should show:

1. the promo-set name and year
2. the list of included cards and corporations
3. thumbnail images for each item
4. tap-through access to the full card image
5. card number, card type, and card name

This promo-set view should be available from:

1. group settings when choosing default promo sets
2. game setup when selecting promos used for a game
3. the broader card-reference browsing experience

### Metadata Fields

Each `cards` row stores:

1. source card id
2. card number
3. card name
4. card type
5. expansion code
6. expansion name
7. promo set id when applicable
8. tag metadata for supported Terraforming Mars tags
9. source image URL
10. source attribution
11. sync metadata

Tag metadata is required for imported-log analytics such as:

1. per-player tag profiles
2. tags played by generation
3. corporation-specific tag tendencies
4. win-rate comparisons between different tag mixes

### Catalog Snapshot Stamping

Each import or catalog sync should create a `catalog_snapshots` row.

Each snapshot stores:

1. source name
2. imported timestamp
3. source manifest, version label, or hash when available
4. notes about overrides or patch-level fixes when relevant

Each game stores the `catalog_snapshot_id` that was current when the game was finalized.

This snapshot reference is primarily for traceability and historical interpretation. Historical game results remain driven by the logged game data itself, but the app should still preserve which catalog version or override state was active at the time.

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
4. updates cloud-hosted card records
5. never mutates historical game logs

Because upstream fan-maintained sources may be incomplete, the catalog system must support manual override records for missing official promo cards and promo corporations.

Override support must allow:

1. manual metadata entries
2. manual image entries
3. source attribution per overridden card
4. coexistence with the primary imported catalog

### GitHub Usage Boundary

GitHub may store:

1. import scripts
2. sync manifests
3. metadata snapshots

GitHub is not the primary runtime image host because repository size, file limits, and LFS bandwidth/storage constraints make it a poor long-term image-serving layer for this use case.

## Analytics Model

Analytics are split across personal, group, and global aggregate scopes.

### Sentence-Form Insights

The app should generate plain-English insight cards in addition to charts and tables.

These insights should summarize statistically meaningful relationships such as:

1. how adding or removing an expansion changes score composition
2. how adding or removing a promo set changes inferred playstyles
3. which maps become stronger or weaker when certain expansions are included
4. which corporations or preludes gain or lose performance under different expansion mixes
5. which inferred playstyles become more common or more successful when specific expansions or promos are present

Example insight format:

1. "In this group, adding Colonies increases average winning score and shifts winning inferred styles toward economy and trade-heavy play."
2. "When Turmoil is present, your group funds more awards and inferred milestone-race styles become less common."
3. "With Promo Set 2022 enabled, this group plays more Jovian-heavy endgames and card-point totals rise."

Every sentence-form insight must include:

1. a confidence marker
2. a visible sample size
3. the relevant filter context

### Improvement Insights

The app should also provide player-improvement insight cards.

These are not generic strategy tips. They must be derived from the player's actual history compared with:

1. their own best-performing games
2. stronger players in the same group
3. winners in similar map, player-count, expansion, and promo contexts

Improvement insights should focus on:

1. playstyles
2. maps
3. corporations and preludes
4. award and milestone aggression
5. head-to-head adaptation patterns

`Award and milestone aggression` means how often a player pushes for milestones and funds awards relative to:

1. their total games
2. their winning games
3. stronger players in the same group
4. the group baseline

Example coaching insight format:

1. "You win more often on Elysium when your inferred style is board control instead of economy engine."
2. "In 4-player games with Prelude and Colonies, your best results come when you fund awards more often than your personal average."
3. "Compared with the strongest players in this group, you claim fewer milestones in winning-position games."

### Time-Based Progress Insights

The app should explicitly track evidence over time, not just cumulative lifetime totals.

This includes:

1. how win rate changes over time
2. how inferred and declared playstyles shift over time
3. how score composition changes over time
4. how leaderboard position changes over time
5. how milestone and award aggression changes over time
6. whether a player is actually improving over time

Time-based progress insights should be available as both:

1. charts
2. sentence-form progress summaries

Example progress insight format:

1. "Over your last 12 games, your win rate has improved and your inferred styles have shifted away from balanced play toward milestone-race and board-control finishes."
2. "Your recent games show stronger performance on Hellas when you play more aggressively for milestones than you did earlier in the year."
3. "Since adding Colonies to your group's default setup, your winning scores and award-funding rate have both increased."

### Leaderboards

Leaderboards are a first-class analytics surface, not just a sorted win-count list.

The app should support multiple leaderboard views:

1. raw wins
2. win percentage
3. average placement
4. average score
5. weighted performance leaderboard

The default leaderboard should be the `weighted performance leaderboard`.

### Weighted Performance Leaderboard

The weighted performance leaderboard should consider:

1. win percentage
2. margin of victory in wins
3. how close a player was in non-winning finishes
4. strength of repeated high placements

The recommended default leaderboard formula is a composite score built from:

1. `win_rate_component`
2. `placement_component`
3. `differential_component`

Definitions:

1. `win_rate_component`: rewards percentage of games won
2. `placement_component`: rewards higher finishes, with second place worth more than third and so on
3. `differential_component`: rewards larger winning margins and softens penalties for close losses compared with blowout losses

Differential rules:

1. for a winner, `win differential` is the point margin over second place
2. for non-winners, `finish differential` is the point gap to the next higher placement
3. a close second should score materially better than a distant second
4. a close third should score materially better than a distant third
5. if first place is a true tie, winning differential is zero for the tied winners
6. tie-aware differential logic must not invent artificial gaps between tied placements

The leaderboard system should expose the underlying components so users can see:

1. win percentage
2. average finish
3. average winning margin
4. average losing margin to the next higher place
5. weighted leaderboard score

The formula should be configurable by administrators later, but v1 should ship with one default scoring method and transparent component breakdowns.

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
19. head-to-head record versus other players
20. average score differential versus specific opponents
21. average placement differential versus specific opponents
22. how style and score composition shift across different groups
23. declared versus inferred style comparison
24. personal best style views
25. personal leaderboard position and component breakdown
26. personal sentence-form insights
27. personal improvement insights
28. personal trend evidence over time
29. personal progress-over-time insights

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
13. which players fund which awards most often
14. most successful playstyles
15. meta shifts over time
16. group winners leaderboard
17. head-to-head tables for players inside the group
18. how lineup changes alter score composition, game pace, and winning styles
19. declared versus inferred style comparison for the group
20. best style views for the group across player-count, map, and expansion slices
21. weighted leaderboard with win rate, placement, and differential components
22. group sentence-form insights about expansion, promo, and lineup effects
23. group trend evidence over time for meta shifts, playstyles, and win patterns

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
9. aggregate group-composition effects where sample size is large enough
10. declared versus inferred style agreement rates
11. best style views by map, player count, expansion mix, corporation, and prelude
12. global leaderboard-style rankings only in aggregate segment form, not as cross-group named player tables
13. global sentence-form insights about expansion, promo, map, corporation, prelude, and inferred-style interactions
14. global over-time trend evidence for playstyles, win rates, and expansion-era changes

## Statistics to Support

### Outcome Statistics

1. win rate
2. average placement
3. podium rate
4. average winning score
5. average final megacredit tiebreak amount

### Leaderboard Statistics

1. weighted leaderboard score
2. win percentage
3. average finish position
4. average winning margin
5. average losing margin to the next higher placement
6. placement-weighted differential score
7. leaderboard movement over time

### Score Composition Statistics

1. average cities points
2. average greenery points
3. average total card points
4. average microbe card points when recorded
5. average animal card points when recorded
6. average Jovian points when recorded
7. average other card points when derivable
8. average TR points
9. average milestone points
10. average award points

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
10. played-card support by corporation when imported logs are available

### Imported Log Statistics

1. most-played cards
2. most-played cards in wins versus losses
3. cards played by generation
4. average first-generation timing for repeatable engine cards
5. action-use timing by player and corporation
6. tile placement frequencies and board-space heatmaps
7. tag counts by player, corporation, map, and expansion mix
8. tag counts in wins versus losses
9. per-generation tag ramp by player and corporation
10. imported-log coverage rate and parsed-event confidence coverage
11. ignored-filler-line rate and parser-noise tolerance coverage

### OCR-Assisted Entry Statistics

1. screenshot-assisted score-entry coverage rate
2. OCR-confirmed score-field coverage by game
3. mismatch rate between screenshot OCR and pasted-log evidence when both are present
4. score-source breakdown coverage rate when the supported screenshot layout is present

### Expansion and Promo Interaction Statistics

1. map performance by expansion mix
2. corporation performance by expansion mix
3. prelude performance by expansion mix
4. inferred style distribution by expansion mix
5. inferred style win rate by expansion mix
6. promo-set impact on corporations, preludes, maps, and inferred styles
7. add-versus-remove effect sizes for an expansion or promo set
8. sentence-form interaction summaries

### Milestone and Award Statistics

1. claim frequency
2. win correlation
3. per-map milestone success
4. per-map award success
5. which players fund specific awards most often
6. which players or styles convert specific milestones and awards most effectively

### Head-to-Head Statistics

1. player-versus-player win-loss record
2. average score differential between two players
3. average placement differential between two players
4. corporation performance in specific head-to-head matchups
5. playstyle performance in specific head-to-head matchups
6. head-to-head outcomes filtered by map, player count, and expansion mix

### Group-Context Statistics

1. how a player's score composition changes between groups
2. how a player's style shifts when particular opponents are present
3. how generation count changes when the lineup changes
4. how winner profiles change when the group composition changes
5. how specific groups influence corporation and prelude performance

### Data Quality and Lifecycle Statistics

1. draft versus finalized game counts
2. optional card-breakdown coverage rate
3. declared-style entry rate
4. key-card tagging coverage rate
5. post-finalization edit frequency
6. true tie frequency

### Improvement Statistics

1. player's best-performing inferred styles by map and player count
2. player's strongest maps relative to their own baseline
3. player's strongest corporations and preludes relative to their own baseline
4. award-funding aggression compared with win rate
5. milestone-claim aggression compared with win rate
6. comparison with stronger players in the same group
7. coaching insight trigger conditions

### Time-Series and Progress Statistics

1. rolling win rate over time
2. rolling average placement over time
3. rolling leaderboard score over time
4. inferred-style frequency over time
5. declared-style frequency over time
6. score-composition changes over time
7. milestone-claim aggression over time
8. award-funding aggression over time
9. improvement delta between early and recent play windows
10. expansion-era and promo-era before-versus-after comparisons

### Style Statistics

1. style frequency
2. style win rate
3. style performance by player count
4. style performance by map
5. style performance by expansion mix
6. style score fingerprints
7. declared versus inferred agreement
8. key cards associated with each style
9. best style by player
10. best style by group
11. best style by corporation
12. best style by prelude
13. best style by map
14. best style by player count

### Declared Versus Inferred Statistics

1. exact primary-style agreement rate
2. partial agreement rate through modifier overlap
3. mismatch rate
4. agreement rate by player
5. agreement rate by group
6. agreement rate by style
7. performance delta between agreed and disagreed style readings
8. most common mismatch patterns

### Tempo and Game-Length Statistics

1. average generation count
2. win rate by short, medium, or long games
3. style distribution by game length
4. corporation performance by game length

## Visual Graphs

The app should prioritize graphs that remain readable on a phone.

Charts must be available directly on `My Profile`, `Group`, and `Insights`, with `Insights` providing the most flexible filtered view.

Charts should be paired with sentence-form insight cards when the system detects a meaningful relationship worth calling out.

Recommended visual types:

1. stacked bar charts for score composition
2. line charts for trends over time
3. ranked bar charts for win rates and play rates
4. heatmaps for corporation versus map and corporation versus player count
5. scatter plots for generation count versus total points
6. comparison bars for winners versus non-winners
7. head-to-head matrix views for player-versus-player records
8. delta charts for group-context and lineup-change effects
9. agreement-versus-mismatch charts for declared and inferred styles
10. ranked best-style charts by player, group, map, corporation, or prelude
11. leaderboard component charts showing win rate, placement, and differential contributions
12. expansion and promo interaction charts showing add-versus-remove effects
13. rolling progress charts for win rate, placement, leaderboard score, and playstyle shifts over time

Graph design rules:

1. default to one clear question per chart
2. include sample size on views that may be misread
3. allow filters for player, group, map, expansion mix, player count, corporation, prelude, and style
4. clearly label whether a style chart is based on inferred styles, declared styles, or both
5. pair major charts with sentence-form summary insights where useful
6. use the same Terraforming Mars-inspired visual system for charts, legends, cards, and empty states instead of dropping into generic analytics defaults
7. show visible data-coverage badges or entered-data counts when optional inputs materially affect the chart

## Reliability Rules

The app must avoid overstating weak data.

Rules:

1. Every major insight shows sample size.
2. Ranking and correlation views use minimum sample thresholds.
3. Small-sample results are visually marked as low-confidence.
4. Inferred style without card evidence is marked lower confidence than declared style with key-card support.
5. Analytics that rely on optional microbe, animal, Jovian, or derived other-card breakdowns must show data coverage or entered-sample count so missing optional data is not mistaken for zero.
6. Official leaderboards and headline statistics use finalized games by default, not drafts.
7. True ties must be displayed and counted as ties rather than being broken arbitrarily for presentation convenience.

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

Supabase is the primary system of record for saved application data, including games, players, groups, settings, catalog metadata, and image assets.

The app may keep transient in-memory or device cache layers for performance, but saved user data must persist to the cloud rather than existing only on the phone.

The app will be built as a phone-first web application with responsive screens and a strong mobile logging flow.

## Implementation Priorities

### V1 Must Include

1. auth and group model
2. player profiles
3. group default expansion profile
4. group default promo-set profile
5. per-game setup logging
6. score entry with final megacredits, generation count, required total card points, and optional Jovian, microbe, and animal breakdowns
7. explicit milestone and award recording including who funded each award
8. individual stats
9. group stats
10. global aggregate winner stats with opt-in
11. visual graphs
12. head-to-head comparisons
13. group-composition and lineup-change analytics
14. inferred styles
15. optional declared styles
16. declared-versus-inferred style comparison views
17. best-style views with sample thresholds
18. optional key-card tagging
19. cached card metadata and image pipeline
20. full promo-card support, including override handling for upstream gaps
21. promo-set browsing by year or edition with card thumbnails and full images
22. promo-set bulk selection and select-all behavior
23. weighted leaderboard views with transparent scoring components
24. sentence-form interaction insights
25. player-improvement insight cards based on real play history
26. progress-over-time analytics and sentence-form progress insights
27. board-game-inspired visual theming for fonts, palette, surfaces, and charts
28. cloud-backed persistence for saved user, group, game, and catalog data
29. draft and finalized game lifecycle with revision history for finalized edits
30. duplicate-from-previous-game setup flow
31. explicit true-tie handling across logging, analytics, and leaderboards
32. visible data-coverage indicators for analytics built from optional inputs
33. catalog snapshot stamping for historical traceability
34. optional in-app web page for pasted exported game logs
35. Supabase-backed raw import storage plus normalized parsed event storage
36. card tag metadata required for imported-log tag analytics
37. imported-log analytics for cards played, tag profiles, timing, and board-control patterns
38. exact digital endgame screenshot parsing for OCR-assisted score prefill
39. editable review step that combines screenshot-derived numeric fields with pasted-log-derived event evidence
40. explicit player-profile resolution and alias saving for imported evidence
41. score-source screenshot parsing for supported endgame breakdown layouts
42. noise-tolerant game-log parsing that classifies and filters filler text without losing relevant events

### V1 Can Be Lightweight In

1. advanced style inference formulas
2. heavy admin sync tooling
3. deep card-reference browsing polish
4. parser repair tooling beyond a clear import review surface
5. support for multiple external log formats
6. support for general screenshots or real-world photos beyond the known digital results screen
7. sophisticated fuzzy player matching beyond exact, normalized, and user-confirmed alias flows
8. deep use of perspective-dependent draw and discard chatter beyond simple ignore-or-context classification

Those items must be functional, but they do not need extensive polish before the core logging and analytics loop works.

## Final Design Decisions

1. Manual post-game entry remains the default flow, with an optional authenticated web page for combining pasted exported game logs and an endgame screenshot into one reviewable import flow
2. Phone-first interface
3. Shared-group access with Supabase auth
4. Full expansion-aware support from the start
5. Hybrid catalog-first setup data with simple numeric final scoring
6. Group default expansions with per-game overrides
7. Group default promo sets with per-game overrides
8. Final megacredits tracked as tiebreak data
9. Winners and placements tracked explicitly
10. Jovian, animal, and microbe card-point breakdowns are optional score subcategories layered on top of required total card points
11. Milestones and awards recorded as explicit map-aware outcomes
12. Who funded each award is recorded explicitly
13. Generation count logged for every game
14. Both inferred and optional declared styles supported
15. Styles are fixed definitions, not freeform labels
16. Optional key cards supported from a cached catalog
17. Cached thumbnails and full-size card images supported
18. Individual, group, and opt-in global analytics all supported
19. Head-to-head and group-context comparisons are first-class analytics
20. Declared-versus-inferred style comparison is first-class analytics
21. Best-style reporting is a first-class analytics concept
22. Charts and graphs appear on My Profile, Group, and Insights
23. Full promo-card support is required, even when upstream sources are incomplete
24. Promo sets are selectable by year or edition with bulk select-all behavior
25. Promo sets can be opened to browse included cards and images
26. Weighted leaderboards combine win rate, placement, and point differential
27. Sentence-form insight cards summarize expansion, promo, map, corporation, prelude, and inferred-style effects
28. Improvement insights help players adjust playstyles, maps, and award-milestone aggression
29. Progress-over-time analytics track win rates, playstyles, and improvement trends
30. My player profile is the default landing page
31. The visual system should echo Terraforming Mars typography, palette, and component styling while staying readable on a phone
32. The approved theme intensity is medium: clearly Terraforming Mars, with visible plaque-like framing and atmospheric backgrounds, but without sacrificing fast score-entry readability
33. Saved data is cloud-backed with Supabase as the system of record, not local phone storage
34. Games support draft and finalized states, and finalized edits keep revision history
35. Loggers can duplicate a previous game setup to speed up repeated group entry
36. True ties are preserved explicitly instead of being broken by arbitrary ordering
37. Analytics surface data coverage when optional inputs affect interpretation
38. Games retain a catalog snapshot reference for historical traceability
39. Imported logs are optional enrichment data, not the authoritative source for official finalized results
40. The app stores raw pasted logs in Supabase and parses them into normalized events inside the app
41. The app stores imported endgame screenshots in Supabase Storage and OCRs them into editable score candidates inside the app
42. V1 supports one known exported-log format and one known digital endgame screenshot layout well before expanding to additional formats
43. Card tag metadata is part of the catalog so imported played-card events can power tag analytics
44. Screenshot OCR is an assisted score-entry layer, not a replacement for explicit milestone, award, prelude, and expansion review
45. Imported participants must be explicitly linked to the correct saved player profiles before import data becomes finalized game data
46. Confirmed player aliases can be reused for future imports to improve match accuracy without hiding ambiguity
47. Supported endgame score-source screenshots may prefill point-origin fields, including optional sub-breakdowns when the exact layout exposes them clearly
48. Game-log filler text is expected and must be filtered or downgraded by the parser instead of treated as a fatal import problem

## External References

1. Hadronikle Terraforming Mars card database: https://tm.hadronikle.com/
2. Hadronikle catalog repository: https://github.com/hadronikle/Complete-Terraforming-Mars-Card-Database
3. Terraforming Mars Prelude rulebook: https://cdn.1j1ju.com/medias/6e/a5/22-terraforming-mars-prelude-rulebook.pdf
4. Terraforming Mars Venus Next rulebook: https://cdn.1j1ju.com/medias/6f/8f/c8-terraforming-mars-venus-next-rulebook.pdf
5. Terraforming Mars Colonies rulebook: https://cdn.1j1ju.com/medias/55/6a/42-terraforming-mars-colonies-rulebook.pdf
6. GitHub large file guidance: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
7. Git LFS billing: https://docs.github.com/en/billing/concepts/product-billing/git-lfs
8. GitHub Pages overview: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
