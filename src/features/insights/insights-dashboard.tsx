"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Dot,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BestStyleSnapshot } from "./best-style-snapshot";
import { GroupScoringProfile } from "./group-scoring-profile";
import { CoverageBadge } from "@/components/charts/coverage-badge";
import { ChartFrame } from "@/components/charts/chart-frame";
import { PromoSetBrowser } from "@/features/catalog/promo-set-browser";
import { GlobalMetricBoard } from "@/features/analytics/global-metric-board";
import { GlobalSummaryBoard } from "@/features/analytics/global-summary-board";
import type {
  GroupAnalytics,
  GroupHeadToHeadRow,
  GroupInteractionRow,
  GroupStylePerformanceRow,
  TrendRow,
} from "@/lib/db/analytics-repo";
import type { PromoCardOption, PromoSetOption } from "@/lib/db/reference-repo";
import { buildInsightCards } from "./build-insight-cards";

type PlayerOption = {
  displayName: string;
  id: string;
};

type InsightsDashboardProps = {
  analytics: GroupAnalytics;
  players: PlayerOption[];
  promoCards: PromoCardOption[];
  promoSets: PromoSetOption[];
};

type FocusedHeadToHeadRow = {
  averageScoreDifferential: number;
  gamesPlayed: number;
  label: string;
  losses: number;
  ties: number;
  wins: number;
};

type TrendChartPoint = {
  count: number;
  label: string;
  score: number;
  styleLabel: string;
  winRate: number;
};

type DashboardInteractionRow = GroupInteractionRow & {
  playerId?: string;
  playerName?: string;
};

const leaderboardColors = {
  default: "#f97316",
  focused: "#22d3ee",
};

