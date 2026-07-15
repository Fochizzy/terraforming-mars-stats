'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
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
import { TagLabel } from '@/components/ui/tag-icon';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { TagOutcomeRow } from '@/lib/db/extended-analytics-repo';
import type { SelectionDialogData } from '@/lib/db/selection-stats-repo';
import { CorporationRelationshipPanel } from './corporation-relationship-panel';

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

export type TagWinRateDatum = {
  averageTagCount: number;
  maxTagCount: number;
  results: number;
  tagCode: string;
  winRate: number;
  wins: number;
};

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

function formatTagName(tagCode: string) {
  return tagCode.charAt(0).toUpperCase() + tagCode.slice(1);
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

function TagWinRateTable({ data }: { data: TagWinRateDatum[] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="tm-data-label">
            <th className="py-1 pr-3">Tag</th>
            <th className="py-1 pr-3">Results</th>
            <th className="py-1 pr-3">Win rate</th>
            <th className="py-1 pr-3">Wins</th>
            <th className="py-1 pr-3">Avg count</th>
            <th className="py-1 pr-3">Max count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr className="border-t border-white/5" key={entry.tagCode}>
              <td className="py-1 pr-3 font-semibold text-stone-100">
                <TagLabel code={entry.tagCode} />
              </td>
              <td className="py-1 pr-3">{entry.results}</td>
              <td className="py-1 pr-3">{entry.winRate}%</td>
              <td className="py-1 pr-3">{entry.wins}/{entry.results}</td>
              <td className="py-1 pr-3">{entry.averageTagCount}</td>
              <td className="py-1 pr-3">{entry.maxTagCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <div className="flex flex-col gap-4">
          <section>
            <h3 className="tm-data-label mb-2 text-xs">Win Rate by Tag</h3>
            <p className="tm-muted-copy mb-2 text-xs">
              {activeTagCode ? <TagLabel code={activeTagCode} /> : null}
            </p>
            <ResponsiveContainer height={260} width="100%">
              <BarChart
                data={winRateData}
                margin={{ bottom: 24, left: 0, right: 12, top: 8 }}
              >
                <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="tagCode" tick={chartAxisTick} />
                <YAxis
                  domain={[0, 100]}
                  tick={chartAxisTick}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Bar
                  dataKey="winRate"
                  fill={chartSeriesColors.greenery}
                  name="Win rate"
                  radius={[10, 10, 0, 0]}
                  unit="%"
                />
              </BarChart>
            </ResponsiveContainer>
            <TagWinRateTable data={winRateData} />
            {narratives.length > 0 ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
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
                    {tagCode}
                  </option>
                ))}
              </select>
              <span className="mt-2 block"><SelectChevron /></span>
              {activeTagCode ? (
                <span className="tm-muted-copy mt-2 flex text-xs">
                  <TagLabel code={activeTagCode} />
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
