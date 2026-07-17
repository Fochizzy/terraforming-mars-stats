# TM Stats Page Architecture

## Primary navigation

1. Log a Game
2. My Profile
3. Global Insights
4. Individual Insights
5. Group Insights
6. Compare
7. Improvement
8. Leaderboard

## Supporting destinations

- Games Library
- Game Detail
- Game Replay
- Cards
- Glossary
- Corporations
- Preludes
- Players
- Groups
- Group Members
- Group Settings

## Target routes

- `/log-game`
- `/log-game/import`
- `/games`
- `/games/[gameId]`
- `/games/[gameId]/replay`
- `/profile`
- `/insights/global`
- `/insights/individual`
- `/insights/group`
- `/compare`
- `/improvement`
- `/leaderboard`
- `/cards`
- `/glossary`

## Page responsibilities

### Log a Game

Game entry, imports, drafts, validation, and finalization.

### My Profile

Identity, recent activity, groups, data status, and shortcuts.

### Global Insights

Global meta, conditions, cards, tags, corporations, objectives, and board trends.

### Individual Insights

One-player scoring, style, engine, cards, competition, board, tempo, and objectives.

### Group Insights

Group performance, members, chemistry, lineups, conditions, and games.

### Compare

Side-by-side comparison of compatible entities.

### Improvement

Recommendations, evidence, focus areas, action plans, and progress.

### Leaderboard

Formal rankings, placement analysis, and methodology.

### Card Database

Authenticated full reference browsing for the available catalog. It owns stable
catalog identity, stored metadata, art fallback, search, and filters; it does
not imply card-play or card-outcome analytics.

### Glossary

Authenticated, shareable definitions for current and historical product terms.
It owns stable entry fragments and controlled explanatory-text links, while
current analytics contracts remain the authority for semantic meaning.
