import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerMapMetricRow } from '@/lib/db/analytics-repo';
import { MapPerformanceSection } from './map-performance-section';

// MapImage calls getPublicEnv() which reads process.env.
vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key',
  }),
}));

const BASE_ROW: PlayerMapMetricRow = {
  averageGenerations: 10.0,
  averageNormalizedEfficiency: 1.1,
  averagePoints: 82.4,
  averagePointsPerGeneration: 8.24,
  averageScoreDeltaVsExpected: 2.1,
  bestScoreSourceOnMap: 'cards',
  bestTagLaneOnMap: 'science',
  gamesPlayed: 8,
  groupId: 'g1',
  mapCode: 'tharsis',
  mapId: 'map-tharsis',
  mapName: 'Tharsis',
  mapRankForPlayer: 1,
  playerId: 'p1',
  winRate: 0.625,
  wins: 5,
  losses: 3,
  highestScore: 97,
  lastPlayedAt: '2025-06-01',
  recentWinsLast5: 3,
  hasSufficientRecentForm: true,
};

const ELYSIUM_ROW: PlayerMapMetricRow = {
  averageGenerations: 11.2,
  averageNormalizedEfficiency: 0.95,
  averagePoints: 78.1,
  averagePointsPerGeneration: 6.97,
  averageScoreDeltaVsExpected: -1.5,
  bestScoreSourceOnMap: 'tr',
  bestTagLaneOnMap: 'building',
  gamesPlayed: 5,
  groupId: 'g1',
  mapCode: 'elysium',
  mapId: 'map-elysium',
  mapName: 'Elysium',
  mapRankForPlayer: 2,
  playerId: 'p1',
  winRate: 0.4,
  wins: 2,
  losses: 3,
  highestScore: 85,
  lastPlayedAt: '2025-05-10',
  recentWinsLast5: 2,
  hasSufficientRecentForm: true,
};

const SINGLE_GAME_ROW: PlayerMapMetricRow = {
  ...BASE_ROW,
  mapId: 'map-hellas',
  mapName: 'Hellas',
  mapCode: 'hellas',
  gamesPlayed: 2,
  wins: 1,
  losses: 1,
  mapRankForPlayer: 3,
  hasSufficientRecentForm: false,
};

