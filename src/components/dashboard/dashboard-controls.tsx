'use client';

import type { CSSProperties } from 'react';
import {
  FilterToolbarField,
  FilterToolbarGroup,
} from '@/components/foundations';

export type DashboardSelectOption = {
  id: string;
  label: string;
  disabled?: boolean;
  unavailable?: boolean;
};

function DashboardSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string | null;
  options: readonly DashboardSelectOption[];
  onChange: (value: string | null) => void;
  placeholder: string;
}) {
  return (
    <FilterToolbarField label={label}>
      <select
        className="tm-input tm-focus-ring min-h-11 min-w-44 max-w-full"
        disabled={options.length === 0}
        id={id}
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ''}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            disabled={option.disabled || option.unavailable}
            key={option.id}
            value={option.id}
          >
            {option.label}
            {option.unavailable ? ' (Unavailable)' : ''}
          </option>
        ))}
      </select>
    </FilterToolbarField>
  );
}

export function DashboardEntitySelector({
  id = 'dashboard-entity',
  label = 'Entity',
  value,
  options,
  onChange,
}: {
  id?: string;
  label?: string;
  value: string | null;
  options: readonly DashboardSelectOption[];
  onChange: (value: string | null) => void;
}) {
  return (
    <DashboardSelect
      id={id}
      label={label}
      onChange={onChange}
      options={options}
      placeholder="Choose an entity"
      value={value}
    />
  );
}

export function DashboardMetricSelector({
  id = 'dashboard-metric',
  label = 'Metric',
  value,
  options,
  onChange,
}: {
  id?: string;
  label?: string;
  value: string | null;
  options: readonly DashboardSelectOption[];
  onChange: (value: string | null) => void;
}) {
  return (
    <DashboardSelect
      id={id}
      label={label}
      onChange={onChange}
      options={options}
      placeholder="Choose a metric"
      value={value}
    />
  );
}

export type SelectableLegendItem = {
  id: string;
  label: string;
  color?: string;
  disabled?: boolean;
  unavailable?: boolean;
};

export function SelectableDashboardLegend({
  label = 'Chart legend',
  items,
  activeItemId,
  onChange,
}: {
  label?: string;
  items: readonly SelectableLegendItem[];
  activeItemId: string | null;
  onChange: (itemId: string | null) => void;
}) {
  return (
    <FilterToolbarGroup label={label}>
      {items.map((item) => {
        const selected = item.id === activeItemId;
        const disabled = item.disabled || item.unavailable;
        const stateLabel = item.unavailable
          ? 'Unavailable'
          : selected
            ? 'Selected'
            : 'Available';
        const markerStyle = item.color
          ? ({ backgroundColor: item.color } satisfies CSSProperties)
          : undefined;
        return (
          <button
            aria-label={`${item.label}. ${stateLabel}`}
            aria-pressed={selected}
            className="tm-dashboard-legend-button tm-focus-ring"
            data-selected={selected ? 'true' : 'false'}
            disabled={disabled}
            key={item.id}
            onClick={() => onChange(selected ? null : item.id)}
            title={item.label}
            type="button"
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full border border-white/30"
              style={markerStyle}
            />
            <span className="min-w-0 break-words text-left">{item.label}</span>
            <span className="text-[0.65rem] uppercase tracking-[0.08em]">
              {stateLabel}
            </span>
          </button>
        );
      })}
    </FilterToolbarGroup>
  );
}

export type DashboardSelectionLabels = {
  entity: string | null;
  metric: string | null;
  item: string | null;
  legend: string | null;
};

export function DashboardSelectionSummary({
  labels,
}: {
  labels: DashboardSelectionLabels;
}) {
  const itemSummary = labels.item
    ? `Focused item: ${labels.item}.`
    : 'No data point selected.';
  const legendSummary = labels.legend
    ? `Legend: ${labels.legend}.`
    : 'All available series shown.';
  return (
    <p
      aria-atomic="true"
      aria-live="polite"
      className="tm-muted-copy min-w-0 text-sm"
      data-dashboard-selection-summary
    >
      {labels.entity ? `Entity: ${labels.entity}. ` : 'No entity. '}
      {labels.metric ? `Metric: ${labels.metric}. ` : 'No metric. '}
      {itemSummary} {legendSummary}
    </p>
  );
}

export function ClearDashboardSelectionButton({
  disabled = false,
  onClear,
}: {
  disabled?: boolean;
  onClear: () => void;
}) {
  return (
    <button
      className="tm-button-secondary tm-focus-ring min-h-11"
      disabled={disabled}
      onClick={onClear}
      type="button"
    >
      Clear selection
    </button>
  );
}
