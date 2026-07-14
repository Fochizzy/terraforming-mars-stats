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

function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tm-data-label">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-100">{value}</p>
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
  const activeNarratives = activePair
    ? buildPairingNarratives({
        baselineWinRate,
        corporation: corporationRows.find(
          (row) => row.corporation_name === activePair.corporation_name,
        ),
        pair: activePair,
        prelude: preludeRows.find(
          (row) => row.prelude_name === activePair.prelude_name,
        ),
      })
    : [];

  if (corporationNames.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold tm-accent-copy">
        Corporation + Prelude Pairings
      </h4>

      {topPairings.length > 0 ? (
        <div className="mb-4">
          <p className="tm-data-label mb-1 text-xs">Top {topPairings.length} by plays</p>
          <ul className="flex flex-col gap-1 text-xs">
            {topPairings.map((pair) => (
              <li key={`${pair.corporation_name}-${pair.prelude_name}`}>
                <SelectionNameButton
                  dialogData={dialogData}
                  kind="Corporation"
                  name={pair.corporation_name}
                />{' '}
                +{' '}
                <SelectionNameButton
                  dialogData={dialogData}
                  kind="Prelude"
                  name={pair.prelude_name}
                />
                : {pair.plays} plays, {formatWinRate(pair.win_rate)} wins,{' '}
                {pair.avg_points} avg VP
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-[240px] sm:w-auto sm:flex-1">
          <label
            className="tm-data-label"
            htmlFor="pairing-corporation-select"
          >
            Corporation
          </label>
          <select
            className="tm-input mt-2 w-full appearance-none pr-9"
            id="pairing-corporation-select"
            onChange={(event) => setSelectedCorporation(event.target.value)}
            value={activeCorporation}
          >
            {corporationNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span className="mt-2 block">
            <SelectChevron />
          </span>
        </div>
        <div className="relative w-full max-w-[240px] sm:w-auto sm:flex-1">
          <label className="tm-data-label" htmlFor="pairing-prelude-select">
            Prelude
          </label>
          <select
            className="tm-input mt-2 w-full appearance-none pr-9"
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
          <span className="mt-2 block">
            <SelectChevron />
          </span>
        </div>
      </div>

      {activePair ? (
        <div className="tm-stat-card mt-3">
          <p className="text-sm font-semibold text-stone-100">
            <SelectionNameButton
              dialogData={dialogData}
              kind="Corporation"
              name={activePair.corporation_name}
            />{' '}
            +{' '}
            <SelectionNameButton
              dialogData={dialogData}
              kind="Prelude"
              name={activePair.prelude_name}
            />
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <StatBlock label="Plays" value={String(activePair.plays)} />
            <StatBlock
              label="Win rate"
              value={formatWinRate(activePair.win_rate)}
            />
            <StatBlock label="Avg VP" value={String(activePair.avg_points)} />
          </div>
          <div className="tm-muted-copy mt-3 space-y-2 text-sm">
            {activeNarratives.map((narrative) => (
              <p key={narrative}>{narrative}</p>
            ))}
          </div>
        </div>
      ) : (
        <p className="tm-muted-copy mt-3 text-xs">
          No recorded games used this corporation and prelude together.
        </p>
      )}
    </div>
  );
}
