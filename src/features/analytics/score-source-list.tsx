'use client';

import { useState } from 'react';
import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';
import { GlossaryLink } from '@/features/glossary/glossary-link';
import { getSupabaseGameAssetUrl } from '@/lib/assets/supabase-game-assets';

// Pure helper — inlined here so this client component has no server-only imports.
function buildScoreSourceEntries(row: ScoreSourceAverages) {
  return [
    { label: 'Terraform Rating', value: row.averageTrPoints },
    { label: 'Card Points', value: row.averageCardPoints },
    { label: 'Other Card', value: row.averageOtherCardPoints },
    { label: 'Greenery', value: row.averageGreeneryPoints },
    { label: 'Cities', value: row.averageCitiesPoints },
    { label: 'Milestones', value: row.averageMilestonePoints },
    { label: 'Awards', value: row.averageAwardPoints },
    { label: 'Jovian', value: row.averageJovianPoints },
    { label: 'Microbe', value: row.averageMicrobePoints },
    { label: 'Animal', value: row.averageAnimalPoints },
  ];
}

// ---------------------------------------------------------------------------
// Compact axis variants keep the charts crisp without downloading the larger
// point-source artwork used by the Scoring DNA panel.
// ---------------------------------------------------------------------------
const SCORE_SOURCE_ICONS: Record<string, string> = {
  'Terraform Rating': getSupabaseGameAssetUrl(
    'tm-score-icons',
    'axis/Terraform_Rating.png',
  ),
  'Card Points': getSupabaseGameAssetUrl('tm-score-icons', 'axis/Card_Points.png'),
  'Other Card': getSupabaseGameAssetUrl('tm-score-icons', 'axis/Other_Card.png'),
  Greenery: getSupabaseGameAssetUrl('tm-score-icons', 'axis/Greenery.png'),
  Cities: getSupabaseGameAssetUrl('tm-score-icons', 'axis/City.png'),
  Milestones: getSupabaseGameAssetUrl('tm-score-icons', 'axis/Milestones.png'),
  Awards: getSupabaseGameAssetUrl('tm-score-icons', 'axis/Awards.png'),
  Jovian: getSupabaseGameAssetUrl('tm-score-icons', 'axis/Jovian.png'),
  Microbe: getSupabaseGameAssetUrl('tm-score-icons', 'axis/Microbe.png'),
  Animal: getSupabaseGameAssetUrl('tm-score-icons', 'axis/Animal.png'),
};

/** Maps each score-source row label to its glossary term anchor. */
const scoreSourceSlugs: Record<string, string> = {
  'Terraform Rating': 'terraform-rating',
  'Card Points': 'card-points',
  'Other Card': 'other-card-points',
  Greenery: 'greenery-points',
  Cities: 'city-points',
  Milestones: 'milestone-points',
  Awards: 'award-points',
  Jovian: 'jovian-points',
  Microbe: 'microbe-points',
  Animal: 'animal-points',
};

// Copper gradient colours for pie slices — cycles through shades
const PIE_COLORS = [
  '#ad5129', '#c97738', '#dda15d', '#ecd09f',
  '#8e3d1f', '#b86330', '#d4924e', '#f0bb7a',
  '#7a3018', '#c28548',
];

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Control types
// ---------------------------------------------------------------------------
type ChartType = 'horizontal-bar' | 'vertical-bar' | 'pie';
type Metric = 'average' | 'percentage';
type SortOrder = 'high-low' | 'low-high' | 'alpha';
type AdditionalView = 'breakdown' | 'percentage' | 'trend' | 'distribution';

