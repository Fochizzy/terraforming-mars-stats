'use client';

import { useMemo, useState } from 'react';
import type { ScoreSourceAverages, PlayerScoreSourceAverages } from '@/lib/db/analytics-repo';
import {
  buildScoringSourceRows,
  computeScoringSummary,
} from './group-scoring/scoring-calculations';
import { GroupInsightHeader } from './group-scoring/group-insight-header';
import { GroupInsightMetrics } from './group-scoring/group-insight-metrics';
import { ScoreSourceViewToggle } from './group-scoring/score-source-view-toggle';
import { ScoreSourceBarChart, ScoreSourceChartLegend } from './group-scoring/score-source-bar-chart';
import { ScoreSourceRadarChart } from './group-scoring/score-source-radar-chart';
import { GroupInsightPanel } from './group-scoring/group-insight-panel';
import { PlayerComparisonSelect } from './group-scoring/player-comparison-select';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerOption = {
  id: string;
  displayName: string;
};

export type GroupScoringProfileProps = {
  groupAverages: ScoreSourceAverages | null;
  playerScoreAverages: PlayerScoreSourceAverages[];
  players: PlayerOption[];
  /** Number of finalized games in this group. */
  gameCount?: number | null;
  /** Human-readable date range, e.g. "Jan 2024 – Dec 2024". */
  dateRange?: string | null;
  /**
   * When the dashboard's player-focus selector selects a player, pass that
   * player's name here so the heading updates to "Score Profile for <name>"
   * and that player's averages are used as the comparison series.
   */
  focusedPlayerName?: string | null;
  focusedPlayerId?: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GroupScoringProfile({
  groupAverages,
  playerScoreAverages,
  players,
  gameCount,
  dateRange,
  focusedPlayerName = null,
  focusedPlayerId = null,
}: GroupScoringProfileProps) {
  const [view, setView] = useState<'bar' | 'radar'>('bar');
  const [comparedPlayerId, setComparedPlayerId] = useState<string | null>(null);

  // When the dashboard focuses a player via the global selector, use that player
  // as the comparison series (overrides the local compare select).
  const effectiveComparedPlayerId = focusedPlayerId ?? comparedPlayerId;

  const comparedPlayerAverages = useMemo(() => {
    if (!effectiveComparedPlayerId) return null;
    return playerScoreAverages.find((r) => r.playerId === effectiveComparedPlayerId) ?? null;
  }, [effectiveComparedPlayerId, playerScoreAverages]);

  const comparedPlayer = useMemo(() => {
    if (focusedPlayerId && focusedPlayerName) {
      return { id: focusedPlayerId, displayName: focusedPlayerName };
    }
    return comparedPlayerId ? (players.find((p) => p.id === comparedPlayerId) ?? null) : null;
  }, [focusedPlayerId, focusedPlayerName, comparedPlayerId, players]);

  // Section heading: "Group Score Profile" or "Score Profile for <name>"
  const sectionTitle = focusedPlayerName
    ? `Score Profile for ${focusedPlayerName}`
    : 'Group Score Profile';

  const rows = useMemo(() => {
    if (!groupAverages) return [];
    return buildScoringSourceRows(groupAverages, comparedPlayerAverages);
  }, [groupAverages, comparedPlayerAverages]);

  const summary = useMemo(() => computeScoringSummary(rows), [rows]);

  const hasData = groupAverages !== null && rows.length > 0 && summary.totalAverage > 0;

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (!groupAverages || !hasData) {
    return (
      <section
        aria-labelledby="group-scoring-title"
        style={sectionStyle(false)}
      >
        <GroupInsightHeader
          dateRange={dateRange}
          gameCount={gameCount}
          title={sectionTitle}
        />
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '3rem 1rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: 'rgb(250,250,249)',
              fontSize: '1.05rem',
              fontWeight: 700,
              margin: 0,
            }}
          >
            No finalized game data yet
          </p>
          <p style={{ color: 'rgb(120,113,108)', fontSize: '0.875rem', margin: 0 }}>
            Group scoring insights will appear after finalized games are available.
          </p>
        </div>
      </section>
    );
  }

  // ─── Controls row ─────────────────────────────────────────────────────────

  const controlsRow = (
    <div
      style={{
        alignItems: 'flex-end',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem 1.25rem',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}
    >
      <ScoreSourceViewToggle onChange={setView} value={view} />
      {/* Only show the local compare selector when the dashboard isn't already focusing a player */}
      {!focusedPlayerId && (
        <PlayerComparisonSelect
          onChange={setComparedPlayerId}
          players={players}
          selectedId={comparedPlayerId}
        />
      )}
    </div>
  );

  // ─── Chart heading ────────────────────────────────────────────────────────

  const chartHeading = (
    <div style={{ marginBottom: '0.65rem' }}>
      <p
        style={{
          color: 'rgb(250,250,249)',
          fontSize: '0.88rem',
          fontWeight: 700,
          margin: 0,
        }}
      >
        Average scoring by source
      </p>
      <p style={{ color: 'rgb(120,113,108)', fontSize: '0.72rem', margin: '0.2rem 0 0' }}>
        Victory points per finalized game
      </p>
      <ScoreSourceChartLegend playerName={comparedPlayer?.displayName ?? null} />
    </div>
  );

  // ─── Full render ──────────────────────────────────────────────────────────

  return (
    <section
      aria-label={
        view === 'bar'
          ? `Group scoring profile – bar chart${comparedPlayer ? `, comparing ${comparedPlayer.displayName}` : ''}`
          : `Group scoring profile – radar${comparedPlayer ? `, comparing ${comparedPlayer.displayName}` : ''}`
      }
      aria-labelledby="group-scoring-title"
      style={sectionStyle(true)}
    >
      <style>{`
        @media (max-width: 720px) {
          .gsp-content-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* Header */}
      <GroupInsightHeader
        dateRange={dateRange}
        gameCount={gameCount}
        title={sectionTitle}
      />

      {/* Metrics */}
      <GroupInsightMetrics
        gameCount={gameCount ?? 0}
        summary={summary}
      />

      {/* Controls */}
      {controlsRow}

      {/* Two-column content layout */}
      <div className="gsp-content-grid" style={contentGridStyle}>
        {/* Left — chart area */}
        <div style={{ minWidth: 0 }}>
          {chartHeading}

          {view === 'bar' ? (
            <ScoreSourceBarChart
              playerName={comparedPlayer?.displayName ?? null}
              rows={rows}
            />
          ) : (
            <ScoreSourceRadarChart
              groupAverages={groupAverages}
              playerAverages={comparedPlayerAverages}
              playerName={comparedPlayer?.displayName ?? null}
            />
          )}
        </div>

        {/* Right — insight panel */}
        <GroupInsightPanel
          gameCount={gameCount ?? 0}
          playerName={comparedPlayer?.displayName ?? null}
          rows={rows}
          summary={summary}
        />
      </div>
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function sectionStyle(hasData: boolean): React.CSSProperties {
  return {
    background:
      'linear-gradient(180deg, rgba(29,35,43,0.92), rgba(11,14,20,0.94))',
    border: hasData
      ? '1px solid rgba(120,113,108,0.32)'
      : '1px solid rgba(120,113,108,0.22)',
    borderRadius: '1.5rem',
    boxShadow: '0 16px 32px rgba(4,6,10,0.45), inset 0 1px 0 rgba(255,226,184,0.10)',
    overflow: 'hidden',
    padding: 'clamp(1rem, 2vw, 1.5rem)',
    position: 'relative',
  };
}

const contentGridStyle: React.CSSProperties = {
  alignItems: 'flex-start',
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'minmax(0, 2fr) minmax(200px, 0.8fr)',
};

