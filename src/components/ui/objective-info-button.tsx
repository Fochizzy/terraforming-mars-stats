'use client';

import { type ReactNode, useEffect, useState } from 'react';
import {
  AWARD_DEFINITIONS,
  MILESTONE_DEFINITIONS,
} from '@/lib/maps/map-objective-definitions';

const DEFAULT_CLASS =
  'font-semibold text-stone-100 underline decoration-dotted underline-offset-2 transition hover:text-[rgb(221,161,93)]';

type RateStats = {
  count: number;
  denominator: number;
  rate: number;
};

export type MilestoneObjectiveStats = {
  global?: {
    claimRate: number;
    claimedWhenWonRate: number;
    claims: number;
    winRateWhenClaimed: number;
    winsWhenClaimed: number;
  } | null;
  personal?: {
    claims: number;
    winRateWhenClaimed: number;
    winsWhenClaimed: number;
  } | null;
};

export type AwardObjectiveStats = {
  global?: {
    firstPlace: RateStats;
    fundedCount: number;
    gameWins: RateStats;
    secondPlace: RateStats;
  } | null;
  personal?: {
    firstPlace: RateStats;
    fundedCount: number;
    gameWins: RateStats;
    secondPlace: RateStats;
  } | null;
};

type ObjectiveInfoButtonProps = {
  awardStats?: AwardObjectiveStats;
  children?: ReactNode;
  className?: string;
  kind: 'award' | 'milestone';
  milestoneStats?: MilestoneObjectiveStats;
  name: string;
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return `${Math.round(value * 100)}%`;
}

function formatCount(count: number, denominator: number) {
  return `${count}/${denominator}`;
}

function Definition({ kind, name }: { kind: 'award' | 'milestone'; name: string }) {
  const definitions = kind === 'award' ? AWARD_DEFINITIONS : MILESTONE_DEFINITIONS;

  return (
    <p className="tm-muted-copy mt-2 text-sm">
      {definitions[name] ?? 'Definition pending.'}
    </p>
  );
}

function EmptyStats({ label }: { label: string }) {
  return (
    <p className="tm-muted-copy mt-1 text-xs">
      {label} stats will appear after finalized games record this objective.
    </p>
  );
}

function StatLine({
  label,
  stats,
}: {
  label: string;
  stats: RateStats;
}) {
  return (
    <p className="tm-muted-copy text-xs">
      {label}:{' '}
      <span className="font-semibold text-stone-100">
        {formatPercent(stats.rate)}
      </span>{' '}
      ({formatCount(stats.count, stats.denominator)})
    </p>
  );
}

function MilestoneStats({
  stats,
}: {
  stats: MilestoneObjectiveStats | undefined;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <article className="tm-stat-card">
        <p className="tm-data-label text-xs">Personal</p>
        {stats?.personal ? (
          <>
            <p className="mt-1 text-xl font-semibold text-stone-100">
              {formatPercent(stats.personal.winRateWhenClaimed)}
            </p>
            <p className="tm-muted-copy text-xs">
              won when claimed ({stats.personal.winsWhenClaimed}/
              {stats.personal.claims})
            </p>
          </>
        ) : (
          <EmptyStats label="Personal" />
        )}
      </article>
      <article className="tm-stat-card">
        <p className="tm-data-label text-xs">Global</p>
        {stats?.global ? (
          <div className="mt-2 flex flex-col gap-1">
            <p className="tm-muted-copy text-xs">
              Won when claimed:{' '}
              <span className="font-semibold text-stone-100">
                {formatPercent(stats.global.winRateWhenClaimed)}
              </span>{' '}
              ({stats.global.winsWhenClaimed}/{stats.global.claims})
            </p>
            <p className="tm-muted-copy text-xs">
              Claimed when won:{' '}
              <span className="font-semibold text-stone-100">
                {formatPercent(stats.global.claimedWhenWonRate)}
              </span>
            </p>
            <p className="tm-muted-copy text-xs">
              Claimed in {formatPercent(stats.global.claimRate)} of games
            </p>
          </div>
        ) : (
          <EmptyStats label="Global" />
        )}
      </article>
    </div>
  );
}

function AwardStats({ stats }: { stats: AwardObjectiveStats | undefined }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <article className="tm-stat-card">
        <p className="tm-data-label text-xs">Personal Funding</p>
        {stats?.personal ? (
          <div className="mt-2 flex flex-col gap-1">
            <p className="tm-muted-copy text-xs">
              Funded {stats.personal.fundedCount} times
            </p>
            <StatLine label="Won game" stats={stats.personal.gameWins} />
            <StatLine label="Came 1st in award" stats={stats.personal.firstPlace} />
            <StatLine label="Came 2nd in award" stats={stats.personal.secondPlace} />
          </div>
        ) : (
          <EmptyStats label="Personal award" />
        )}
      </article>
      <article className="tm-stat-card">
        <p className="tm-data-label text-xs">Global Funding</p>
        {stats?.global ? (
          <div className="mt-2 flex flex-col gap-1">
            <p className="tm-muted-copy text-xs">
              Funded {stats.global.fundedCount} times
            </p>
            <StatLine label="Funder won game" stats={stats.global.gameWins} />
            <StatLine label="Funder came 1st" stats={stats.global.firstPlace} />
            <StatLine label="Funder came 2nd" stats={stats.global.secondPlace} />
          </div>
        ) : (
          <EmptyStats label="Global award" />
        )}
      </article>
    </div>
  );
}

export function ObjectiveInfoButton({
  awardStats,
  children,
  className = DEFAULT_CLASS,
  kind,
  milestoneStats,
  name,
}: ObjectiveInfoButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        aria-label={`Show ${kind} details for ${name}`}
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        {children ?? name}
      </button>
      {open ? (
        <div
          aria-label={`${name} ${kind} details`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <div
            className="tm-panel max-h-[90vh] w-full max-w-xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="tm-data-label text-xs">
                  {kind === 'award' ? 'Award' : 'Milestone'}
                </p>
                <h2 className="tm-panel-title text-lg font-semibold">{name}</h2>
              </div>
              <button
                aria-label="Close"
                className="tm-button-secondary px-3 py-1 text-sm"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <Definition kind={kind} name={name} />
            {kind === 'award' ? (
              <AwardStats stats={awardStats} />
            ) : (
              <MilestoneStats stats={milestoneStats} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
