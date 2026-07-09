import Link from 'next/link';
import { ChartFrame } from '@/components/charts/chart-frame';
import type { LeaderboardRow } from '@/lib/db/analytics-repo';
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
  unavailable?: boolean;
};

function ComparisonBody({
  overallPerformance,
  playerName,
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

  return (
    <div className="grid gap-3">
      <p className="tm-muted-copy text-sm">
        {selectedGroupPerformance.gamesPlayed} finalized games in this group
        {overallPerformance
          ? ` | ${overallPerformance.gamesPlayed} overall`
          : ''}
      </p>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {buildGroupStatEntries({
          overallPerformance,
          performance: selectedGroupPerformance,
        }).map((entry) => (
          <div className="tm-stat-card" key={entry.label}>
            <dt className="tm-data-label">{entry.label}</dt>
            <dd className="mt-2 text-lg font-semibold text-stone-100">
              {entry.value}
            </dd>
            {entry.delta !== null ? (
              <dd className="tm-muted-copy mt-1 text-xs">
                {entry.delta} vs overall
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

export function GroupPlayComparison({
  groups,
  overallPerformance,
  playerName,
  selectedGroupId,
  selectedGroupPerformance,
  unavailable = false,
}: GroupPlayComparisonProps) {
  return (
    <ChartFrame title="My Play vs Overall">
      <div className="grid gap-4">
        {groups.length > 0 ? (
          <form
            action="/group"
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
              name="compareGroupId"
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
          playerName={playerName}
          selectedGroupPerformance={selectedGroupPerformance}
          unavailable={unavailable}
        />
      </div>
    </ChartFrame>
  );
}
