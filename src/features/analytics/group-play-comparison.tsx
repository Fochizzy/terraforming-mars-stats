'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChartFrame } from '@/components/charts/chart-frame';
import type {
  LeaderboardRow,
  ProfileAnalytics,
  ScoreSourceAverages,
} from '@/lib/db/analytics-repo';
import {
  buildGroupStatEntries,
  deltaDirection,
  formatAverage,
  formatSignedAverage,
  sampleStrength,
} from './performance-delta';

export type GroupPlayComparisonGroup = {
  groupId: string;
  groupName: string;
};

type GroupPlayComparisonProps = {
  groups: GroupPlayComparisonGroup[];
  overallPerformance: LeaderboardRow | null;
  playerName: string | null;
  selectedGroupId: string;
  selectedGroupPerformance: LeaderboardRow | null;
  overallProfile?: ProfileAnalytics | null;
  selectedGroupProfile?: ProfileAnalytics | null;
  unavailable?: boolean;
};

const scoreSources: Array<{ key: keyof ScoreSourceAverages; label: string }> = [
  { key: 'averageTrPoints', label: 'Terraform Rating' },
  { key: 'averageCardPoints', label: 'Cards' },
  { key: 'averageCitiesPoints', label: 'Cities' },
  { key: 'averageGreeneryPoints', label: 'Greenery' },
  { key: 'averageMilestonePoints', label: 'Milestones' },
  { key: 'averageAwardPoints', label: 'Awards' },
];

function number(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function buildGroupComparisonNarratives(
  group: LeaderboardRow,
  overall: LeaderboardRow | null,
) {
  if (!overall) return [];
  const winDelta = Math.round((group.winRate - overall.winRate) * 100);
  const scoreDelta = group.averageScore - overall.averageScore;
  const placementDelta = group.averagePlacement - overall.averagePlacement;

  const winDir = winDelta >= 0 ? 'higher' : 'lower';
  const scoreDir = scoreDelta >= 0 ? 'higher' : 'lower';
  const placementDir = placementDelta <= 0 ? 'better' : 'worse';

  return [
    `Win rate is ${Math.abs(winDelta)} pp ${winDir} (${Math.round(group.winRate * 100)}% vs ${Math.round(overall.winRate * 100)}% overall), and average score is ${number(Math.abs(scoreDelta))} pts ${scoreDir}.`,
    `Average finish is ${formatAverage(Math.abs(placementDelta))} places ${placementDir} here. Combined with the score shift, the group likely creates a distinct scoring environment.`,
    `Based on ${group.gamesPlayed} finalized ${group.gamesPlayed === 1 ? 'game' : 'games'} in this group vs. ${overall.gamesPlayed} overall — small samples may shift substantially as more games are logged.`,
  ];
}

const DIRECTION_CLASSES: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  neutral: 'text-stone-400',
};

const DIRECTION_ARROW: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: '↑',
  negative: '↓',
  neutral: '',
};

function DeltaCell({
  delta,
  numericDelta,
  lowerIsBetter,
}: {
  delta: string | null;
  numericDelta: number | null;
  lowerIsBetter?: boolean;
}) {
  if (delta === null || numericDelta === null) {
    return <td className="p-2 text-right tabular-nums text-stone-500">—</td>;
  }
  const dir = deltaDirection(numericDelta, lowerIsBetter);
  const cls = DIRECTION_CLASSES[dir];
  const arrow = DIRECTION_ARROW[dir];
  return (
    <td className={`p-2 text-right tabular-nums font-semibold ${cls}`}>
      {arrow ? <span aria-hidden="true">{arrow} </span> : null}
      {delta}
    </td>
  );
}

function WeightedScoreTooltip() {
  return (
    <span className="relative inline-block">
      <span
        aria-label="Weighted Score is a composite performance metric combining win rate, placement, and score differential. Higher is better."
        className="ml-1 inline-flex cursor-help items-center justify-center rounded-full border border-stone-600 text-[0.6rem] leading-none text-stone-400 hover:border-stone-400 hover:text-stone-200"
        role="img"
        style={{ width: '1rem', height: '1rem', verticalAlign: 'middle' }}
        title="Composite metric combining win rate, placement, and score differential. Higher is better."
      >
        i
      </span>
    </span>
  );
}

