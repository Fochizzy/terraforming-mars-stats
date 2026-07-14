import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GlobalInsightMetrics } from '@/lib/db/analytics-repo';
import {
  GlobalInsightMetricsSection,
  rankMetaSignals,
} from './global-insight-metrics-section';

const metrics: GlobalInsightMetrics = {
  cardTiming: [
    {
      cardName: 'Mars University',
      earlyPlays: 4,
      earlyWinRate: 0.75,
      earlyWins: 3,
      latePlays: 3,
      lateWinRate: 0.3333,
      lateWins: 1,
      winRateDelta: 0.4167,
    },
  ],
  mapTableMeta: [
    {
      averageGeneration: 10.5,
      averageScore: 82.25,
      category: 'map',
      games: 6,
      label: 'Tharsis',
      playerResults: 24,
      winRate: null,
    },
  ],
  metaSignals: [
    {
      averageScore: 88.5,
      baselineWinRate: 0.25,
      direction: 'overperformer',
      label: 'Tharsis Republic',
      sampleSize: 5,
      sourceType: 'Corporation',
      winRate: 0.6,
      winRateDelta: 0.35,
      wins: 3,
    },
  ],
  objectiveConversion: [
    {
      actions: 4,
      conversionRate: 0.5,
      label: 'Gardener',
      objectiveType: 'milestone',
      snipedActions: null,
      snipedRate: null,
      winRate: 0.75,
      wins: 3,
    },
  ],
  openingCombos: [
    {
      averageScore: 91.5,
      corporationName: 'Ecoline',
      label: 'Ecoline | Mohole',
      plays: 4,
      preludeLabel: 'Mohole',
      scoreDeviation: 8.5,
      signalType: 'best',
      winRate: 0.75,
      wins: 3,
    },
  ],
  summary: {
    averageGeneration: 10.5,
    averageScore: 82.25,
    baselineWinRate: 0.25,
    playerResults: 24,
    totalGames: 6,
  },
  tempoProfile: [
    {
      averageGeneration: 10,
      averagePointsPerGeneration: 8.1,
      averageScore: 81,
      bucket: 'standard',
      games: 4,
      label: 'Standard games',
      playerResults: 16,
      winRate: 0.25,
      wins: 4,
    },
  ],
  terraformingShare: [
    {
      actionShare: 0.4,
      heatActions: 2,
      oceanActions: 1,
      oxygenActions: 5,
      playerId: 'player-1',
      playerName: 'Friday Mars',
      totalActions: 8,
    },
  ],
};

describe('GlobalInsightMetricsSection', () => {
  it('ranks meta signals by delta tempered by how often they were played', () => {
    const baseSignal = metrics.metaSignals[0]!;
    const lightlyPlayedOutlier = {
      ...baseSignal,
      label: 'One-game outlier',
      sampleSize: 1,
      winRateDelta: 0.6,
    };
    const repeatedSignal = {
      ...baseSignal,
      label: 'Repeated signal',
      sampleSize: 10,
      winRateDelta: 0.3,
    };

    expect(rankMetaSignals([lightlyPlayedOutlier, repeatedSignal])).toEqual([
      repeatedSignal,
      lightlyPlayedOutlier,
    ]);
  });

  it('renders all seven global metric groups', () => {
    render(<GlobalInsightMetricsSection metrics={metrics} />);

    expect(screen.getByText('Global Meta Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Meta Winners & Draggers')).toBeInTheDocument();
    expect(screen.getByText('Tempo Profile')).toBeInTheDocument();
    expect(screen.getByText('Terraforming Share')).toBeInTheDocument();
    expect(screen.getByText('Objective Conversion')).toBeInTheDocument();
    expect(screen.getByText('Map & Table-Size Meta')).toBeInTheDocument();
    expect(screen.getByText('Opening Combo Strength')).toBeInTheDocument();
    expect(screen.getByText('Log-Derived Card Timing')).toBeInTheDocument();
    expect(screen.getByText('Tharsis Republic')).toBeInTheDocument();
    expect(screen.getByText('Friday Mars')).toBeInTheDocument();
    expect(screen.getByText('Mars University')).toBeInTheDocument();
  });
});
