'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { CardWinStats } from '@/features/catalog/card-stats-actions';
import type { CardOutcomeRow } from '@/lib/db/extended-analytics-repo';

export const MOST_PLAYED_CARD_LIMIT = 8;

function roundPercent(value: number) {
  return Math.round(value * 100);
}

function truncateLabel(value: string, length = 16) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1)}…`;
}

// Each (game, player, card) is already a distinct result in
// analytics.player_card_outcomes, but we key on the trio anyway so the counts
// stay correct even if a future import path emits the same play twice.
function getScopedResultRows(
  rows: CardOutcomeRow[],
  focusPlayerId: string | null,
) {
  const byResult = new Map<string, CardOutcomeRow>();

  for (const row of rows) {
    if (focusPlayerId && row.playerId !== focusPlayerId) {
      continue;
    }

    const key = `${row.gameId}|${row.playerId}|${row.cardId}`;

    if (!byResult.has(key)) {
      byResult.set(key, row);
    }
  }

  return [...byResult.values()];
}

export type MostPlayedCardDatum = {
  cardId: string;
  cardName: string;
  fullImageUrl: string | null;
  plays: number;
  thumbnailUrl: string | null;
  winRate: number;
  wins: number;
};

export function buildMostPlayedCardData(
  rows: CardOutcomeRow[],
  focusPlayerId: string | null,
  limit = MOST_PLAYED_CARD_LIMIT,
): MostPlayedCardDatum[] {
  const totals = new Map<
    string,
    {
      cardName: string;
      fullImageUrl: string | null;
      plays: number;
      thumbnailUrl: string | null;
      wins: number;
    }
  >();

  for (const row of getScopedResultRows(rows, focusPlayerId)) {
    const entry = totals.get(row.cardId) ?? {
      cardName: row.cardName,
      fullImageUrl: row.fullImageUrl,
      plays: 0,
      thumbnailUrl: row.thumbnailUrl,
      wins: 0,
    };

    entry.plays += 1;
    entry.wins += row.isWinner ? 1 : 0;
    entry.fullImageUrl ??= row.fullImageUrl;
    entry.thumbnailUrl ??= row.thumbnailUrl;
    totals.set(row.cardId, entry);
  }

  return [...totals.entries()]
    .map(([cardId, entry]) => ({
      cardId,
      cardName: entry.cardName,
      fullImageUrl: entry.fullImageUrl,
      plays: entry.plays,
      thumbnailUrl: entry.thumbnailUrl,
      winRate: roundPercent(entry.wins / entry.plays),
      wins: entry.wins,
    }))
    .sort(
      (left, right) =>
        right.plays - left.plays ||
        right.winRate - left.winRate ||
        left.cardName.localeCompare(right.cardName),
    )
    .slice(0, limit);
}

export type MostPlayedCardSummary = {
  cards: number;
  plays: number;
  winRate: number;
  wins: number;
};

function indexMostPlayedCards(data: MostPlayedCardDatum[]) {
  return new Map(data.map((entry) => [entry.cardId, entry]));
}

function buildKnownCardStats(
  globalEntry: MostPlayedCardDatum | undefined,
  personalEntry: MostPlayedCardDatum | undefined,
): CardWinStats | undefined {
  if (!globalEntry && !personalEntry) {
    return undefined;
  }

  return {
    globalGames: globalEntry?.plays ?? 0,
    globalWins: globalEntry?.wins ?? 0,
    personalGames: personalEntry?.plays ?? 0,
    personalWins: personalEntry?.wins ?? 0,
  };
}

// The headline "win with your most-played cards" statistic: pool every result
// across the top cards and take the combined win rate, so a single low-sample
// card can't swing the number the way a per-card average would.
export function summarizeMostPlayedCards(
  data: MostPlayedCardDatum[],
): MostPlayedCardSummary | null {
  if (data.length === 0) {
    return null;
  }

  const plays = data.reduce((sum, entry) => sum + entry.plays, 0);
  const wins = data.reduce((sum, entry) => sum + entry.wins, 0);

  if (plays === 0) {
    return null;
  }

  return {
    cards: data.length,
    plays,
    winRate: roundPercent(wins / plays),
    wins,
  };
}

function CardOutcomePanel(props: {
  data: MostPlayedCardDatum[];
  emptyCopy: string;
  headline: string;
  knownStatsByCardId?: Map<string, CardWinStats>;
  summary: MostPlayedCardSummary | null;
}) {
  const chartData = props.data.map((entry) => ({
    ...entry,
    label: truncateLabel(entry.cardName),
  }));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">{props.headline}</h3>
      {props.summary ? (
        <p className="tm-body-copy text-sm">
          <span className="text-lg font-semibold text-stone-100">
            {props.summary.winRate}%
          </span>{' '}
          <GlossaryRichText>
            {`win rate across ${props.summary.wins}/${props.summary.plays} results with the ${props.summary.cards} most-played cards.`}
          </GlossaryRichText>
        </p>
      ) : (
        <p className="tm-muted-copy text-sm">
          <GlossaryRichText>{props.emptyCopy}</GlossaryRichText>
        </p>
      )}
      {props.data.length > 0 ? (
        <>
          <ResponsiveContainer height={240} width="100%">
            <BarChart
              data={chartData}
              margin={{ bottom: 48, left: 0, right: 12, top: 8 }}
            >
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis
                angle={-30}
                dataKey="label"
                height={72}
                interval={0}
                textAnchor="end"
                tick={chartAxisTick}
              />
              <YAxis
                domain={[0, 100]}
                tick={chartAxisTick}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar
                dataKey="winRate"
                fill={chartSeriesColors.greenery}
                name="Win rate"
                radius={[10, 10, 0, 0]}
                unit="%"
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="tm-data-label">
                  <th className="py-1 pr-3">Card</th>
                  <th className="py-1 pr-3">Plays</th>
                  <th className="py-1 pr-3">Win rate</th>
                  <th className="py-1 pr-3">Wins</th>
                </tr>
              </thead>
              <tbody>
                {props.data.map((entry) => (
                  <tr className="border-t border-white/5" key={entry.cardId}>
                    <td className="py-1 pr-3 font-semibold text-stone-100">
                      <CardStatsButton
                        card={{
                          cardName: entry.cardName,
                          fullImageUrl: entry.fullImageUrl,
                          id: entry.cardId,
                          thumbnailUrl: entry.thumbnailUrl,
                        }}
                        className="font-semibold text-stone-100 underline decoration-dotted underline-offset-2 transition hover:text-[rgb(221,161,93)]"
                        knownStats={props.knownStatsByCardId?.get(entry.cardId)}
                      >
                        {entry.cardName}
                      </CardStatsButton>
                    </td>
                    <td className="py-1 pr-3">{entry.plays}</td>
                    <td className="py-1 pr-3">{entry.winRate}%</td>
                    <td className="py-1 pr-3">
                      {entry.wins}/{entry.plays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function CardOutcomesSection(props: {
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  rows: CardOutcomeRow[];
}) {
  const globalData = useMemo(
    () => buildMostPlayedCardData(props.rows, null),
    [props.rows],
  );
  const personalData = useMemo(
    () =>
      props.focusPlayerId
        ? buildMostPlayedCardData(props.rows, props.focusPlayerId)
        : [],
    [props.rows, props.focusPlayerId],
  );
  const globalSummary = summarizeMostPlayedCards(globalData);
  const personalSummary = summarizeMostPlayedCards(personalData);
  const knownStatsByCardId = useMemo(() => {
    if (!props.focusPlayerId) {
      return undefined;
    }

    const globalByCardId = indexMostPlayedCards(globalData);
    const personalByCardId = indexMostPlayedCards(personalData);
    const cardIds = new Set([
      ...globalByCardId.keys(),
      ...personalByCardId.keys(),
    ]);

    return new Map(
      [...cardIds].flatMap((cardId) => {
        const stats = buildKnownCardStats(
          globalByCardId.get(cardId),
          personalByCardId.get(cardId),
        );

        return stats ? [[cardId, stats] as const] : [];
      }),
    );
  }, [globalData, personalData, props.focusPlayerId]);

  return (
    <ChartFrame
      description="Win rate and average score for the cards played most often, drawn from imported game logs. Select a card to open its image with your win rate and the global win rate."
      title="Most-Played Card Outcomes"
    >
      {props.rows.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          <GlossaryRichText>
            Card outcomes will appear once imported game logs record the cards players played in finalized games.
          </GlossaryRichText>
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <CardOutcomePanel
            data={globalData}
            emptyCopy="Group-wide card plays will appear once finalized game logs are imported."
            headline="Group — most-played cards"
            knownStatsByCardId={knownStatsByCardId}
            summary={globalSummary}
          />
          <CardOutcomePanel
            data={personalData}
            emptyCopy={
              props.focusPlayerName
                ? `${props.focusPlayerName} has no logged card plays in finalized games yet.`
                : 'Choose a player in Player Focus above to see their most-played cards and win rate.'
            }
            headline={
              props.focusPlayerName
                ? `${props.focusPlayerName} — most-played cards`
                : 'Personal — most-played cards'
            }
            knownStatsByCardId={knownStatsByCardId}
            summary={personalSummary}
          />
        </div>
      )}
    </ChartFrame>
  );
}