const styleColors = {
  exact: "#22c55e",
  mismatch: "#ef4444",
  partial: "#f59e0b",
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatTrendDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatScoreChange(
  current: number,
  previous: number | undefined,
): number | null {
  if (previous === undefined) return null;
  return current - previous;
}

function formatAverage(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPersistedMetric(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function truncateLabel(value: string, length = 18) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1)}…`;
}

function humanizeStyleCode(styleCode: string | null) {
  if (!styleCode) {
    return "Unclassified";
  }

  return styleCode
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getMapLabel(row: { mapId: string; mapName?: string | null }) {
  return row.mapName ?? row.mapId;
}

function humanizeInteractionType(
  interactionType: GroupInteractionRow["interactionType"],
) {
  if (interactionType === "corporation_prelude_pair") {
    return "Corporation + Prelude";
  }

  return "Map + Expansions";
}

function buildTrendChartData(rows: TrendRow[], isFocusedPlayer: boolean) {
  if (isFocusedPlayer) {
    return [...rows]
      .sort(
        (left, right) =>
          left.playedOn.localeCompare(right.playedOn) ||
          left.playerName.localeCompare(right.playerName),
      )
      .map((row) => ({
        count: 1,
        label: row.playedOn,
        score: row.totalPoints,
        styleLabel: humanizeStyleCode(row.inferredPrimaryStyleCode),
        winRate: row.isWinner ? 100 : 0,
      }));
  }

  const grouped = rows.reduce<Record<string, TrendChartPoint>>(
    (accumulator, row) => {
      const existing = accumulator[row.playedOn] ?? {
        count: 0,
        label: row.playedOn,
        score: 0,
        styleLabel: "",
        winRate: 0,
      };

      existing.count += 1;
      existing.score += row.totalPoints;
      existing.winRate += row.isWinner ? 1 : 0;

      accumulator[row.playedOn] = existing;
      return accumulator;
    },
    {},
  );

  const styleByDate = rows.reduce<Record<string, Record<string, number>>>(
    (accumulator, row) => {
      if (!row.inferredPrimaryStyleCode) {
        return accumulator;
      }

      const dateEntry = accumulator[row.playedOn] ?? {};
      dateEntry[row.inferredPrimaryStyleCode] =
        (dateEntry[row.inferredPrimaryStyleCode] ?? 0) + 1;
      accumulator[row.playedOn] = dateEntry;
      return accumulator;
    },
    {},
  );

  return Object.values(grouped)
    .map((entry) => {
      const styleCounts = Object.entries(styleByDate[entry.label] ?? {}).sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      );
      return {
        ...entry,
        score: Number((entry.score / entry.count).toFixed(1)),
        styleLabel: humanizeStyleCode(styleCounts[0]?.[0] ?? null),
        winRate: Math.round((entry.winRate / entry.count) * 100),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function normalizeHeadToHeadRows(
  rows: GroupHeadToHeadRow[],
  focusPlayerId: string | null,
  focusPlayerName: string | null,
): FocusedHeadToHeadRow[] {
  if (!focusPlayerId || !focusPlayerName) {
    return rows.slice(0, 6).map((row) => ({
      label: `${row.leftPlayerName} vs ${row.rightPlayerName}`,
      gamesPlayed: row.gamesPlayed,
      wins: row.leftWins,
      losses: row.rightWins,
      ties: row.ties,
      averageScoreDifferential: row.averageScoreDifferential,
    }));
  }

  return rows
    .map((row) => {
      if (row.leftPlayerId === focusPlayerId) {
        return {
          label: `${focusPlayerName} vs ${row.rightPlayerName}`,
          gamesPlayed: row.gamesPlayed,
          wins: row.leftWins,
          losses: row.rightWins,
          ties: row.ties,
          averageScoreDifferential: row.averageScoreDifferential,
        };
      }

      if (row.rightPlayerId === focusPlayerId) {
        return {
          label: `${focusPlayerName} vs ${row.leftPlayerName}`,
          gamesPlayed: row.gamesPlayed,
          wins: row.rightWins,
          losses: row.leftWins,
          ties: row.ties,
          averageScoreDifferential: row.averageScoreDifferential * -1,
        };
      }

      return null;
    })
    .filter((row): row is FocusedHeadToHeadRow => Boolean(row))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        Math.abs(right.averageScoreDifferential) -
          Math.abs(left.averageScoreDifferential) ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 6);
}

// ─── Trend Over Time sub-components ───────────────────────────────────────────

type TrendOverTimeProps = { trendChartData: TrendChartPoint[] };

function TrendMetricSummary({ trendChartData }: TrendOverTimeProps) {
  const latestPoint = trendChartData.at(-1);
  const previousPoint = trendChartData.at(-2);

  if (!latestPoint) return null;

  const latestScore = latestPoint.score;
  const prevScore = previousPoint?.score;
  const change = formatScoreChange(latestScore, prevScore);

  const totalResults = trendChartData.reduce((sum, p) => sum + p.count, 0);
  const totalWins = trendChartData.reduce(
    (sum, p) => sum + Math.round((p.winRate / 100) * p.count),
    0,
  );
  const periodWinRate =
    totalResults > 0 ? Math.round((totalWins / totalResults) * 100) : 0;

  const metrics: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: "Latest score",
      value: `${formatAverage(latestScore)} pts`,
    },
    {
      label: "Change",
      value:
        change === null
          ? "—"
          : change >= 0
            ? `↑ ${formatAverage(Math.abs(change))} pts`
            : `↓ ${formatAverage(Math.abs(change))} pts`,
      sub: change === null ? "No prior date" : "vs previous date",
    },
    {
      label: "Period win rate",
      value: `${periodWinRate}%`,
      sub: `${totalResults} result${totalResults !== 1 ? "s" : ""}`,
    },
    {
      label: "Total results",
      value: String(totalResults),
      sub: `across ${trendChartData.length} date${trendChartData.length !== 1 ? "s" : ""}`,
    },
  ];

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(120,113,108,0.3)",
        display: "grid",
        gap: 0,
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        marginBottom: "1rem",
        paddingBottom: "1rem",
      }}
    >
      {metrics.map((m, i) => (
        <div
          key={m.label}
          style={{
            borderLeft: i > 0 ? "1px solid rgba(120,113,108,0.3)" : undefined,
            padding: "0.25rem 0.75rem 0.25rem",
          }}
        >
          <p
            style={{
              color: "#a8a29e",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              marginBottom: "0.2rem",
              textTransform: "uppercase",
            }}
          >
            {m.label}
          </p>
          <p
            style={{
              color:
                m.label === "Change" && change !== null
                  ? change >= 0
                    ? "#93c5fd"
                    : "#fca5a5"
                  : "#f6eddf",
              fontSize: "1.05rem",
              fontWeight: 700,
            }}
          >
            {m.value}
          </p>
          {m.sub ? (
            <p
              style={{
                color: "#78716c",
                fontSize: "0.7rem",
                marginTop: "0.1rem",
              }}
            >
              {m.sub}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TrendDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TrendChartPoint;
  dataLength: number;
}) {
  const { cx = 0, cy = 0, index = 0, dataLength } = props;
  const isLast = index === dataLength - 1;
  if (isLast) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        fill="#38bdf8"
        r={6}
        stroke="#ffffff"
        strokeWidth={2}
      />
    );
  }
  return (
    <Dot
      cx={cx}
      cy={cy}
      fill="#38bdf8"
      r={3}
      stroke="#0f172a"
      strokeWidth={1}
    />
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      style={{
        background: "#141a22",
        border: "1px solid rgba(214,130,66,0.42)",
        borderRadius: "0.75rem",
        fontSize: "0.8rem",
        padding: "0.7rem 0.9rem",
      }}
    >
      <p style={{ color: "#dda15d", fontWeight: 700, marginBottom: "0.35rem" }}>
        {formatTrendDate(point.label)}
      </p>
      <p style={{ color: "#93c5fd" }}>
        Score: <strong>{formatAverage(point.score)} pts</strong>
      </p>
      <p style={{ color: "#d1c1ad" }}>Win rate: {point.winRate}%</p>
      <p style={{ color: "#d1c1ad" }}>Playstyle: {point.styleLabel}</p>
      <p style={{ color: "#d1c1ad" }}>Results: {point.count}</p>
    </div>
  );
}

function TrendResultRow({
  row,
  change,
  isFirst,
}: {
  row: TrendChartPoint;
  change: number | null;
  isFirst: boolean;
}) {
  const changeText =
    change === null
      ? "—"
      : change >= 0
        ? `↑ ${formatAverage(Math.abs(change))}`
        : `↓ ${formatAverage(Math.abs(change))}`;
  const changeColor =
    change === null ? "#78716c" : change >= 0 ? "#93c5fd" : "#fca5a5";

  return (
    <div
      style={{
        alignItems: "center",
        borderTop: isFirst ? "none" : "1px solid rgba(120,113,108,0.2)",
        display: "grid",
        gap: "0.5rem",
        gridTemplateColumns: "5rem 1fr auto auto",
        padding: "0.65rem 0.25rem",
        transition: "background 120ms ease",
      }}
    >
      {/* Date — h3 so existing test assertion on heading role continues to pass */}
      <h3
        style={{
          color: "#d1c1ad",
          fontSize: "0.82rem",
          fontWeight: 600,
          margin: 0,
        }}
      >
        {row.label}
      </h3>

      {/* Playstyle badge */}
      <span
        style={{
          background: "rgba(56,189,248,0.1)",
          border: "1px solid rgba(56,189,248,0.2)",
          borderRadius: "999px",
          color: "#93c5fd",
          display: "inline-block",
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          maxWidth: "11rem",
          overflow: "hidden",
          padding: "0.15rem 0.55rem",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.styleLabel}
      </span>

      {/* Win rate + count */}
      <span
        style={{
          color: "#a8a29e",
          fontSize: "0.8rem",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {row.winRate}%
        {row.count > 1 ? (
          <span
            style={{
              color: "#6b7280",
              fontSize: "0.72rem",
              marginLeft: "0.35rem",
            }}
          >
            {row.count}
          </span>
        ) : null}
      </span>

      {/* Score + change */}
      <div style={{ minWidth: "6rem", textAlign: "right" }}>
        <span style={{ color: "#bae6fd", fontSize: "0.9rem", fontWeight: 700 }}>
          {formatAverage(row.score)} pts
        </span>
        <span
          aria-label={changeText === "—" ? "No previous result" : changeText}
          style={{ color: changeColor, display: "block", fontSize: "0.72rem" }}
        >
          {changeText}
        </span>
      </div>
    </div>
  );
}

function TrendOverTimeContent({ trendChartData }: TrendOverTimeProps) {
  const latestIndex = trendChartData.length - 1;

  // Padded y-axis domain around actual values
  const scores = trendChartData.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const pad = Math.max((maxScore - minScore) * 0.15, 8);
  const yMin = Math.max(0, Math.floor(minScore - pad));
  const yMax = Math.ceil(maxScore + pad);

  // Limit x-axis ticks to ~6
  const maxTicks = 6;
  const tickInterval =
    trendChartData.length <= maxTicks
      ? 0
      : Math.ceil((trendChartData.length - 1) / (maxTicks - 1));

  const recentRows = trendChartData.slice(-4).reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Sub-header: description */}
      <p
        style={{
          color: "#a8a29e",
          fontSize: "0.82rem",
          margin: "0 0 0.75rem",
        }}
      >
        Average score by game date
      </p>

      {/* 4-metric summary row */}
      <TrendMetricSummary trendChartData={trendChartData} />

      {/* Responsive chart */}
      <div style={{ width: "100%" }}>
        <ResponsiveContainer height={280} width="100%">
          <LineChart
            data={trendChartData}
            margin={{ bottom: 28, left: 0, right: 20, top: 12 }}
          >
            <CartesianGrid
              stroke="rgba(120,113,108,0.18)"
              strokeDasharray="4 4"
            />
            <XAxis
              angle={-15}
              axisLine={{ stroke: "rgba(120,113,108,0.25)" }}
              dataKey="label"
              height={52}
              interval={tickInterval}
              textAnchor="end"
              tick={{ fill: "#78716c", fontSize: 11 }}
              tickFormatter={formatTrendDate}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[yMin, yMax]}
              tick={{ fill: "#78716c", fontSize: 11 }}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TrendTooltip />} />
            <Line
              dataKey="score"
              dot={(dotProps) => (
                <TrendDot
                  key={`dot-${dotProps.index}`}
                  {...dotProps}
                  dataLength={trendChartData.length}
                />
              )}
              label={(labelProps) => {
                if (labelProps.index !== latestIndex) return <g key="empty" />;
                return (
                  <text
                    fill="#bae6fd"
                    fontSize={11}
                    fontWeight={700}
                    key={`label-${labelProps.index}`}
                    textAnchor="middle"
                    x={labelProps.x}
                    y={(labelProps.y as number) - 12}
                  >
                    {formatAverage(trendChartData[latestIndex]?.score ?? 0)}
                  </text>
                );
              }}
              stroke="#38bdf8"
              strokeWidth={2}
              type="linear"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent results list */}
      <div style={{ marginTop: "1.5rem" }}>
        <p
          style={{
            borderBottom: "1px solid rgba(120,113,108,0.25)",
            color: "#a8a29e",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.15em",
            margin: 0,
            paddingBottom: "0.4rem",
            textTransform: "uppercase",
          }}
        >
          Recent results
        </p>

        {/* Column header row */}
        <div
          aria-hidden="true"
          style={{
            borderBottom: "1px solid rgba(120,113,108,0.15)",
            color: "#6b7280",
            display: "grid",
            fontSize: "0.66rem",
            fontWeight: 600,
            gap: "0.5rem",
            gridTemplateColumns: "5rem 1fr auto auto",
            letterSpacing: "0.1em",
            padding: "0.35rem 0.25rem",
            textTransform: "uppercase",
          }}
        >
          <span>Date</span>
          <span>Playstyle</span>
          <span style={{ textAlign: "right" }}>Win rate</span>
          <span style={{ textAlign: "right" }}>Score / Δ</span>
        </div>

        <div>
          {recentRows.map((row, i) => {
            const prevRow = recentRows[i + 1];
            const change =
              prevRow !== undefined
                ? formatScoreChange(row.score, prevRow.score)
                : null;

            return (
              <TrendResultRow
                change={change}
                isFirst={i === 0}
                key={`${row.label}-${row.styleLabel}`}
                row={row}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────

export function InsightsDashboard({
  analytics,
  players,
  promoCards,
  promoSets,
}: InsightsDashboardProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");

  const selectedPlayer =
    selectedPlayerId === "all"
      ? null
      : (players.find((player) => player.id === selectedPlayerId) ?? null);
  const selectedStylePerformanceRows: GroupStylePerformanceRow[] =
    selectedPlayer
      ? analytics.playerStylePerformanceRows.filter(
          (row) => row.playerId === selectedPlayer.id,
        )
      : analytics.groupStylePerformanceRows;
  const selectedTrendRows = selectedPlayer
    ? analytics.playerTrendRows.filter(
        (row) => row.playerId === selectedPlayer.id,
      )
    : analytics.playerTrendRows;
  const selectedCoverage = selectedPlayer
    ? (analytics.playerCoverages.find(
        (row) => row.playerId === selectedPlayer.id,
      ) ?? analytics.coverage)
    : analytics.coverage;
  const selectedStyleRows = selectedPlayer
    ? analytics.styleAgreementRows.filter(
        (row) => row.playerId === selectedPlayer.id,
      )
    : analytics.styleAgreementRows.slice(0, 6);
  const selectedLineupRows = selectedPlayer
    ? analytics.lineupEffectRows.filter(
        (row) => row.playerId === selectedPlayer.id,
      )
    : analytics.lineupEffectRows.slice(0, 6);
  const selectedInteractionRows: DashboardInteractionRow[] = selectedPlayer
    ? analytics.playerInteractionRows.filter(
        (row) => row.playerId === selectedPlayer.id,
      )
    : analytics.groupInteractionRows.slice(0, 6);
  const selectedEfficiencyRows = selectedPlayer
    ? analytics.playerEfficiencySummaries.filter(
        (row) => row.playerId === selectedPlayer.id,
      )
    : analytics.playerEfficiencySummaries;
  const selectedMapMetricRows = selectedPlayer
    ? analytics.playerMapMetricRows.filter(
        (row) => row.playerId === selectedPlayer.id,
      )
    : analytics.playerMapMetricRows;
  const focusedHeadToHeadRows = useMemo(
    () =>
      normalizeHeadToHeadRows(
        analytics.headToHeadRows,
        selectedPlayer?.id ?? null,
        selectedPlayer?.displayName ?? null,
      ),
    [analytics.headToHeadRows, selectedPlayer],
  );

  const insightCards = useMemo(
    () =>
      buildInsightCards({
        coverage: selectedCoverage,
        focusPlayerId: selectedPlayer?.id ?? null,
        focusPlayerName: selectedPlayer?.displayName ?? null,
        headToHeadRows: analytics.headToHeadRows,
        globalMapMetricRows: analytics.globalMapMetricRows,
        interactionRows: selectedInteractionRows,
        leaderboardRows: analytics.leaderboardRows,
        lineupEffectRows: analytics.lineupEffectRows,
        playerEfficiencySummaries: selectedEfficiencyRows,
        playerMapMetricRows: selectedMapMetricRows,
        stylePerformanceRows: selectedStylePerformanceRows,
        styleAgreementRows: analytics.styleAgreementRows,
        trendRows: analytics.playerTrendRows,
      }),
    [
      analytics.headToHeadRows,
      analytics.globalMapMetricRows,
      analytics.leaderboardRows,
      analytics.lineupEffectRows,
      analytics.playerTrendRows,
      analytics.styleAgreementRows,
      selectedCoverage,
      selectedEfficiencyRows,
      selectedInteractionRows,
      selectedMapMetricRows,
      selectedPlayer,
      selectedStylePerformanceRows,
    ],
  );

  const leaderboardChartData = analytics.leaderboardRows
    .slice(0, 6)
    .map((row) => ({
      name: row.playerName,
      weightedScore: Number(row.weightedScore.toFixed(3)),
      isFocused: row.playerId === selectedPlayer?.id,
      winRate: Math.round(row.winRate * 100),
    }));
  const styleAgreementData = selectedStyleRows.map((row) => ({
    exact: Math.round(row.exactMatchRate * 100),
    mismatch: Math.round(row.mismatchRate * 100),
    partial: Math.round(row.partialMatchRate * 100),
    playerName: row.playerName,
  }));
  const trendChartData = buildTrendChartData(
    selectedTrendRows,
    Boolean(selectedPlayer),
  );
  const coverageData = selectedCoverage
    ? [
        {
          label: "Full Card",
          value: Math.round(selectedCoverage.cardBreakdownCoverage * 100),
        },
        {
          label: "Microbe",
          value: Math.round(selectedCoverage.microbeCoverage * 100),
        },
        {
          label: "Animal",
          value: Math.round(selectedCoverage.animalCoverage * 100),
        },
        {
          label: "Jovian",
          value: Math.round(selectedCoverage.jovianCoverage * 100),
        },
        {
          label: "Declared",
          value: Math.round(selectedCoverage.declaredStyleCoverage * 100),
        },
        {
          label: "Key Cards",
          value: Math.round(selectedCoverage.keyCardCoverage * 100),
        },
      ]
    : [];

  const hasAnalytics =
    analytics.leaderboardRows.length > 0 ||
    analytics.headToHeadRows.length > 0 ||
    analytics.groupInteractionRows.length > 0 ||
    analytics.globalMapMetricRows.length > 0 ||
    analytics.globalCorporationMetricRows.length > 0 ||
    analytics.globalStyleMetricRows.length > 0 ||
    analytics.globalTagMetricRows.length > 0 ||
    analytics.globalMilestoneMetricRows.length > 0 ||
    analytics.globalAwardMetricRows.length > 0 ||
    analytics.globalPlayerCountMetricRows.length > 0 ||
    analytics.globalGenerationMetricRows.length > 0 ||
    analytics.playerInteractionRows.length > 0 ||
    analytics.playerEfficiencySummaries.length > 0 ||
    analytics.playerMapMetricRows.length > 0 ||
    analytics.lineupEffectRows.length > 0 ||
    analytics.styleAgreementRows.length > 0 ||
    analytics.scoreAverages !== null ||
    analytics.coverage !== null;

  const groupGameCount = analytics.coverage?.finalizedGames ?? null;

  return (
    <div className="flex flex-col gap-4">
      <GroupScoringProfile
        focusedPlayerId={selectedPlayer?.id ?? null}
        focusedPlayerName={selectedPlayer?.displayName ?? null}
        gameCount={groupGameCount}
        groupAverages={analytics.scoreAverages}
        playerScoreAverages={analytics.playerScoreAverages}
        players={players}
      />

      <ChartFrame title="Insights Lab">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label
                className="text-xs uppercase tracking-[0.2em] text-orange-300"
                htmlFor="player-focus-select"
              >
                Player Focus
              </label>
              <select
                aria-label="Player focus"
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                id="player-focus-select"
                onChange={(event) => setSelectedPlayerId(event.target.value)}
                value={selectedPlayerId}
              >
                <option value="all">All players</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName}
                  </option>
                ))}
              </select>
            </div>
            <p className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs text-orange-100">
              {selectedPlayer
                ? `Focused on ${selectedPlayer.displayName}`
                : "Focused on group-wide finalized results"}
            </p>
          </div>
          <p className="text-sm text-stone-300">
            Compare weighted leaderboard form, score-source patterns, style
            agreement, head-to-head edges, lineup effects, interaction pairings,
            and promo catalog references from finalized games only.
          </p>
        </div>
      </ChartFrame>

      {hasAnalytics ? (
        <>
          <ChartFrame title="Insight Cards">
            <div className="grid gap-3 md:grid-cols-2">
              {insightCards.map((card) => (
                <article
                  className="rounded-2xl border border-stone-800 bg-stone-950/60 p-3"
                  key={`${card.title}-${card.body}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-stone-100">
                      {card.title}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                      {card.confidence}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-stone-300">{card.body}</p>
                  <p className="mt-3 text-xs text-stone-500">
                    Sample size: {card.sampleSize}
                  </p>
                </article>
              ))}
            </div>
          </ChartFrame>

          <ChartFrame title="Weighted Leaderboard Comparison">
            {leaderboardChartData.length === 0 ? (
              <p className="text-sm text-stone-400">
                Finalized leaderboard rows will appear here once games are
                logged.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <BarChart
                  data={leaderboardChartData}
                  height={260}
                  margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                  width={340}
                >
                  <CartesianGrid stroke="#44403c" strokeDasharray="3 3" />
                  <XAxis
                    angle={-20}
                    dataKey="name"
                    height={60}
                    textAnchor="end"
                    tick={{ fill: "#d6d3d1", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#d6d3d1", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1c1917",
                      border: "1px solid #7c2d12",
                      borderRadius: "12px",
                      color: "#f5f5f4",
                    }}
                  />
                  <Bar dataKey="weightedScore" radius={[10, 10, 0, 0]}>
                    {leaderboardChartData.map((row) => (
                      <Cell
                        fill={
                          row.isFocused
                            ? leaderboardColors.focused
                            : leaderboardColors.default
                        }
                        key={row.name}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            )}
          </ChartFrame>

          <ChartFrame
            title={
              selectedPlayer
                ? `Persisted Efficiency for ${selectedPlayer.displayName}`
                : "Persisted Efficiency"
            }
          >
            {selectedEfficiencyRows.length === 0 &&
            selectedMapMetricRows.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Persisted efficiency and map rows will appear after Supabase
                summaries refresh.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedEfficiencyRows.slice(0, 3).map((row) => (
                  <article
                    className="tm-stat-card"
                    key={`${row.groupId}-${row.playerId}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {selectedPlayer?.displayName ??
                          analytics.leaderboardRows.find(
                            (leader) => leader.playerId === row.playerId,
                          )?.playerName ??
                          row.playerId}
                      </h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPersistedMetric(row.averagePointsPerGeneration)}{" "}
                        pts/gen
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      {row.gamesPlayed} games | avg{" "}
                      {formatPersistedMetric(row.averageScore)} points
                      {row.averageExpectedScore !== null
                        ? ` | expected ${formatPersistedMetric(row.averageExpectedScore)}`
                        : ""}
                    </p>
                  </article>
                ))}
                {selectedMapMetricRows.slice(0, 3).map((row) => (
                  <article
                    className="tm-stat-card"
                    key={`${row.groupId}-${row.playerId}-${row.mapId}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {getMapLabel(row)}
                      </h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPersistedMetric(row.averagePointsPerGeneration)}{" "}
                        pts/gen
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      {row.gamesPlayed} games | avg{" "}
                      {formatPersistedMetric(row.averagePoints)} points |{" "}
                      {formatPersistedMetric(row.averageGenerations)} gens
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <section
            aria-label="Global Statistics"
            className="flex scroll-mt-28 flex-col gap-4"
            id="global-statistics"
          >
            <GlobalMetricBoard
              globalMapMetricRows={analytics.globalMapMetricRows}
            />

            <GlobalSummaryBoard
              globalAwardMetricRows={analytics.globalAwardMetricRows}
              globalCorporationMetricRows={
                analytics.globalCorporationMetricRows
              }
              globalGenerationMetricRows={analytics.globalGenerationMetricRows}
              globalMilestoneMetricRows={analytics.globalMilestoneMetricRows}
              globalPlayerCountMetricRows={
                analytics.globalPlayerCountMetricRows
              }
              globalStyleMetricRows={analytics.globalStyleMetricRows}
              globalTagMetricRows={analytics.globalTagMetricRows}
            />
          </section>

          <ChartFrame
            title={
              selectedPlayer
                ? `Style Agreement for ${selectedPlayer.displayName}`
                : "Group Style Agreement"
            }
          >
            {styleAgreementData.length === 0 ? (
              <p className="text-sm text-stone-400">
                Declared-versus-inferred style comparisons will appear once both
                style inputs are recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <BarChart
                  data={styleAgreementData}
                  height={260}
                  margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                  width={340}
                >
                  <CartesianGrid stroke="#44403c" strokeDasharray="3 3" />
                  <XAxis
                    angle={-20}
                    dataKey="playerName"
                    height={60}
                    textAnchor="end"
                    tick={{ fill: "#d6d3d1", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#d6d3d1", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1c1917",
                      border: "1px solid #7c2d12",
                      borderRadius: "12px",
                      color: "#f5f5f4",
                    }}
                  />
                  <Bar
                    dataKey="exact"
                    fill={styleColors.exact}
                    stackId="style"
                  />
                  <Bar
                    dataKey="partial"
                    fill={styleColors.partial}
                    stackId="style"
                  />
                  <Bar
                    dataKey="mismatch"
                    fill={styleColors.mismatch}
                    stackId="style"
                  />
                </BarChart>
              </div>
            )}
          </ChartFrame>

          <BestStyleSnapshot rows={selectedStylePerformanceRows} />

          <ChartFrame title="Trend Over Time">
            {trendChartData.length === 0 ? (
              <p className="text-sm text-stone-400">
                Trend evidence will appear after finalized games are logged.
              </p>
            ) : (
              <TrendOverTimeContent trendChartData={trendChartData} />
            )}
          </ChartFrame>

          <ChartFrame title="Head-to-Head Lens">
            {focusedHeadToHeadRows.length === 0 ? (
              <p className="text-sm text-stone-400">
                Head-to-head comparisons will appear after repeated finalized
                matchups are logged.
              </p>
            ) : (
              <div className="grid gap-3">
                {focusedHeadToHeadRows.map((row) => (
                  <article
                    className="rounded-2xl border border-stone-800 bg-stone-950/60 p-3"
                    key={row.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {row.label}
                      </h3>
                      <p className="text-sm text-cyan-200">
                        {formatAverage(row.averageScoreDifferential)} pts
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-stone-300">
                      {row.wins}-{row.losses}-{row.ties} over {row.gamesPlayed}{" "}
                      games
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <ChartFrame title="Lineup Effects">
            {selectedLineupRows.length === 0 ? (
              <p className="text-sm text-stone-400">
                Lineup effects will appear after repeated finalized group mixes
                are logged.
              </p>
            ) : (
              <div className="grid gap-3">
                {selectedLineupRows.map((row) => (
                  <article
                    className="rounded-2xl border border-stone-800 bg-stone-950/60 p-3"
                    key={`${row.playerId}-${row.lineupLabel}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {selectedPlayer ? row.lineupLabel : row.playerName}
                      </h3>
                      <p className="text-sm text-cyan-200">
                        {formatPercent(row.winRate)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-stone-300">
                      {selectedPlayer
                        ? `${row.gamesPlayed} games | avg ${formatAverage(row.averageScore)} points | ${formatAverage(row.averageGenerationCount)} gens`
                        : `${truncateLabel(row.lineupLabel)} | ${row.gamesPlayed} games | avg ${formatAverage(row.averageScore)} points`}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <ChartFrame title="Interaction Insights">
            {selectedInteractionRows.length === 0 ? (
              <p className="text-sm text-stone-400">
                Interaction comparisons will appear after enough finalized games
                link maps, expansions, corporations, and preludes.
              </p>
            ) : (
              <div className="grid gap-3">
                {selectedInteractionRows.map((row) => (
                  <article
                    className="rounded-2xl border border-stone-800 bg-stone-950/60 p-3"
                    key={`${row.playerId ?? "group"}-${row.interactionType}-${row.label}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {row.label}
                      </h3>
                      <p className="text-sm text-cyan-200">
                        {formatPercent(row.winRate)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-stone-300">
                      {humanizeInteractionType(row.interactionType)} |{" "}
                      {row.gamesPlayed} results | avg{" "}
                      {formatAverage(row.averageScore)} points | avg place{" "}
                      {formatAverage(row.averagePlacement)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <ChartFrame
            title={
              selectedPlayer
                ? `Optional Data Coverage for ${selectedPlayer.displayName}`
                : "Group Optional Data Coverage"
            }
          >
            {coverageData.length === 0 ? (
              <p className="text-sm text-stone-400">
                Coverage metrics will appear after finalized games are logged.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <BarChart
                    data={coverageData}
                    height={260}
                    margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                    width={340}
                  >
                    <CartesianGrid stroke="#44403c" strokeDasharray="3 3" />
                    <XAxis
                      angle={-20}
                      dataKey="label"
                      height={60}
                      textAnchor="end"
                      tick={{ fill: "#d6d3d1", fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: "#d6d3d1", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1c1917",
                        border: "1px solid #7c2d12",
                        borderRadius: "12px",
                        color: "#f5f5f4",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#14b8a6"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCoverage ? (
                    <>
                      <CoverageBadge
                        label="Full card breakdown"
                        value={selectedCoverage.cardBreakdownCoverage}
                      />
                      <CoverageBadge
                        label="Microbe coverage"
                        value={selectedCoverage.microbeCoverage}
                      />
                      <CoverageBadge
                        label="Animal coverage"
                        value={selectedCoverage.animalCoverage}
                      />
                      <CoverageBadge
                        label="Jovian coverage"
                        value={selectedCoverage.jovianCoverage}
                      />
                      <CoverageBadge
                        label="Declared style coverage"
                        value={selectedCoverage.declaredStyleCoverage}
                      />
                      <CoverageBadge
                        label="Key-card coverage"
                        value={selectedCoverage.keyCardCoverage}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </ChartFrame>
        </>
      ) : (
        <ChartFrame title="Insights Waiting on Finalized Games">
          <p className="text-sm text-stone-300">
            Finalize a few games to unlock leaderboard, style, lineup, and
            coverage insights. The promo catalog is ready below either way.
          </p>
        </ChartFrame>
      )}

      <PromoSetBrowser cards={promoCards} promoSets={promoSets} />
    </div>
  );
}
