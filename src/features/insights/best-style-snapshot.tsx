"use client";

import { useMemo, useState } from "react";
import type { GroupStylePerformanceRow } from "@/lib/db/analytics-repo";
import styles from "./best-style-snapshot.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StyleEntry = {
  styleCode: string;
  styleLabel: string;
  winRate: number; // 0–1 fraction
  winRatePct: number; // integer percent
  gamesPlayed: number;
  averageScore: number | null;
  averagePlacement: number | null;
  rank: number;
};

type BestStyleSnapshotProps = {
  rows: GroupStylePerformanceRow[];
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function humanizeStyleCode(styleCode: string | null): string {
  if (!styleCode) return "Unclassified";
  return styleCode
    .split("_")
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(" ");
}

function formatWinRate(pct: number): string {
  return `${pct}%`;
}

function formatScore(value: number | null): string {
  if (value === null || !isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function formatPlacement(value: number | null): string {
  if (value === null || !isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatGameCount(count: number): string {
  return count === 1 ? "1 game" : `${count} games`;
}

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

function deriveEligibleStyles(rows: GroupStylePerformanceRow[]): StyleEntry[] {
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = row.styleCode ?? "";
      if (!key || seen.has(key)) return false;
      seen.add(key);
      const rate = Number(row.winRate);
      if (!isFinite(rate)) return false;
      if (row.gamesPlayed <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = b.winRate - a.winRate;
      if (diff !== 0) return diff;
      return (a.styleCode ?? "").localeCompare(b.styleCode ?? "");
    })
    .slice(0, 3)
    .map((row, index) => ({
      styleCode: row.styleCode,
      styleLabel: humanizeStyleCode(row.styleCode),
      winRate: row.winRate,
      winRatePct: Math.round(row.winRate * 100),
      gamesPlayed: row.gamesPlayed,
      averageScore:
        row.averageScore != null && isFinite(row.averageScore)
          ? row.averageScore
          : null,
      averagePlacement:
        row.averagePlacement != null && isFinite(row.averagePlacement)
          ? row.averagePlacement
          : null,
      rank: index + 1,
    }));
}

function computeChartMax(topEntries: StyleEntry[]): number {
  if (topEntries.length === 0) return 100;
  const maxPct = Math.max(...topEntries.map((e) => e.winRatePct));
  // Round up to nearest clean interval: 10 or 20 or 50 or 100
  const intervals = [10, 20, 25, 50, 100];
  for (const interval of intervals) {
    const candidate = Math.ceil(maxPct / interval) * interval;
    if (candidate >= maxPct && candidate - maxPct <= interval) {
      return Math.max(candidate, 10);
    }
  }
  return 100;
}

function buildInsightSentence(topEntries: StyleEntry[]): string | null {
  if (topEntries.length < 2) return null;
  const first = topEntries[0];
  const second = topEntries[1];
  if (first.winRatePct === second.winRatePct) {
    // Tie — find all tied at the top
    const tied = topEntries.filter((e) => e.winRatePct === first.winRatePct);
    const names = tied.map((e) => e.styleLabel);
    const joined =
      names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    return `${joined} share the highest win rate at ${formatWinRate(first.winRatePct)}.`;
  }
  const diff = first.winRatePct - second.winRatePct;
  return `${first.styleLabel} leads with a ${formatWinRate(first.winRatePct)} win rate, ${diff} percentage point${diff === 1 ? "" : "s"} above ${second.styleLabel}.`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StyleMethodologyTooltip() {
  return (
    <span className={styles.tooltipWrap}>
      <button
        aria-describedby="style-methodology-tooltip"
        className={styles.infoBtn}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span className="sr-only">About inferred play styles</span>
      </button>
      <span
        className={styles.tooltip}
        id="style-methodology-tooltip"
        role="tooltip"
      >
        Play styles are assigned from each game&rsquo;s scoring profile.
      </span>
    </span>
  );
}

type StyleRankingRowProps = {
  entry: StyleEntry;
  chartMax: number;
  isHighlighted: boolean;
  onHover: (styleCode: string | null) => void;
};

function StyleRankingRow({
  entry,
  chartMax,
  isHighlighted,
  onHover,
}: StyleRankingRowProps) {
  const barPct = chartMax > 0 ? (entry.winRatePct / chartMax) * 100 : 0;

  return (
    <div
      aria-label={`${entry.styleLabel}, rank ${entry.rank}, ${formatWinRate(entry.winRatePct)} win rate, ${formatGameCount(entry.gamesPlayed)}, ${formatScore(entry.averageScore)} average points, ${formatPlacement(entry.averagePlacement)} average placement`}
      className={[
        styles.chartRow,
        isHighlighted ? styles.chartRowHighlighted : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-style={entry.styleCode}
      id={`chart-row-${entry.styleCode}`}
      onBlur={() => onHover(null)}
      onFocus={() => onHover(entry.styleCode)}
      onMouseEnter={() => onHover(entry.styleCode)}
      onMouseLeave={() => onHover(null)}
      role="row"
      tabIndex={0}
    >
      <span aria-hidden="true" className={styles.chartRank}>
        #{entry.rank}
      </span>
      <span className={styles.chartLabel} title={entry.styleLabel}>
        {entry.styleLabel}
      </span>
      <span aria-hidden="true" className={styles.barTrack} role="presentation">
        <span className={styles.barFill} style={{ width: `${barPct}%` }} />
      </span>
      <span aria-atomic="true" aria-live="off" className={styles.chartPct}>
        <span aria-hidden="true">{formatWinRate(entry.winRatePct)}</span>
        <span className="sr-only">
          {formatWinRate(entry.winRatePct)} win rate
        </span>
      </span>
    </div>
  );
}

type StylePerformanceRowProps = {
  entry: StyleEntry;
  isHighlighted: boolean;
  onHover: (styleCode: string | null) => void;
};

function StylePerformanceRow({
  entry,
  isHighlighted,
  onHover,
}: StylePerformanceRowProps) {
  const isFirst = entry.rank === 1;

  return (
    <article
      aria-labelledby={`detail-name-${entry.styleCode}`}
      className={[
        styles.detailRow,
        isFirst ? styles.detailRowFirst : "",
        isHighlighted ? styles.detailRowHighlighted : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-style={entry.styleCode}
      id={`detail-row-${entry.styleCode}`}
      onBlur={() => onHover(null)}
      onFocus={() => onHover(entry.styleCode)}
      onMouseEnter={() => onHover(entry.styleCode)}
      onMouseLeave={() => onHover(null)}
      tabIndex={0}
    >
      <div className={styles.detailPrimary}>
        <span aria-hidden="true" className={styles.detailRank}>
          #{entry.rank}
        </span>
        <h3 className={styles.detailName} id={`detail-name-${entry.styleCode}`}>
          {entry.styleLabel}
        </h3>
        <div className={styles.detailRateGroup}>
          {isFirst && (
            <span aria-label="Top performer" className={styles.topBadge}>
              Top performer
            </span>
          )}
          <span className={styles.detailRate}>
            {formatWinRate(entry.winRatePct)}{" "}
            <span className={styles.detailRateLabel}>win rate</span>
          </span>
        </div>
      </div>
      <p className={styles.detailMeta}>
        {formatGameCount(entry.gamesPlayed)}
        {entry.averageScore !== null
          ? ` · ${formatScore(entry.averageScore)} avg points`
          : ""}
        {entry.averagePlacement !== null
          ? ` · ${formatPlacement(entry.averagePlacement)} avg placement`
          : ""}
      </p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// GridLines for the horizontal chart
// ---------------------------------------------------------------------------

function ChartGridLines({ max }: { max: number }) {
  const step = max <= 20 ? 10 : max <= 50 ? 25 : 50;
  const lines: number[] = [];
  for (let v = step; v <= max; v += step) {
    lines.push(v);
  }
  return (
    <div aria-hidden="true" className={styles.gridLines}>
      {lines.map((v) => (
        <span
          className={styles.gridLine}
          key={v}
          style={{ left: `${(v / max) * 100}%` }}
        >
          <span className={styles.gridLineLabel}>{v}%</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BestStyleSnapshot({ rows }: BestStyleSnapshotProps) {
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);

  const topEntries = useMemo(() => deriveEligibleStyles(rows), [rows]);
  const chartMax = useMemo(() => computeChartMax(topEntries), [topEntries]);
  const insightSentence = useMemo(
    () => buildInsightSentence(topEntries),
    [topEntries],
  );

  if (topEntries.length === 0) {
    return (
      <section aria-label="Best style snapshot" className="tm-panel">
        <div className={styles.emptyHeader}>
          <p className={styles.eyebrow}>Performance profile</p>
          <h2 className={styles.heading}>Best style snapshot</h2>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No style performance data yet</p>
          <p className={styles.emptyDesc}>
            Style comparisons will appear after finalized game data is
            available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Best style snapshot"
      className={`tm-panel ${styles.snapshot}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <p className={styles.eyebrow}>Performance profile</p>
          <h2 className={styles.heading}>Best style snapshot</h2>
          <p className={styles.description}>
            Compare the group&rsquo;s strongest{" "}
            <span className={styles.tooltipHost}>
              inferred play styles
              <StyleMethodologyTooltip />
            </span>{" "}
            across finalized games.
          </p>
          {insightSentence !== null && (
            <p aria-live="polite" className={styles.insight}>
              {insightSentence}
            </p>
          )}
        </div>
        <div className={styles.badge} aria-hidden="true">
          <span>★</span>
          Top styles
        </div>
      </div>

      {/* Horizontal ranking chart */}
      <div
        aria-label="Top inferred play styles ranked by win rate"
        className={styles.chartArea}
        role="table"
      >
        <div aria-hidden="true" className={styles.chartHeader}>
          <span />
          <span />
          <span className={styles.chartAxisLabel}>
            Win rate (0–{chartMax}%)
          </span>
          <span />
        </div>
        <ChartGridLines max={chartMax} />
        <div role="rowgroup">
          {topEntries.map((entry) => (
            <StyleRankingRow
              chartMax={chartMax}
              entry={entry}
              isHighlighted={hoveredStyle === entry.styleCode}
              key={entry.styleCode}
              onHover={setHoveredStyle}
            />
          ))}
        </div>
      </div>

      {/* Detail rows */}
      <div className={styles.detailList} role="list">
        {topEntries.map((entry) => (
          <StylePerformanceRow
            entry={entry}
            isHighlighted={hoveredStyle === entry.styleCode}
            key={entry.styleCode}
            onHover={setHoveredStyle}
          />
        ))}
      </div>
    </section>
  );
}
