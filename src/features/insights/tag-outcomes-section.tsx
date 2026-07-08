'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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

export type TagScatterPoint = {
  playerName: string;
  tagCount: number;
  totalPoints: number;
};

export function buildTagScatterData(
  rows: TagOutcomeRow[],
  tagCode: string,
  focusPlayerId: string | null,
) {
  const relevantRows = rows.filter(
    (row) =>
      row.tagCode === tagCode &&
      (!focusPlayerId || row.playerId === focusPlayerId),
  );

  return {
    losses: relevantRows
      .filter((row) => !row.isWinner)
      .map((row) => ({
        playerName: row.playerName,
        tagCount: row.tagCount,
        totalPoints: row.totalPoints,
      })),
    wins: relevantRows
      .filter((row) => row.isWinner)
      .map((row) => ({
        playerName: row.playerName,
        tagCount: row.tagCount,
        totalPoints: row.totalPoints,
      })),
  };
}

export type TagFingerprintDatum = {
  groupAverage: number;
  playerAverage: number | null;
  tagCode: string;
};

export function buildTagFingerprintData(
  rows: TagOutcomeRow[],
  focusPlayerId: string | null,
): TagFingerprintDatum[] {
  const groupTotals = new Map<string, { count: number; sum: number }>();
  const playerTotals = new Map<string, { count: number; sum: number }>();

  for (const row of rows) {
    const groupEntry = groupTotals.get(row.tagCode) ?? { count: 0, sum: 0 };

    groupEntry.count += 1;
    groupEntry.sum += row.tagCount;
    groupTotals.set(row.tagCode, groupEntry);

    if (focusPlayerId && row.playerId === focusPlayerId) {
      const playerEntry = playerTotals.get(row.tagCode) ?? { count: 0, sum: 0 };

      playerEntry.count += 1;
      playerEntry.sum += row.tagCount;
      playerTotals.set(row.tagCode, playerEntry);
    }
  }

  return [...groupTotals.entries()]
    .map(([tagCode, groupEntry]) => {
      const playerEntry = playerTotals.get(tagCode);

      return {
        groupAverage: Math.round((groupEntry.sum / groupEntry.count) * 10) / 10,
        playerAverage: playerEntry
          ? Math.round((playerEntry.sum / playerEntry.count) * 10) / 10
          : null,
        tagCode,
      };
    })
    .sort((left, right) => right.groupAverage - left.groupAverage);
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
  const scatterData = buildTagScatterData(
    props.rows,
    activeTagCode,
    props.focusPlayerId,
  );
  const fingerprintData = buildTagFingerprintData(
    props.rows,
    props.focusPlayerId,
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
          <div className="relative max-w-[220px]">
            <label className="tm-data-label" htmlFor="tag-outcome-select">
              Tag
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
          <ResponsiveContainer height={280} width="100%">
            <ScatterChart margin={{ bottom: 24, left: 0, right: 12, top: 12 }}>
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis
                allowDecimals={false}
                dataKey="tagCount"
                name={`${activeTagCode} tags`}
                tick={chartAxisTick}
                type="number"
              />
              <YAxis
                dataKey="totalPoints"
                name="Final score"
                tick={chartAxisTick}
                type="number"
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend />
              <Scatter
                data={scatterData.wins}
                fill={chartSeriesColors.greenery}
                name="Wins"
              />
              <Scatter
                data={scatterData.losses}
                fill={chartSeriesColors.danger}
                name="Losses"
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div>
            <h3 className="tm-data-label mb-2 text-xs">
              Tag Fingerprint (avg tags per game)
            </h3>
            <ResponsiveContainer height={240} width="100%">
              <BarChart
                data={fingerprintData}
                margin={{ bottom: 4, left: 0, right: 12, top: 8 }}
              >
                <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="tagCode" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Bar
                  dataKey="groupAverage"
                  fill={chartSeriesColors.default}
                  name="Group avg"
                  radius={[10, 10, 0, 0]}
                />
                {props.focusPlayerId ? (
                  <Bar
                    dataKey="playerAverage"
                    fill={chartSeriesColors.accent}
                    name={props.focusPlayerName ?? 'Player avg'}
                    radius={[10, 10, 0, 0]}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="tm-muted-copy text-xs">
            Each scatter point is one finalized result from an imported log:
            {` ${activeTagCode}`} tags played against the final score, split by
            wins and losses.
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