// ---------------------------------------------------------------------------
// Small reusable select control
// ---------------------------------------------------------------------------
function ControlSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--tm-copper-400)',
          fontFamily: 'var(--tm-font-display)',
        }}
      >
        {label}
      </span>
      <div className="relative flex items-center">
        <select
          className="appearance-none pr-7 pl-2 py-1.5 text-sm rounded-lg cursor-pointer"
          style={{
            background: 'rgba(12, 15, 20, 0.8)',
            border: '1px solid rgba(214,130,66,0.35)',
            color: 'var(--tm-text)',
            minWidth: 148,
          }}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {/* chevron */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-2"
          fill="none"
          height="10"
          viewBox="0 0 10 10"
          width="10"
        >
          <path
            d="M2 3.5l3 3 3-3"
            stroke="var(--tm-copper-400)"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--tm-copper-400)',
          fontFamily: 'var(--tm-font-display)',
        }}
      >
        {label}
      </span>
      <button
        aria-checked={checked}
        aria-label={label}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
        role="switch"
        style={{
          background: checked
            ? 'linear-gradient(90deg, var(--tm-rust-600), var(--tm-copper-400))'
            : 'rgba(12,15,20,0.8)',
          border: '1px solid rgba(214,130,66,0.35)',
        }}
        type="button"
        onClick={() => onChange(!checked)}
      >
        <span
          className="inline-block h-4 w-4 rounded-full transition-transform"
          style={{
            background: checked ? 'white' : 'var(--tm-metal-500)',
            transform: checked ? 'translateX(24px)' : 'translateX(4px)',
          }}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Additional view button
// ---------------------------------------------------------------------------
const ADDITIONAL_VIEW_ICONS: Record<AdditionalView, string> = {
  breakdown: '▐',
  percentage: '◑',
  trend: '∿',
  distribution: '▁▂▄',
};

