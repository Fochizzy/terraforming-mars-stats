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
          {compactRows(rows, 8).map((row) => (
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

function OpeningComboCards({ rows }: { rows: GlobalOpeningComboMetric[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Opening Combo Strength</SectionHeading>
      {rows.length === 0 ? (
        <EmptyMetric>
          Opening combo strength needs repeated corporation and prelude pairings.
        </EmptyMetric>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {compactRows(rows, 9).map((row, index) => (
            <article
              className="tm-stat-card"
              key={`${row.signalType}-${row.label}-${index}`}
            >
              <p className="tm-data-label">
                {OPENING_SIGNAL_LABELS[row.signalType]}
              </p>
              <h4 className="mt-1 font-semibold text-stone-100">
                {row.corporationName}
              </h4>
              <p className="tm-muted-copy mt-1 text-xs">{row.preludeLabel}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="tm-data-label">Win Rate</dt>
                  <dd>{formatPercent(row.winRate)}</dd>
                </div>
                <div>
                  <dt className="tm-data-label">Plays</dt>
                  <dd>{row.plays}</dd>
                </div>
                <div>
                  <dt className="tm-data-label">Score SD</dt>
                  <dd>{formatAverage(row.scoreDeviation)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function CardTimingTable({ rows }: { rows: GlobalCardTimingMetric[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Log-Derived Card Timing</SectionHeading>
      {rows.length === 0 ? (
        <EmptyMetric>
          Card timing needs repeated early and late logged plays of the same card.
        </EmptyMetric>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Card</th>
                <th className="py-1 pr-3">Early Win</th>
                <th className="py-1 pr-3">Late Win</th>
                <th className="py-1 pr-3">Delta</th>
                <th className="py-1 pr-3">Early Plays</th>
                <th className="py-1 pr-3">Late Plays</th>
              </tr>
            </thead>
            <tbody>
              {compactRows(rows, 8).map((row) => (
                <tr className="border-t border-white/5" key={row.cardName}>
                  <td className="py-1 pr-3 font-semibold text-stone-100">
                    {row.cardName}
                  </td>
                  <td className="py-1 pr-3">
                    {formatPercent(row.earlyWinRate)}
                  </td>
                  <td className="py-1 pr-3">{formatPercent(row.lateWinRate)}</td>
                  <td className={`py-1 pr-3 ${metricTone(row.winRateDelta)}`}>
                    {formatSignedPercent(row.winRateDelta)}
                  </td>
                  <td className="py-1 pr-3">{row.earlyPlays}</td>
                  <td className="py-1 pr-3">{row.latePlays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