describe('MapPerformanceSection', () => {
  it('renders section heading and description', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/map performance/i);
    expect(screen.getByText(/compare your results/i)).toBeInTheDocument();
  });

  it('shows an empty state when no rows are provided', () => {
    render(<MapPerformanceSection mapMetricRows={[]} />);

    expect(screen.getByText(/no map data yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('shows an empty state when mapMetricRows is undefined', () => {
    render(<MapPerformanceSection />);

    expect(screen.getByText(/no map data yet/i)).toBeInTheDocument();
  });

  it('renders metric selector tabs', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    const tablist = screen.getByRole('tablist', { name: /metric/i });
    expect(within(tablist).getByText(/average score/i)).toBeInTheDocument();
    expect(within(tablist).getByText(/win rate/i)).toBeInTheDocument();
    expect(within(tablist).getByText(/games played/i)).toBeInTheDocument();
    expect(within(tablist).getByText(/avg\. generations/i)).toBeInTheDocument();
  });

  it('defaults to Average score metric', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    const avgScoreBtn = screen.getByRole('tab', { name: /average score/i });
    expect(avgScoreBtn).toHaveAttribute('aria-selected', 'true');
  });

  it('switches metric when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    const winRateBtn = screen.getByRole('tab', { name: /win rate/i });
    await user.click(winRateBtn);

    expect(winRateBtn).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /average score/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders a map card for each played row', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW, ELYSIUM_ROW]} />);

    // Names appear in both card and detail panel — just confirm they're present
    expect(screen.getAllByText('Tharsis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elysium').length).toBeGreaterThan(0);
  });

  it('shows formatted average-score value on card', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    // 82.4 appears on both the card and in the detail panel
    expect(screen.getAllByText('82.4').length).toBeGreaterThan(0);
  });

  it('shows win-rate format after switching metric', async () => {
    const user = userEvent.setup();
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    await user.click(screen.getByRole('tab', { name: /win rate/i }));

    // 0.625 → 63%
    expect(screen.getByText('63%')).toBeInTheDocument();
  });

  it('shows games played as whole number after switching', async () => {
    const user = userEvent.setup();
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    await user.click(screen.getByRole('tab', { name: /games played/i }));

    // '8' appears in the card metric value (and also in detail panel)
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('first card is selected by default', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW, ELYSIUM_ROW]} />);

    const cards = screen.getAllByRole('button', { name: /tharsis|elysium/i });
    // The first rendered card (Tharsis) should be pressed
    const tharsisCard = cards.find((c) =>
      c.textContent?.toLowerCase().includes('tharsis'),
    );
    expect(tharsisCard).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking a card selects it and deselects the previous one', async () => {
    const user = userEvent.setup();
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW, ELYSIUM_ROW]} />);

    // Find card buttons by their accessible name / text content
    const elysiumCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.toLowerCase().includes('elysium'));
    expect(elysiumCard).toBeDefined();

    await user.click(elysiumCard!);

    expect(elysiumCard).toHaveAttribute('aria-pressed', 'true');

    const tharsisCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.toLowerCase().includes('tharsis'));
    expect(tharsisCard).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders detail panel for selected map', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    // Detail panel uses aria-label on the div — query by role 'generic' or just check aria-label presence
    expect(screen.getByLabelText(/details for tharsis/i)).toBeInTheDocument();
  });

  it('shows wins and losses in detail panel', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    expect(screen.getByText(/5W.*3L|5W – 3L/)).toBeInTheDocument();
  });

  it('shows recent form in detail panel when hasSufficientRecentForm is true', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    expect(screen.getByText(/recent form/i)).toBeInTheDocument();
    expect(screen.getByText(/3 of last 5 won/i)).toBeInTheDocument();
  });

  it('does not show recent form label when insufficient data', () => {
    render(<MapPerformanceSection mapMetricRows={[SINGLE_GAME_ROW]} />);

    expect(screen.queryByText(/recent form/i)).not.toBeInTheDocument();
  });

  it('shows sample size label on card', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    // 8 games → Limited data (appears on card and in detail panel)
    expect(screen.getAllByText(/limited data/i).length).toBeGreaterThan(0);
  });

  it('shows Very limited data for cards with 1-4 games', () => {
    render(<MapPerformanceSection mapMetricRows={[SINGLE_GAME_ROW]} />);

    expect(screen.getAllByText(/very limited data/i).length).toBeGreaterThan(0);
  });

  it('filter toggle defaults to Played maps', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    const playedBtn = screen.getByRole('button', { name: /played maps/i });
    expect(playedBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching to All maps shows same rows when all rows are played', async () => {
    const user = userEvent.setup();
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW, ELYSIUM_ROW]} />);

    await user.click(screen.getByRole('button', { name: /all maps/i }));

    expect(screen.getAllByText('Tharsis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elysium').length).toBeGreaterThan(0);
  });

  it('unplayed map shows "No games recorded" in All maps view', async () => {
    const user = userEvent.setup();
    const unplayedRow: PlayerMapMetricRow = {
      ...BASE_ROW,
      mapId: 'map-utopia',
      mapName: 'Utopia Planitia',
      gamesPlayed: 0,
      wins: 0,
    };
    render(
      <MapPerformanceSection mapMetricRows={[BASE_ROW, unplayedRow]} />,
    );

    // Switch to All maps
    await user.click(screen.getByRole('button', { name: /all maps/i }));

    expect(screen.getByText(/no games recorded/i)).toBeInTheDocument();
    expect(screen.getAllByText('Utopia Planitia').length).toBeGreaterThan(0);
  });

  it('unplayed map does not appear in Played maps view', async () => {
    const unplayedRow: PlayerMapMetricRow = {
      ...BASE_ROW,
      mapId: 'map-utopia',
      mapName: 'Utopia Planitia',
      gamesPlayed: 0,
      wins: 0,
    };
    render(
      <MapPerformanceSection mapMetricRows={[BASE_ROW, unplayedRow]} />,
    );

    expect(screen.queryByText('Utopia Planitia')).not.toBeInTheDocument();
    expect(screen.queryByText(/no games recorded/i)).not.toBeInTheDocument();
  });

  it('selected map is preserved when metric changes', async () => {
    const user = userEvent.setup();
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW, ELYSIUM_ROW]} />);

    // Select Elysium
    const elysiumCard = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.toLowerCase().includes('elysium'));
    await user.click(elysiumCard!);

    // Switch metric
    await user.click(screen.getByRole('tab', { name: /win rate/i }));

    // Elysium still selected
    const elysiumAfter = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.toLowerCase().includes('elysium'));
    expect(elysiumAfter).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a sort selector with expected options', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    const sortSelect = screen.getByRole('combobox', { name: /sort maps by/i });
    expect(sortSelect).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /best performance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /most played/i }),
    ).toBeInTheDocument();
  });

  it('sorts by map name when "Map name" sort is selected', async () => {
    const user = userEvent.setup();
    render(<MapPerformanceSection mapMetricRows={[ELYSIUM_ROW, BASE_ROW]} />);

    const sortSelect = screen.getByRole('combobox', { name: /sort maps by/i });
    await user.selectOptions(sortSelect, 'mapName');

    // After name sort, Elysium < Tharsis alphabetically
    const cards = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.match(/tharsis|elysium/i));
    // First card text should contain Elysium
    expect(cards[0].textContent?.toLowerCase()).toContain('elysium');
  });

  it('renders accessibility attributes on map cards', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    const card = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.toLowerCase().includes('tharsis'));
    expect(card).toHaveAttribute('aria-pressed');
    expect(card).not.toHaveAttribute('href'); // not an anchor
  });

  it('renders image with alt text for known map codes', () => {
    render(<MapPerformanceSection mapMetricRows={[BASE_ROW]} />);

    const img = screen.getAllByAltText(/tharsis board map/i);
    expect(img.length).toBeGreaterThan(0);
  });

  it('renders fallback placeholder for unknown map code', () => {
    const unknownRow: PlayerMapMetricRow = {
      ...BASE_ROW,
      mapCode: 'unknown_planet',
      mapName: 'Unknown Planet',
    };
    render(<MapPerformanceSection mapMetricRows={[unknownRow]} />);

    // No broken img — fallback aria-label div is shown
    expect(
      screen.getAllByRole('img', { name: /map image unavailable for unknown planet/i }).length,
    ).toBeGreaterThan(0);
  });

  it('uses wins from row to compute losses when losses field missing', () => {
    const rowWithoutLosses: PlayerMapMetricRow = {
      ...BASE_ROW,
      losses: undefined,
      wins: 5,
      gamesPlayed: 8,
    };
    render(<MapPerformanceSection mapMetricRows={[rowWithoutLosses]} />);

    // 8 - 5 = 3 losses
    expect(screen.getByText(/5W – 3L/)).toBeInTheDocument();
  });
});
