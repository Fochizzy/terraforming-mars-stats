import type {
  GlobalCardTimingMetric,
  GlobalInsightMetrics,
  GlobalMapTableMetric,
  GlobalMetaSignal,
  GlobalObjectiveConversionMetric,
  GlobalOpeningComboMetric,
  GlobalTempoMetric,
  GlobalTerraformingShareMetric,
} from '@/lib/db/analytics-repo';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';

function formatAverage(value: number | null | undefined, digits = 1) {
  if (value === null || typeof value === 'undefined') {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || typeof value === 'undefined') {
    return '-';
  }

  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number) {
  const points = Math.round(value * 100);

  if (points === 0) {
    return '0 pts';
  }

  return `${points > 0 ? '+' : '-'}${Math.abs(points)} pts`;
}

function metricTone(value: number) {
  if (value > 0) {
    return 'text-emerald-400';
  }

  if (value < 0) {
    return 'text-rose-300';
  }

  return 'text-stone-100';
}

function signalLabel(signal: GlobalMetaSignal) {
  return signal.direction === 'overperformer' ? 'Overperformer' : 'Dragger';
}

const OPENING_SIGNAL_LABELS: Record<GlobalOpeningComboMetric['signalType'], string> =
  {
    best: 'Best opener',
    highVariance: 'High variance',
    trap: 'Trap opener',
  };

function compactRows<T>(rows: T[], limit: number) {
  return rows.slice(0, limit);
}

const META_SIGNAL_PRIOR_PLAYS = 5;

export function rankMetaSignals(rows: GlobalMetaSignal[]) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftWeight =
        left.row.sampleSize / (left.row.sampleSize + META_SIGNAL_PRIOR_PLAYS);
      const rightWeight =
        right.row.sampleSize / (right.row.sampleSize + META_SIGNAL_PRIOR_PLAYS);
      const leftScore = Math.abs(left.row.winRateDelta) * leftWeight;
      const rightScore = Math.abs(right.row.winRateDelta) * rightWeight;

      return (
        rightScore - leftScore ||
        right.row.sampleSize - left.row.sampleSize ||
        left.index - right.index
      );
    })
    .map(({ row }) => row);
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="tm-data-label text-xs">
      <GlossaryRichText maxLinks={2}>{children}</GlossaryRichText>
    </h3>
  );
}

function EmptyMetric({ children }: { children: string }) {
  return (
    <p className="tm-muted-copy text-sm">
      <GlossaryRichText>{children}</GlossaryRichText>
    </p>
  );
}

function SummaryCards({ metrics }: { metrics: GlobalInsightMetrics }) {
  const summary = metrics.summary;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="tm-stat-card">
        <p className="tm-data-label">
          <GlossaryRichText maxLinks={1}>Finalized Games</GlossaryRichText>
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-100">
          {summary.totalGames}
        </p>
      </div>
      <div className="tm-stat-card">
        <p className="tm-data-label">
          <GlossaryRichText maxLinks={1}>Baseline Win Rate</GlossaryRichText>
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-100">
          {formatPercent(summary.baselineWinRate)}
        </p>
      </div>
      <div className="tm-stat-card">
        <p className="tm-data-label">
          <GlossaryRichText maxLinks={1}>Average Score</GlossaryRichText>
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-100">
          {formatAverage(summary.averageScore)}
        </p>
      </div>
      <div className="tm-stat-card">
        <p className="tm-data-label">
          <GlossaryRichText maxLinks={1}>Average Generation</GlossaryRichText>
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-100">
          {formatAverage(summary.averageGeneration)}
        </p>
      </div>
    </div>
  );
}

