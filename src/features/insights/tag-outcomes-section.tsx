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
import type { TagOutcomeRow } from '@/lib/db/extended-analytics-repo';

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

  for (const row of getScopedRows(rows, focusPlayerId)) {
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
  const relevantRows = getScopedRows(rows, focusPlayerId).filter(
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

export function TagOutcomesSection(props: {
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  rows: TagOutcomeRow[];
}) {
  const tagCodes = useMemo(() => listAvailableTagCodes(props.rows), [props.rows]);
  const [selectedTagCode, setSelectedTagCode] = useState('science');
  const activeTagCode = tagCodes.includes(selectedTagCode)
    ? selectedTagCode
    : tagCodes[0] ?? '';
  const winRateData = buildTagWinRateData(
    props.rows,
    props.focusPlayerId,
  );
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
      title={
        props.focusPlayerName
          ? `Tag Outcomes for ${props.focusPlayerName}`
          : 'Tag Outcomes'
      }
    >
      {props.rows.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Tag outcomes will appear once imported game logs provide tag
          summaries for finalized games.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="tm-data-label mb-2 text-xs">Win Rate by Tag</h3>
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
                  {winRateData.map((entry) => (
                    <tr className="border-t border-white/5" key={entry.tagCode}>
                      <td className="py-1 pr-3 font-semibold text-stone-100">
                        {entry.tagCode}
                      </td>
                      <td className="py-1 pr-3">{entry.results}</td>
                      <td className="py-1 pr-3">{entry.winRate}%</td>
                      <td className="py-1 pr-3">
                        {entry.wins}/{entry.results}
                      </td>
                      <td className="py-1 pr-3">{entry.averageTagCount}</td>
                      <td className="py-1 pr-3">{entry.maxTagCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3">
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
              <span className="mt-2 block">
                <SelectChevron />
              </span>
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
                <YAxis
                  allowDecimals={false}
                  tick={chartAxisTick}
                  yAxisId="results"
                />
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
                  {distributionData.map((entry) => (
                    <tr className="border-t border-white/5" key={entry.tagCount}>
                      <td className="py-1 pr-3 font-semibold text-stone-100">
                        {entry.tagCount}
                      </td>
                      <td className="py-1 pr-3">{entry.results}</td>
                      <td className="py-1 pr-3">{entry.resultShare}%</td>
                      <td className="py-1 pr-3">{entry.winRate}%</td>
                      <td className="py-1 pr-3">
                        {entry.wins}/{entry.results}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="tm-data-label mb-2 text-xs">
              Corporation Relationship
            </h3>
            <ResponsiveContainer height={260} width="100%">
              <ComposedChart
                data={corporationTagData}
                margin={{ bottom: 40, left: 0, right: 12, top: 8 }}
              >
                <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                <XAxis
                  dataKey="corporationName"
                  interval={0}
                  tick={chartAxisTick}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={chartAxisTick}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Bar
                  dataKey="tagUseRate"
                  fill={chartSeriesColors.accent}
                  name="Use rate"
                  radius={[10, 10, 0, 0]}
                  unit="%"
                />
                <Line
                  dataKey="winRate"
                  name="Win rate"
                  stroke={chartSeriesColors.greenery}
                  strokeWidth={2}
                  type="monotone"
                  unit="%"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="tm-data-label">
                    <th className="py-1 pr-3">Corporation</th>
                    <th className="py-1 pr-3">Results</th>
                    <th className="py-1 pr-3">Use rate</th>
                    <th className="py-1 pr-3">Avg count</th>
                    <th className="py-1 pr-3">Win rate</th>
                    <th className="py-1 pr-3">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {corporationTagData.map((entry) => (
                    <tr
                      className="border-t border-white/5"
                      key={entry.corporationId ?? entry.corporationName}
                    >
                      <td className="py-1 pr-3 font-semibold text-stone-100">
                        {entry.corporationName}
                      </td>
                      <td className="py-1 pr-3">{entry.results}</td>
                      <td className="py-1 pr-3">{entry.tagUseRate}%</td>
                      <td className="py-1 pr-3">{entry.averageTagCount}</td>
                      <td className="py-1 pr-3">{entry.winRate}%</td>
                      <td className="py-1 pr-3">
                        {entry.winsWithTag}/{entry.withTagResults}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {winRateData.length === 0 ? (
            <p className="tm-muted-copy text-sm">
              Tag win rates will appear once at least one finalized result has
              a nonzero tag count.
            </p>
          ) : null}
        </div>
      )}
    </ChartFrame>
  );
}
