'use client';

import { useMemo, useState } from 'react';
import { SelectChevron } from '@/components/ui/select-chevron';
import type {
  CorporationSelectionStat,
  PreludeSelectionStat,
  SelectionDialogData,
  SelectionPairStat,
} from '@/lib/db/selection-stats-repo';
import { SelectionNameButton } from './selection-name-link';

const TOP_PAIRING_LIMIT = 5;

const SCORE_PROFILE_LABELS = {
  'board-focused': 'Board-focused',
  'card-engine': 'Card-engine',
  'objective-focused': 'Objective-focused',
  'terraforming-led': 'Terraforming-led',
} as const;

type PairingConfidence = 'high' | 'low' | 'medium';
type ScoreProfileKey = keyof typeof SCORE_PROFILE_LABELS;
type SelectionSource = CorporationSelectionStat | PreludeSelectionStat;

type PairingScoreProfile = {
  boardPoints: number;
  cardPoints: number;
  channelPoints: number;
  channels: Array<{ label: string; value: number }>;
  label: string;
  objectivePoints: number;
  trPoints: number;
};

const selectionNameClass =
  'rounded-sm font-semibold text-stone-100 no-underline transition hover:text-[rgb(221,161,93)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70';

function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatGameCount(plays: number) {
  return `${plays} ${plays === 1 ? 'game' : 'games'}`;
}

function getPairingConfidence(plays: number): PairingConfidence {
  if (plays >= 6) {
    return 'high';
  }

  if (plays >= 3) {
    return 'medium';
  }

  return 'low';
}

function getPairingScoreProfile(
  corporation?: CorporationSelectionStat,
  prelude?: PreludeSelectionStat,
): PairingScoreProfile | null {
  const sources = [corporation, prelude].filter(
    (row): row is SelectionSource => Boolean(row),
  );

  if (sources.length === 0) {
    return null;
  }

  const average = (getValue: (row: SelectionSource) => number) =>
    sources.reduce((sum, row) => sum + getValue(row), 0) / sources.length;
  const trPoints = average((row) => row.avg_tr_points);
  const boardPoints = average(
    (row) => row.avg_cities_points + row.avg_greenery_points,
  );
  const cardPoints = average((row) => row.avg_card_points);
  const objectivePoints = average(
    (row) => row.avg_milestone_points + row.avg_award_points,
  );
  const channels = [
    { label: 'TR', value: trPoints },
    { label: 'Board', value: boardPoints },
    { label: 'Cards', value: cardPoints },
    { label: 'Objectives', value: objectivePoints },
  ];
  const profiles: Array<{ label: ScoreProfileKey; value: number }> = [
    { label: 'terraforming-led', value: trPoints },
    { label: 'board-focused', value: boardPoints },
    { label: 'card-engine', value: cardPoints },
    { label: 'objective-focused', value: objectivePoints },
  ];
  const primaryProfile = [...profiles].sort(
    (left, right) => right.value - left.value,
  )[0];

  return {
    boardPoints,
    cardPoints,
    channelPoints: primaryProfile.value,
    channels,
    label: SCORE_PROFILE_LABELS[primaryProfile.label],
    objectivePoints,
    trPoints,
  };
}

function buildPerformanceSummary(
  pair: SelectionPairStat,
  baselineWinRate: number,
) {
  const wins = Math.round(pair.win_rate * pair.plays);
  const deltaPoints = Math.round((pair.win_rate - baselineWinRate) * 100);
  const gameLabel = pair.plays === 1 ? 'game' : 'games';
  let comparison = `in line with your ${formatWinRate(baselineWinRate)} baseline`;

  if (deltaPoints > 0) {
    comparison = `${deltaPoints} percentage ${deltaPoints === 1 ? 'point' : 'points'} above your ${formatWinRate(baselineWinRate)} baseline`;
  } else if (deltaPoints < 0) {
    const absoluteDelta = Math.abs(deltaPoints);
    comparison = `${absoluteDelta} percentage ${absoluteDelta === 1 ? 'point' : 'points'} below your ${formatWinRate(baselineWinRate)} baseline`;
  }

  return `Won ${wins} of ${pair.plays} recorded ${gameLabel}, ${comparison}, while averaging ${formatAverage(pair.avg_points)} VP.`;
}

