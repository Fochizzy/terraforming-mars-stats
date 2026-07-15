import type { ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  Gauge,
  Layers3,
  Minus,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { TagLabel } from '@/components/ui/tag-icon';
import type {
  CrossGroupFocusPerson,
  GroupAnalytics,
  PlayerInteractionRow,
  PlayerScoreSourceAverages,
} from '@/lib/db/analytics-repo';
import type {
  ExtendedGroupAnalytics,
  TagOutcomeRow,
} from '@/lib/db/extended-analytics-repo';

type PlayerComparisonSummaryProps = {
  analytics: GroupAnalytics;
  currentUserCanonicalId?: string;
  extended: ExtendedGroupAnalytics;
  focusPeople: CrossGroupFocusPerson[];
  selectedCanonicalIds: string[];
};

type TagProfileRow = {
  averagePerGame: number;
  gamesWithTag: number;
  tagCode: string;
  winRate: number;
};

type DisplayPlayer = {
  averageScore: number | null;
  canonicalId: string;
  displayName: string;
  gamesPlayed: number;
  isCurrentUser: boolean;
  winRate: number | null;
};

type ParsedPairing = {
  corporation: string;
  preludes: string[];
};

type ComparisonInsight = {
  body: ReactNode;
  icon: ReactNode;
  title: string;
};

const scoreSourceKeys = [
  ['averageTrPoints', 'Terraform Rating'],
  ['averageCardPoints', 'Card points'],
  ['averageOtherCardPoints', 'Other card points'],
  ['averageGreeneryPoints', 'Greenery'],
  ['averageCitiesPoints', 'Cities'],
  ['averageMilestonePoints', 'Milestones'],
  ['averageAwardPoints', 'Awards'],
  ['averageJovianPoints', 'Jovian'],
  ['averageMicrobePoints', 'Microbes'],
  ['averageAnimalPoints', 'Animals'],
] as const satisfies ReadonlyArray<
  readonly [keyof PlayerScoreSourceAverages, string]
>;

function formatAverage(value: number, digits = 2) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSigned(value: number, digits = 2) {
  const formatted = formatAverage(Math.abs(value), digits);
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatted}`;
}

function formatGameCount(value: number) {
  return `${value} ${value === 1 ? 'game' : 'games'}`;
}

function humanize(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function parsePairingLabel(label: string): ParsedPairing {
  const pipeParts = label
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (pipeParts.length >= 2) {
    return {
      corporation: pipeParts[0],
      preludes: pipeParts
        .slice(1)
        .join(' + ')
        .split(/\s*\+\s*/)
        .map((part) => part.trim())
        .filter(Boolean),
    };
  }

  const slashParts = label
    .split(/\s+\/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (slashParts.length >= 2) {
    return {
      corporation: slashParts[0],
      preludes: slashParts.slice(1),
    };
  }

  const plusIndex = label.indexOf(' + ');
  if (plusIndex >= 0) {
    return {
      corporation: label.slice(0, plusIndex).trim(),
      preludes: label
        .slice(plusIndex + 3)
        .split(/\s*\+\s*/)
        .map((part) => part.trim())
        .filter(Boolean),
    };
  }

  return { corporation: label, preludes: [] };
}

function buildTagProfile(
  rows: TagOutcomeRow[],
  playerId: string,
  gamesPlayed: number,
): TagProfileRow[] {
  const rowsByTag = new Map<string, TagOutcomeRow[]>();

  for (const row of rows) {
    if (row.playerId !== playerId || row.tagCount <= 0) continue;
    rowsByTag.set(row.tagCode, [...(rowsByTag.get(row.tagCode) ?? []), row]);
  }

  return [...rowsByTag.entries()]
    .map(([tagCode, tagRows]) => {
      const gameIds = new Set(tagRows.map((row) => row.gameId));
      const winningGameIds = new Set(
        tagRows.filter((row) => row.isWinner).map((row) => row.gameId),
      );
      const totalTags = tagRows.reduce((sum, row) => sum + row.tagCount, 0);
      const denominator = Math.max(
        gamesPlayed,
        new Set(rows.filter((row) => row.playerId === playerId).map((row) => row.gameId))
          .size,
        1,
      );

      return {
        averagePerGame: totalTags / denominator,
        gamesWithTag: gameIds.size,
        tagCode,
        winRate: gameIds.size > 0 ? winningGameIds.size / gameIds.size : 0,
      };
    })
    .sort(
      (left, right) =>
        right.averagePerGame - left.averagePerGame ||
        right.gamesWithTag - left.gamesWithTag ||
        left.tagCode.localeCompare(right.tagCode),
    )
    .slice(0, 5);
}

function getPlayerPairings(rows: PlayerInteractionRow[], playerId: string) {
  return rows
    .filter(
      (row) =>
        row.playerId === playerId &&
        row.interactionType === 'corporation_prelude_pair',
    )
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        right.winRate - left.winRate ||
        right.averageScore - left.averageScore ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 3);
}

function SectionHeading({
  description,
  id,
  title,
}: {
  description?: string;
  id: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="h-8 w-1 shrink-0 rounded-full bg-amber-300/70"
        />
        <h2
          className="font-serif text-xl font-semibold tracking-[0.03em] text-stone-50 sm:text-2xl"
          id={id}
        >
          {title}
        </h2>
      </div>
      {description ? (
        <p className="max-w-2xl text-sm leading-6 text-stone-400">
          {description}
        </p>
      ) : null}
    </header>
  );
}

function PlayerHeader({ player }: { player: DisplayPlayer }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/[0.08] font-serif text-sm font-semibold text-amber-100">
          {initials(player.displayName)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-stone-50">
              {player.displayName}
            </h3>
            {player.isCurrentUser ? (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                You
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            Finalized comparison profile
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap items-center justify-end gap-1.5 text-xs tabular-nums">
        <div className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1">
          <dt className="sr-only">Games</dt>
          <dd className="text-stone-300">{formatGameCount(player.gamesPlayed)}</dd>
        </div>
        <div className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1">
          <dt className="sr-only">Win rate</dt>
          <dd className="text-stone-300">
            {player.winRate === null ? '—' : `${formatPercent(player.winRate)} win rate`}
          </dd>
        </div>
        <div className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1">
          <dt className="sr-only">Average points</dt>
          <dd className="text-stone-300">
            {player.averageScore === null
              ? '—'
              : `${formatAverage(player.averageScore, 1)} avg. points`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ComparisonDelta({
  currentValue,
  otherValue,
}: {
  currentValue: number;
  otherValue: number | null;
}) {
  if (otherValue === null || Math.abs(currentValue - otherValue) < 0.005) {
    return (
      <span
        aria-label="Tied comparison"
        className="inline-flex items-center text-stone-500"
      >
        <Minus aria-hidden="true" className="h-3 w-3" />
      </span>
    );
  }

  if (currentValue < otherValue) return null;

  return (
    <span
      aria-label={`${formatSigned(currentValue - otherValue)} lead`}
      className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-1.5 py-0.5 text-[0.62rem] font-semibold text-emerald-200"
    >
      <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
      {formatSigned(currentValue - otherValue)}
    </span>
  );
}

function TagProfileCard({
  allProfiles,
  player,
  profile,
}: {
  allProfiles: Map<string, TagProfileRow[]>;
  player: DisplayPlayer;
  profile: TagProfileRow[];
}) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-5">
      <PlayerHeader player={player} />
      {profile.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-stone-400">
          Tag evidence will appear after imported finalized games include card-tag
          summaries.
        </p>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-[minmax(0,1fr)_6.75rem_5.75rem] gap-2 border-b border-white/[0.06] px-2 pb-2 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
            <span>Tag</span>
            <span className="text-right">Avg. / game</span>
            <span className="text-right">Win rate</span>
          </div>
          <div className="divide-y divide-white/[0.055]">
            {profile.map((row) => {
              const otherValues = [...allProfiles.entries()]
                .filter(([playerId]) => playerId !== player.canonicalId)
                .map(([, rows]) =>
                  rows.find((candidate) => candidate.tagCode === row.tagCode),
                )
                .filter((candidate): candidate is TagProfileRow => Boolean(candidate))
                .map((candidate) => candidate.averagePerGame);
              const bestOther =
                otherValues.length > 0 ? Math.max(...otherValues) : null;

              return (
                <div
                  className="grid min-h-11 grid-cols-[minmax(0,1fr)_6.75rem_5.75rem] items-center gap-2 px-2 py-2.5 text-sm"
                  key={row.tagCode}
                >
                  <TagLabel
                    className="min-w-0 capitalize text-stone-200 [&>img]:h-5 [&>img]:w-5 [&>img]:shrink-0"
                    code={row.tagCode}
                    size={20}
                  />
                  <span className="flex items-center justify-end gap-1.5 text-right font-semibold tabular-nums text-stone-100">
                    {formatAverage(row.averagePerGame)}
                    <ComparisonDelta
                      currentValue={row.averagePerGame}
                      otherValue={bestOther}
                    />
                  </span>
                  <span className="text-right tabular-nums text-stone-300">
                    {formatPercent(row.winRate)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function PairingCard({
  pairings,
  player,
}: {
  pairings: PlayerInteractionRow[];
  player: DisplayPlayer;
}) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-5">
      <PlayerHeader player={player} />
      {pairings.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-stone-400">
          Corporation and Prelude preferences will appear after finalized games
          include both selections.
        </p>
      ) : (
        <div className="mt-4 grid flex-1 auto-rows-fr gap-3">
          {pairings.map((row) => {
            const pairing = parsePairingLabel(row.label);
            return (
              <div
                className="flex h-full flex-col justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition hover:border-amber-300/15 hover:bg-amber-300/[0.025]"
                key={`${player.canonicalId}-${row.label}`}
              >
                <div>
                  <p className="font-semibold leading-5 text-stone-100">
                    {pairing.corporation}
                  </p>
                  <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-5 text-stone-400">
                    <Sparkles
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/70"
                    />
                    <span>
                      {pairing.preludes.length > 0
                        ? pairing.preludes.join(' + ')
                        : 'Prelude not recorded'}
                    </span>
                  </p>
                </div>
                <dl className="mt-3 flex flex-wrap gap-1.5 text-[0.68rem] tabular-nums">
                  <div className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">
                    <dt className="sr-only">Games</dt>
                    <dd className="text-stone-300">{formatGameCount(row.gamesPlayed)}</dd>
                  </div>
                  <div className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">
                    <dt className="sr-only">Win rate</dt>
                    <dd className="text-stone-300">{formatPercent(row.winRate)} win rate</dd>
                  </div>
                  <div className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1">
                    <dt className="sr-only">Average points</dt>
                    <dd className="text-stone-300">
                      {formatAverage(row.averageScore, 1)} avg. points
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function buildComparisonInsights(
  analytics: GroupAnalytics,
  players: DisplayPlayer[],
  tagProfiles: Map<string, TagProfileRow[]>,
): ComparisonInsight[] {
  const [left, right] = players;
  if (!left || !right) return [];

  const headToHead = analytics.headToHeadRows.find(
    (row) =>
      (row.leftPlayerId === left.canonicalId &&
        row.rightPlayerId === right.canonicalId) ||
      (row.leftPlayerId === right.canonicalId &&
        row.rightPlayerId === left.canonicalId),
  );
  const leftScoreEdge = headToHead
    ? headToHead.leftPlayerId === left.canonicalId
      ? headToHead.averageScoreDifferential
      : headToHead.averageScoreDifferential * -1
    : null;

  const topStyle = (playerId: string) =>
    analytics.playerStylePerformanceRows
      .filter((row) => row.playerId === playerId)
      .sort(
        (a, b) =>
          b.gamesPlayed - a.gamesPlayed ||
          b.winRate - a.winRate ||
          b.averageScore - a.averageScore,
      )[0] ?? null;
  const leftStyle = topStyle(left.canonicalId);
  const rightStyle = topStyle(right.canonicalId);

  const scoreRows = new Map(
    analytics.playerScoreAverages.map((row) => [row.playerId, row]),
  );
  const leftScores = scoreRows.get(left.canonicalId);
  const rightScores = scoreRows.get(right.canonicalId);
  const largestScoreGap =
    leftScores && rightScores
      ? scoreSourceKeys
          .map(([key, label]) => ({
            gap: leftScores[key] - rightScores[key],
            label,
          }))
          .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0] ?? null
      : null;

  const leftTopTag = tagProfiles.get(left.canonicalId)?.[0] ?? null;
  const rightTopTag = tagProfiles.get(right.canonicalId)?.[0] ?? null;
  const leftPairing = getPlayerPairings(
    analytics.playerInteractionRows,
    left.canonicalId,
  )[0];
  const rightPairing = getPlayerPairings(
    analytics.playerInteractionRows,
    right.canonicalId,
  )[0];

  return [
    {
      body: headToHead ? (
        <>
          Review the <strong className="text-stone-100">{headToHead.gamesPlayed}</strong>{' '}
          direct {headToHead.gamesPlayed === 1 ? 'matchup' : 'matchups'} where{' '}
          <strong className="text-stone-100">{left.displayName}</strong> has a{' '}
          <strong
            className={
              (leftScoreEdge ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'
            }
          >
            {formatSigned(leftScoreEdge ?? 0)}-point
          </strong>{' '}
          average score edge.
        </>
      ) : (
        <>Direct matchup evidence is not available for this player pair yet.</>
      ),
      icon: <Activity aria-hidden="true" className="h-4 w-4" />,
      title: 'Pressure games',
    },
    {
      body:
        leftStyle && rightStyle ? (
          leftStyle.styleCode === rightStyle.styleCode ? (
            <>
              Both profiles lean{' '}
              <strong className="text-stone-100">
                {humanize(leftStyle.styleCode)}
              </strong>
              , so compare opening tempo and endgame conversion.
            </>
          ) : (
            <>
              Contrast <strong className="text-stone-100">{left.displayName}</strong>{' '}
              on {humanize(leftStyle.styleCode)} with{' '}
              <strong className="text-stone-100">{right.displayName}</strong> on{' '}
              {humanize(rightStyle.styleCode)}.
            </>
          )
        ) : (
          <>Style comparison will sharpen as more inferred-style games are recorded.</>
        ),
      icon: <Layers3 aria-hidden="true" className="h-4 w-4" />,
      title: 'Style mirror',
    },
    {
      body: largestScoreGap ? (
        <>
          <strong className="text-stone-100">{largestScoreGap.label}</strong> is the
          largest current point-source gap at{' '}
          <strong className="text-amber-100">
            {formatSigned(largestScoreGap.gap)} points
          </strong>{' '}
          from {left.displayName}&apos;s perspective.
        </>
      ) : (
        <>Point-source differences will appear after score breakdowns are available.</>
      ),
      icon: <Gauge aria-hidden="true" className="h-4 w-4" />,
      title: 'Point-source gap',
    },
    {
      body:
        leftTopTag && rightTopTag ? (
          leftTopTag.tagCode === rightTopTag.tagCode ? (
            <>
              Both profiles are led by{' '}
              <strong className="capitalize text-stone-100">
                {leftTopTag.tagCode}
              </strong>{' '}
              tags; compare which engine cards appear most reliably.
            </>
          ) : (
            <>
              Compare <strong className="capitalize text-stone-100">{leftTopTag.tagCode}</strong>{' '}
              for {left.displayName} against{' '}
              <strong className="capitalize text-stone-100">{rightTopTag.tagCode}</strong>{' '}
              for {right.displayName}.
            </>
          )
        ) : (
          <>Tag identity will appear after card-tag summaries are imported.</>
        ),
      icon: <Trophy aria-hidden="true" className="h-4 w-4" />,
      title: 'Tag identity',
    },
    {
      body:
        leftPairing && rightPairing ? (
          <>
            Compare{' '}
            <strong className="text-stone-100">
              {parsePairingLabel(leftPairing.label).corporation}
            </strong>{' '}
            for {left.displayName} against{' '}
            <strong className="text-stone-100">
              {parsePairingLabel(rightPairing.label).corporation}
            </strong>{' '}
            for {right.displayName} when choosing corporations and Preludes.
          </>
        ) : (
          <>Selection-comfort signals need corporation and Prelude evidence.</>
        ),
      icon: <Sparkles aria-hidden="true" className="h-4 w-4" />,
      title: 'Selection comfort',
    },
  ];
}

export function PlayerComparisonSummary({
  analytics,
  currentUserCanonicalId,
  extended,
  focusPeople,
  selectedCanonicalIds,
}: PlayerComparisonSummaryProps) {
  const peopleById = new Map(
    focusPeople.map((person) => [person.canonicalId, person]),
  );
  const leaderboardById = new Map(
    analytics.leaderboardRows.map((row) => [row.playerId, row]),
  );
  const players = selectedCanonicalIds
    .map<DisplayPlayer>((canonicalId) => {
      const person = peopleById.get(canonicalId);
      const performance = leaderboardById.get(canonicalId);
      return {
        averageScore: performance?.averageScore ?? null,
        canonicalId,
        displayName:
          person?.displayName ?? performance?.playerName ?? 'Unknown player',
        gamesPlayed: performance?.gamesPlayed ?? 0,
        isCurrentUser: canonicalId === currentUserCanonicalId,
        winRate: performance?.winRate ?? null,
      };
    })
    .filter(
      (player, index, rows) =>
        rows.findIndex((candidate) => candidate.canonicalId === player.canonicalId) ===
        index,
    );

  if (players.length < 2) return null;

  const tagProfiles = new Map(
    players.map((player) => [
      player.canonicalId,
      buildTagProfile(
        extended.tagOutcomeRows,
        player.canonicalId,
        player.gamesPlayed,
      ),
    ]),
  );
  const insights = buildComparisonInsights(analytics, players, tagProfiles);

  return (
    <div className="flex flex-col gap-5" data-player-comparison-summary>
      <section
        aria-labelledby="comparison-tag-profiles"
        className="rounded-2xl border border-white/[0.08] bg-stone-950/35 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-6"
      >
        <SectionHeading
          description="Aligned averages and win rates make each player’s tag engine easier to compare. Leading values carry a restrained difference marker."
          id="comparison-tag-profiles"
          title="Tag profiles"
        />
        <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
          {players.map((player) => (
            <TagProfileCard
              allProfiles={tagProfiles}
              key={player.canonicalId}
              player={player}
              profile={tagProfiles.get(player.canonicalId) ?? []}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="comparison-preferred-selections"
        className="rounded-2xl border border-white/[0.08] bg-stone-950/35 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-6"
      >
        <SectionHeading
          description="Most-played combinations are separated into corporation, Prelude package, and consistent supporting metrics."
          id="comparison-preferred-selections"
          title="Preferred corporations and Preludes"
        />
        <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
          {players.map((player) => (
            <PairingCard
              key={player.canonicalId}
              pairings={getPlayerPairings(
                analytics.playerInteractionRows,
                player.canonicalId,
              )}
              player={player}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="comparison-additional-points"
        className="rounded-2xl border border-white/[0.08] bg-stone-950/35 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-6"
      >
        <SectionHeading
          description="Five concise prompts surface the strongest areas to inspect next without turning the comparison into another dense table."
          id="comparison-additional-points"
          title="Additional compare points"
        />
        <div className="mt-5 grid gap-2.5">
          {insights.map((insight) => (
            <article
              className="grid gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3.5 sm:grid-cols-[2rem_minmax(0,1fr)] sm:items-start sm:p-4"
              key={insight.title}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-300/[0.07] text-amber-100">
                {insight.icon}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-stone-100">{insight.title}</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-stone-400">
                  {insight.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
