export type GlossaryTerm = {
  /** Stable anchor id used for deep links (e.g. /glossary#weighted-score). */
  slug: string;
  /** Display name for the term. */
  term: string;
  /** Additional labels used when auto-linking site copy to this term. */
  aliases?: string[];
  /** Plain-language definition. */
  definition: string;
};

export type GlossaryCategory = {
  id: string;
  title: string;
  blurb: string;
  terms: GlossaryTerm[];
};

export const glossaryCategories: GlossaryCategory[] = [
  {
    id: 'standings',
    title: 'Ranking & Standings',
    blurb:
      'The numbers that decide where players sit on the leaderboard and how their form is measured.',
    terms: [
      {
        slug: 'weighted-score',
        term: 'Weighted Score',
        aliases: ['leaderboard score', 'leaderboard form'],
        definition:
          'A single ranking number that blends how a player finishes rather than just their raw points: 50% win rate, 30% average finishing placement, and 20% average score margin against opponents (capped at ±20 points). Higher is better, and it helps explain leaderboard order without making raw score the only signal.',
      },
      {
        slug: 'win-rate',
        term: 'Win Rate',
        aliases: ['win rates'],
        definition:
          "The share of a player's finalized games that ended in a win, shown as a percentage. A player who won 3 of 12 games has a 25% win rate. Ties for first count as wins.",
      },
      {
        slug: 'average-placement',
        term: 'Average Placement',
        aliases: ['avg place', 'average place'],
        definition:
          "The mean finishing position across a player's finalized games, where 1 is first place. Lower is better — an average placement of 1.8 means the player typically finishes second or better. Shown as 'Avg place' in tables.",
      },
      {
        slug: 'average-score',
        term: 'Average Score',
        aliases: ['avg score', 'average VP', 'avg VP'],
        definition:
          "The mean number of victory points a player scores per finalized game, added up from every scoring source (terraform rating, cards, board tiles, milestones, and awards). Shown as 'Avg VP' in tables.",
      },
      {
        slug: 'score-margin',
        term: 'Score Margin',
        aliases: ['average point margin', 'avg margin', 'score edge', 'score differential'],
        definition:
          "The average point gap between a player and the people they played against, also called the score differential. A positive margin means they usually out-score opponents; a negative margin means they trail. In head-to-head views this is the average differential between the two named players — a '+8' means the first player wins by 8 points on average.",
      },
      {
        slug: 'finish-distribution',
        term: 'Finish Distribution',
        definition:
          "The split of a player's results into first, second, and third-or-worse finishes (written as '1st/2nd/3rd+'). It reveals consistency that a single average placement hides: two players can share an average of 2.0 while one alternates firsts and thirds and the other finishes second every time.",
      },
      {
        slug: 'sample-size',
        term: 'Sample Size',
        aliases: ['samples', 'sample floor'],
        definition:
          'How many finalized games (or player results) a figure is built from. Small samples swing wildly, so every insight is tagged with its sample size to show how much weight it deserves — a 100% win rate over two games says far less than 60% over thirty.',
      },
      {
        slug: 'confidence',
        term: 'Confidence',
        definition:
          'A quick reliability tag on each auto-generated insight card, derived from its sample size: high (5+ games), medium (2–4 games), or low (a single game). Treat low-confidence cards as hints rather than conclusions.',
      },
      {
        slug: 'trend-over-time',
        term: 'Trend Over Time',
        aliases: ['trend lines', 'trend line', 'score trends'],
        definition:
          "Average score plotted against the date each game was played, tracing how a player or group's form moves across the season. Rising lines mean improving results; the most recent games are listed beneath the chart.",
      },
      {
        slug: 'play-rate',
        term: 'Play Rate',
        aliases: ['playrate', 'global playrate', 'your playrate', 'played rate'],
        definition:
          'The share of games in a scope where a card, corporation, prelude, play style, or other tracked item appeared. It is different from raw plays because it uses the current game count as the denominator.',
      },
      {
        slug: 'win-rate-delta',
        term: 'Win Rate Delta',
        aliases: ['delta', 'win-rate lift', 'win rate lift', 'victory impact', 'loss impact'],
        definition:
          'The gap between one win rate and the comparison baseline. Positive deltas show an item outperforming its baseline; negative deltas show it trailing that baseline.',
      },
      {
        slug: 'score-deviation',
        term: 'Score Deviation',
        aliases: ['Score SD', 'score SD'],
        definition:
          'How widely scores vary around their average for a corporation, prelude, pairing, or other selection. Higher deviation means results are swingier and less predictable.',
      },
    ],
  },
  {
    id: 'scope-views',
    title: 'Scope & Views',
    blurb:
      'How to read the controls at the top of the Insights page and the names of the different lenses the data is shown through.',
    terms: [
      {
        slug: 'scope',
        term: 'Scope (Overall vs Selected Group)',
        aliases: ['Insight scope', 'Selected Group'],
        definition:
          "The control at the top of Insights that switches charts between lenses. Overall pools all the games you share with each player across every group, so you see a player's complete record. Selected Group narrows to just the group chosen below, so you can study one table's dynamics in isolation.",
      },
      {
        slug: 'player-focus',
        term: 'Player Focus',
        definition:
          "The dropdown that points every chart at one person. Leave it on 'All players' for a group- or field-wide view, or pick a player to refocus each chart on their results. It works together with Scope to control exactly what you are looking at.",
      },
      {
        slug: 'insights-lab',
        term: 'Insights Lab',
        aliases: ['Group Insights Lab', 'Individual Insights Lab'],
        definition:
          'The control panel at the top of Insights where you choose the scope, player focus, and group or combination view before reading the charts below.',
      },
      {
        slug: 'combination-lens',
        term: 'Combination Lens',
        aliases: ['combination view', 'selected mix'],
        definition:
          'A group Insights mode that filters charts to finalized games containing a chosen mix of players, so you can compare how that table composition performs together.',
      },
      {
        slug: 'overall-view',
        term: 'Overall',
        aliases: ['overall record', 'cross-group lens'],
        definition:
          'The cross-group lens: it combines every finalized game a player appears in, regardless of which group it was logged under, so you see their complete record rather than one group\'s slice. Chosen with the Scope toggle.',
      },
      {
        slug: 'shared-games',
        term: 'Shared Games',
        definition:
          'Games that two or more of the people you track both played in. The Overall leaderboard and head-to-head views are built only from shared games, because those are the only games where players can be compared against each other directly.',
      },
      {
        slug: 'personal-vs-global',
        term: 'Your Games vs All Recorded Games',
        aliases: ['Your Games', 'All Recorded Games', 'personal games'],
        definition:
          "The two scopes in the Corporation & Prelude stats. 'Your Games' counts only games you personally played, while 'All Recorded Games' pools every finalized game in the database. Comparing them shows whether your corporation results line up with the wider trend or are unique to your table.",
      },
      {
        slug: 'global-statistics',
        term: 'Global Statistics',
        aliases: ['Global Meta Snapshot', 'global meta', 'app-wide page'],
        definition:
          'The app-wide page that reports insights across every recorded game rather than a single player or group. It is the widest view of the data.',
      },
      {
        slug: 'insight-card',
        term: 'Insight Card',
        definition:
          'An auto-generated highlight near the top of the Insights page. Each card states the strongest signal for the current focus in plain language and is tagged with its sample size and confidence, so you can read the headline takeaways without studying every chart.',
      },
      {
        slug: 'score-source-radar',
        term: 'Score Source Radar',
        aliases: ['score-source radar', 'score source patterns'],
        definition:
          "The spider (radar) chart that plots a player's average points from each scoring source against the group average. It makes it easy to see at a glance which sources a player over- or under-relies on compared with everyone else.",
      },
      {
        slug: 'score-profile',
        term: 'Score Profile',
        aliases: ['Group Score Profile', 'Overall Score Profile', 'Combination Score Profile'],
        definition:
          'The Insights section that breaks a player, group, or player combination into score sources, score averages, and related scoring patterns.',
      },
    ],
  },
  {
    id: 'play-styles',
    title: 'Play Styles',
    blurb:
      'The strategic archetype a game was played in — both the style a player declares up front and the one inferred from how their points actually came together.',
    terms: [
      {
        slug: 'play-style',
        term: 'Play Style',
        aliases: ['play styles', 'style identity', 'style profile'],
        definition:
          "A game's strategic archetype — for example greenery-heavy, card-engine, or milestone-and-award focused. Each game can carry a declared style the player chose up front and an inferred style derived from how their points actually came together; the style sections compare the two and track which styles win most.",
      },
      {
        slug: 'declared-style',
        term: 'Declared Style',
        definition:
          'The play style a player records for themselves when a game is logged, capturing the plan they went in with. It is optional, so not every game has one.',
      },
      {
        slug: 'inferred-style',
        term: 'Inferred Style',
        definition:
          "A play style the app derives automatically from a player's actual score breakdown — the mix of terraform rating, card points, board tiles, milestones, and awards they ended up with. It reflects what happened, not what was planned, so it can differ from the declared style.",
      },
      {
        slug: 'style-agreement',
        term: 'Style Agreement',
        definition:
          "How often a player's declared style matched the style inferred from their scoring. Each game is scored as an exact match, a partial match (related archetypes), or a mismatch, and the section stacks those rates per player. Frequent mismatches can mean a player plans one way but scores another.",
      },
      {
        slug: 'style-modifier',
        term: 'Style Modifier',
        definition:
          'An optional secondary tag layered on a declared style to capture a supporting plan — for example a board-control game with an engine-building lean. A game can carry up to two modifiers alongside its primary declared style.',
      },
      {
        slug: 'style-balanced',
        term: 'Balanced (style)',
        definition:
          'Spreads scoring across terraform rating, board tiles, and card points instead of committing to one route. Balanced players stay flexible and are rarely shut out of any single scoring source, but rarely dominate one either.',
      },
      {
        slug: 'style-board-control',
        term: 'Board Control (style)',
        definition:
          'Scores mainly through the map — placing cities and greeneries and competing for adjacency bonuses — rather than through card combos. Strong on maps and tables where good tile spots are scarce and worth fighting over.',
      },
      {
        slug: 'style-engine-building',
        term: 'Engine Building (style)',
        aliases: ['Engine Builder', 'engine builder'],
        definition:
          "Spends the early game assembling production and repeatable card effects, then cashes that 'engine' in for a large late-game payoff. Slower to start, but powerful if the game runs long enough for the engine to pay off.",
      },
      {
        slug: 'style-jovian-payoff',
        term: 'Jovian Payoff (style)',
        definition:
          'Collects Jovian (outer-planet) tags and cards that multiply their value, aiming for one big burst of card points at the end. High-variance: it depends on the right Jovian cards showing up.',
      },
      {
        slug: 'style-terraform-rush',
        term: 'Terraform Rush (style)',
        aliases: ['Terraforming Rush', 'terraforming rush'],
        definition:
          'Raises the global parameters — oxygen, temperature, and oceans — as fast as possible to score through terraform rating and end the game early, before slower engine-building opponents can cash in.',
      },
      {
        slug: 'style-milestone-aggression',
        term: 'Milestone Aggression (style)',
        aliases: ['Milestone Race', 'milestone race'],
        definition:
          'Races to claim milestones early — the fixed-point achievements only a few players can grab — and positions on the board to lock them in before opponents can reach the requirements.',
      },
      {
        slug: 'style-award-pressure',
        term: 'Award Pressure (style)',
        definition:
          'Funds awards and builds toward leading them, betting that end-game award points will outweigh the cost of funding. Rewards players who can dominate a category the whole table is competing over.',
      },
      {
        slug: 'style-award-closer',
        term: 'Award Closer (style)',
        definition:
          'Finishes games by converting funded award races into end-game points. It overlaps with award pressure, but focuses on the closing payoff rather than the act of funding early.',
      },
      {
        slug: 'style-card-combo',
        term: 'Card Combo (style)',
        definition:
          'Wins through interacting project-card effects rather than a single scoring lane. Combo games often depend on timing, tags, discounts, and chained card text lining up.',
      },
      {
        slug: 'style-card-vp-engine',
        term: 'Card VP Engine (style)',
        aliases: ['Card Victory Point Engine'],
        definition:
          'Builds toward repeatable or scalable victory points from cards, using the engine to turn resources, tags, and card effects into end-game card points.',
      },
      {
        slug: 'style-city-building',
        term: 'City Building (style)',
        definition:
          'Prioritizes city placement and adjacency value, usually pairing cities with greeneries so board position becomes a major scoring source.',
      },
      {
        slug: 'style-economy-engine',
        term: 'Economy Engine (style)',
        definition:
          'Focuses on production, discounts, and money flow first, then converts that economy into points once the engine is running.',
      },
      {
        slug: 'style-plant-greenery',
        term: 'Plant Greenery (style)',
        definition:
          'Leans into plant production and greenery placement, scoring through oxygen bumps, greenery points, and city adjacency.',
      },
      {
        slug: 'style-science-combo',
        term: 'Science Combo (style)',
        definition:
          'Uses science tags and science-gated cards to unlock stronger effects, discounts, or point engines than the player could access otherwise.',
      },
      {
        slug: 'style-space-economy',
        term: 'Space Economy (style)',
        definition:
          'Builds around space tags, titanium, and space-card discounts so expensive space projects become the main route to tempo or points.',
      },
      {
        slug: 'style-effectiveness',
        term: 'Style Effectiveness',
        aliases: ['style fit', 'style outcomes'],
        definition:
          'A plain-language read on which play styles are working for the current scope, comparing how often each style appears, where its points come from, and how its win rate compares with the surrounding baseline.',
      },
    ],
  },
  {
    id: 'score-sources',
    title: 'Score Sources',
    blurb:
      'The individual buckets a final victory-point total is broken into. The score profile and radar charts average these across a player or group.',
    terms: [
      {
        slug: 'victory-points',
        term: 'Victory Points (VP)',
        aliases: ['victory point', 'VP'],
        definition:
          "The points that decide the game. Every scoring source below — terraform rating, cards, board tiles, milestones, and awards — feeds into a player's final victory-point total, and the highest total wins. 'Avg VP' throughout the stats is the average of these totals per game.",
      },
      {
        slug: 'terraform-rating',
        term: 'Terraform Rating (TR)',
        aliases: ['TR', 'tr points', 'terraform rating points'],
        definition:
          "A player's global-parameter track. Each step of raising oxygen or temperature, or placing an ocean, lifts terraform rating by one, and every point of it counts directly as a victory point at the end of the game. It also sets each generation's base income.",
      },
      {
        slug: 'card-points',
        term: 'Card Points',
        aliases: ['card scoring', 'total card points'],
        definition:
          'Victory points printed on project cards that a player kept in play, including cards that score from resources they collected. In the score profile this is the headline card-scoring bucket.',
      },
      {
        slug: 'other-card-points',
        term: 'Other Card Points',
        aliases: ['other card'],
        definition:
          'Card-driven victory points that fall outside the main resource buckets — flat point values and miscellaneous card effects that are not tracked as microbe, animal, or Jovian points.',
      },
      {
        slug: 'greenery-points',
        term: 'Greenery Points',
        aliases: ['greenery scoring', 'greeneries'],
        definition:
          'One victory point for each greenery tile a player has on the board at the end of the game.',
      },
      {
        slug: 'city-points',
        term: 'City Points',
        aliases: ['cities points', 'cities'],
        definition:
          'Victory points a city tile earns from the greenery tiles adjacent to it, scored at the end of the game.',
      },
      {
        slug: 'milestone-points',
        term: 'Milestone Points',
        aliases: ['milestone scoring'],
        definition:
          'The fixed victory points awarded for each milestone a player claimed (5 points apiece in the standard rules).',
      },
      {
        slug: 'award-points',
        term: 'Award Points',
        aliases: ['award scoring'],
        definition:
          'Victory points earned for placing first or second in a funded award. Awards are scored at the end of the game based on final standings, so anyone at the table can win them regardless of who paid to fund them.',
      },
      {
        slug: 'jovian-points',
        term: 'Jovian Points',
        definition:
          'Card points that scale with Jovian tags in play — the payoff lane for Jovian-focused decks, tracked separately so its swing is visible.',
      },
      {
        slug: 'microbe-points',
        term: 'Microbe Points',
        definition:
          'Victory points from cards that store and score microbe resources. Because these are optional to record, low microbe coverage means the value is missing rather than zero.',
      },
      {
        slug: 'animal-points',
        term: 'Animal Points',
        definition:
          'Victory points from cards that store and score animal resources, tracked as its own bucket alongside microbes.',
      },
    ],
  },
  {
    id: 'coverage',
    title: 'Data Coverage',
    blurb:
      'How complete the optional detail is behind a chart. Low coverage means a detail simply was not recorded, so the dependent charts are partial samples — not evidence that the value was zero.',
    terms: [
      {
        slug: 'finalized-game',
        term: 'Finalized Game',
        aliases: ['finalized games', 'finished game', 'finished games', 'finalized results'],
        definition:
          'A logged game that has been reviewed and locked in as complete. Every figure across the app is built from finalized games only; drafts and in-progress logs are excluded until they are finalized.',
      },
      {
        slug: 'optional-data-coverage',
        term: 'Optional Data Coverage',
        aliases: ['coverage', 'optional-data coverage'],
        definition:
          "The share of a player's or group's finalized games that recorded the optional breakdown details — full card-point breakdowns, microbe / animal / Jovian points, declared play style, and key cards. A low value means that detail is simply missing from those games, not that the value was zero, so treat the dependent charts as partial samples.",
      },
      {
        slug: 'full-card-breakdown-coverage',
        term: 'Full Card Breakdown Coverage',
        definition:
          'The share of finalized games where the complete card-point breakdown was recorded, rather than just a total. Higher coverage makes the card-scoring charts more trustworthy.',
      },
      {
        slug: 'microbe-coverage',
        term: 'Microbe Coverage',
        definition:
          'The share of finalized games that recorded microbe points. When it is low, microbe scoring is under-counted in the score profile.',
      },
      {
        slug: 'animal-coverage',
        term: 'Animal Coverage',
        definition:
          'The share of finalized games that recorded animal points. Low coverage means animal scoring is under-represented.',
      },
      {
        slug: 'jovian-coverage',
        term: 'Jovian Coverage',
        definition:
          'The share of finalized games that recorded Jovian points, which drives how reliable the Jovian score bucket is.',
      },
      {
        slug: 'declared-style-coverage',
        term: 'Declared Style Coverage',
        definition:
          'The share of finalized games where a player recorded a declared style. Style-agreement charts can only compare the games where this exists.',
      },
      {
        slug: 'key-card-coverage',
        term: 'Key-Card Coverage',
        aliases: ['key card coverage'],
        definition:
          'The share of finalized games where a player noted the key cards that shaped the game, feeding the card-outcome views.',
      },
      {
        slug: 'game-log',
        term: 'Game Log',
        aliases: ['exported game log', 'imported game logs', 'imported logs', 'log evidence'],
        definition:
          'The text export from a digital Terraforming Mars game. The importer reads it to recover participants, generations, card plays, map clues, milestones, awards, tags, and other events.',
      },
      {
        slug: 'import-evidence',
        term: 'Import Evidence',
        aliases: ['result evidence', 'game result evidence', 'combined result screenshot', 'game-result image'],
        definition:
          'The uploaded game log plus result screenshot or PDF used to prefill a game. Evidence can be analyzed, reviewed, corrected, and then saved as an import draft.',
      },
      {
        slug: 'score-details',
        term: 'Score Details',
        aliases: ['score detail', 'victory point breakdown', 'score breakdown', 'point breakdown'],
        definition:
          'The detailed end-game scoring breakdown for each player, including card points, milestones, awards, greenery points, city points, terraform rating, and resource-driven card points when available.',
      },
      {
        slug: 'ocr',
        term: 'OCR',
        aliases: ['browser OCR', 'server-side OCR'],
        definition:
          'Optical character recognition: the step that reads text from uploaded result screenshots. PDFs with a readable text layer can skip OCR and provide cleaner score details.',
      },
      {
        slug: 'import-draft',
        term: 'Import Draft',
        aliases: ['import draft', 'saved import draft', 'Confirm Import Draft'],
        definition:
          'A saved, editable game created from import evidence before it becomes final. Review the generated players, scores, milestones, awards, cards, and notes before finalizing it.',
      },
      {
        slug: 'saved-game',
        term: 'Saved Game',
        aliases: ['saved games', 'Review Saved Games', 'saved draft', 'saved drafts'],
        definition:
          'A draft or finalized game kept in the app so it can be reviewed, corrected, reopened, or finalized later.',
      },
    ],
  },
  {
    id: 'insight-views',
    title: 'Insight Views',
    blurb:
      'What each chart and section on the Insights and Global Statistics pages is actually showing.',
    terms: [
      {
        slug: 'head-to-head',
        term: 'Head-to-Head',
        aliases: ['head-to-head lens', 'head-to-head snapshot', 'head-to-head records'],
        definition:
          'Direct matchup records between two players — wins-losses-ties and the average point margin across the games they both played in. It only counts games the pair actually shared.',
      },
      {
        slug: 'lineup-effects',
        term: 'Lineup Effects',
        definition:
          "How a player's win rate and average score shift depending on which specific opponents are at the table together. It surfaces which group mixes a player thrives or struggles in.",
      },
      {
        slug: 'interaction-insights',
        term: 'Interaction Insights',
        aliases: ['interaction pairings'],
        definition:
          'Win rates for specific corporation-and-prelude pairings, ranked by how often the combination shows up, to highlight which starting packages perform best together.',
      },
      {
        slug: 'milestone-economics',
        term: 'Milestone Economics',
        definition:
          'How claiming each milestone relates to winning — how often a milestone is claimed and how the players who claim it tend to finish, so you can see which milestones are worth racing for.',
      },
      {
        slug: 'award-economics',
        term: 'Award Economics',
        definition:
          'How funding and winning awards plays out — who pays to fund an award versus who ends up scoring it, plus the win rates tied to award outcomes.',
      },
      {
        slug: 'card-outcomes',
        term: 'Card Outcomes',
        aliases: ['Most-Played Card Outcomes', 'card outcome views', 'card plays'],
        definition:
          'Win rate and average score for games where a specific key card was in play, ranked to show which cards travel with the strongest results.',
      },
      {
        slug: 'tag-outcomes',
        term: 'Tag Outcomes',
        definition:
          'Win rate and average score grouped by card tag (for example space, building, or science), showing which tag-leaning decks perform best.',
      },
      {
        slug: 'game-pace',
        term: 'Game Pace',
        aliases: ['pace', 'tempo'],
        definition:
          'How quickly the global parameters and scoring build up generation by generation, tracing the tempo of a typical game.',
      },
      {
        slug: 'board-heatmap',
        term: 'Board Heatmap',
        definition:
          'A map of how often each board space is used for a tile across finalized games, so you can spot the most-contested hexes and popular placements.',
      },
      {
        slug: 'placement-distribution',
        term: 'Placement Distribution',
        definition:
          "How a player or group's finishes spread across first, second, third, and beyond — a fuller picture than a single average placement.",
      },
      {
        slug: 'table-size',
        term: 'Table Size',
        aliases: ['table-size meta', 'table size'],
        definition:
          'Performance broken out by how many players were in the game, showing whether a player does better in duels or in larger tables.',
      },
      {
        slug: 'game-length',
        term: 'Game Length',
        aliases: ['generation length', 'generation length fit'],
        definition:
          'Performance broken out by how many generations a game lasted, revealing whether a player favours fast games or long ones.',
      },
      {
        slug: 'map-performance',
        term: 'Map Performance',
        aliases: ['map meta', 'map-specific strengths'],
        definition:
          'Win rate and average score broken out by which board map was played (Tharsis, Hellas, Elysium, and the rest), showing map-specific strengths.',
      },
      {
        slug: 'meta-winners-draggers',
        term: 'Meta Winners & Draggers',
        aliases: ['Meta Winners and Draggers', 'meta signals', 'overperformer', 'dragger'],
        definition:
          'Cards, corporations, preludes, or other selections whose win rate sits meaningfully above or below the current baseline once they clear the sample floor.',
      },
      {
        slug: 'tempo-profile',
        term: 'Tempo Profile',
        aliases: ['tempo metrics', 'fast games', 'long games'],
        definition:
          'A read on how game speed affects results, grouping games by tempo and comparing win rate, average score, and points per generation.',
      },
      {
        slug: 'terraforming-share',
        term: 'Terraforming Share',
        aliases: ['global-parameter actions', 'terraforming actions'],
        definition:
          'A log-derived measure of who performed the oxygen, temperature, and ocean actions that pushed the game toward completion.',
      },
      {
        slug: 'objective-conversion',
        term: 'Objective Conversion',
        aliases: ['objective records', 'conversion rate', 'sniped'],
        definition:
          'How often milestone and award involvement turns into points or wins. It highlights objectives that reliably convert and ones that are often overtaken by opponents.',
      },
      {
        slug: 'map-table-meta',
        term: 'Map & Table-Size Meta',
        aliases: ['Map and Table-Size Meta'],
        definition:
          'A combined view of how maps and player counts change average score, game length, and result patterns across recorded games.',
      },
      {
        slug: 'opening-combo-strength',
        term: 'Opening Combo Strength',
        aliases: ['opening combo', 'Best opener', 'Trap opener', 'High variance'],
        definition:
          'How repeated corporation-and-prelude starts perform, including strong openers, swingy starts, and traps that underperform their apparent promise.',
      },
      {
        slug: 'log-derived-card-timing',
        term: 'Log-Derived Card Timing',
        aliases: ['card timing', 'early win', 'late win'],
        definition:
          'A comparison of outcomes when a card is played earlier or later in the game, based on imported log timing rather than final score rows alone.',
      },
      {
        slug: 'final-terraforming-action',
        term: 'Final Terraforming Action',
        aliases: ['final action', 'final actions', 'final-action win rate', 'common finisher'],
        definition:
          'The oxygen, temperature, or ocean action that completes terraforming pressure near the end of an imported-log game, tracked to see who tends to close the game and how often that correlates with winning.',
      },
      {
        slug: 'expanded-individual-metrics',
        term: 'Expanded Individual Metrics',
        aliases: ['individual metrics', 'player-specific lenses'],
        definition:
          'Profile-focused reads that explain what is driving wins, losses, tempo, style fit, consistency, and other personal patterns beyond the main leaderboard.',
      },
      {
        slug: 'lead-pressure',
        term: 'Lead Pressure',
        aliases: ['lead rate', 'score edge', 'avg winning lead', 'avg chase gap'],
        definition:
          'A profile metric showing how often a player holds a meaningful lead, how big that edge is, and how their chases compare when they are behind.',
      },
      {
        slug: 'phase-tempo',
        term: 'Phase Tempo',
        aliases: ['opening tempo', 'midgame tempo', 'endgame tempo'],
        definition:
          'A profile breakdown of how a player performs in different parts of the game, helping separate fast starts from strong finishes.',
      },
      {
        slug: 'global-parameter-tempo',
        term: 'Global Parameter Tempo',
        aliases: ['global parameter tempo', 'parameter tempo'],
        definition:
          'How a player contributes to oxygen, temperature, and ocean progress over time, showing whether they tend to push the planet or let others do the terraforming work.',
      },
      {
        slug: 'resource-removal',
        term: 'Resource Removal',
        aliases: ['resource removal profile'],
        definition:
          'A profile read on games affected by removing resources or production, such as plants or heat, and whether those actions correlate with stronger or weaker results.',
      },
      {
        slug: 'score-pace',
        term: 'Score Pace',
        aliases: ['points per generation', 'pts/gen'],
        definition:
          'How quickly points accumulate relative to game length. It helps distinguish a high total from a fast, efficient scoring pace.',
      },
      {
        slug: 'profile-expansions',
        term: 'Profile Expansions',
        aliases: ['profile model', 'expansion profile'],
        definition:
          'Extra profile reads that use available setup, scoring, tempo, and card data to explain a player in more detail when enough evidence exists.',
      },
    ],
  },
  {
    id: 'selection-stats',
    title: 'Corporations, Preludes & Selection',
    blurb:
      'The Corporation & Prelude stats measure which starting choices get picked and how they perform. These terms decode that table.',
    terms: [
      {
        slug: 'corporation-selection',
        term: 'Selection Stats',
        aliases: ['Corporation & Prelude Performance', 'Corporation & Prelude Stats', 'global value summary', 'selection stats'],
        definition:
          "How often each corporation or prelude gets picked and how those picks perform — plays, win rate, average placement, and where the points come from. It answers the question 'which starts actually win?'",
      },
      {
        slug: 'plays',
        term: 'Plays',
        aliases: ['games played', 'play count'],
        definition:
          'The number of finalized games a corporation, prelude, or pairing was used in — its sample size. A high win rate over only two plays is far less reliable than the same rate over twenty, so always read a win rate next to its plays.',
      },
      {
        slug: 'baseline-win-rate',
        term: 'Baseline Win Rate',
        aliases: ['baseline', 'baseline win rate'],
        definition:
          'The win rate you would expect from an average seat if nobody had an edge — roughly one divided by the number of players (about 25% at a four-player table). A corporation or prelude is only genuinely strong if it beats this baseline, not just if its win rate is above zero.',
      },
      {
        slug: 'corp-prelude-pairing',
        term: 'Corporation + Prelude Pairing',
        aliases: ['corporation-and-prelude pairings', 'corporation and prelude pairings', 'starting package', 'opening combo'],
        definition:
          "A specific starting package — one corporation combined with one prelude — tracked as a single unit. Because a corporation's strength often depends on the prelude backing it, pairings can reveal combos that the individual corporation and prelude stats miss.",
      },
      {
        slug: 'award-funding-roi',
        term: 'Award Funding ROI',
        aliases: ['ROI', 'funder ROI'],
        definition:
          'For each award, how often the player who paid to fund it went on to actually win it. A low ROI means funders are frequently handing points to opponents; a high ROI means paying to fund that award tends to pay the funder back.',
      },
      {
        slug: 'merger',
        term: 'Merger',
        definition:
          'A prelude (seen in imported games) that lets a player start with two corporations merged into one. Games that used it are flagged so its outsized effect can be measured separately from ordinary starts.',
      },
      {
        slug: 'merger-impact',
        term: 'Merger Impact',
        aliases: ['Merger win rate', 'Non-Merger win rate'],
        definition:
          "A per-player comparison of win rate in games where they played the Merger prelude versus games where they didn't, with the difference shown as a delta — revealing whether the two-corporation start actually helped that player.",
      },
      {
        slug: 'corporation-matchup',
        term: 'Corporation Matchup',
        aliases: ['Corporation Matchups'],
        definition:
          'A head-to-head record between two corporations: how often each one came out ahead when both were at the same table.',
      },
      {
        slug: 'tags-in-wins',
        term: 'Tags in Wins vs Losses',
        aliases: ['tag trends', 'Most Prevalent Tag Trends', 'tags in wins'],
        definition:
          'The average number of a given card tag a player held in games they won versus games they lost. A wide gap suggests that leaning into that tag tracks with winning; a small gap suggests it makes little difference.',
      },
      {
        slug: 'point-source-share',
        term: 'Point-Source Share',
        aliases: ['Where Points Come From', 'share of VP', 'score-source share'],
        definition:
          'The percentage of a score that came from each scoring bucket, such as terraform rating, cards, greeneries, cities, milestones, and awards.',
      },
    ],
  },
  {
    id: 'game-concepts',
    title: 'Game Concepts',
    blurb:
      'Core Terraforming Mars terms the stats lean on, defined briefly for anyone new to the game.',
    terms: [
      {
        slug: 'generation',
        term: 'Generation',
        aliases: ['generations', 'average generation', 'avg gen'],
        definition:
          'One full round of Terraforming Mars — players draft and play cards, take actions, then collect production. Game length is measured in generations.',
      },
      {
        slug: 'global-parameters',
        term: 'Global Parameters',
        aliases: ['oxygen', 'temperature', 'oceans'],
        definition:
          'The three planet-wide tracks players raise to terraform Mars: oxygen, temperature, and oceans. Raising any of them lifts terraform rating, and the game ends the generation after all three are maxed out.',
      },
      {
        slug: 'production',
        term: 'Production',
        definition:
          'A player\'s recurring per-generation income of a resource — money, steel, titanium, plants, energy, or heat. Building production compounds every generation, which is what makes an engine-building game strong if it runs long.',
      },
      {
        slug: 'project-resources',
        term: 'Project Resources',
        aliases: ['microbes', 'animals', 'floaters'],
        definition:
          'Resources such as microbes, animals, and floaters that accumulate on specific cards rather than in a player\'s general supply. They often convert into victory points or effects, which is why microbe and animal points are tracked as their own buckets.',
      },
      {
        slug: 'tag',
        term: 'Tag',
        aliases: ['tags', 'card tag', 'card tags'],
        definition:
          'An icon on a project card marking its theme — space, building, science, microbe, Jovian, and so on. Many cards score points or trigger effects based on how many of a tag a player has, which is why tag-based stats are worth watching.',
      },
      {
        slug: 'standard-project',
        term: 'Standard Project',
        aliases: ['standard projects'],
        definition:
          "A fixed action any player can pay for regardless of their cards — such as building a city, placing a greenery, or bumping a global parameter. It is the reliable fallback for scoring when a player's cards aren't cooperating.",
      },
      {
        slug: 'milestone',
        term: 'Milestone',
        definition:
          'A one-time achievement a player can pay to claim when they meet its requirement, worth fixed victory points at the end. Only a limited number can be claimed per game, so they trigger races.',
      },
      {
        slug: 'award',
        term: 'Award',
        definition:
          'A category any player can pay to fund; at the end of the game the players who lead that category score points for first and second. Unlike milestones, funding an award does not guarantee winning it — an opponent can overtake you in the category you paid for.',
      },
      {
        slug: 'corporation',
        term: 'Corporation',
        aliases: ['corporations', 'corp'],
        definition:
          'The company a player runs, setting their starting resources and a unique ability that shapes their whole game.',
      },
      {
        slug: 'prelude',
        term: 'Prelude',
        aliases: ['preludes'],
        definition:
          "A one-time boost card played at the very start of the game (from the Prelude expansion) that accelerates a player's opening — often paired with a corporation to define a starting package.",
      },
      {
        slug: 'greenery',
        term: 'Greenery',
        aliases: ['greenery tile', 'greenery tiles'],
        definition:
          'A forest tile placed on the board. Greeneries raise oxygen, score a victory point each, and boost adjacent cities.',
      },
      {
        slug: 'ocean',
        term: 'Ocean',
        aliases: ['ocean tile', 'ocean tiles'],
        definition:
          'A water tile placed on reserved ocean spaces. Placing oceans raises terraform rating and pays bonuses to adjacent tiles, but oceans themselves are not worth end-game points.',
      },
      {
        slug: 'city-tile',
        term: 'City Tile',
        aliases: ['city tiles'],
        definition:
          'A settlement tile placed on the board. Cities score at the end based on the greenery tiles next to them and feed several awards and milestones.',
      },
      {
        slug: 'key-card',
        term: 'Key Card',
        aliases: ['key cards', 'loss-correlated cards', 'most-played cards'],
        definition:
          'A project card a player flags as pivotal to how a game went. Key cards are optional to record and power the card-outcome and coverage views.',
      },
      {
        slug: 'map',
        term: 'Map',
        aliases: ['maps', 'board map'],
        definition:
          'The Terraforming Mars board used for a game, such as Tharsis, Hellas, Elysium, or another supported map. Maps determine available milestones, awards, ocean spaces, and many placement incentives.',
      },
      {
        slug: 'expansion',
        term: 'Expansion',
        aliases: ['expansions', 'required expansions'],
        definition:
          'An add-on set of cards, rules, maps, or setup options. The app tracks expansions so cards, corporations, preludes, and profile reads can be interpreted in the right context.',
      },
      {
        slug: 'card-database',
        term: 'Card Database',
        aliases: ['card catalog', 'Card Lookup', 'Search Card Database'],
        definition:
          'The searchable card catalog in the app, including card names, numbers, types, expansions, tags, victory-point type, and card images when available.',
      },
      {
        slug: 'player-profile',
        term: 'Player Profile',
        aliases: ['saved player profile', 'profile analytics', 'player roster', 'roster player'],
        definition:
          'The app record for a person at a table. Profiles connect logged results, saved-player claims, group rosters, and personal analytics.',
      },
    ],
  },
];

