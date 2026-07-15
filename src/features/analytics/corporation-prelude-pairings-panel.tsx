'use client';

import { useMemo, useState } from 'react';
import type {
  GroupInteractionRow,
  ScoreSourceAverages,
} from '@/lib/db/analytics-repo';

type CorporationPreludePairingsPanelProps = {
  baselineWinRate: number | null;
  rows: GroupInteractionRow[];
  scoreAverages: ScoreSourceAverages | null;
};

type PairingRecord = GroupInteractionRow & {
  corporation: string;
  key: string;
  prelude: string;
};

type ScoreChannel = {
  barClassName: string;
  label: string;
  value: number;
};

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatPointDelta(value: number) {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? '+' : ''}${rounded} pts vs baseline`;
}

function pairingKey(corporation: string, prelude: string) {
  return `${corporation}\u0000${prelude}`;
}

function parsePairingLabel(label: string) {
  const separators = [/\s*\|\s*/, /\s+\+\s+/, /\s+\/\s+/];

  for (const separator of separators) {
    const parts = label
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return {
        corporation: parts[0],
        prelude: parts.slice(1).join(' + '),
      };
    }
  }

  return null;
}

function buildPairings(rows: GroupInteractionRow[]) {
  const pairings = new Map<string, PairingRecord>();

  rows
    .filter((row) => row.interactionType === 'corporation_prelude_pair')
    .forEach((row) => {
      const parsed = parsePairingLabel(row.label);
      if (!parsed) {
        return;
      }

      const key = pairingKey(parsed.corporation, parsed.prelude);
      const existing = pairings.get(key);

      if (!existing) {
        pairings.set(key, {
          ...row,
          ...parsed,
          key,
        });
        return;
      }

      const gamesPlayed = existing.gamesPlayed + row.gamesPlayed;
      const weightedScore =
        existing.averageScore * existing.gamesPlayed +
        row.averageScore * row.gamesPlayed;
      const weightedPlacement =
        existing.averagePlacement * existing.gamesPlayed +
        row.averagePlacement * row.gamesPlayed;
      const wins = existing.wins + row.wins;

      pairings.set(key, {
        ...existing,
        averagePlacement: weightedPlacement / gamesPlayed,
        averageScore: weightedScore / gamesPlayed,
        gamesPlayed,
        winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
        wins,
      });
    });

  return [...pairings.values()].sort(
    (left, right) =>
      right.gamesPlayed - left.gamesPlayed ||
      right.averageScore - left.averageScore ||
      left.corporation.localeCompare(right.corporation) ||
      left.prelude.localeCompare(right.prelude),
  );
}

function buildScoreChannels(
  scoreAverages: ScoreSourceAverages | null,
): ScoreChannel[] {
  if (!scoreAverages) {
    return [];
  }

  return [
    {
      barClassName: 'bg-cyan-400',
      label: 'TR',
      value: scoreAverages.averageTrPoints,
    },
    {
      barClassName: 'bg-emerald-400',
      label: 'Board',
      value:
        scoreAverages.averageGreeneryPoints + scoreAverages.averageCitiesPoints,
    },
    {
      barClassName: 'bg-amber-400',
      label: 'Cards',
      value:
        scoreAverages.averageCardPoints +
        scoreAverages.averageOtherCardPoints +
        scoreAverages.averageJovianPoints +
        scoreAverages.averageMicrobePoints +
        scoreAverages.averageAnimalPoints,
    },
    {
      barClassName: 'bg-violet-400',
      label: 'Milestones + awards',
      value:
        scoreAverages.averageMilestonePoints + scoreAverages.averageAwardPoints,
    },
  ];
}

function getConfidence(gamesPlayed: number) {
  if (gamesPlayed <= 2) {
    return {
      badgeClassName: 'border-amber-300/25 bg-amber-300/[0.08] text-amber-100',
      label: `Low confidence · ${gamesPlayed} ${gamesPlayed === 1 ? 'game' : 'games'}`,
      note: 'This is low-confidence setup evidence.',
    };
  }

  if (gamesPlayed <= 5) {
    return {
      badgeClassName: 'border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100',
      label: `Developing sample · ${gamesPlayed} games`,
      note: 'The sample is useful, but still developing.',
    };
  }

  return {
    badgeClassName:
      'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100',
    label: `Established sample · ${gamesPlayed} games`,
    note: 'This pairing has a comparatively established sample.',
  };
}

export function CorporationPreludePairingsPanel({
  baselineWinRate,
  rows,
  scoreAverages,
}: CorporationPreludePairingsPanelProps) {
  const pairings = useMemo(() => buildPairings(rows), [rows]);
  const firstPairing = pairings[0] ?? null;
  const [selectedKey, setSelectedKey] = useState(firstPairing?.key ?? '');
  const [draftCorporation, setDraftCorporation] = useState(
    firstPairing?.corporation ?? '',
  );
  const [draftPrelude, setDraftPrelude] = useState(firstPairing?.prelude ?? '');

  const corporations = useMemo(
    () => [...new Set(pairings.map((pairing) => pairing.corporation))].sort(),
    [pairings],
  );
  const availablePreludes = useMemo(
    () =>
      pairings
        .filter((pairing) => pairing.corporation === draftCorporation)
        .map((pairing) => pairing.prelude)
        .sort(),
    [draftCorporation, pairings],
  );
  const selectedPairing =
    pairings.find((pairing) => pairing.key === selectedKey) ?? firstPairing;
  const draftPairing = pairings.find(
    (pairing) =>
      pairing.corporation === draftCorporation &&
      pairing.prelude === draftPrelude,
  );
  const scoreChannels = useMemo(
    () => buildScoreChannels(scoreAverages),
    [scoreAverages],
  );
  const scoreTotal = scoreChannels.reduce(
    (sum, channel) => sum + channel.value,
    0,
  );
  const dominantChannel = [...scoreChannels].sort(
    (left, right) => right.value - left.value,
  )[0];

  if (pairings.length === 0) {
    return (
      <section className="tm-panel">
        <div className="mx-auto max-w-6xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Setup analytics
          </p>
          <h2 className="tm-panel-title mt-1 font-serif text-2xl font-semibold text-stone-50 sm:text-3xl">
            Corporation + Prelude Pairings
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400">
            Pairing comparisons will appear after finalized games include both a
            corporation and at least one prelude.
          </p>
        </div>
      </section>
    );
  }

  if (!selectedPairing) {
    return null;
  }

  const confidence = getConfidence(selectedPairing.gamesPlayed);
  const baselineDelta =
    baselineWinRate === null ? null : selectedPairing.winRate - baselineWinRate;
  const winTone =
    baselineDelta === null
      ? 'text-stone-100'
      : baselineDelta < 0
        ? 'text-rose-200'
        : baselineDelta > 0
          ? 'text-emerald-200'
          : 'text-amber-100';

  function selectPairing(pairing: PairingRecord) {
    setDraftCorporation(pairing.corporation);
    setDraftPrelude(pairing.prelude);
    setSelectedKey(pairing.key);
  }

  function handleCorporationChange(corporation: string) {
    const firstMatch = pairings.find(
      (pairing) => pairing.corporation === corporation,
    );
    setDraftCorporation(corporation);
    setDraftPrelude(firstMatch?.prelude ?? '');
  }

  return (
    <section className="tm-panel">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Setup analytics
          </p>
          <h2 className="tm-panel-title mt-1 font-serif text-2xl font-semibold text-stone-50 sm:text-3xl">
            Corporation + Prelude Pairings
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-400 sm:text-base">
            Compare the combinations your group has actually played, then
            inspect sample strength, baseline performance, and the current
            scoring mix.
          </p>
        </header>

        <div className="mt-7 space-y-8">
          <section aria-labelledby="top-pairings-heading">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-orange-300">
                  Recorded combinations
                </p>
                <h3
                  className="mt-1 font-serif text-xl font-semibold text-stone-100"
                  id="top-pairings-heading"
                >
                  Top pairings
                </h3>
              </div>
              <p className="max-w-xl text-sm leading-6 text-stone-400">
                Ranked by recorded plays. Select a row to inspect it
                immediately.
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className="border-b border-white/[0.08] bg-white/[0.025] text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    <tr>
                      <th className="px-4 py-3" scope="col">
                        Pairing
                      </th>
                      <th className="px-4 py-3 text-right" scope="col">
                        Plays
                      </th>
                      <th className="px-4 py-3 text-right" scope="col">
                        Win rate
                      </th>
                      <th className="px-4 py-3 text-right" scope="col">
                        Avg VP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {pairings.slice(0, 5).map((pairing) => {
                      const isSelected = pairing.key === selectedPairing.key;
                      return (
                        <tr
                          className={
                            isSelected
                              ? 'bg-cyan-300/[0.07] text-stone-100'
                              : 'text-stone-300 transition hover:bg-white/[0.035] hover:text-stone-100'
                          }
                          key={pairing.key}
                        >
                          <th className="p-0 font-medium" scope="row">
                            <button
                              aria-current={isSelected ? 'true' : undefined}
                              className="flex w-full items-center gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/70"
                              onClick={() => selectPairing(pairing)}
                              type="button"
                            >
                              <span className="font-semibold text-cyan-100">
                                {pairing.corporation}
                              </span>
                              <span
                                aria-hidden="true"
                                className="text-orange-300"
                              >
                                +
                              </span>
                              <span>{pairing.prelude}</span>
                            </button>
                          </th>
                          <td className="px-4 py-3 text-right tabular-nums text-stone-400">
                            {pairing.gamesPlayed}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatPercent(pairing.winRate)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-stone-100">
                            {formatAverage(pairing.averageScore)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section aria-labelledby="pairing-controls-heading">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-orange-300">
                Pairing explorer
              </p>
              <h3
                className="mt-1 font-serif text-xl font-semibold text-stone-100"
                id="pairing-controls-heading"
              >
                Choose a combination
              </h3>
            </div>

            <div className="mt-4 grid max-w-4xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Corporation
                </span>
                <select
                  aria-label="Corporation"
                  className="mt-2 h-12 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm text-stone-100 shadow-inner outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  onChange={(event) =>
                    handleCorporationChange(event.target.value)
                  }
                  value={draftCorporation}
                >
                  {corporations.map((corporation) => (
                    <option key={corporation} value={corporation}>
                      {corporation}
                    </option>
                  ))}
                </select>
              </label>

              <span
                aria-hidden="true"
                className="hidden h-12 items-center justify-center text-xl font-semibold text-orange-300 sm:flex"
              >
                +
              </span>

              <label className="block">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Prelude
                </span>
                <select
                  aria-label="Prelude"
                  className="mt-2 h-12 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm text-stone-100 shadow-inner outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  onChange={(event) => setDraftPrelude(event.target.value)}
                  value={draftPrelude}
                >
                  {availablePreludes.map((prelude) => (
                    <option key={prelude} value={prelude}>
                      {prelude}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="h-12 rounded-xl border border-orange-300/30 bg-orange-300/[0.1] px-5 text-sm font-semibold text-orange-50 transition hover:bg-orange-300/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!draftPairing}
                onClick={() => {
                  if (draftPairing) {
                    selectPairing(draftPairing);
                  }
                }}
                type="button"
              >
                View results
              </button>
            </div>
          </section>

          <section
            aria-labelledby="selected-pairing-heading"
            className="overflow-hidden rounded-2xl border border-orange-300/20 bg-gradient-to-br from-orange-950/20 via-stone-950/65 to-stone-950/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="border-b border-white/[0.07] p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-orange-300">
                    Selected pairing
                  </p>
                  <h3
                    aria-label={`${selectedPairing.corporation} + ${selectedPairing.prelude}`}
                    className="mt-2 flex flex-wrap items-center gap-2 font-serif text-2xl font-semibold text-stone-50"
                    id="selected-pairing-heading"
                  >
                    <span>{selectedPairing.corporation}</span>
                    <span aria-hidden="true" className="text-orange-300">
                      +
                    </span>
                    <span>{selectedPairing.prelude}</span>
                  </h3>
                </div>
                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${confidence.badgeClassName}`}
                >
                  {confidence.label}
                </span>
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                  <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
                    Plays
                  </dt>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums text-stone-200">
                    {selectedPairing.gamesPlayed}
                  </dd>
                  <p className="mt-1 text-xs text-stone-500">Recorded sample</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                  <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
                    Win rate
                  </dt>
                  <dd
                    className={`mt-2 text-2xl font-semibold tabular-nums ${winTone}`}
                  >
                    {formatPercent(selectedPairing.winRate)}
                  </dd>
                  <p className={`mt-1 text-xs ${winTone}`}>
                    {baselineDelta === null
                      ? 'No group baseline yet'
                      : formatPointDelta(baselineDelta)}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.055] p-4">
                  <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-cyan-200/70">
                    Avg VP
                  </dt>
                  <dd className="mt-2 text-3xl font-semibold tabular-nums text-cyan-50">
                    {formatAverage(selectedPairing.averageScore)}
                  </dd>
                  <p className="mt-1 text-xs text-cyan-100/55">
                    Average final score
                  </p>
                </div>
              </dl>

              <div className="max-w-4xl space-y-3 text-sm leading-6 text-stone-300 sm:text-base">
                <p>
                  <span className="font-semibold text-stone-100">
                    {selectedPairing.corporation} with {selectedPairing.prelude}
                  </span>{' '}
                  won {formatPercent(selectedPairing.winRate)} of{' '}
                  {selectedPairing.gamesPlayed} recorded{' '}
                  {selectedPairing.gamesPlayed === 1 ? 'game' : 'games'} and
                  averaged {formatAverage(selectedPairing.averageScore)} VP.
                </p>
                <p className="text-stone-400">{confidence.note}</p>
              </div>

              <div className="border-t border-white/[0.07] pt-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-orange-300">
                      Scoring breakdown
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-stone-100">
                      Score-channel profile
                    </h4>
                  </div>
                  {dominantChannel ? (
                    <p className="max-w-xl text-sm leading-6 text-stone-400">
                      The current Insights focus is led by{' '}
                      <span className="font-semibold text-stone-200">
                        {dominantChannel.label.toLowerCase()}
                      </span>{' '}
                      scoring.
                    </p>
                  ) : null}
                </div>

                {scoreChannels.length > 0 && scoreTotal > 0 ? (
                  <div className="mt-4 space-y-4">
                    <div
                      aria-label="Scoring channel distribution"
                      className="flex h-3 overflow-hidden rounded-full bg-stone-800"
                      role="img"
                    >
                      {scoreChannels.map((channel) => (
                        <span
                          className={channel.barClassName}
                          key={channel.label}
                          style={{
                            width: `${(channel.value / scoreTotal) * 100}%`,
                          }}
                          title={`${channel.label}: ${formatAverage(channel.value)} points`}
                        />
                      ))}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {scoreChannels.map((channel) => (
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5"
                          key={channel.label}
                        >
                          <span className="flex items-center gap-2 text-sm text-stone-400">
                            <span
                              aria-hidden="true"
                              className={`size-2.5 rounded-full ${channel.barClassName}`}
                            />
                            {channel.label}
                          </span>
                          <span className="font-semibold tabular-nums text-stone-100">
                            {formatAverage(channel.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="max-w-4xl text-xs leading-5 text-stone-500">
                      The score-channel mix reflects the current player or group
                      focus; pairing-specific score-source rows are not yet
                      stored separately.
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-stone-400">
                    Score-channel data will appear after finalized games include
                    a full scoring breakdown.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