function MetricPill({
  compact = false,
  label,
  value,
}: {
  compact?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={[
        'rounded-xl border border-white/10 bg-black/25',
        compact ? 'px-2.5 py-2' : 'px-3.5 py-3',
      ].join(' ')}
    >
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-stone-500">
        {label}
      </dt>
      <dd
        className={[
          'mt-1 font-semibold tabular-nums text-stone-100',
          compact ? 'text-xs sm:text-sm' : 'text-base',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}

function ConfidenceBadge({ plays }: { plays: number }) {
  const confidence = getPairingConfidence(plays);
  const tone = {
    high: 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200',
    low: 'border-amber-300/20 bg-amber-300/[0.08] text-amber-200',
    medium: 'border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200',
  }[confidence];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${tone}`}
    >
      {confidence} confidence · {formatGameCount(plays)}
    </span>
  );
}

function ScoreChannelBreakdown({ profile }: { profile: PairingScoreProfile }) {
  const maximum = Math.max(
    ...profile.channels.map((channel) => channel.value),
    1,
  );

  return (
    <div className="mt-4" aria-labelledby="scoring-channel-breakdown-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h6
          className="text-xs font-semibold text-stone-200"
          id="scoring-channel-breakdown-title"
        >
          Scoring channel breakdown
        </h6>
        <span className="text-[0.68rem] text-stone-500">
          Relative to the strongest channel
        </span>
      </div>
      <dl className="mt-3 grid gap-2.5">
        {profile.channels.map((channel) => {
          const isStrongest = channel.value === profile.channelPoints;
          const width = Math.max(
            (channel.value / maximum) * 100,
            channel.value > 0 ? 4 : 0,
          );

          return (
            <div
              className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3"
              key={channel.label}
            >
              <dt className="text-xs text-stone-400">{channel.label}</dt>
              <dd
                aria-label={`${channel.label}: ${formatAverage(channel.value)} average points`}
                className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
              >
                <span
                  aria-hidden="true"
                  className={`block h-full rounded-full transition-[width] ${
                    isStrongest ? 'bg-amber-300/85' : 'bg-stone-300/35'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </dd>
              <dd className="text-right text-xs font-semibold tabular-nums text-stone-200">
                {formatAverage(channel.value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function buildPairingNarratives({
  baselineWinRate,
  corporation,
  pair,
  prelude,
}: {
  baselineWinRate: number;
  corporation?: CorporationSelectionStat;
  pair: SelectionPairStat;
  prelude?: PreludeSelectionStat;
}) {
  const deltaPoints = Math.round((pair.win_rate - baselineWinRate) * 100);
  const evidence = pair.plays >= 6 ? 'high' : pair.plays >= 3 ? 'medium' : 'low';
  const direction =
    deltaPoints > 0
      ? `${deltaPoints} points above`
      : deltaPoints < 0
        ? `${Math.abs(deltaPoints)} points below`
        : 'even with';
  const narratives = [
    `${pair.corporation_name} with ${pair.prelude_name} won ${formatWinRate(pair.win_rate)} of ${pair.plays} recorded ${pair.plays === 1 ? 'game' : 'games'}, ${direction} your ${formatWinRate(baselineWinRate)} baseline, while averaging ${pair.avg_points} VP. This is ${evidence}-confidence setup evidence.`,
  ];

  const sources = [corporation, prelude].filter(
    (row): row is CorporationSelectionStat | PreludeSelectionStat => Boolean(row),
  );
  if (sources.length > 0) {
    const average = (getValue: (row: typeof sources[number]) => number) =>
      sources.reduce((sum, row) => sum + getValue(row), 0) / sources.length;
    const profiles = [
      { label: 'terraforming-led', value: average((row) => row.avg_tr_points) },
      {
        label: 'board-focused',
        value: average((row) => row.avg_cities_points + row.avg_greenery_points),
      },
      { label: 'card-engine', value: average((row) => row.avg_card_points) },
      {
        label: 'objective-focused',
        value: average((row) => row.avg_milestone_points + row.avg_award_points),
      },
    ].sort((left, right) => right.value - left.value);

    narratives.push(
      `The recorded scoring profile for these choices is most ${profiles[0].label}: about ${profiles[0].value.toFixed(1)} points came from that channel, alongside ${average((row) => row.avg_tr_points).toFixed(1)} TR points, ${average((row) => row.avg_cities_points + row.avg_greenery_points).toFixed(1)} board points, and ${average((row) => row.avg_card_points).toFixed(1)} card points on average.`,
    );
  }

  return narratives;
}

export function CorporationPreludePairings({
  baselineWinRate,
  corporationRows,
  dialogData,
  preludeRows,
  rows,
}: {
  baselineWinRate: number;
  corporationRows: CorporationSelectionStat[];
  dialogData?: SelectionDialogData;
  preludeRows: PreludeSelectionStat[];
  rows: SelectionPairStat[];
}) {
  const topPairings = useMemo(
    () =>
      [...rows]
        .sort(
          (left, right) =>
            right.plays - left.plays ||
            right.win_rate - left.win_rate ||
            left.corporation_name.localeCompare(right.corporation_name),
        )
        .slice(0, TOP_PAIRING_LIMIT),
    [rows],
  );
  const corporationNames = useMemo(
    () =>
      [...new Set(rows.map((row) => row.corporation_name))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [rows],
  );
  const [selectedCorporation, setSelectedCorporation] = useState('');
  const activeCorporation =
    selectedCorporation && corporationNames.includes(selectedCorporation)
      ? selectedCorporation
      : corporationNames[0] ?? '';

  // Only offer preludes that actually paired with the chosen corporation, so the
  // selection always resolves to a real record instead of an empty state.
  const preludesForCorporation = useMemo(
    () =>
      [
        ...new Set(
          rows
            .filter((row) => row.corporation_name === activeCorporation)
            .map((row) => row.prelude_name),
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [rows, activeCorporation],
  );
  const [selectedPrelude, setSelectedPrelude] = useState('');
  const activePrelude =
    selectedPrelude && preludesForCorporation.includes(selectedPrelude)
      ? selectedPrelude
      : preludesForCorporation[0] ?? '';

  const activePair = useMemo(
    () =>
      rows.find(
        (row) =>
          row.corporation_name === activeCorporation &&
          row.prelude_name === activePrelude,
      ) ?? null,
    [rows, activeCorporation, activePrelude],
  );
  const activeCorporationRow = activePair
    ? corporationRows.find(
        (row) => row.corporation_name === activePair.corporation_name,
      )
    : undefined;
  const activePreludeRow = activePair
    ? preludeRows.find((row) => row.prelude_name === activePair.prelude_name)
    : undefined;
  const scoreProfile = getPairingScoreProfile(
    activeCorporationRow,
    activePreludeRow,
  );

  if (corporationNames.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="corporation-prelude-pairings-title"
      className="min-w-0 max-w-full overflow-x-clip"
    >
      <div>
        <h4
          className="text-sm font-semibold text-cyan-200"
          id="corporation-prelude-pairings-title"
        >
          Corporation + Prelude Pairings
        </h4>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
          Compare the most-played combinations, then inspect one pairing in detail.
        </p>
      </div>

      {topPairings.length > 0 ? (
        <section
          aria-labelledby="top-pairings-title"
          className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-stone-100" id="top-pairings-title">
              Top pairings
            </h5>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-stone-500">
              Ranked by plays
            </span>
          </div>
          <ol className="grid gap-2">
            {topPairings.map((pair, index) => (
              <li
                className="grid gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3 transition hover:border-white/15 hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={`${pair.corporation_name}-${pair.prelude_name}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold tabular-nums text-stone-400">
                    {index + 1}
                  </span>
                  <p className="min-w-0 pt-0.5 text-sm leading-6 text-stone-300">
                    <SelectionNameButton
                      className={selectionNameClass}
                      dialogData={dialogData}
                      kind="Corporation"
                      name={pair.corporation_name}
                    />{' '}
                    <span className="text-stone-600">+</span>{' '}
                    <SelectionNameButton
                      className={selectionNameClass}
                      dialogData={dialogData}
                      kind="Prelude"
                      name={pair.prelude_name}
                    />
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-2 sm:min-w-[19rem]">
                  <MetricPill
                    compact
                    label="Plays"
                    value={String(pair.plays)}
                  />
                  <MetricPill
                    compact
                    label="Win rate"
                    value={formatWinRate(pair.win_rate)}
                  />
                  <MetricPill
                    compact
                    label="Avg VP"
                    value={formatAverage(pair.avg_points)}
                  />
                </dl>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section
        aria-labelledby="compare-pairing-title"
        className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4"
      >
        <div>
          <h5 className="text-sm font-semibold text-stone-100" id="compare-pairing-title">
            Compare a pairing
          </h5>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Choose a corporation first; the prelude list only shows recorded matches.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="tm-data-label" htmlFor="pairing-corporation-select">
              Corporation
            </label>
            <div className="relative mt-2">
              <select
                className="tm-input w-full appearance-none pr-10"
                id="pairing-corporation-select"
                onChange={(event) => {
                  setSelectedCorporation(event.target.value);
                  setSelectedPrelude('');
                }}
                value={activeCorporation}
              >
                {corporationNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <label className="tm-data-label" htmlFor="pairing-prelude-select">
              Prelude
            </label>
            <div className="relative mt-2">
              <select
                className="tm-input w-full appearance-none pr-10"
                id="pairing-prelude-select"
                onChange={(event) => setSelectedPrelude(event.target.value)}
                value={activePrelude}
              >
                {preludesForCorporation.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>
      </section>

      {activePair ? (
        <section className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Selected pairing
              </p>
              <h5 className="mt-1 font-serif text-lg font-semibold text-stone-100">
                <SelectionNameButton
                  className={selectionNameClass}
                  dialogData={dialogData}
                  kind="Corporation"
                  name={activePair.corporation_name}
                />{' '}
                <span className="font-sans text-stone-600">+</span>{' '}
                <SelectionNameButton
                  className={selectionNameClass}
                  dialogData={dialogData}
                  kind="Prelude"
                  name={activePair.prelude_name}
                />
              </h5>
            </div>
            <ConfidenceBadge plays={activePair.plays} />
          </header>

          <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <MetricPill label="Plays" value={String(activePair.plays)} />
            <MetricPill
              label="Win rate"
              value={formatWinRate(activePair.win_rate)}
            />
            <MetricPill
              label="Avg VP"
              value={formatAverage(activePair.avg_points)}
            />
          </dl>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <article className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-amber-300">
                Performance
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                {buildPerformanceSummary(activePair, baselineWinRate)}
              </p>
            </article>

            <article className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-amber-300">
                Scoring profile
              </p>
              {scoreProfile ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-stone-300">
                    <span className="font-semibold text-stone-100">
                      {scoreProfile.label}
                    </span>{' '}
                    mix, with {formatAverage(scoreProfile.channelPoints)} points from
                    its strongest scoring channel on average.
                  </p>
                  <ScoreChannelBreakdown profile={scoreProfile} />
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  A scoring-source breakdown is not available for this pairing yet.
                </p>
              )}
            </article>
          </div>
        </section>
      ) : (
        <p className="tm-muted-copy mt-3 text-xs">
          No recorded games used this corporation and prelude together.
        </p>
      )}
    </section>
  );
}
