import { ChevronDown } from 'lucide-react';
import type {
  ProfileGameLengthProfile,
  ProfileGlobalParameterTempoProfile,
  ProfilePhaseTempoProfile,
} from '@/lib/db/analytics-repo';
import { formatAverage, formatPercent } from './performance-delta';

type InsightMetric = {
  label: string;
  value: string;
};

type InsightColumn = {
  key: string;
  label: string;
};

type InsightRow = {
  highlighted?: boolean;
  key: string;
  label: string;
  values: Record<string, string>;
};

type TempoInsightCardProps = {
  columns: InsightColumn[];
  methodology?: string | null;
  rowHeaderLabel: string;
  rows: InsightRow[];
  summary: string;
  supportingText?: string | null;
  takeawayEyebrow: string;
  takeawayLabel?: string | null;
  takeawayMetrics: InsightMetric[];
  title: string;
};

type ProfileTempoFitCardsProps = {
  gameLengthProfile: ProfileGameLengthProfile | null;
  gameLengthStatements: string[];
  globalParameterTempoProfile: ProfileGlobalParameterTempoProfile | null;
  globalParameterTempoStatements: string[];
  phaseTempoProfile: ProfilePhaseTempoProfile | null;
  phaseTempoStatements: string[];
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function TempoInsightCard({
  columns,
  methodology = null,
  rowHeaderLabel,
  rows,
  summary,
  supportingText = null,
  takeawayEyebrow,
  takeawayLabel = null,
  takeawayMetrics,
  title,
}: TempoInsightCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-[1.125rem] border border-stone-700/50 bg-[linear-gradient(180deg,rgba(35,21,18,0.74),rgba(15,19,25,0.94)_42%,rgba(11,14,20,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,229,191,0.05),0_10px_24px_rgba(4,6,10,0.16)] sm:p-6">
      <header>
        <h3 className="text-lg font-bold leading-snug tracking-tight text-stone-100">
          {title}
        </h3>

        {takeawayLabel ? (
          <div className="mt-4 rounded-xl border border-orange-200/15 bg-orange-200/[0.045] p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-orange-200/80">
              {takeawayEyebrow}
            </p>
            <p className="mt-1.5 text-base font-semibold leading-snug text-stone-50">
              {takeawayLabel}
            </p>
            {takeawayMetrics.length > 0 ? (
              <dl className="mt-3 flex flex-wrap gap-2">
                {takeawayMetrics.map((metric) => (
                  <div
                    className="inline-flex items-baseline gap-1.5 rounded-full border border-white/10 bg-black/15 px-3 py-1.5"
                    key={metric.label}
                  >
                    <dt className="text-[0.7rem] text-stone-400">
                      {metric.label}
                    </dt>
                    <dd className="text-sm font-semibold tabular-nums text-orange-200">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="mt-4 space-y-2">
        <p className="text-[0.9375rem] leading-6 text-stone-200/90">{summary}</p>
        {supportingText ? (
          <p className="text-sm leading-6 text-stone-400">{supportingText}</p>
        ) : null}
      </div>

      <div className="mt-auto pt-5">
        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
            <div className="overflow-x-auto">
              <table
                aria-label={`${title} comparison metrics`}
                className="min-w-[26rem] w-full table-fixed border-collapse text-sm"
              >
                <thead className="bg-white/[0.025] text-[0.64rem] uppercase tracking-[0.1em] text-stone-500">
                  <tr>
                    <th className="w-[38%] px-3 py-3 text-left font-medium" scope="col">
                      {rowHeaderLabel}
                    </th>
                    {columns.map((column) => (
                      <th
                        className="px-3 py-3 text-right font-medium"
                        key={column.key}
                        scope="col"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      className={`border-t border-white/[0.075] ${
                        row.highlighted ? 'bg-orange-200/[0.055]' : ''
                      }`}
                      key={row.key}
                    >
                      <th
                        className={`px-3 py-3 text-left font-semibold leading-5 ${
                          row.highlighted ? 'text-orange-100' : 'text-stone-100'
                        }`}
                        scope="row"
                      >
                        {row.label}
                      </th>
                      {columns.map((column) => (
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${
                            row.highlighted ? 'text-orange-100' : 'text-stone-300'
                          }`}
                          key={column.key}
                        >
                          {row.values[column.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {methodology ? (
          <details className="group mt-4 border-t border-white/10 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-xs font-medium text-stone-400 outline-none transition hover:text-stone-200 focus-visible:ring-2 focus-visible:ring-orange-300/40 [&::-webkit-details-marker]:hidden">
              <span>How this is calculated</span>
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 shrink-0 transition-transform duration-150 group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 text-xs leading-5 text-stone-500">{methodology}</p>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export function ProfileTempoFitCards({
  gameLengthProfile,
  gameLengthStatements,
  globalParameterTempoProfile,
  globalParameterTempoStatements,
  phaseTempoProfile,
  phaseTempoStatements,
}: ProfileTempoFitCardsProps) {
  const bestPhase = phaseTempoProfile?.bestPhase ?? null;
  const mostActivePhase = phaseTempoProfile?.mostActivePhase ?? null;
  const bestTempoMix = globalParameterTempoProfile?.bestMix ?? null;
  const weakestTempoMix = globalParameterTempoProfile?.weakestMix ?? null;
  const bestLength = gameLengthProfile?.bestBucket ?? null;
  const weakestLength = gameLengthProfile?.weakestBucket ?? null;

  const phaseSummary = bestPhase
    ? `Your strongest log-backed results occur when activity peaks in the ${bestPhase.label.toLowerCase()} across ${pluralize(bestPhase.gamesWithPeak, 'imported game')}.`
    : phaseTempoStatements[0] ??
      'Import logs with generation markers to compare early-, mid-, and late-game activity.';
  const phaseSupportingText = mostActivePhase
    ? `${mostActivePhase.label} carries your highest logged tempo at ${formatAverage(mostActivePhase.actionsPerImportedGame)} tracked actions per imported game.`
    : null;

  const tempoSummary = bestTempoMix
    ? `${bestTempoMix.label} is your strongest current fast-parameter result across ${pluralize(bestTempoMix.gamesPlayed, 'imported game')}.`
    : globalParameterTempoStatements[0] ??
      'Imported oxygen, heat, and ocean raises will reveal which fast terraforming mixes fit best.';
  const tempoSupportingText =
    weakestTempoMix && weakestTempoMix.code !== bestTempoMix?.code
      ? `${weakestTempoMix.label} is the toughest current mix at ${formatPercent(weakestTempoMix.winRate)} win rate and ${formatAverage(weakestTempoMix.averagePlacement)} average placement.`
      : null;

  const lengthSummary = bestLength
    ? `${bestLength.label} (${bestLength.rangeLabel}) currently produce your strongest combination of finish and scoring efficiency across ${pluralize(bestLength.gamesPlayed, 'game')}.`
    : gameLengthStatements[0] ??
      'Finalized games with generation counts will reveal which game length fits best.';
  const lengthSupportingText =
    weakestLength && weakestLength.bucket !== bestLength?.bucket
      ? `${weakestLength.label} are the roughest length so far at ${formatPercent(weakestLength.winRate)} win rate and ${formatAverage(weakestLength.averagePlacement)} average placement.`
      : null;
  const gameLengthMethodology = gameLengthProfile?.rows.length
    ? `Game-length buckets use recorded generation counts: ${gameLengthProfile.rows
        .map((row) => `${row.label} are ${row.rangeLabel.toLowerCase()}`)
        .join('; ')}.`
    : null;

  return (
    <div className="mt-5 grid items-stretch gap-4 xl:grid-cols-3">
      <TempoInsightCard
        columns={[
          { key: 'actions', label: 'Actions/game' },
          { key: 'winRate', label: 'Peak win rate' },
          { key: 'placement', label: 'Avg place' },
        ]}
        methodology={phaseTempoProfile?.confidenceLabel}
        rowHeaderLabel="Phase"
        rows={
          phaseTempoProfile?.rows.map((row) => ({
            highlighted: row.phase === bestPhase?.phase,
            key: row.phase,
            label: row.label,
            values: {
              actions: formatAverage(row.actionsPerImportedGame),
              placement: formatAverage(row.averagePlacementWhenPeak),
              winRate:
                row.winRateWhenPeak === null
                  ? '—'
                  : formatPercent(row.winRateWhenPeak),
            },
          })) ?? []
        }
        summary={phaseSummary}
        supportingText={phaseSupportingText}
        takeawayEyebrow="Best phase"
        takeawayLabel={bestPhase?.label ?? mostActivePhase?.label}
        takeawayMetrics={
          bestPhase
            ? [
                {
                  label: 'Actions/game',
                  value: formatAverage(bestPhase.actionsPerImportedGame),
                },
                {
                  label: 'Win rate',
                  value:
                    bestPhase.winRateWhenPeak === null
                      ? '—'
                      : formatPercent(bestPhase.winRateWhenPeak),
                },
                {
                  label: 'Avg place',
                  value: formatAverage(bestPhase.averagePlacementWhenPeak),
                },
              ]
            : mostActivePhase
              ? [
                  {
                    label: 'Actions/game',
                    value: formatAverage(mostActivePhase.actionsPerImportedGame),
                  },
                ]
              : []
        }
        title="Early, Mid, and Late Game"
      />

      <TempoInsightCard
        columns={[
          { key: 'winRate', label: 'Win rate' },
          { key: 'placement', label: 'Avg place' },
          { key: 'generation', label: 'First raise' },
        ]}
        methodology={globalParameterTempoProfile?.confidenceLabel}
        rowHeaderLabel="Tempo"
        rows={
          globalParameterTempoProfile?.rows.map((row) => ({
            highlighted: row.code === bestTempoMix?.code,
            key: row.code,
            label: row.label,
            values: {
              generation: `Gen ${formatAverage(row.averageFastGeneration)}`,
              placement: formatAverage(row.averagePlacement),
              winRate: formatPercent(row.winRate),
            },
          })) ?? []
        }
        summary={tempoSummary}
        supportingText={tempoSupportingText}
        takeawayEyebrow="Best fast mix"
        takeawayLabel={bestTempoMix?.label}
        takeawayMetrics={
          bestTempoMix
            ? [
                { label: 'Win rate', value: formatPercent(bestTempoMix.winRate) },
                {
                  label: 'Avg place',
                  value: formatAverage(bestTempoMix.averagePlacement),
                },
                {
                  label: 'Avg score',
                  value: formatAverage(bestTempoMix.averageScore),
                },
              ]
            : []
        }
        title="Terraforming Tempo"
      />

      <TempoInsightCard
        columns={[
          { key: 'winRate', label: 'Win rate' },
          { key: 'placement', label: 'Avg place' },
          { key: 'pointsPerGeneration', label: 'Pts/gen' },
        ]}
        methodology={gameLengthMethodology}
        rowHeaderLabel="Length"
        rows={
          gameLengthProfile?.rows.map((row) => ({
            highlighted: row.bucket === bestLength?.bucket,
            key: row.bucket,
            label: row.label,
            values: {
              placement: formatAverage(row.averagePlacement),
              pointsPerGeneration: formatAverage(row.averagePointsPerGeneration),
              winRate: formatPercent(row.winRate),
            },
          })) ?? []
        }
        summary={lengthSummary}
        supportingText={lengthSupportingText}
        takeawayEyebrow="Best game length"
        takeawayLabel={bestLength?.label}
        takeawayMetrics={
          bestLength
            ? [
                { label: 'Win rate', value: formatPercent(bestLength.winRate) },
                {
                  label: 'Avg place',
                  value: formatAverage(bestLength.averagePlacement),
                },
                {
                  label: 'Pts/gen',
                  value: formatAverage(bestLength.averagePointsPerGeneration),
                },
              ]
            : []
        }
        title="Generation Length Fit"
      />
    </div>
  );
}
