import Link from 'next/link';
import { ChartFrame } from '@/components/charts/chart-frame';
import type {
  LeaderboardRow,
  ProfileAnalytics,
  ScoreSourceAverages,
} from '@/lib/db/analytics-repo';
import { buildGroupStatEntries } from './performance-delta';

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
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function buildGroupComparisonNarratives(
  group: LeaderboardRow,
  overall: LeaderboardRow | null,
) {
  if (!overall) return [];
  const winDelta = Math.round((group.winRate - overall.winRate) * 100);
  const scoreDelta = group.averageScore - overall.averageScore;
  const placementDelta = group.averagePlacement - overall.averagePlacement;
  const evidence = group.gamesPlayed >= 10 ? 'established' : group.gamesPlayed >= 5 ? 'developing' : 'early';

  return [
    `Your win rate in this group is ${Math.abs(winDelta)} percentage points ${winDelta >= 0 ? 'higher' : 'lower'} than your overall record, while your average score is ${number(Math.abs(scoreDelta))} points ${scoreDelta >= 0 ? 'higher' : 'lower'}.`,
    `You finish ${number(Math.abs(placementDelta))} places ${placementDelta <= 0 ? 'better' : 'worse'} here on average. Taken with the score difference, that suggests this group may create a different scoring environment rather than a simple across-the-board improvement or decline.`,
    `This is ${evidence} evidence based on ${group.gamesPlayed} finalized ${group.gamesPlayed === 1 ? 'game' : 'games'} in the selected group, compared with ${overall.gamesPlayed} overall.`,
  ];
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
    <div className="grid gap-3">
      <p className="tm-muted-copy text-sm">
        {selectedGroupPerformance.gamesPlayed} finalized games in this group
        {overallPerformance
          ? ` | ${overallPerformance.gamesPlayed} overall`
          : ''}
      </p>
      <div className="tm-stat-card">
        <p className="tm-data-label mb-2">What changes in this group</p>
        <div className="grid gap-2 text-sm text-stone-200">
          {narratives.map((narrative) => <p key={narrative}>{narrative}</p>)}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-black/20"><tr className="tm-data-label"><th className="p-3">Metric</th><th className="p-3">This group</th><th className="p-3">Overall</th><th className="p-3">Difference</th></tr></thead>
          <tbody>
            {entries.map((entry, index) => {
              const overallValues = overallPerformance ? [overallPerformance.weightedScore, `${Math.round(overallPerformance.winRate * 100)}%`, overallPerformance.averagePlacement, overallPerformance.averageScore] : [];
              return <tr className="border-t border-white/10" key={entry.label}><th className="p-3 text-stone-100">{entry.label}</th><td className="p-3">{entry.value}</td><td className="p-3">{overallValues[index] ?? '—'}</td><td className="p-3">{entry.delta ?? '—'}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      {selectedGroupProfile?.scoreAverages && overallProfile?.scoreAverages ? (
        <div className="tm-stat-card">
          <h3 className="tm-panel-title text-base">Scoring Differences</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {scoreSources.map((source) => {
              const groupValue = selectedGroupProfile.scoreAverages![source.key];
              const overallValue = overallProfile.scoreAverages![source.key];
              return <div className="rounded border border-white/10 p-3" key={source.key}><p className="tm-data-label">{source.label}</p><p className="mt-1 text-stone-100">{number(groupValue)} group / {number(overallValue)} overall</p><p className="tm-muted-copy text-xs">{number(Math.abs(groupValue - overallValue))} points {groupValue >= overallValue ? 'higher' : 'lower'}</p></div>;
            })}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="tm-stat-card"><h3 className="tm-panel-title text-base">Style Context</h3><p className="mt-2 text-sm text-stone-200">{groupStyle ? `${groupStyle.styleName} is your most prominent recorded style here (${Math.round(groupStyle.winRate * 100)}% win rate across ${groupStyle.gamesPlayed} games).` : 'More declared or inferred style data is needed for this group.'}</p>{overallStyle ? <p className="tm-muted-copy mt-2 text-xs">Overall reference: {overallStyle.styleName}, {Math.round(overallStyle.winRate * 100)}% win rate.</p> : null}</div>
        <div className="tm-stat-card"><h3 className="tm-panel-title text-base">Pace Context</h3><p className="mt-2 text-sm text-stone-200">{groupLength ? `Your strongest length here is ${groupLength.label}, averaging ${number(groupLength.averageGenerationCount)} generations and ${number(groupLength.averageScore)} points.` : 'More finalized games are needed to identify a group-specific pace.'}</p>{overallLength ? <p className="tm-muted-copy mt-2 text-xs">Overall best length: {overallLength.label}.</p> : null}</div>
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
  return (
    <ChartFrame title="Group Comparison">
      <div className="grid gap-4">
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
              className="tm-input min-w-44"
              defaultValue={selectedGroupId}
              id="compare-group"
              name="groupId"
            >
              {groups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.groupName}
                </option>
              ))}
            </select>
            <button
              className="tm-button-secondary px-4 py-2 text-xs"
              type="submit"
            >
              View
            </button>
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
