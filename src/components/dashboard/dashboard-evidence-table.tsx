'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import {
  MissingDataNotice,
  TableContainer,
  type DataDisplayState,
} from '@/components/foundations';
import {
  formatMetricValue,
  type MetricValue,
} from '@/lib/metrics/metric-value';

export type DashboardEvidenceColumn<Row> = {
  id: string;
  header: string;
  align?: 'start' | 'numeric';
  render(row: Row): ReactNode;
};

export function DashboardMetricValue({
  value,
  unit,
}: {
  value: MetricValue;
  unit?: string;
}) {
  if (value.kind === 'missing') {
    return <MissingDataNotice />;
  }

  return (
    <span
      className={value.kind === 'unavailable' ? 'tm-missing-value' : undefined}
      data-metric-kind={value.kind}
    >
      {formatMetricValue(value)}
      {unit && value.kind !== 'unavailable' ? ` ${unit}` : ''}
    </span>
  );
}

export function DashboardEvidenceTable<Row>({
  label,
  caption,
  columns,
  rows,
  getRowId,
  getRowLabel,
  selectedRowId,
  state,
  onActivateRow,
}: {
  label: string;
  caption?: string;
  columns: readonly DashboardEvidenceColumn<Row>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  getRowLabel: (row: Row) => string;
  selectedRowId?: string | null;
  state?: DataDisplayState;
  onActivateRow?: (rowId: string) => void;
}) {
  const resolvedState =
    state ??
    (rows.length === 0
      ? ({ status: 'empty', title: 'No evidence rows' } as const)
      : ({ status: 'ready' } as const));
  const activate = (rowId: string) => onActivateRow?.(rowId);
  const handleKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    rowId: string,
  ) => {
    if (!onActivateRow) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(rowId);
    }
  };

  return (
    <TableContainer caption={caption} label={label} state={resolvedState}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              data-align={column.align === 'numeric' ? 'numeric' : undefined}
              key={column.id}
              scope="col"
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const rowId = getRowId(row);
          const interactive = onActivateRow !== undefined;
          const selected = rowId === selectedRowId;
          return (
            <tr
              aria-label={interactive ? `Focus ${getRowLabel(row)}` : undefined}
              aria-selected={interactive ? selected : undefined}
              className={interactive ? 'tm-dashboard-evidence-row tm-focus-ring' : undefined}
              data-selected={selected ? 'true' : 'false'}
              key={rowId}
              onClick={interactive ? () => activate(rowId) : undefined}
              onKeyDown={
                interactive ? (event) => handleKeyDown(event, rowId) : undefined
              }
              tabIndex={interactive ? 0 : undefined}
            >
              {columns.map((column) => (
                <td
                  data-align={column.align === 'numeric' ? 'numeric' : undefined}
                  key={column.id}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </TableContainer>
  );
}
