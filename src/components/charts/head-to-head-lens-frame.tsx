"use client";

import { Children, isValidElement, useState, type ReactNode } from 'react';
import styles from './head-to-head-lens-frame.module.css';

type ParsedHeadToHeadRow = {
  firstPlayer: string;
  gamesPlayed: number;
  losses: number;
  margin: number;
  secondPlayer: string;
  ties: number;
  wins: number;
};

type HeadToHeadSort = 'most-games' | 'largest-margin' | 'closest-matchup';

type ElementWithChildren = {
  children?: ReactNode;
};

function flattenText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(flattenText).join('');
  }

  if (isValidElement<ElementWithChildren>(node)) {
    return flattenText(node.props.children);
  }

  return '';
}

function parseHeadToHeadRows(children: ReactNode): ParsedHeadToHeadRow[] | null {
  const root = Children.toArray(children)[0];

  if (!isValidElement<ElementWithChildren>(root) || root.type !== 'div') {
    return null;
  }

  const parsedRows = Children.toArray(root.props.children).map((candidate) => {
    if (!isValidElement<ElementWithChildren>(candidate) || candidate.type !== 'article') {
      return null;
    }

    const articleChildren = Children.toArray(candidate.props.children);
    const summary = articleChildren[0];
    const record = articleChildren[1];

    if (!isValidElement<ElementWithChildren>(summary)) {
      return null;
    }

    const summaryChildren = Children.toArray(summary.props.children);
    const label = flattenText(summaryChildren[0]).trim();
    const marginText = flattenText(summaryChildren[1]).trim();
    const recordText = flattenText(record).trim();
    const labelParts = label.split(' vs ');
    const recordMatch = recordText.match(/^(\d+)-(\d+)-(\d+) over (\d+) games?$/i);
    const margin = Number(marginText.replace(/[^\d.+-]/g, ''));

    if (labelParts.length < 2 || !recordMatch || Number.isNaN(margin)) {
      return null;
    }

    return {
      firstPlayer: labelParts[0],
      secondPlayer: labelParts.slice(1).join(' vs '),
      wins: Number(recordMatch[1]),
      losses: Number(recordMatch[2]),
      ties: Number(recordMatch[3]),
      gamesPlayed: Number(recordMatch[4]),
      margin,
    };
  });

  if (parsedRows.some((row) => row === null)) {
    return null;
  }

  return parsedRows as ParsedHeadToHeadRow[];
}

function sortRows(rows: ParsedHeadToHeadRow[], sort: HeadToHeadSort): ParsedHeadToHeadRow[] {
  const copy = [...rows];
  if (sort === 'most-games') {
    return copy.sort((a, b) => b.gamesPlayed - a.gamesPlayed || a.firstPlayer.localeCompare(b.firstPlayer));
  }
  if (sort === 'largest-margin') {
    return copy.sort((a, b) => Math.abs(b.margin) - Math.abs(a.margin) || b.gamesPlayed - a.gamesPlayed);
  }
  // closest-matchup
  return copy.sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin) || b.gamesPlayed - a.gamesPlayed);
}

function formatPoints(value: number) {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);

  return `${formatted} pts`;
}

function HeadToHeadSummary({ rows }: { rows: ParsedHeadToHeadRow[] }) {
  const totalGames = rows.reduce((sum, r) => sum + r.gamesPlayed, 0);
  const closest = rows.reduce<ParsedHeadToHeadRow | null>((best, r) => {
    if (!best) return r;
    return Math.abs(r.margin) < Math.abs(best.margin) ? r : best;
  }, null);

  return (
    <div className={styles.summary}>
      <span className={styles.summaryItem}>
        <span className={styles.summaryValue}>{rows.length}</span>
        {' '}
        <span className={styles.summaryLabel}>{rows.length === 1 ? 'matchup' : 'matchups'}</span>
      </span>
      <span className={styles.summarySep} aria-hidden="true">·</span>
      <span className={styles.summaryItem}>
        <span className={styles.summaryValue}>{totalGames}</span>
        {' '}
        <span className={styles.summaryLabel}>shared games</span>
      </span>
      {closest && (
        <>
          <span className={styles.summarySep} aria-hidden="true">·</span>
          <span className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Closest: </span>
            <span className={styles.summaryValue}>
              {closest.firstPlayer} vs {closest.secondPlayer}
            </span>
          </span>
        </>
      )}
    </div>
  );
}