/** Flat lookup of every valid glossary slug, useful for validation and tests. */
export const glossarySlugs: ReadonlySet<string> = new Set(
  glossaryCategories.flatMap((category) => category.terms.map((term) => term.slug)),
);

export type GlossaryLinkTarget = {
  label: string;
  slug: string;
  term: string;
};

function parentheticalAliases(term: string) {
  return [...term.matchAll(/\(([^)]+)\)/g)]
    .map((match) => match[1]?.trim() ?? '')
    .filter((alias) => /^[A-Z0-9 +&/-]+$/.test(alias));
}

function baseTerm(term: string) {
  return term.replace(/\s*\([^)]*\)/g, '').trim();
}

/** Link labels that are valid because they are backed by the current glossary. */
export const glossaryLinkTargets: GlossaryLinkTarget[] = [
  ...new Map(
    glossaryCategories.flatMap((category) =>
      category.terms.flatMap((term) => {
        const labels = new Set([
          term.term,
          baseTerm(term.term),
          ...parentheticalAliases(term.term),
          ...(term.aliases ?? []),
        ].filter(Boolean));

        return [...labels].map((label) => [
          `${label.toLowerCase()}|${term.slug}`,
          {
            label,
            slug: term.slug,
            term: term.term,
          },
        ] as const);
      }),
    ),
  ).values(),
].sort((left, right) => right.label.length - left.label.length);