function SampleBadge({ gamesPlayed }: { gamesPlayed: number }) {
  const strength = sampleStrength(gamesPlayed);
  const badge =
    gamesPlayed >= 10
      ? 'bg-green-900/40 border-green-700/50 text-green-300'
      : gamesPlayed >= 5
        ? 'bg-yellow-900/30 border-yellow-700/40 text-yellow-300'
        : 'bg-stone-800/60 border-stone-600/50 text-stone-400';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium tracking-wide ${badge}`}
      title="Small samples may shift substantially as more games are logged."
    >
      {strength}
    </span>
  );
}

function MetadataBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-stone-700/60 bg-stone-800/50 px-2.5 py-0.5 text-xs text-stone-300 tabular-nums">
      {children}
    </span>
  );
}

function ComparisonBody({
  overallPerformance,
  overallProfile,
  playerName,
  selectedGroupProfile,
  selectedGroupPerformance,
  unavailable,
}: Omit<GroupPlayComparisonProps, 'groups' | 'selectedGroupId'>) {
  if (unavailable) {
    return (
      <p className="text-sm text-stone-400">
        We couldn&apos;t load your finalized-game comparison right now. Your
        logged games are still intact.
      </p>
    );
  }

  if (!playerName) {
    return (
      <div>
        <p className="text-sm text-stone-300">
          Link a saved player profile to your signed-in account to compare your
          play in this group against your overall record.
        </p>
        <Link
          className="tm-button-primary mt-4 inline-flex w-fit"
          href="/group/players"
        >
          Link Saved Player
        </Link>
      </div>
    );
  }

  if (!selectedGroupPerformance) {
    return (
      <p className="text-sm text-stone-400">
        {playerName} has no finalized games in this group yet. Deltas appear
        once a finalized game is logged here.
      </p>
    );
  }

  const entries = buildGroupStatEntries({
    overallPerformance,
    performance: selectedGroupPerformance,
  });
  const narratives = buildGroupComparisonNarratives(
    selectedGroupPerformance,
    overallPerformance,
  );
  const groupStyle = selectedGroupProfile?.styleBreakdownRows?.[0] ?? null;
  const overallStyle = overallProfile?.styleBreakdownRows?.[0] ?? null;
  const groupLength = selectedGroupProfile?.gameLengthProfile?.bestBucket ?? null;
  const overallLength = overallProfile?.gameLengthProfile?.bestBucket ?? null;

  return (
    <div className="grid gap-5">
      {/* Metadata badges */}
      <div className="flex flex-wrap items-center gap-2" data-testid="metadata-badges">
        <MetadataBadge>
          {selectedGroupPerformance.gamesPlayed} group{' '}
          {selectedGroupPerformance.gamesPlayed === 1 ? 'game' : 'games'}
        </MetadataBadge>
        {overallPerformance ? (
          <MetadataBadge>{overallPerformance.gamesPlayed} total games</MetadataBadge>
        ) : null}
      </div>

      {/* Main insight panel — orange accent border */}
      <div className="rounded-2xl border-l-4 border-[var(--tm-copper-500)] bg-stone-900/60 px-4 py-3">
        <p className="tm-data-label mb-2">Group Insight</p>
        <div className="grid gap-2" style={{ lineHeight: '1.65' }}>
          {narratives[0] ? (
            <p className="text-sm font-semibold text-stone-100">{narratives[0]}</p>
          ) : null}
          {narratives[1] ? (
            <p className="text-sm text-stone-300">{narratives[1]}</p>
          ) : null}
          {narratives[2] ? (
            <p className="text-xs text-stone-500">{narratives[2]}</p>
          ) : null}
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border border-stone-700/50">
        <table className="w-full min-w-[560px] text-sm" style={{ lineHeight: '1.5' }}>
          <thead>
            <tr className="border-b border-stone-700/50 bg-black/20">
              <th className="p-2 text-left">
                <span className="tm-data-label">Metric</span>
              </th>
              <th className="p-2 text-right">
                <span className="tm-data-label">Group</span>
              </th>
              <th className="p-2 text-right">
                <span className="tm-data-label">Overall</span>
              </th>
              <th className="p-2 text-right">
                <span className="tm-data-label">Difference</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const overallValue = (() => {
                if (!overallPerformance) return '—';
                switch (entry.label) {
                  case 'Weighted Score': return formatAverage(overallPerformance.weightedScore);
                  case 'Win Rate': return `${Math.round(overallPerformance.winRate * 100)}%`;
                  case 'Average Placement': return formatAverage(overallPerformance.averagePlacement);
                  case 'Average Score': return formatAverage(overallPerformance.averageScore);
                  default: return '—';
                }
              })();
              return (
                <tr className="border-t border-stone-700/30" key={entry.label}>
                  <th className="p-2 text-left font-medium text-stone-100">
                    {entry.label}
                    {entry.label === 'Weighted Score' ? <WeightedScoreTooltip /> : null}
                  </th>
                  <td className="p-2 text-right tabular-nums text-stone-200">
                    {entry.value}
                  </td>
                  <td className="p-2 text-right tabular-nums text-stone-400">
                    {overallValue}
                  </td>
                  <DeltaCell
                    delta={entry.delta}
                    lowerIsBetter={entry.lowerIsBetter}
                    numericDelta={entry.numericDelta}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Scoring difference cards */}
      {selectedGroupProfile?.scoreAverages && overallProfile?.scoreAverages ? (
        <div>
          <h3 className="tm-data-label mb-3">Scoring Differences</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="scoring-cards">
            {scoreSources.map((source) => {
              const groupValue = selectedGroupProfile.scoreAverages![source.key];
              const overallValue = overallProfile.scoreAverages![source.key];
              const raw = groupValue - overallValue;
              const dir = deltaDirection(raw);
              const deltaCls = DIRECTION_CLASSES[dir];
              const arrow = DIRECTION_ARROW[dir];
              return (
                <div
                  className="rounded-xl border border-stone-700/40 bg-stone-900/50 p-3"
                  key={source.key}
                >
                  <p className="tm-data-label">{source.label}</p>
                  <p
                    className={`mt-1 text-xl font-semibold tabular-nums ${deltaCls}`}
                  >
                    {arrow ? <span aria-hidden="true">{arrow} </span> : null}
                    {formatSignedAverage(raw)}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 tabular-nums">
                    {number(groupValue)} group vs. {number(overallValue)} overall
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Merged Game Context section */}
      <div className="rounded-xl border border-stone-700/40 bg-stone-900/40 p-4" data-testid="game-context">
        <h3 className="tm-data-label mb-3">Game Context</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Style subsection */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400">
              Style
            </p>
            {groupStyle ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-stone-600/50 bg-stone-800/60 px-2.5 py-0.5 text-xs text-stone-200">
                  {groupStyle.styleName}
                </span>
                <span className="rounded-full border border-stone-600/50 bg-stone-800/60 px-2.5 py-0.5 text-xs text-stone-400">
                  {Math.round(groupStyle.winRate * 100)}% win · {groupStyle.gamesPlayed}{' '}
                  {groupStyle.gamesPlayed === 1 ? 'game' : 'games'}
                </span>
                {overallStyle ? (
                  <span className="rounded-full border border-stone-700/40 bg-stone-800/30 px-2.5 py-0.5 text-xs text-stone-500">
                    overall: {overallStyle.styleName}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                More inferred style data needed.
              </p>
            )}
          </div>

          {/* Pace subsection */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400">
              Pace
            </p>
            {groupLength ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-stone-600/50 bg-stone-800/60 px-2.5 py-0.5 text-xs text-stone-200">
                  {groupLength.label}
                </span>
                <span className="rounded-full border border-stone-600/50 bg-stone-800/60 px-2.5 py-0.5 text-xs text-stone-400">
                  {formatAverage(groupLength.averageGenerationCount)} gen ·{' '}
                  {number(groupLength.averageScore)} pts
                </span>
                {overallLength ? (
                  <span className="rounded-full border border-stone-700/40 bg-stone-800/30 px-2.5 py-0.5 text-xs text-stone-500">
                    overall: {overallLength.label}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                More finalized games needed to identify a group-specific pace.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GroupPlayComparison({
  groups,
  overallPerformance,
  overallProfile,
  playerName,
  selectedGroupId,
  selectedGroupPerformance,
  selectedGroupProfile,
  unavailable = false,
}: GroupPlayComparisonProps) {
  const router = useRouter();
  const sampleBadge =
    selectedGroupPerformance ? (
      <SampleBadge gamesPlayed={selectedGroupPerformance.gamesPlayed} />
    ) : null;

  return (
    <ChartFrame
      description="Compares performance in the selected group against your overall record."
      title="Group Performance"
    >
      <div className="grid gap-5">
        {/* Section title row with sample badge */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-stone-100">
            My Play vs Overall
          </h3>
          {sampleBadge}
        </div>

        {/* Auto-submitting group selector */}
        {groups.length > 0 ? (
          <form
            action="/profile/comparison"
            className="flex flex-wrap items-center gap-2"
            method="get"
          >
            <label className="tm-data-label" htmlFor="compare-group">
              Group
            </label>
            <select
              className="tm-input w-auto max-w-[16rem] min-w-36 py-2 text-sm"
              defaultValue={selectedGroupId}
              id="compare-group"
              name="groupId"
              onChange={(e) => {
                const form = e.currentTarget.form;
                if (form) {
                  const params = new URLSearchParams({ groupId: e.currentTarget.value });
                  router.push(`/profile/comparison?${params.toString()}`);
                }
              }}
            >
              {groups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.groupName}
                </option>
              ))}
            </select>
          </form>
        ) : null}

        <ComparisonBody
          overallPerformance={overallPerformance}
          overallProfile={overallProfile}
          playerName={playerName}
          selectedGroupPerformance={selectedGroupPerformance}
          selectedGroupProfile={selectedGroupProfile}
          unavailable={unavailable}
        />
      </div>
    </ChartFrame>
  );
}