function AdditionalViewButton({
  id,
  title,
  description,
  active,
  onClick,
}: {
  id: AdditionalView;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-start gap-3 rounded-xl p-3 text-left transition-colors"
      style={{
        background: active ? 'rgba(173,81,41,0.18)' : 'rgba(12,15,20,0.5)',
        border: active
          ? '1px solid rgba(214,130,66,0.55)'
          : '1px solid rgba(214,130,66,0.18)',
        flex: '1 1 120px',
        minWidth: 0,
      }}
      type="button"
      onClick={onClick}
    >
      <span
        aria-hidden="true"
        style={{
          color: 'var(--tm-copper-400)',
          fontSize: 18,
          lineHeight: 1,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {ADDITIONAL_VIEW_ICONS[id]}
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold" style={{ color: 'var(--tm-dust-300)' }}>
          {title}
        </span>
        <span className="text-xs" style={{ color: 'var(--tm-muted)' }}>
          {description}
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Chart axis ticks (horizontal-bar)
// ---------------------------------------------------------------------------
function AxisTicks({ maxValue }: { maxValue: number }) {
  const step = maxValue <= 10 ? 5 : maxValue <= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= Math.ceil(maxValue / step) * step; t += step) {
    ticks.push(t);
  }
  const highest = ticks[ticks.length - 1] ?? maxValue;
  return (
    <div
      className="flex justify-between pt-1"
      style={{ color: 'var(--tm-muted)', fontSize: 11 }}
    >
      {ticks.map((t) => (
        <span
          key={t}
          style={{
            width: `${(t / highest) * 100}%`,
            textAlign: 'left',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bar chart
// ---------------------------------------------------------------------------
type Entry = { label: string; value: number; displayValue: number };

function HorizontalBarChart({
  sorted,
  maxValue,
  showValues,
  formatDisplay,
}: {
  sorted: Entry[];
  maxValue: number;
  showValues: boolean;
  formatDisplay: (v: number) => string;
}) {
  return (
    <>
      <div className="grid gap-2.5">
        {sorted.map((entry) => {
          const pct = Math.max(
            (entry.displayValue / maxValue) * 100,
            entry.displayValue > 0 ? 3 : 0,
          );
          const icon = SCORE_SOURCE_ICONS[entry.label];
          return (
            <div className="flex items-center gap-2" key={entry.label}>
              {/* icon */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={entry.label}
                    height={28}
                    src={icon}
                    style={{ objectFit: 'contain', borderRadius: 4 }}
                    width={28}
                  />
                ) : null}
              </div>

              {/* label */}
              <span
                className="text-sm shrink-0"
                style={{ color: 'var(--tm-dust-300)', width: 120 }}
              >
                {scoreSourceSlugs[entry.label] ? (
                  <GlossaryLink slug={scoreSourceSlugs[entry.label]}>
                    {entry.label}
                  </GlossaryLink>
                ) : (
                  entry.label
                )}
              </span>

              {/* bar + inline value */}
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <div className="tm-score-track flex-1">
                  <div
                    className="tm-score-fill"
                    style={{ width: `${pct}%`, transition: 'width 0.35s ease' }}
                  />
                </div>
                {showValues && (
                  <span
                    className="shrink-0 text-sm tabular-nums"
                    style={{
                      color: 'var(--tm-dust-300)',
                      minWidth: 36,
                      textAlign: 'right',
                    }}
                  >
                    {formatDisplay(entry.displayValue)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* axis */}
      <div style={{ paddingLeft: 28 + 8 + 120 + 8 }}>
        <AxisTicks maxValue={maxValue} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Vertical bar chart
// ---------------------------------------------------------------------------
function VerticalBarChart({
  sorted,
  maxValue,
  showValues,
  formatDisplay,
}: {
  sorted: Entry[];
  maxValue: number;
  showValues: boolean;
  formatDisplay: (v: number) => string;
}) {
  const BAR_HEIGHT = 180; // px available for bars
  const BAR_WIDTH = 36;
  const GAP = 8;
  const totalWidth = sorted.length * (BAR_WIDTH + GAP) - GAP;

  return (
    <div className="flex flex-col gap-2 overflow-x-auto pb-1">
      {/* bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: GAP,
          height: BAR_HEIGHT + (showValues ? 20 : 0),
          minWidth: totalWidth,
        }}
      >
        {sorted.map((entry, i) => {
          const barH = Math.max(
            (entry.displayValue / maxValue) * BAR_HEIGHT,
            entry.displayValue > 0 ? 4 : 0,
          );
          return (
            <div
              key={entry.label}
              style={{
                width: BAR_WIDTH,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: BAR_HEIGHT + (showValues ? 20 : 0),
              }}
            >
              {showValues && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--tm-dust-300)',
                    marginBottom: 3,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDisplay(entry.displayValue)}
                </span>
              )}
              <div
                style={{
                  width: BAR_WIDTH,
                  height: barH,
                  borderRadius: '4px 4px 0 0',
                  background: `linear-gradient(180deg, ${PIE_COLORS[i % PIE_COLORS.length]}, ${PIE_COLORS[(i + 2) % PIE_COLORS.length]})`,
                  boxShadow: '0 0 8px rgba(209,120,56,0.18)',
                  transition: 'height 0.35s ease',
                  flexShrink: 0,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* x-axis labels with icons */}
      <div
        style={{
          display: 'flex',
          gap: GAP,
          minWidth: totalWidth,
          borderTop: '1px solid rgba(214,130,66,0.18)',
          paddingTop: 6,
        }}
      >
        {sorted.map((entry) => {
          const icon = SCORE_SOURCE_ICONS[entry.label];
          return (
            <div
              key={entry.label}
              style={{
                width: BAR_WIDTH,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={entry.label}
                  height={22}
                  src={icon}
                  style={{ objectFit: 'contain', borderRadius: 3 }}
                  width={22}
                />
              ) : null}
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--tm-muted)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                  maxWidth: BAR_WIDTH,
                }}
              >
                {entry.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pie / Donut chart (SVG)
// ---------------------------------------------------------------------------
function PieChart({
  sorted,
  showValues,
  formatDisplay,
}: {
  sorted: Entry[];
  showValues: boolean;
  formatDisplay: (v: number) => string;
}) {
  const total = sorted.reduce((s, e) => s + e.displayValue, 0) || 1;
  const CX = 110;
  const CY = 110;
  const R = 90;
  const INNER_R = 50; // donut hole

  // Build pie slices
  type Slice = {
    label: string;
    value: number;
    color: string;
    startAngle: number;
    endAngle: number;
    midAngle: number;
  };
  const slices: Slice[] = [];
  let cumAngle = -Math.PI / 2; // start at top
  sorted.forEach((entry, i) => {
    const sweep = (entry.displayValue / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + sweep;
    const midAngle = cumAngle + sweep / 2;
    slices.push({
      label: entry.label,
      value: entry.displayValue,
      color: PIE_COLORS[i % PIE_COLORS.length],
      startAngle,
      endAngle,
      midAngle,
    });
    cumAngle = endAngle;
  });

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  function arcPath(cx: number, cy: number, r: number, innerR: number, startAngle: number, endAngle: number) {
    const sweep = endAngle - startAngle;
    const largeArc = sweep > Math.PI ? 1 : 0;
    const o1 = polarToCartesian(cx, cy, r, startAngle);
    const o2 = polarToCartesian(cx, cy, r, endAngle);
    const i1 = polarToCartesian(cx, cy, innerR, endAngle);
    const i2 = polarToCartesian(cx, cy, innerR, startAngle);
    return [
      `M ${o1.x} ${o1.y}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
      `L ${i1.x} ${i1.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
      'Z',
    ].join(' ');
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* SVG donut */}
      <svg
        aria-label="Score source pie chart"
        height={CY * 2}
        style={{ flexShrink: 0 }}
        width={CX * 2}
      >
        {slices.map((s) => (
          <path
            d={arcPath(CX, CY, R, INNER_R, s.startAngle, s.endAngle)}
            fill={s.color}
            key={s.label}
            opacity={0.92}
            stroke="rgba(12,15,20,0.6)"
            strokeWidth={1.5}
          >
            <title>
              {s.label}: {formatDisplay(s.value)}
            </title>
          </path>
        ))}
        {/* centre label */}
        <text
          dominantBaseline="middle"
          fill="var(--tm-dust-300)"
          fontSize={11}
          textAnchor="middle"
          x={CX}
          y={CY - 6}
        >
          Total
        </text>
        <text
          dominantBaseline="middle"
          fill="var(--tm-copper-400)"
          fontSize={15}
          fontWeight="bold"
          textAnchor="middle"
          x={CX}
          y={CY + 9}
        >
          {formatAverage(total)}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-0" style={{ flex: '1 1 180px' }}>
        {slices.map((s, i) => {
          const icon = SCORE_SOURCE_ICONS[s.label];
          const pct = ((s.value / total) * 100).toFixed(1);
          return (
            <div className="flex items-center gap-2" key={s.label}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: PIE_COLORS[i % PIE_COLORS.length],
                  flexShrink: 0,
                }}
              />
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  height={18}
                  src={icon}
                  style={{ objectFit: 'contain', borderRadius: 2, flexShrink: 0 }}
                  width={18}
                />
              ) : null}
              <span className="text-xs truncate" style={{ color: 'var(--tm-dust-300)', flex: 1 }}>
                {scoreSourceSlugs[s.label] ? (
                  <GlossaryLink slug={scoreSourceSlugs[s.label]}>{s.label}</GlossaryLink>
                ) : (
                  s.label
                )}
              </span>
              {showValues && (
                <span
                  className="text-xs tabular-nums"
                  style={{ color: 'var(--tm-muted)', marginLeft: 'auto', flexShrink: 0 }}
                >
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function ScoreSourceList({
  scoreAverages,
}: {
  scoreAverages: ScoreSourceAverages | null;
}) {
  const [chartType, setChartType] = useState<ChartType>('horizontal-bar');
  const [metric, setMetric] = useState<Metric>('average');
  const [sortOrder, setSortOrder] = useState<SortOrder>('high-low');
  const [showValues, setShowValues] = useState(true);
  const [activeView, setActiveView] = useState<AdditionalView>('breakdown');

  if (!scoreAverages) {
    return (
      <p className="text-sm text-stone-400">
        No finalized score-source rows are available yet.
      </p>
    );
  }

  const rawEntries = buildScoreSourceEntries(scoreAverages);
  const total = rawEntries.reduce((s, e) => s + e.value, 0) || 1;

  // Apply metric transform
  const entries = rawEntries.map((e) => ({
    ...e,
    displayValue: metric === 'percentage' ? (e.value / total) * 100 : e.value,
  }));

  // Apply sort
  const sorted = [...entries].sort((a, b) => {
    if (sortOrder === 'high-low') return b.displayValue - a.displayValue;
    if (sortOrder === 'low-high') return a.displayValue - b.displayValue;
    return a.label.localeCompare(b.label);
  });

  const maxValue = Math.max(...sorted.map((e) => e.displayValue), 1);

  const formatDisplay = (v: number) =>
    metric === 'percentage' ? `${v.toFixed(1)}%` : formatAverage(v);

  // Keep activeView in sync with metric changes
  function handleMetricChange(m: Metric) {
    setMetric(m);
    if (m === 'percentage') setActiveView('percentage');
    else setActiveView('breakdown');
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Controls row ────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-end gap-3"
        style={{ borderBottom: '1px solid rgba(214,130,66,0.15)', paddingBottom: 16 }}
      >
        <ControlSelect
          label="Chart Type"
          options={[
            { value: 'horizontal-bar', label: '≡  Horizontal Bar' },
            { value: 'vertical-bar', label: '▐  Vertical Bar' },
            { value: 'pie', label: '◑  Pie / Donut' },
          ]}
          value={chartType}
          onChange={setChartType}
        />
        <ControlSelect
          label="Metric"
          options={[
            { value: 'average', label: 'Average Score' },
            { value: 'percentage', label: 'Percentage Share' },
          ]}
          value={metric}
          onChange={handleMetricChange}
        />
        <ControlSelect
          label="Sort By"
          options={[
            { value: 'high-low', label: 'Highest to Lowest' },
            { value: 'low-high', label: 'Lowest to Highest' },
            { value: 'alpha', label: 'Alphabetical' },
          ]}
          value={sortOrder}
          onChange={setSortOrder}
        />
        <div className="ml-auto">
          <ToggleSwitch checked={showValues} label="Show Values" onChange={setShowValues} />
        </div>
      </div>

      {/* ── Chart area ──────────────────────────────────────────── */}
      {chartType === 'horizontal-bar' && (
        <HorizontalBarChart
          formatDisplay={formatDisplay}
          maxValue={maxValue}
          showValues={showValues}
          sorted={sorted}
        />
      )}
      {chartType === 'vertical-bar' && (
        <VerticalBarChart
          formatDisplay={formatDisplay}
          maxValue={maxValue}
          showValues={showValues}
          sorted={sorted}
        />
      )}
      {chartType === 'pie' && (
        <PieChart
          formatDisplay={formatDisplay}
          showValues={showValues}
          sorted={sorted}
        />
      )}

      {/* ── Additional views ────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid rgba(214,130,66,0.15)',
          paddingTop: 16,
        }}
      >
        <p
          className="mb-3 text-xs uppercase tracking-widest"
          style={{ color: 'var(--tm-copper-400)', fontFamily: 'var(--tm-font-display)' }}
        >
          Additional Views
        </p>
        <div className="flex flex-wrap gap-2">
          <AdditionalViewButton
            active={activeView === 'breakdown'}
            description="Compare all sources"
            id="breakdown"
            title="Score Breakdown"
            onClick={() => {
              setActiveView('breakdown');
              setMetric('average');
              setChartType('horizontal-bar');
            }}
          />
          <AdditionalViewButton
            active={activeView === 'percentage'}
            description="Show relative contribution"
            id="percentage"
            title="Percentage View"
            onClick={() => {
              setActiveView('percentage');
              setMetric('percentage');
              setChartType('pie');
            }}
          />
          <AdditionalViewButton
            active={activeView === 'trend'}
            description="View historical trends"
            id="trend"
            title="Trend Over Time"
            onClick={() => {
              setActiveView('trend');
              setChartType('horizontal-bar');
            }}
          />
          <AdditionalViewButton
            active={activeView === 'distribution'}
            description="Score distribution"
            id="distribution"
            title="Distribution"
            onClick={() => {
              setActiveView('distribution');
              setChartType('vertical-bar');
            }}
          />
        </div>
      </div>
    </div>
  );
}
