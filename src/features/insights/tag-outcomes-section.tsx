'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartSeriesColors,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import { SelectChevron } from '@/components/ui/select-chevron';
import { TagIcon } from '@/components/ui/tag-icon';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { TagOutcomeRow } from '@/lib/db/extended-analytics-repo';
import type { SelectionDialogData } from '@/lib/db/selection-stats-repo';
import { CorporationRelationshipPanel } from './corporation-relationship-panel';
import {
  buildTagWinRateSummary,
  formatTagName,
  getTagWinRateBand,
  isLowSampleTag,
  type TagWinRatePresentationDatum,
} from './tag-outcomes-presentation';

export function listAvailableTagCodes(rows: TagOutcomeRow[]) {
  return [...new Set(rows.map((row) => row.tagCode))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function roundPercent(value: number) {
  return Math.round(value * 100);
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function getScopedRows(rows: TagOutcomeRow[], focusPlayerId: string | null) {
  return rows.filter((row) => !focusPlayerId || row.playerId === focusPlayerId);
}

// A player who controls several corporations (e.g. after the Merger prelude)
// gets one row per corporation for the same tag result. Aggregations that count
// player results — rather than corporation results — must collapse those back to
// a single row, otherwise multi-corporation games are counted twice.
function getScopedPlayerResultRows(
  rows: TagOutcomeRow[],
  focusPlayerId: string | null,
) {
  const byPlayerResult = new Map<string, TagOutcomeRow>();

  for (const row of getScopedRows(rows, focusPlayerId)) {
    const key = `${row.gameId}|${row.playerId}|${row.tagCode}`;

    if (!byPlayerResult.has(key)) {
      byPlayerResult.set(key, row);
    }
  }

  return [...byPlayerResult.values()];
}

export type TagWinRateDatum = TagWinRatePresentationDatum;

export function buildTagWinRateData(
  rows: TagOutcomeRow[],
  focusPlayerId: string | null,
) {
  const totals = new Map<
    string,
    { maxTagCount: number; results: number; tagSum: number; wins: number }
  >();

  for (const row of getScopedPlayerResultRows(rows, focusPlayerId)) {
    if (row.tagCount <= 0) {
      continue;
    }

    const entry = totals.get(row.tagCode) ?? {
      maxTagCount: 0,
      results: 0,
      tagSum: 0,
      wins: 0,
    };

    entry.maxTagCount = Math.max(entry.maxTagCount, row.tagCount);
    entry.results += 1;
    entry.tagSum += row.tagCount;
    entry.wins += row.isWinner ? 1 : 0;
    totals.set(row.tagCode, entry);
  }

  return [...totals.entries()]
    .map(([tagCode, entry]) => ({
      averageTagCount: roundOneDecimal(entry.tagSum / entry.results),
      maxTagCount: entry.maxTagCount,
      results: entry.results,
      tagCode,
      winRate: roundPercent(entry.wins / entry.results),
      wins: entry.wins,
    }))
    .sort(
      (left, right) =>
        right.winRate - left.winRate ||
        right.results - left.results ||
        left.tagCode.localeCompare(right.tagCode),
    );
}

function tagEvidenceLabel(results: number) {
  return results >= 10 ? 'well-established' : results >= 5 ? 'developing' : 'early';
}

export function buildTagOutcomeNarratives(
  rows: TagOutcomeRow[],
  focusPlayerId: string | null,
) {
  const resultRows = getScopedPlayerResultRows(rows, focusPlayerId);
  const uniqueResults = new Map<string, TagOutcomeRow>();
  for (const row of resultRows) {
    uniqueResults.set(`${row.gameId}|${row.playerId}`, row);
  }
  const baselineRows = [...uniqueResults.values()];
  const baselineWinRate = baselineRows.length
    ? baselineRows.filter((row) => row.isWinner).length / baselineRows.length
    : 0;
  const data = buildTagWinRateData(rows, focusPlayerId).map((entry) => ({
    ...entry,
    adjustedDelta:
      (entry.wins + 5 * baselineWinRate) / (entry.results + 5) -
      baselineWinRate,
  }));

  if (data.length === 0) {
    return [];
  }

  const strongest = [...data].sort(
    (left, right) =>
      right.adjustedDelta - left.adjustedDelta ||
      right.results - left.results ||
      left.tagCode.localeCompare(right.tagCode),
  )[0];
  const weakest = [...data].sort(
    (left, right) =>
      left.adjustedDelta - right.adjustedDelta ||
      right.results - left.results ||
      left.tagCode.localeCompare(right.tagCode),
  )[0];
  const deepest = [...data].sort(
    (left, right) =>
      right.averageTagCount - left.averageTagCount ||
      right.results - left.results ||
      left.tagCode.localeCompare(right.tagCode),
  )[0];
  const baselinePercent = roundPercent(baselineWinRate);
  const narratives = [
    `${formatTagName(strongest.tagCode)} is your strongest context-adjusted tag signal: ${strongest.wins} wins in ${strongest.results} results (${strongest.winRate}%), compared with your ${baselinePercent}% baseline. This is ${tagEvidenceLabel(strongest.results)} evidence, with ${strongest.averageTagCount} ${strongest.tagCode} tags on average.`,
  ];

  if (weakest.tagCode !== strongest.tagCode) {
    narratives.push(
      `${formatTagName(weakest.tagCode)} is your clearest loss-correlated tag: ${weakest.wins} wins in ${weakest.results} results (${weakest.winRate}%), compared with your ${baselinePercent}% baseline. Its average count was ${weakest.averageTagCount}, so the signal reflects both whether the tag appeared and how heavily you used it.`,
    );
  }

  if (
    deepest.tagCode !== strongest.tagCode &&
    deepest.tagCode !== weakest.tagCode
  ) {
    narratives.push(
      `${formatTagName(deepest.tagCode)} was your deepest tag engine, averaging ${deepest.averageTagCount} tags and reaching ${deepest.maxTagCount} in one result; that volume produced a ${deepest.winRate}% win rate across ${deepest.results} results.`,
    );
  }

  return narratives;
}

export type TagCountDistributionDatum = {
  countLabel: string;
  resultShare: number;
  results: number;
  tagCount: number;
  winRate: number;
  wins: number;
};

export function buildTagCountDistributionData(
  rows: TagOutcomeRow[],
  tagCode: string,
  focusPlayerId: string | null,
): TagCountDistributionDatum[] {
  const relevantRows = getScopedPlayerResultRows(rows, focusPlayerId).filter(
    (row) => row.tagCode === tagCode,
  );
  const totalResults = relevantRows.length;
  const totals = new Map<number, { results: number; wins: number }>();

  for (const row of relevantRows) {
    const entry = totals.get(row.tagCount) ?? { results: 0, wins: 0 };
    entry.results += 1;
    entry.wins += row.isWinner ? 1 : 0;
    totals.set(row.tagCount, entry);
  }

  return [...totals.entries()]
    .map(([tagCount, entry]) => ({
      countLabel: String(tagCount),
      resultShare:
        totalResults > 0 ? roundPercent(entry.results / totalResults) : 0,
      results: entry.results,
      tagCount,
      winRate: roundPercent(entry.wins / entry.results),
      wins: entry.wins,
    }))
    .sort((left, right) => left.tagCount - right.tagCount);
}

export type CorporationTagDatum = {
  averageTagCount: number;
  corporationId: string | null;
  corporationName: string;
  results: number;
  tagUseRate: number;
  winRate: number;
  winsWithTag: number;
  withTagResults: number;
};

export function buildCorporationTagData(
  rows: TagOutcomeRow[],
  tagCode: string,
  focusPlayerId: string | null,
): CorporationTagDatum[] {
  const totals = new Map<
    string,
    {
      corporationId: string | null;
      corporationName: string;
      results: number;
      tagSum: number;
      winsWithTag: number;
      withTagResults: number;
    }
  >();

  for (const row of getScopedRows(rows, focusPlayerId)) {
    if (row.tagCode !== tagCode) {
      continue;
    }

    const key = row.corporationId ?? row.corporationName;
    const entry = totals.get(key) ?? {
      corporationId: row.corporationId,
      corporationName: row.corporationName,
      results: 0,
      tagSum: 0,
      winsWithTag: 0,
      withTagResults: 0,
    };

    entry.results += 1;
    entry.tagSum += row.tagCount;

    if (row.tagCount > 0) {
      entry.withTagResults += 1;
      entry.winsWithTag += row.isWinner ? 1 : 0;
    }

    totals.set(key, entry);
  }

  return [...totals.values()]
    .map((entry) => ({
      averageTagCount: roundOneDecimal(entry.tagSum / entry.results),
      corporationId: entry.corporationId,
      corporationName: entry.corporationName,
      results: entry.results,
      tagUseRate: roundPercent(entry.withTagResults / entry.results),
      winRate:
        entry.withTagResults > 0
          ? roundPercent(entry.winsWithTag / entry.withTagResults)
          : 0,
      winsWithTag: entry.winsWithTag,
      withTagResults: entry.withTagResults,
    }))
    .sort(
      (left, right) =>
        right.tagUseRate - left.tagUseRate ||
        right.winRate - left.winRate ||
        left.corporationName.localeCompare(right.corporationName),
    );
}

const WIN_RATE_PRESENTATION = {
  competitive: {
    chartColor: '#a3a34f',
    pillClass: 'border-amber-300/25 bg-amber-300/[0.08] text-amber-100',
  },
  mixed: {
    chartColor: '#78716c',
    pillClass: 'border-stone-500/30 bg-stone-500/10 text-stone-300',
  },
  strong: {
    chartColor: '#65a30d',
    pillClass: 'border-lime-400/30 bg-lime-400/10 text-lime-200',
  },
  winless: {
    chartColor: '#9f4a45',
    pillClass: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200',
  },
} as const;

function getWinRatePresentation(winRate: number) {
  return WIN_RATE_PRESENTATION[getTagWinRateBand(winRate)];
}

function TagDisplay({
  className,
  code,
  size = 20,
}: {
  className?: string;
  code: string;
  size?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <TagIcon code={code} size={size} />
      <span>{formatTagName(code)}</span>
    </span>
  );
}

function TagSummaryCard({
  detail,
  entry,
  label,
  value,
}: {
  detail: string;
  entry: TagWinRateDatum;
  label: string;
  value: string;
}) {
  const presentation = getWinRatePresentation(entry.winRate);

  return (
    <article className="rounded-xl border border-white/[0.08] bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="tm-data-label text-[0.65rem]">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <TagDisplay className="min-w-0 font-semibold text-stone-100" code={entry.tagCode} />
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold tabular-nums ${presentation.pillClass}`}
        >
          {value}
        </span>
      </div>
      <p className="tm-muted-copy mt-2 text-xs tabular-nums">{detail}</p>
    </article>
  );
}

function TagWinRateTable({ data }: { data: TagWinRateDatum[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/15">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm tabular-nums">
          <thead className="bg-black/25">
            <tr className="tm-data-label border-b border-white/[0.08] text-[0.65rem]">
              <th className="px-3 py-2.5 text-left">Tag</th>
              <th className="px-3 py-2.5 text-right">Games</th>
              <th className="px-3 py-2.5 text-right">Win Rate</th>
              <th className="px-3 py-2.5 text-right">Record</th>
              <th className="px-3 py-2.5 text-right">Avg. Cards</th>
              <th className="px-3 py-2.5 text-right">Most Cards</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => {
              const presentation = getWinRatePresentation(entry.winRate);
              const lowSample = isLowSampleTag(entry.results);

              return (
                <tr
                  className={`border-t border-white/[0.055] transition hover:bg-white/[0.045] ${
                    index % 2 === 1 ? 'bg-white/[0.018]' : 'bg-transparent'
                  }`}
                  key={entry.tagCode}
                >
                  <td className="px-3 py-2.5 font-semibold text-stone-100">
                    <div className="flex items-center gap-2.5">
                      <TagDisplay code={entry.tagCode} />
                      {lowSample ? (
                        <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.12em] text-amber-200/80">
                          Low sample
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-stone-300">
                    {entry.results}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`inline-flex min-w-14 justify-center rounded-full border px-2 py-1 text-xs font-semibold ${presentation.pillClass}`}
                    >
                      {entry.winRate}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-stone-200">
                    {entry.wins}/{entry.results}
                  </td>
                  <td className="px-3 py-2.5 text-right text-stone-300">
                    {entry.averageTagCount}
                  </td>
                  <td className="px-3 py-2.5 text-right text-stone-300">
                    {entry.maxTagCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DistributionTable({ data }: { data: TagCountDistributionDatum[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="tm-data-label">
            <th className="py-1 pr-3">Count</th>
            <th className="py-1 pr-3">Results</th>
            <th className="py-1 pr-3">Share</th>
            <th className="py-1 pr-3">Win rate</th>
            <th className="py-1 pr-3">Wins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr className="border-t border-white/5" key={entry.tagCount}>
              <td className="py-1 pr-3 font-semibold text-stone-100">{entry.tagCount}</td>
              <td className="py-1 pr-3">{entry.results}</td>
              <td className="py-1 pr-3">{entry.resultShare}%</td>
              <td className="py-1 pr-3">{entry.winRate}%</td>
              <td className="py-1 pr-3">{entry.wins}/{entry.results}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TagOutcomesSection(props: {
  dialogData?: SelectionDialogData;
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  rows: TagOutcomeRow[];
}) {
  const tagCodes = useMemo(() => listAvailableTagCodes(props.rows), [props.rows]);
  const [selectedTagCode, setSelectedTagCode] = useState('science');
  const activeTagCode = tagCodes.includes(selectedTagCode)
    ? selectedTagCode
    : tagCodes[0] ?? '';
  const winRateData = buildTagWinRateData(props.rows, props.focusPlayerId);
  const winRateSummary = buildTagWinRateSummary(winRateData);
  const winRateChartData = winRateData.map((entry) => ({
    ...entry,
    barLabel: `${entry.winRate}% · ${entry.wins}/${entry.results}`,
    tagLabel: formatTagName(entry.tagCode),
  }));
  const winRateChartHeight = Math.max(320, winRateChartData.length * 38 + 44);
  const narratives = buildTagOutcomeNarratives(props.rows, props.focusPlayerId);
  const distributionData = buildTagCountDistributionData(
    props.rows,
    activeTagCode,
    props.focusPlayerId,
  );
  const corporationTagData = buildCorporationTagData(
    props.rows,
    activeTagCode,
    props.focusPlayerId,
  );
  const activeTagSummary = winRateData.find(
    (entry) => entry.tagCode === activeTagCode,
  );

  return (
    <ChartFrame
      description="Win rate and average score grouped by card tag, showing which tag-heavy strategies tend to pay off."
      title={
        props.focusPlayerName
          ? `Tag Outcomes for ${props.focusPlayerName}`
          : 'Tag Outcomes'
      }
    >
      {props.rows.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          <GlossaryRichText>
            Tag outcomes will appear once imported game logs provide tag summaries for finalized games.
          </GlossaryRichText>
        </p>
      ) : (
        <div className="-mt-1 flex flex-col gap-4">
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="tm-data-label text-xs">Win Rate by Tag</h3>
                <p className="tm-muted-copy mt-1 text-xs">
                  Sorted by performance. Each bar includes the win record and sample size.
                </p>
              </div>
              <p className="text-[0.68rem] text-stone-500">
                Dashed bars and badges mark fewer than 5 games.
              </p>
            </div>

            {winRateSummary ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <TagSummaryCard
                  detail={`${winRateSummary.best.wins}/${winRateSummary.best.results} record`}
                  entry={winRateSummary.best}
                  label="Best Win Rate"
                  value={`${winRateSummary.best.winRate}%`}
                />
                <TagSummaryCard
                  detail={`${winRateSummary.mostPlayed.averageTagCount} avg. cards · ${winRateSummary.mostPlayed.winRate}% win rate`}
                  entry={winRateSummary.mostPlayed}
                  label="Most Played"
                  value={`${winRateSummary.mostPlayed.results} games`}
                />
                <TagSummaryCard
                  detail={`${winRateSummary.weakest.wins}/${winRateSummary.weakest.results} record`}
                  entry={winRateSummary.weakest}
                  label="Biggest Drag"
                  value={`${winRateSummary.weakest.winRate}%`}
                />
              </div>
            ) : null}

            <div className="rounded-xl border border-white/[0.08] bg-black/15 px-2 py-3 sm:px-3">
              <ResponsiveContainer height={winRateChartHeight} width="100%">
                <BarChart
                  data={winRateChartData}
                  layout="vertical"
                  margin={{ bottom: 6, left: 4, right: 100, top: 4 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke={chartGridStroke}
                    strokeDasharray="3 5"
                    strokeOpacity={0.42}
                  />
                  <XAxis
                    axisLine={{ stroke: '#57534e' }}
                    domain={[0, 100]}
                    tick={{ ...chartAxisTick, fill: '#a8a29e', fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    ticks={[0, 25, 50, 75, 100]}
                    type="number"
                  />
                  <YAxis
                    axisLine={false}
                    dataKey="tagLabel"
                    interval={0}
                    tick={{ ...chartAxisTick, fill: '#e7e5e4', fontSize: 12, fontWeight: 600 }}
                    tickLine={false}
                    type="category"
                    width={88}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.035)' }}
                    formatter={(value) => [`${value}%`, 'Win rate']}
                  />
                  <Bar
                    barSize={22}
                    dataKey="winRate"
                    minPointSize={3}
                    name="Win rate"
                    radius={[0, 8, 8, 0]}
                    unit="%"
                  >
                    {winRateChartData.map((entry) => {
                      const presentation = getWinRatePresentation(entry.winRate);
                      const lowSample = isLowSampleTag(entry.results);

                      return (
                        <Cell
                          fill={presentation.chartColor}
                          fillOpacity={lowSample ? 0.52 : 0.92}
                          key={entry.tagCode}
                          stroke={lowSample ? presentation.chartColor : 'transparent'}
                          strokeDasharray={lowSample ? '4 3' : undefined}
                          strokeWidth={lowSample ? 1.5 : 0}
                        />
                      );
                    })}
                    <LabelList
                      dataKey="barLabel"
                      fill="#e7e5e4"
                      fontSize={11}
                      fontWeight={600}
                      position="right"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <TagWinRateTable data={winRateData} />
            {narratives.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                <h4 className="tm-data-label text-xs">What the tag data says</h4>
                <ul className="tm-muted-copy mt-2 space-y-2 text-sm">
                  {narratives.map((narrative) => (
                    <li key={narrative}>{narrative}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <div className="relative max-w-[220px]">
              <label className="tm-data-label" htmlFor="tag-outcome-select">
                Tag Distribution
              </label>
              <select
                className="tm-input mt-2 w-full appearance-none pr-9"
                id="tag-outcome-select"
                onChange={(event) => setSelectedTagCode(event.target.value)}
                value={activeTagCode}
              >
                {tagCodes.map((tagCode) => (
                  <option key={tagCode} value={tagCode}>
                    {formatTagName(tagCode)}
                  </option>
                ))}
              </select>
              <span className="mt-2 block"><SelectChevron /></span>
              {activeTagCode ? (
                <span className="tm-muted-copy mt-2 flex text-xs">
                  <TagDisplay code={activeTagCode} />
                </span>
              ) : null}
            </div>

            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div>
                <p className="tm-data-label">Results with Tag</p>
                <p className="mt-1 text-lg font-semibold text-stone-100">
                  {activeTagSummary?.results ?? 0}
                </p>
              </div>
              <div>
                <p className="tm-data-label">Win Rate</p>
                <p className="mt-1 text-lg font-semibold text-stone-100">
                  {activeTagSummary ? `${activeTagSummary.winRate}%` : '0%'}
                </p>
              </div>
              <div>
                <p className="tm-data-label">Avg Count When Played</p>
                <p className="mt-1 text-lg font-semibold text-stone-100">
                  {activeTagSummary?.averageTagCount ?? 0}
                </p>
              </div>
            </div>

            <ResponsiveContainer height={260} width="100%">
              <ComposedChart
                data={distributionData}
                margin={{ bottom: 16, left: 0, right: 12, top: 8 }}
              >
                <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                <XAxis
                  dataKey="countLabel"
                  name={`${activeTagCode} count`}
                  tick={chartAxisTick}
                />
                <YAxis allowDecimals={false} tick={chartAxisTick} yAxisId="results" />
                <YAxis
                  domain={[0, 100]}
                  orientation="right"
                  tick={chartAxisTick}
                  tickFormatter={(value) => `${value}%`}
                  yAxisId="rate"
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Bar
                  dataKey="results"
                  fill={chartSeriesColors.default}
                  name="Results"
                  radius={[10, 10, 0, 0]}
                  yAxisId="results"
                />
                <Line
                  dataKey="winRate"
                  name="Win rate"
                  stroke={chartSeriesColors.greenery}
                  strokeWidth={2}
                  type="monotone"
                  unit="%"
                  yAxisId="rate"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <DistributionTable data={distributionData} />
          </section>

          <CorporationRelationshipPanel
            data={corporationTagData}
            dialogData={props.dialogData}
          />

          {winRateData.length === 0 ? (
            <p className="tm-muted-copy text-sm">
              <GlossaryRichText>
                Tag win rates will appear once at least one finalized result has a nonzero tag count.
              </GlossaryRichText>
            </p>
          ) : null}
        </div>
      )}
    </ChartFrame>
  );
}
