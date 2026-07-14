'use client';

import { useMemo, useState } from 'react';
import { SelectChevron } from '@/components/ui/select-chevron';
import type {
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

export function CorporationPreludePairings({
  dialogData,
  rows,
}: {
  dialogData?: SelectionDialogData;
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
        </div>
      ) : (
        <p className="tm-muted-copy mt-3 text-xs">
          No recorded games used this corporation and prelude together.
        </p>
      )}
    </div>
  );
}