function MetaSignalCards({ rows }: { rows: GlobalMetaSignal[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Meta Winners &amp; Draggers</SectionHeading>
      {rows.length === 0 ? (
        <EmptyMetric>
          Meta signals will appear once selections clear the sample floor.
        </EmptyMetric>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {compactRows(rankMetaSignals(rows), 8).map((row) => (
            <article
              className="tm-stat-card"
              key={`${row.direction}-${row.sourceType}-${row.label}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="tm-data-label">{signalLabel(row)}</p>
                  <h4 className="mt-1 font-semibold text-stone-100">
                    {row.label}
                  </h4>
                </div>
                <span className="tm-data-label whitespace-nowrap">
                  {row.sourceType}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="tm-data-label">Delta</dt>
                  <dd className={metricTone(row.winRateDelta)}>
                    {formatSignedPercent(row.winRateDelta)}
                  </dd>
                </div>
                <div>
                  <dt className="tm-data-label">Win Rate</dt>
                  <dd>{formatPercent(row.winRate)}</dd>
                </div>
                <div>
                  <dt className="tm-data-label">Samples</dt>
                  <dd>{row.sampleSize}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TempoCards({ rows }: { rows: GlobalTempoMetric[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Tempo Profile</SectionHeading>
      {rows.length === 0 ? (
        <EmptyMetric>Tempo metrics will appear after finalized games.</EmptyMetric>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {rows.map((row) => (
            <article className="tm-stat-card" key={row.bucket}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-stone-100">{row.label}</h4>
                <span className="tm-data-label whitespace-nowrap">
                  {row.games} games
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="tm-data-label">Win Rate</dt>
                  <dd>{formatPercent(row.winRate)}</dd>
                </div>
                <div>
                  <dt className="tm-data-label">Avg Score</dt>
                  <dd>{formatAverage(row.averageScore)}</dd>
                </div>
                <div>
                  <dt className="tm-data-label">Pts / Gen</dt>
                  <dd>{formatAverage(row.averagePointsPerGeneration)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TerraformingShareTable({
  rows,
}: {
  rows: GlobalTerraformingShareMetric[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Terraforming Share</SectionHeading>
      {rows.length === 0 ? (
        <EmptyMetric>
          Terraforming share needs imported logs with global-parameter actions.
        </EmptyMetric>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Player</th>
                <th className="py-1 pr-3">Share</th>
                <th className="py-1 pr-3">Heat</th>
                <th className="py-1 pr-3">Oxygen</th>
                <th className="py-1 pr-3">Ocean</th>
                <th className="py-1 pr-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {compactRows(rows, 8).map((row) => (
                <tr className="border-t border-white/5" key={row.playerId}>
                  <td className="py-1 pr-3 font-semibold text-stone-100">
                    {row.playerName}
                  </td>
                  <td className="py-1 pr-3">{formatPercent(row.actionShare)}</td>
                  <td className="py-1 pr-3">{row.heatActions}</td>
                  <td className="py-1 pr-3">{row.oxygenActions}</td>
                  <td className="py-1 pr-3">{row.oceanActions}</td>
                  <td className="py-1 pr-3">{row.totalActions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ObjectiveConversionTable({
  rows,
}: {
  rows: GlobalObjectiveConversionMetric[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Objective Conversion</SectionHeading>
      {rows.length === 0 ? (
        <EmptyMetric>
          Objective conversion will appear after milestones and awards are logged.
        </EmptyMetric>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Objective</th>
                <th className="py-1 pr-3">Type</th>
                <th className="py-1 pr-3">Rate</th>
                <th className="py-1 pr-3">Win Rate</th>
                <th className="py-1 pr-3">Sniped</th>
                <th className="py-1 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {compactRows(rows, 10).map((row) => (
                <tr
                  className="border-t border-white/5"
                  key={`${row.objectiveType}-${row.label}`}
                >
                  <td className="py-1 pr-3 font-semibold text-stone-100">
                    {row.label}
                  </td>
                  <td className="py-1 pr-3 capitalize">{row.objectiveType}</td>
                  <td className="py-1 pr-3">
                    {formatPercent(row.conversionRate)}
                  </td>
                  <td className="py-1 pr-3">{formatPercent(row.winRate)}</td>
                  <td className="py-1 pr-3">
                    {row.snipedRate === null ? '-' : formatPercent(row.snipedRate)}
                  </td>
                  <td className="py-1 pr-3">{row.actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MapTableCards({ rows }: { rows: GlobalMapTableMetric[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Map &amp; Table-Size Meta</SectionHeading>
      {rows.length === 0 ? (
        <EmptyMetric>Map and table-size metrics need finalized games.</EmptyMetric>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {compactRows(rows, 8).map((row) => (
            <article
              className="tm-stat-card"
              key={`${row.category}-${row.label}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-stone-100">{row.label}</h4>
                <span className="tm-data-label whitespace-nowrap">
                  {row.category === 'map' ? 'Map' : 'Table'}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="tm-data-label">Games</dt>
                  <dd>{row.games}</dd>
                </div>
                <div>
                  <dt className="tm-data-label">Avg Score</dt>
                  <dd>{formatAverage(row.averageScore)}</dd>
                </div>
                <div>
                  <dt className="tm-data-label">Avg Gen</dt>
                  <dd>{formatAverage(row.averageGeneration)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TimingDeltaBadge({ value }: { value: number }) {
  const points = Math.round(value * 100);
  let ariaLabel = 'Early and late win rates are equal';
  let label = '→ 0 pts';
  let toneClass = 'border-white/10 bg-white/5 text-stone-300';

  if (points > 0) {
    ariaLabel =
      'Early win rate is ' + points + ' points higher than late win rate';
    label = '↑ +' + points + ' pts';
    toneClass =
      'border-[#34d399]/25 bg-[#34d399]/10 text-[#34d399]';
  } else if (points < 0) {
    ariaLabel =
      'Early win rate is ' + Math.abs(points) + ' points lower than late win rate';
    label = '↓ −' + Math.abs(points) + ' pts';
    toneClass =
      'border-[#fb7185]/25 bg-[#fb7185]/10 text-[#fb7185]';
  }

  return (
    <span
      aria-label={ariaLabel}
      className={[
        'inline-flex min-w-[6.75rem] items-center justify-center rounded-full border',
        'px-2.5 py-1 text-xs font-semibold tabular-nums',
        toneClass,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function OpeningComboCards({ rows }: { rows: GlobalOpeningComboMetric[] }) {
  const displayedRows = compactRows(rows, 9);

  return (
    <section
      aria-labelledby="opening-combo-strength-title"
      className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-[#263241] bg-[#111821] shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
    >
      <header className="border-b border-[#263241] bg-black/10 px-5 py-5 sm:px-7 sm:py-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f6b94a]">
          Opening analysis
        </p>
        <h3
          className="mt-2 text-2xl font-semibold tracking-tight text-[#f1f5f9]"
          id="opening-combo-strength-title"
        >
          Opening combo strength
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#94a3b8]">
          Compare repeated corporation and prelude pairings across finalized games.
        </p>
      </header>

      <div className="p-5 sm:p-7">
        {displayedRows.length === 0 ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-[#f6b94a]/25 bg-[#f6b94a]/[0.07] px-4 py-3.5"
            role="note"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#f6b94a]/35 text-xs font-bold text-[#f6b94a]"
            >
              !
            </span>
            <div>
              <p className="text-sm font-semibold text-[#f1f5f9]">
                Limited confidence
              </p>
              <p className="mt-1 text-sm leading-6 text-[#94a3b8]">
                More repeated corporation and prelude pairings are needed before
                drawing strong conclusions.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {displayedRows.map((row, index) => (
              <article
                className="rounded-xl border border-[#263241] bg-black/20 p-4 transition-colors hover:border-white/20 hover:bg-white/[0.035]"
                key={[row.signalType, row.label, index].join('-')}
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  {OPENING_SIGNAL_LABELS[row.signalType]}
                </p>
                <h4 className="mt-2 font-semibold text-[#f1f5f9]">
                  {row.corporationName}
                </h4>
                <p className="mt-1 text-xs text-[#94a3b8]">{row.preludeLabel}</p>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[#263241] pt-3 text-right text-sm tabular-nums">
                  <div>
                    <dt className="text-[0.62rem] uppercase tracking-[0.1em] text-[#94a3b8]">
                      Win rate
                    </dt>
                    <dd className="mt-1 font-semibold text-[#f1f5f9]">
                      {formatPercent(row.winRate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.62rem] uppercase tracking-[0.1em] text-[#94a3b8]">
                      Plays
                    </dt>
                    <dd className="mt-1 font-semibold text-[#f1f5f9]">
                      {row.plays}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.62rem] uppercase tracking-[0.1em] text-[#94a3b8]">
                      Score SD
                    </dt>
                    <dd className="mt-1 font-semibold text-[#f1f5f9]">
                      {formatAverage(row.scoreDeviation)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CardTimingTable({ rows }: { rows: GlobalCardTimingMetric[] }) {
  const displayedRows = compactRows(rows, 8);
  const displayedCountLabel =
    displayedRows.length === 1 ? '1 card' : displayedRows.length + ' cards';

  return (
    <section
      aria-labelledby="log-derived-card-timing-title"
      className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-[#263241] bg-[#111821] shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
    >
      <header className="flex flex-col gap-4 border-b border-[#263241] bg-black/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-6">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f6b94a]">
            Card statistics
          </p>
          <h3
            className="mt-2 text-2xl font-semibold tracking-tight text-[#f1f5f9]"
            id="log-derived-card-timing-title"
          >
            Log-derived card timing
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#94a3b8]">
            Compare how the same cards perform when played early versus late.
          </p>
        </div>
        {displayedRows.length > 0 ? (
          <span className="w-fit rounded-full border border-[#263241] bg-black/20 px-3 py-1 text-xs font-medium tabular-nums text-[#94a3b8]">
            {displayedCountLabel}
          </span>
        ) : null}
      </header>

      {displayedRows.length === 0 ? (
        <p className="px-5 py-5 text-sm leading-6 text-[#94a3b8] sm:px-7">
          Card timing needs repeated early and late logged plays of the same card.
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-[38%] border-b-2 border-[#263241] bg-[#111821] px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8] sm:px-6">
                  Card
                </th>
                <th className="sticky top-0 z-10 w-[14%] border-b-2 border-[#263241] bg-[#111821] px-3 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Early win
                </th>
                <th className="sticky top-0 z-10 w-[14%] border-b-2 border-[#263241] bg-[#111821] px-3 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Late win
                </th>
                <th className="sticky top-0 z-10 w-[17%] border-b-2 border-[#263241] bg-[#111821] px-3 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Change
                </th>
                <th className="sticky top-0 z-10 w-[17%] border-b-2 border-[#263241] bg-[#111821] px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94a3b8] sm:px-6">
                  Plays
                </th>
              </tr>
            </thead>
            <tbody className="text-[#f1f5f9]">
              {displayedRows.map((row) => (
                <tr
                  className="h-[46px] transition-colors odd:bg-white/[0.018] hover:bg-amber-400/[0.045]"
                  key={row.cardName}
                >
                  <td className="border-b border-[#263241]/70 px-4 py-3 text-left font-semibold sm:px-6">
                    {row.cardName}
                  </td>
                  <td className="border-b border-[#263241]/70 px-3 py-3 text-right tabular-nums">
                    {formatPercent(row.earlyWinRate)}
                  </td>
                  <td className="border-b border-[#263241]/70 px-3 py-3 text-right tabular-nums">
                    {formatPercent(row.lateWinRate)}
                  </td>
                  <td className="border-b border-[#263241]/70 px-3 py-3 text-right">
                    <TimingDeltaBadge value={row.winRateDelta} />
                  </td>
                  <td className="border-b border-[#263241]/70 px-4 py-3 text-right tabular-nums sm:px-6">
                    <span
                      aria-label={
                        row.earlyPlays +
                        ' early plays to ' +
                        row.latePlays +
                        ' late plays'
                      }
                      className="inline-flex min-w-[5.5rem] items-center justify-end gap-2"
                    >
                      <span className="font-semibold text-[#f1f5f9]">
                        {row.earlyPlays}
                      </span>
                      <span aria-hidden="true" className="text-[#94a3b8]">
                        →
                      </span>
                      <span className="font-semibold text-[#f1f5f9]">
                        {row.latePlays}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function GlobalInsightMetricsSection({
  metrics,
}: {
  metrics: GlobalInsightMetrics;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="tm-panel-title text-base">
          <GlossaryRichText maxLinks={1}>Global Meta Snapshot</GlossaryRichText>
        </h3>
        <p className="tm-muted-copy text-sm">
          <GlossaryRichText>
            All finalized games, imported logs, and objective records.
          </GlossaryRichText>
        </p>
      </div>
      <SummaryCards metrics={metrics} />
      <MetaSignalCards rows={metrics.metaSignals} />
      <TempoCards rows={metrics.tempoProfile} />
      <TerraformingShareTable rows={metrics.terraformingShare} />
      <ObjectiveConversionTable rows={metrics.objectiveConversion} />
      <MapTableCards rows={metrics.mapTableMeta} />
      <OpeningComboCards rows={metrics.openingCombos} />
      <CardTimingTable rows={metrics.cardTiming} />
    </section>
  );
}
