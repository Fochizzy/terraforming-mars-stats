import type { PublicLandingStats } from '@/lib/db/public-landing-stats-repo';

export type LandingStatDetail = {
  value: string;
  caption: string;
};

export type LandingHighlight = {
  label: string;
  detail: (stats: PublicLandingStats) => LandingStatDetail | null;
};

export type LandingSection = {
  id: string;
  title: string;
  description: string;
  highlights: LandingHighlight[];
};

function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export const homepageSections: LandingSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    description:
      "Track finished games, maps, winners, and your group's shifting meta in one place.",
    highlights: [
      {
        label: 'Finished games',
        detail: (stats) => ({
          value: stats.finishedGames.toLocaleString(),
          caption: `finished ${pluralize(stats.finishedGames, 'game')} recorded`,
        }),
      },
      {
        label: 'Player rosters',
        detail: (stats) => ({
          value: stats.totalPlayers.toLocaleString(),
          caption: `players across ${stats.totalGroups} ${pluralize(stats.totalGroups, 'group')}`,
        }),
      },
      {
        label: 'Meta snapshots',
        detail: (stats) => ({
          value: stats.mapsPlayed.toLocaleString(),
          caption: `${pluralize(stats.mapsPlayed, 'map')} in active rotation`,
        }),
      },
    ],
  },
  {
    id: 'corporations',
    title: 'Corporations',
    description:
      'Compare corporation results, favorite picks, and the matchups that keep showing up at your table.',
    highlights: [
      {
        label: 'Win rates',
        detail: (stats) =>
          stats.topCorpWinRate
            ? {
                value: percent(stats.topCorpWinRate.winRate),
                caption: `best win rate — ${stats.topCorpWinRate.name} (${stats.topCorpWinRate.plays} plays)`,
              }
            : null,
      },
      {
        label: 'Favorite picks',
        detail: (stats) =>
          stats.mostPlayedCorp
            ? {
                value: stats.mostPlayedCorp.name,
                caption: `most-picked corporation — ${stats.mostPlayedCorp.plays} plays`,
              }
            : null,
      },
      {
        label: 'Table trends',
        detail: (stats) => ({
          value: stats.distinctCorporations.toLocaleString(),
          caption: 'different corporations logged so far',
        }),
      },
    ],
  },
  {
    id: 'cards',
    title: 'Cards',
    description:
      'Explore imported card evidence, pattern-heavy plays, and the engines that keep deciding close games.',
    highlights: [
      {
        label: 'Imported evidence',
        detail: (stats) => ({
          value: stats.importedGames.toLocaleString(),
          caption: `${pluralize(stats.importedGames, 'game')} imported from full logs`,
        }),
      },
      {
        label: 'Key cards',
        detail: (stats) =>
          stats.topCardWinRate
            ? {
                value: stats.topCardWinRate.name,
                caption: `${percent(stats.topCardWinRate.winRate)} win rate when played (${stats.topCardWinRate.plays} games)`,
              }
            : null,
      },
      {
        label: 'Engine patterns',
        detail: (stats) =>
          stats.mostPlayedCard
            ? {
                value: stats.mostPlayedCard.name,
                caption: `most-played card — ${stats.mostPlayedCard.plays} games`,
              }
            : null,
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    description:
      'Jump from clean game logging into saved drafts, reopened results, and shared group workflows.',
    highlights: [
      {
        label: 'Draft saves',
        detail: (stats) => ({
          value: stats.draftGames.toLocaleString(),
          caption: `${pluralize(stats.draftGames, 'draft')} in progress`,
        }),
      },
      {
        label: 'Result edits',
        detail: (stats) => ({
          value: stats.finishedGames.toLocaleString(),
          caption: 'finalized results you can reopen and edit',
        }),
      },
      {
        label: 'Group logging',
        detail: (stats) => ({
          value: stats.totalGroups.toLocaleString(),
          caption: `${pluralize(stats.totalGroups, 'group')} logging together`,
        }),
      },
    ],
  },
  {
    id: 'milestones',
    title: 'Milestones',
    description:
      'See who closes maps best with milestone timing, award pressure, and map-aware scoring swings.',
    highlights: [
      {
        label: 'Map-aware awards',
        detail: (stats) =>
          stats.avgAwardsPerGame === null
            ? null
            : {
                value: stats.avgAwardsPerGame.toFixed(2),
                caption: 'awards funded per game',
              },
      },
      {
        label: 'Milestone timing',
        detail: (stats) =>
          stats.avgMilestonesPerGame === null
            ? null
            : {
                value: stats.avgMilestonesPerGame.toFixed(2),
                caption: 'milestones claimed per game',
              },
      },
      {
        label: 'Scoring swings',
        detail: (stats) =>
          stats.highestScore === null
            ? null
            : {
                value: stats.highestScore.toLocaleString(),
                caption:
                  stats.avgWinningScore === null
                    ? 'highest score on record'
                    : `highest score · ${stats.avgWinningScore} avg winning score`,
              },
      },
    ],
  },
  {
    id: 'stats',
    title: 'Stats',
    description:
      'Read score trends, leaderboard movement, and long-term group patterns without leaving the theme.',
    highlights: [
      {
        label: 'Trend lines',
        detail: (stats) =>
          stats.avgGenerations === null
            ? null
            : {
                value: stats.avgGenerations.toString(),
                caption: 'generations per finished game',
              },
      },
      {
        label: 'Leaderboards',
        detail: (stats) =>
          stats.topPlayerWinRate === null
            ? null
            : {
                value: `${stats.topPlayerWinRate}%`,
                caption: 'top win rate on the leaderboard',
              },
      },
      {
        label: 'Group patterns',
        detail: (stats) => ({
          value: stats.totalGroups.toLocaleString(),
          caption: `${pluralize(stats.totalGroups, 'group')} compared side by side`,
        }),
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    description:
      'Use imports, roster tools, and admin helpers that make the app practical for a recurring play group.',
    highlights: [
      {
        label: 'Imports',
        detail: (stats) => ({
          value: stats.importedGames.toLocaleString(),
          caption: `${pluralize(stats.importedGames, 'game')} imported from logs`,
        }),
      },
      {
        label: 'Roster tools',
        detail: (stats) => ({
          value: stats.totalPlayers.toLocaleString(),
          caption: 'players under management',
        }),
      },
      {
        label: 'Group settings',
        detail: (stats) => ({
          value: stats.totalGroups.toLocaleString(),
          caption: `${pluralize(stats.totalGroups, 'group')} configured`,
        }),
      },
    ],
  },
];
