'use client';

import { useState } from 'react';
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
import {
  ObjectiveInfoButton,
  type AwardObjectiveStats,
  type MilestoneObjectiveStats,
} from '@/components/ui/objective-info-button';
import type {
  AwardFunderWinnerRow,
  AwardOutcomeRow,
  MilestoneEconomicsRow,
  PlayerAwardFundingOutcomeRow,
  PlayerMilestoneClaimRow,
} from '@/lib/db/extended-analytics-repo';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function rate(count: number, denominator: number) {
  return denominator > 0 ? count / denominator : 0;
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

function buildMilestoneStats({
  focusPlayerId,
  groupRow,
  playerRows,
}: {
  focusPlayerId: string | null;
  groupRow: MilestoneEconomicsRow;
  playerRows: PlayerMilestoneClaimRow[];
}): MilestoneObjectiveStats {
  const personalRow = focusPlayerId
    ? playerRows.find(
        (row) =>
          row.playerId === focusPlayerId &&
          row.milestoneId === groupRow.milestoneId,
      )
    : null;
  const totalGames =
    groupRow.claimRate > 0 ? groupRow.claims / groupRow.claimRate : 0;

  return {
    global: {
      claimedWhenWonRate: rate(groupRow.claimerWins, totalGames),
      claimRate: groupRow.claimRate,
      claims: groupRow.claims,
      winRateWhenClaimed: groupRow.claimerWinRate,
      winsWhenClaimed: groupRow.claimerWins,
    },
    personal: personalRow
      ? {
          claims: personalRow.claims,
          winRateWhenClaimed: rate(personalRow.claimerWins, personalRow.claims),
          winsWhenClaimed: personalRow.claimerWins,
        }
      : null,
  };
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
  const groupRowsById = new Map(
    props.groupRows.map((row) => [row.milestoneId, row]),
  );
  const focusedPlayerRows = props.focusPlayerId
    ? props.playerRows.filter((row) => row.playerId === props.focusPlayerId)
    : [];

  return (
    <ChartFrame
      description="Who claims which milestones, how often, and how claiming them relates to winning."
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
          {props.focusPlayerId ? (
            <div className="grid gap-3 md:grid-cols-2">
              {focusedPlayerRows.slice(0, 6).map((row) => {
                const groupRow = groupRowsById.get(row.milestoneId);

                if (!groupRow) {
                  return null;
                }

                return (
                  <article className="tm-stat-card" key={row.milestoneId}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        <ObjectiveInfoButton
                          kind="milestone"
                          milestoneStats={buildMilestoneStats({
                            focusPlayerId: props.focusPlayerId,
                            groupRow,
                            playerRows: props.playerRows,
                          })}
                          name={row.milestoneName}
                        />
                      </h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPercent(rate(row.claimerWins, row.claims))} wins
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      Claimed {row.claims} time{row.claims === 1 ? '' : 's'}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {props.groupRows.slice(0, 6).map((row) => {
                const topClaimer = topClaimers.get(row.milestoneName);

                return (
                  <article className="tm-stat-card" key={row.milestoneId}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        <ObjectiveInfoButton
                          kind="milestone"
                          milestoneStats={buildMilestoneStats({
                            focusPlayerId: props.focusPlayerId,
                            groupRow: row,
                            playerRows: props.playerRows,
                          })}
                          name={row.milestoneName}
                        />
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
          )}
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
  // Use the union of funders and winners for both axes so the grid is always
  // square: a player who funded but never won (or vice versa) still appears on
  // both axes instead of dropping off one of them.
  const names = [
    ...new Set(
      rows.flatMap((row) => [row.funderPlayerName, row.winnerPlayerName]),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const funderNames = names;
  const winnerNames = names;
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

export type AwardLeaders = {
  topFunderCount: number;
  topFunderName: string;
  topWinnerCount: number;
  topWinnerName: string;
};

export function findAwardLeaders(
  rows: AwardFunderWinnerRow[],
): Map<string, AwardLeaders> {
  const funderTotals = new Map<string, Map<string, number>>();
  const winnerTotals = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const funders = funderTotals.get(row.awardId) ?? new Map<string, number>();
    const winners = winnerTotals.get(row.awardId) ?? new Map<string, number>();

    funders.set(
      row.funderPlayerName,
      (funders.get(row.funderPlayerName) ?? 0) + row.firstPlaceAwards,
    );
    winners.set(
      row.winnerPlayerName,
      (winners.get(row.winnerPlayerName) ?? 0) + row.firstPlaceAwards,
    );
    funderTotals.set(row.awardId, funders);
    winnerTotals.set(row.awardId, winners);
  }

  const leaders = new Map<string, AwardLeaders>();

  for (const [awardId, funders] of funderTotals) {
    const topFunder = findTopEntry(funders);
    const topWinner = findTopEntry(winnerTotals.get(awardId) ?? new Map());

    if (topFunder && topWinner) {
      leaders.set(awardId, {
        topFunderCount: topFunder.count,
        topFunderName: topFunder.name,
        topWinnerCount: topWinner.count,
        topWinnerName: topWinner.name,
      });
    }
  }

  return leaders;
}

function findTopEntry(totals: Map<string, number>) {
  let top: { count: number; name: string } | null = null;

  for (const [name, count] of totals) {
    if (
      !top ||
      count > top.count ||
      (count === top.count && name.localeCompare(top.name) < 0)
    ) {
      top = { count, name };
    }
  }

  return top;
}

type AwardFundingStatsSource = {
  awardId: string;
  awardName: string;
  funderFirstPlaceCount?: number;
  funderFirstPlaceRate?: number;
  funderGameWonCount?: number;
  funderGameWonRate?: number;
  funderSecondPlaceCount?: number;
  funderSecondPlaceRate?: number;
  fundedCount: number;
  funderWonCount?: number;
  funderWonRate?: number;
};

function buildAwardStats(
  personal: AwardFundingStatsSource | null | undefined,
  global: AwardFundingStatsSource | null | undefined,
): AwardObjectiveStats {
  const mapStats = (row: AwardFundingStatsSource | null | undefined) => {
    if (!row) {
      return null;
    }

    const firstPlaceCount = row.funderFirstPlaceCount ?? row.funderWonCount ?? 0;
    const secondPlaceCount = row.funderSecondPlaceCount ?? 0;
    const gameWonCount = row.funderGameWonCount ?? 0;

    return {
      firstPlace: {
        count: firstPlaceCount,
        denominator: row.fundedCount,
        rate:
          row.funderFirstPlaceRate ??
          row.funderWonRate ??
          rate(firstPlaceCount, row.fundedCount),
      },
      fundedCount: row.fundedCount,
      gameWins: {
        count: gameWonCount,
        denominator: row.fundedCount,
        rate: row.funderGameWonRate ?? rate(gameWonCount, row.fundedCount),
      },
      secondPlace: {
        count: secondPlaceCount,
        denominator: row.fundedCount,
        rate: row.funderSecondPlaceRate ?? rate(secondPlaceCount, row.fundedCount),
      },
    };
  };

  return {
    global: mapStats(global),
    personal: mapStats(personal),
  };
}

export function AwardEconomicsSection(props: {
  focusPlayerName: string | null;
  groupFocusPlayerId: string | null;
  groupMatrixRows: AwardFunderWinnerRow[];
  groupOutcomeRows: AwardOutcomeRow[];
  groupPlayerAwardRows?: PlayerAwardFundingOutcomeRow[];
  overallFocusPlayerId: string | null;
  overallMatrixRows: AwardFunderWinnerRow[];
  overallOutcomeRows: AwardOutcomeRow[];
  overallPlayerAwardRows?: PlayerAwardFundingOutcomeRow[];
}) {
  // Default to the active group's matrix so every member of a group sees the
  // same numbers. "All my groups" is an explicit opt-in to the caller's own
  // cross-group aggregate, which is inherently viewer-relative.
  const [scope, setScope] = useState<'all' | 'group'>('group');
  const isAllGroups = scope === 'all';
  const activeFocusPlayerId = isAllGroups
    ? props.overallFocusPlayerId
    : props.groupFocusPlayerId;
  const sourceMatrixRows = isAllGroups
    ? props.overallMatrixRows
    : props.groupMatrixRows;
  const outcomeRows = isAllGroups
    ? props.overallOutcomeRows
    : props.groupOutcomeRows;
  const sourcePlayerAwardRows = isAllGroups
    ? props.overallPlayerAwardRows ?? []
    : props.groupPlayerAwardRows ?? [];

  const matrixRows = activeFocusPlayerId
    ? sourceMatrixRows.filter((row) => row.funderPlayerId === activeFocusPlayerId)
    : sourceMatrixRows;
  const personalAwardRowsById = new Map(
    activeFocusPlayerId
      ? sourcePlayerAwardRows
          .filter((row) => row.funderPlayerId === activeFocusPlayerId)
          .map((row) => [row.awardId, row])
      : [],
  );
  const matrix = buildAwardMatrixModel(matrixRows);
  const awardLeaders = findAwardLeaders(sourceMatrixRows);

  return (
    <ChartFrame
      description="Who funds which awards and who ends up winning them — showing whether paying to fund an award tends to pay off."
      title={
        props.focusPlayerName
          ? `Award Economics for ${props.focusPlayerName} as Funder`
          : 'Award Economics'
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tm-data-label text-xs">Games</span>
          <div
            aria-label="Award economics scope"
            className="inline-flex overflow-hidden rounded-lg border border-white/10"
            role="group"
          >
            <button
              aria-pressed={!isAllGroups}
              className={`px-3 py-1 text-xs transition ${
                isAllGroups ? 'tm-muted-copy' : 'bg-white/10 text-stone-100'
              }`}
              onClick={() => setScope('group')}
              type="button"
            >
              This group
            </button>
            <button
              aria-pressed={isAllGroups}
              className={`px-3 py-1 text-xs transition ${
                isAllGroups ? 'bg-white/10 text-stone-100' : 'tm-muted-copy'
              }`}
              onClick={() => setScope('all')}
              type="button"
            >
              All my groups
            </button>
          </div>
        </div>
        {outcomeRows.length === 0 ? (
          <p className="tm-muted-copy text-sm">
            {isAllGroups
              ? 'Award funding outcomes will appear once finalized games across your groups record them.'
              : 'Award funding outcomes will appear once finalized games record them.'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {outcomeRows.map((row) => {
                const leaders = awardLeaders.get(row.awardId);

              return (
                <article className="tm-stat-card" key={row.awardId}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-stone-100">
                      <ObjectiveInfoButton
                        awardStats={buildAwardStats(
                          personalAwardRowsById.get(row.awardId),
                          row,
                        )}
                        kind="award"
                        name={row.awardName}
                      />
                    </h3>
                    <p className="tm-accent-copy text-sm">
                      {formatPercent(row.funderWonRate)} funder ROI
                    </p>
                  </div>
                  <p className="tm-muted-copy mt-2 text-sm">
                    Funded {row.fundedCount}× | funder took 1st{' '}
                    {row.funderWonCount}× | sniped {row.snipedCount}×
                  </p>
                  {leaders ? (
                    <p className="tm-muted-copy mt-1 text-sm">
                      Most funded by {leaders.topFunderName} (
                      {leaders.topFunderCount}×) | most won by{' '}
                      {leaders.topWinnerName} ({leaders.topWinnerCount}×)
                    </p>
                  ) : null}
                </article>
              );
            })}
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
      </div>
    </ChartFrame>
  );
}
