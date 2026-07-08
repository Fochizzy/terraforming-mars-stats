'use client';

import {
  Bar,
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
import type {
  AwardFunderWinnerRow,
  AwardOutcomeRow,
  MilestoneEconomicsRow,
  PlayerMilestoneClaimRow,
} from '@/lib/db/extended-analytics-repo';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export type MilestoneChartDatum = {
  claimerWinRate: number;
  claims: number;
  milestoneName: string;
};

export function buildMilestoneChartData(input: {
  focusPlayerId: string | null;
  groupRows: MilestoneEconomicsRow[];
  playerRows: PlayerMilestoneClaimRow[];
}): MilestoneChartDatum[] {
  if (input.focusPlayerId) {
    return input.playerRows
      .filter((row) => row.playerId === input.focusPlayerId)
      .map((row) => ({
        claimerWinRate:
          row.claims === 0
            ? 0
            : Math.round((row.claimerWins / row.claims) * 100),
        claims: row.claims,
        milestoneName: row.milestoneName,
      }));
  }

  return input.groupRows.map((row) => ({
    claimerWinRate: Math.round(row.claimerWinRate * 100),
    claims: row.claims,
    milestoneName: row.milestoneName,
  }));
}

export function findTopClaimers(rows: PlayerMilestoneClaimRow[]) {
  const topByMilestone = new Map<string, PlayerMilestoneClaimRow>();

  for (const row of rows) {
    const current = topByMilestone.get(row.milestoneName);

    if (
      !current ||
      row.claims > current.claims ||
      (row.claims === current.claims &&
        row.playerName.localeCompare(current.playerName) < 0)
    ) {
      topByMilestone.set(row.milestoneName, row);
    }
  }

  return topByMilestone;
}

export function MilestoneEconomicsSection(props: {
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  groupRows: MilestoneEconomicsRow[];
  playerRows: PlayerMilestoneClaimRow[];
}) {
  const data = buildMilestoneChartData({
    focusPlayerId: props.focusPlayerId,
    groupRows: props.groupRows,
    playerRows: props.playerRows,
  });
  const topClaimers = findTopClaimers(props.playerRows);

  return (
    <ChartFrame
      title={
        props.focusPlayerName
          ? `Milestone Economics for ${props.focusPlayerName}`
          : 'Milestone Economics'
      }
    >
      {data.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Milestone claims will appear once finalized games record them.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <ResponsiveContainer height={260} width="100%">
            <ComposedChart
              data={data}
              margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis
                angle={-20}
                dataKey="milestoneName"
                height={60}
                textAnchor="end"
                tick={chartAxisTick}
              />
              <YAxis allowDecimals={false} tick={chartAxisTick} yAxisId="claims" />
              <YAxis
                domain={[0, 100]}
                orientation="right"
                tick={chartAxisTick}
                unit="%"
                yAxisId="rate"
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Bar
                dataKey="claims"
                fill={chartSeriesColors.default}
                name="Claims"
                radius={[10, 10, 0, 0]}
                yAxisId="claims"
              />
              <Line
                dataKey="claimerWinRate"
                dot
                name="Claimer win rate"
                stroke={chartSeriesColors.greenery}
                strokeWidth={3}
                type="monotone"
                yAxisId="rate"
              />
            </ComposedChart>
          </ResponsiveContainer>
          {!props.focusPlayerId ? (
            <div className="grid gap-3 md:grid-cols-2">
              {props.groupRows.slice(0, 6).map((row) => {
                const topClaimer = topClaimers.get(row.milestoneName);

                return (
                  <article className="tm-stat-card" key={row.milestoneId}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {row.milestoneName}
                      </h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPercent(row.claimerWinRate)} claimer wins
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      Claimed in {formatPercent(row.claimRate)} of games
                      {topClaimer
                        ? ` | most claimed by ${topClaimer.playerName} (${topClaimer.claims}×)`
                        : ''}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </ChartFrame>
  );
}

export type AwardMatrixModel = {
  counts: Map<string, number>;
  funderNames: string[];
  maxCount: number;
  winnerNames: string[];
};

export function buildAwardMatrixModel(
  rows: AwardFunderWinnerRow[],
): AwardMatrixModel {
  const funderNames = [...new Set(rows.map((row) => row.funderPlayerName))].sort(
    (left, right) => left.localeCompare(right),
  );
  const winnerNames = [...new Set(rows.map((row) => row.winnerPlayerName))].sort(
    (left, right) => left.localeCompare(right),
  );
  const counts = new Map<string, number>();
  let maxCount = 0;

  for (const row of rows) {
    const key = `${row.funderPlayerName}→${row.winnerPlayerName}`;
    const next = (counts.get(key) ?? 0) + row.firstPlaceAwards;

    counts.set(key, next);
    maxCount = Math.max(maxCount, next);
  }

  return { counts, funderNames, maxCount, winnerNames };
}

export function AwardEconomicsSection(props: {
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  matrixRows: AwardFunderWinnerRow[];
  outcomeRows: AwardOutcomeRow[];
}) {
  const matrixRows = props.focusPlayerId
    ? props.matrixRows.filter((row) => row.funderPlayerId === props.focusPlayerId)
    : props.matrixRows;
  const matrix = buildAwardMatrixModel(matrixRows);

  return (
    <ChartFrame
      title={
        props.focusPlayerName
          ? `Award Economics for ${props.focusPlayerName} as Funder`
          : 'Award Economics'
      }
    >
      {props.outcomeRows.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Award funding outcomes will appear once finalized games record them.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            {props.outcomeRows.slice(0, 8).map((row) => (
              <article className="tm-stat-card" key={row.awardId}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-stone-100">{row.awardName}</h3>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.funderWonRate)} funder ROI
                  </p>
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  Funded {row.fundedCount}× | funder took 1st{' '}
                  {row.funderWonCount}× | sniped {row.snipedCount}×
                </p>
              </article>
            ))}
          </div>
          {matrix.funderNames.length > 0 ? (
            <div className="overflow-x-auto">
              <h3 className="tm-data-label mb-2 text-xs">
                Who Profits From Whose Funding (1st places on funded awards)
              </h3>
              <table className="text-xs" data-testid="award-funder-matrix">
                <thead>
                  <tr>
                    <th className="py-1 pr-3 text-left tm-data-label">
                      Funder ↓ / Winner →
                    </th>
                    {matrix.winnerNames.map((winnerName) => (
                      <th className="px-2 py-1 text-left tm-data-label" key={winnerName}>
                        {winnerName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.funderNames.map((funderName) => (
                    <tr className="border-t border-white/5" key={funderName}>
                      <td className="py-1 pr-3 font-semibold text-stone-100">
                        {funderName}
                      </td>
                      {matrix.winnerNames.map((winnerName) => {
                        const count =
                          matrix.counts.get(`${funderName}→${winnerName}`) ?? 0;
                        const intensity =
                          matrix.maxCount === 0 ? 0 : count / matrix.maxCount;

                        return (
                          <td
                            className="px-2 py-1 text-center"
                            key={winnerName}
                            style={{
                              background:
                                count > 0
                                  ? `rgba(51, 136, 187, ${0.15 + intensity * 0.55})`
                                  : 'transparent',
                            }}
                          >
                            {count > 0 ? count : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="tm-muted-copy mt-2 text-xs">
                Diagonal cells are self-funded wins; off-diagonal cells are
                sniped awards.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </ChartFrame>
  );
}