function SortControls({
  sort,
  onSort,
  playerCount,
  playerFilter,
  players,
  onPlayerFilter,
}: {
  sort: HeadToHeadSort;
  onSort: (s: HeadToHeadSort) => void;
  playerCount: number;
  playerFilter: string;
  players: string[];
  onPlayerFilter: (p: string) => void;
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.sortGroup} role="group" aria-label="Sort matchups by">
        <button
          className={sort === 'most-games' ? styles.sortBtnActive : styles.sortBtn}
          onClick={() => onSort('most-games')}
          type="button"
        >
          Most games
        </button>
        <button
          className={sort === 'largest-margin' ? styles.sortBtnActive : styles.sortBtn}
          onClick={() => onSort('largest-margin')}
          type="button"
        >
          Largest edge
        </button>
        <button
          className={sort === 'closest-matchup' ? styles.sortBtnActive : styles.sortBtn}
          onClick={() => onSort('closest-matchup')}
          type="button"
        >
          Closest
        </button>
      </div>
      {playerCount > 4 && (
        <select
          aria-label="Filter by player"
          className={styles.playerFilter}
          value={playerFilter}
          onChange={(e) => onPlayerFilter(e.target.value)}
        >
          <option value="">All players</option>
          {players.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function HeadToHeadRow({ row }: { row: ParsedHeadToHeadRow }) {
  const { firstPlayer, secondPlayer, wins, losses, ties, gamesPlayed, margin } = row;

  const favoredPlayer =
    margin > 0 ? firstPlayer :
    margin < 0 ? secondPlayer :
    null;

  const displayedMargin = Math.abs(margin);

  return (
    <article className={styles.row}>
      <div className={styles.matchup}>
        <strong className={styles.matchupName}>
          {firstPlayer}
          <span className={styles.vsLabel} aria-hidden="true"> vs </span>
          {secondPlayer}
        </strong>
      </div>

      <div className={styles.record} aria-label={`${firstPlayer}'s record: ${wins} wins, ${losses} losses, ${ties} ties`}>
        <span className={styles.recordText}>
          {wins} <abbr title="wins">W</abbr>
          <span className={styles.dot} aria-hidden="true"> · </span>
          {losses} <abbr title="losses">L</abbr>
          <span className={styles.dot} aria-hidden="true"> · </span>
          {ties} <abbr title="ties">T</abbr>
        </span>
        <span className={styles.recordPerspective}>{firstPlayer}&apos;s record</span>
      </div>

      <div className={styles.games}>
        {gamesPlayed}
        <span className={styles.gamesLabel}>{' '}{gamesPlayed === 1 ? 'game' : 'games'}</span>
      </div>

      <div className={styles.margin}>
        {favoredPlayer ? (
          <>
            <span className={styles.edgeBadge}>{favoredPlayer} edge</span>
            <strong className={styles.marginValue}>+{formatPoints(displayedMargin)}</strong>
          </>
        ) : (
          <strong className={styles.marginEven}>Even</strong>
        )}
      </div>
    </article>
  );
}

export function HeadToHeadLensFrame({ children }: { children: ReactNode }) {
  const allRows = parseHeadToHeadRows(children);
  const [sort, setSort] = useState<HeadToHeadSort>('most-games');
  const [playerFilter, setPlayerFilter] = useState<string>('');

  if (!allRows) {
    return (
      <section className="tm-panel p-3 sm:p-4">
        <div className="flex flex-col gap-1">
          <h2 className="tm-panel-title text-lg font-semibold">Head-to-Head Lens</h2>
        </div>
        <div className="mt-3">{children}</div>
      </section>
    );
  }

  const allPlayers = Array.from(
    new Set(allRows.flatMap((r) => [r.firstPlayer, r.secondPlayer])),
  ).sort((a, b) => a.localeCompare(b));

  const filteredRows = playerFilter
    ? allRows.filter((r) => r.firstPlayer === playerFilter || r.secondPlayer === playerFilter)
    : allRows;

  const sortedRows = sortRows(filteredRows, sort);

  return (
    <section className="tm-panel p-3 sm:p-4">
      <div className={styles.header}>
        <h2 className="tm-panel-title text-lg font-semibold">Head-to-Head Lens</h2>
        <p className={styles.description}>
          Compare player records, shared games, and average scoring advantages.{' '}
          <span className={styles.tooltipAnchor} aria-describedby="h2h-tooltip">
            <span className={styles.infoIcon} aria-hidden="true">ⓘ</span>
            <span className={styles.tooltip} id="h2h-tooltip" role="tooltip">
              The average point difference across all games shared by the two players.
            </span>
          </span>
        </p>
      </div>

      <HeadToHeadSummary rows={allRows} />

      <SortControls
        onPlayerFilter={setPlayerFilter}
        onSort={setSort}
        playerCount={allPlayers.length}
        playerFilter={playerFilter}
        players={allPlayers}
        sort={sort}
      />

      <div className={styles.tableWrap}>
        <div className={styles.columnHeaders} aria-hidden="true">
          <span>Matchup</span>
          <span>First player record</span>
          <span>Games</span>
          <span className={styles.colRight}>Average advantage</span>
        </div>

        <div className={styles.rowList}>
          {sortedRows.map((row) => (
            <HeadToHeadRow
              key={`${row.firstPlayer}-${row.secondPlayer}`}
              row={row}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
