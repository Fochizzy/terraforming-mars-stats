'use client';

import { type ReactNode, useMemo, useState } from 'react';
import type {
  SelectionDialogData,
  SelectionStatRow,
} from '@/lib/db/selection-stats-repo';
import {
  SELECTION_NAME_LINK_CLASS,
  SelectionNameButton,
} from './selection-name-link';

type NamedStatRow = SelectionStatRow & { name: string };
type AugmentedRow = NamedStatRow & { globalPlays: number };

type SelectionKind = 'Corporation' | 'Prelude';

function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function formatPlayrate(plays: number, totalGames: number) {
  if (!totalGames || totalGames <= 0) {
    return '-';
  }
  return `${Math.round((plays / totalGames) * 100)}%`;
}

type ColumnType = 'number' | 'string';

type Column = {
  key: string;
  label: string;
  type: ColumnType;
  // Sort value; numbers sort numerically, strings alphabetically.
  value: (row: AugmentedRow) => number | string;
  render: (row: AugmentedRow) => ReactNode;
};

function buildColumns(
  scopeTotalGames: number,
  globalTotalGames: number,
  kind: SelectionKind,
  dialogData?: SelectionDialogData,
): Column[] {
  return [
    {
      key: 'name',
      label: 'Name',
      type: 'string',
      value: (row) => row.name,
      render: (row) => (
        <SelectionNameButton
          className={`${SELECTION_NAME_LINK_CLASS} inline-block text-left`}
          dialogData={dialogData}
          kind={kind}
          name={row.name}
        />
      ),
    },
    {
      key: 'plays',
      label: 'Plays',
      type: 'number',
      value: (row) => row.plays,
      render: (row) => row.plays,
    },
    {
      key: 'playrate',
      label: 'Playrate',
      type: 'number',
      value: (row) => row.plays,
      render: (row) => formatPlayrate(row.plays, scopeTotalGames),
    },
    {
      key: 'globalPlayrate',
      label: 'Global playrate',
      type: 'number',
      value: (row) => row.globalPlays,
      render: (row) => formatPlayrate(row.globalPlays, globalTotalGames),
    },
    {
      key: 'winRate',
      label: 'Win rate',
      type: 'number',
      value: (row) => row.win_rate,
      render: (row) => formatWinRate(row.win_rate),
    },
    {
      key: 'avgPlacement',
      label: 'Avg place',
      type: 'number',
      value: (row) => row.avg_placement,
      render: (row) => row.avg_placement,
    },
    {
      key: 'finishes',
      label: '1st/2nd/3rd+',
      type: 'number',
      value: (row) => row.first_place_finishes,
      render: (row) =>
        `${row.first_place_finishes}/${row.second_place_finishes}/${row.third_plus_finishes}`,
    },
    {
      key: 'avgPoints',
      label: 'Avg VP',
      type: 'number',
      value: (row) => row.avg_points,
      render: (row) => row.avg_points,
    },
    {
      key: 'tr',
      label: 'TR',
      type: 'number',
      value: (row) => row.avg_tr_points,
      render: (row) => row.avg_tr_points,
    },
    {
      key: 'cards',
      label: 'Cards',
      type: 'number',
      value: (row) => row.avg_card_points,
      render: (row) => row.avg_card_points,
    },
    {
      key: 'microbes',
      label: 'Microbes',
      type: 'number',
      value: (row) => row.avg_microbe_points,
      render: (row) => row.avg_microbe_points,
    },
    {
      key: 'animals',
      label: 'Animals',
      type: 'number',
      value: (row) => row.avg_animal_points,
      render: (row) => row.avg_animal_points,
    },
    {
      key: 'greenery',
      label: 'Greenery',
      type: 'number',
      value: (row) => row.avg_greenery_points,
      render: (row) => row.avg_greenery_points,
    },
    {
      key: 'cities',
      label: 'Cities',
      type: 'number',
      value: (row) => row.avg_cities_points,
      render: (row) => row.avg_cities_points,
    },
    {
      key: 'milestones',
      label: 'Milestones',
      type: 'number',
      value: (row) => row.avg_milestone_points,
      render: (row) => `${row.avg_milestone_points} (${row.avg_milestones_won})`,
    },
    {
      key: 'awards',
      label: 'Awards',
      type: 'number',
      value: (row) => row.avg_award_points,
      render: (row) => `${row.avg_award_points} (${row.avg_awards_won})`,
    },
  ];
}

export function SelectionStatTable(props: {
  rows: NamedStatRow[];
  scopeTotalGames: number;
  globalTotalGames: number;
  globalPlaysByName: Map<string, number>;
  kind: SelectionKind;
  dialogData?: SelectionDialogData;
}) {
  const columns = useMemo(
    () =>
      buildColumns(
        props.scopeTotalGames,
        props.globalTotalGames,
        props.kind,
        props.dialogData,
      ),
    [props.scopeTotalGames, props.globalTotalGames, props.kind, props.dialogData],
  );
  // Default to most-played first, matching the pre-sort behaviour.
  const [sortKey, setSortKey] = useState('plays');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const augmented = useMemo<AugmentedRow[]>(
    () =>
      props.rows.map((row) => ({
        ...row,
        globalPlays: props.globalPlaysByName.get(row.name) ?? 0,
      })),
    [props.rows, props.globalPlaysByName],
  );

  const sorted = useMemo(() => {
    const column = columns.find((entry) => entry.key === sortKey) ?? columns[0];
    const factor = direction === 'asc' ? 1 : -1;

    return [...augmented].sort((left, right) => {
      const leftValue = column.value(left);
      const rightValue = column.value(right);
      let comparison: number;

      if (typeof leftValue === 'string' || typeof rightValue === 'string') {
        comparison = String(leftValue).localeCompare(String(rightValue));
      } else {
        comparison = leftValue - rightValue;
      }

      // Stable tiebreak on name so equal values keep a predictable order.
      return comparison * factor || left.name.localeCompare(right.name);
    });
  }, [augmented, columns, sortKey, direction]);

  function toggleSort(key: string, type: ColumnType) {
    if (key === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    // Text columns read best A→Z; numeric columns most-interesting-first.
    setDirection(type === 'string' ? 'asc' : 'desc');
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="tm-data-label">
            {columns.map((column) => {
              const active = column.key === sortKey;

              return (
                <th
                  aria-sort={
                    active
                      ? direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="py-1 pr-3"
                  key={column.key}
                >
                  <button
                    className={`inline-flex items-center gap-1 whitespace-nowrap transition hover:text-stone-100 ${
                      active ? 'text-stone-100' : ''
                    }`}
                    onClick={() => toggleSort(column.key, column.type)}
                    type="button"
                  >
                    {column.label}
                    <span aria-hidden className="text-[9px] opacity-70">
                      {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr className="border-t border-white/5" key={row.name}>
              {columns.map((column) => (
                <td className="py-1 pr-3" key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
