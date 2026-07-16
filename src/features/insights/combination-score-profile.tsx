'use client';

import { useState } from 'react';

// ─── Category configuration ────────────────────────────────────────────────────

type CategoryId =
  | 'terraformRating'
  | 'cardPoints'
  | 'otherCard'
  | 'greenery'
  | 'cities'
  | 'milestones'
  | 'awards'
  | 'jovian'
  | 'microbe'
  | 'animal';

type CategoryConfig = {
  label: string;
  icon: string;
  altText: string;
};

const scoreCategories: Record<CategoryId, CategoryConfig> = {
  terraformRating: {
    label: 'Terraform Rating',
    icon: '/icons/Terraform_Rating.png',
    altText: 'Terraform Rating badge',
  },
  cardPoints: {
    label: 'Card Points',
    icon: '/icons/Card_Points.png',
    altText: 'Card Points badge',
  },
  otherCard: {
    label: 'Other Card',
    icon: '/icons/Other_Card.png',
    altText: 'Other Card badge',
  },
  greenery: {
    label: 'Greenery',
    icon: '/icons/Greenery.png',
    altText: 'Greenery badge',
  },
  cities: {
    label: 'Cities',
    icon: '/icons/City.png',
    altText: 'Cities badge',
  },
  milestones: {
    label: 'Milestones',
    icon: '/icons/Milestones.png',
    altText: 'Milestones badge',
  },
  awards: {
    label: 'Awards',
    icon: '/icons/Awards.png',
    altText: 'Awards badge',
  },
  jovian: {
    label: 'Jovian',
    icon: '/icons/Jovian.png',
    altText: 'Jovian badge',
  },
  microbe: {
    label: 'Microbe',
    icon: '/icons/Microbe.png',
    altText: 'Microbe badge',
  },
  animal: {
    label: 'Animal',
    icon: '/icons/Animal.png',
    altText: 'Animal badge',
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ScoreProfileEntry = {
  categoryId: CategoryId;
  value: number;
};

type TooltipData = {
  categoryId: CategoryId;
  value: number;
  total: number;
  anchorY: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function safePercent(value: number, total: number): string | null {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(value)) return null;
  const pct = (value / total) * 100;
  return `${pct.toFixed(1)}%`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreProfileHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h2
        style={{
          color: 'var(--tm-dust-300)',
          fontFamily: 'var(--tm-font-display)',
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          marginBottom: '0.4rem',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: '#a8a29e',
          fontSize: '0.82rem',
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ─── Badge with fallback ────────────────────────────────────────────────────────

function CategoryBadge({ config }: { config: CategoryConfig }) {
  const [failed, setFailed] = useState(false);
  const size = 32;

  if (failed) {
    return (
      <span
        aria-label={config.altText}
        style={{
          alignItems: 'center',
          color: 'var(--tm-copper-400)',
          display: 'flex',
          fontSize: '0.6rem',
          fontWeight: 700,
          height: size,
          justifyContent: 'center',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          width: size,
        }}
      >
        {config.label.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={config.altText}
      height={size}
      onError={() => setFailed(true)}
      src={config.icon}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))',
        flexShrink: 0,
        height: size,
        objectFit: 'contain',
        width: size,
      }}
      width={size}
    />
  );
}

// ─── Tooltip ───────────────────────────────────────────────────────────────────

function ScoreTooltip({ data }: { data: TooltipData }) {
  const config = scoreCategories[data.categoryId];
  const pct = safePercent(data.value, data.total);

  return (
    <div
      aria-live="polite"
      role="tooltip"
      style={{
        background: '#13191f',
        border: '1px solid rgba(214,130,66,0.38)',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(4,6,10,0.65)',
        color: 'var(--tm-text)',
        fontSize: '0.78rem',
        left: '50%',
        lineHeight: 1.6,
        maxWidth: '14rem',
        minWidth: '11rem',
        padding: '0.6rem 0.8rem',
        pointerEvents: 'none',
        position: 'absolute',
        top: data.anchorY,
        transform: 'translateX(-50%)',
        zIndex: 20,
      }}
    >
      {/* close on esc – handled by parent */}
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.35rem',
        }}
      >
        <CategoryBadge config={config} />
        <strong style={{ color: 'var(--tm-dust-300)', fontFamily: 'var(--tm-font-display)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
          {config.label}
        </strong>
      </div>
      <p style={{ margin: 0 }}>
        <span style={{ color: '#9bd8f4', fontWeight: 600 }}>{formatValue(data.value)}</span>
        {' '}avg pts
        {pct !== null && (
          <span style={{ color: '#78716c' }}>
            {' · '}{pct} of total
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Chart row ─────────────────────────────────────────────────────────────────

type ScoreChartRowProps = {
  categoryId: CategoryId;
  fillPercent: number;
  isHighest: boolean;
  isSecond: boolean;
  onTooltipOpen: (data: TooltipData) => void;
  onTooltipClose: () => void;
  rank: number;
  total: number;
  value: number;
};

function ScoreChartRow({
  categoryId,
  fillPercent,
  isHighest,
  isSecond,
  onTooltipClose,
  onTooltipOpen,
  rank,
  total,
  value,
}: ScoreChartRowProps) {
  const [hovered, setHovered] = useState(false);
  const config = scoreCategories[categoryId];

  const barColor = isHighest
    ? '#4db6e8'
    : isSecond
      ? '#3a9ec8'
      : 'rgba(56,189,248,0.55)';

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    setHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = e.currentTarget.closest('[data-chart-container]')?.getBoundingClientRect();
    const topOffset = containerRect ? rect.top - containerRect.top : 0;
    onTooltipOpen({ categoryId, value, total, anchorY: topOffset });
  }

  function handleMouseLeave() {
    setHovered(false);
    onTooltipClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hovered) {
        setHovered(false);
        onTooltipClose();
      } else {
        setHovered(true);
        const rect = e.currentTarget.getBoundingClientRect();
        const containerRect = e.currentTarget.closest('[data-chart-container]')?.getBoundingClientRect();
        const topOffset = containerRect ? rect.top - containerRect.top : 0;
        onTooltipOpen({ categoryId, value, total, anchorY: topOffset });
      }
    }
    if (e.key === 'Escape') {
      setHovered(false);
      onTooltipClose();
    }
  }

  return (
    <div
      aria-label={`${config.label}: ${formatValue(value)} average victory points`}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="row"
      style={{
        alignItems: 'center',
        borderRadius: '8px',
        display: 'grid',
        gap: '0.5rem',
        gridTemplateColumns: '2rem minmax(0, 7.5rem) 1fr auto',
        minHeight: '44px',
        padding: '0.25rem 0.5rem',
        position: 'relative',
        transition: 'background 160ms ease',
        ...(hovered
          ? { background: 'rgba(249,115,22,0.07)', outline: '1px solid rgba(249,115,22,0.28)', outlineOffset: '-1px' }
          : {}),
      }}
      tabIndex={0}
    >
      {/* Badge */}
      <div
        aria-hidden="true"
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <CategoryBadge config={config} />
      </div>

      {/* Category label */}
      <span
        style={{
          color: '#e7e0d8',
          fontSize: '0.85rem',
          lineHeight: 1.25,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={config.label}
      >
        {config.label}
      </span>

      {/* Bar track + fill */}
      <div
        aria-hidden="true"
        style={{
          background: 'rgba(12,15,20,0.72)',
          borderRadius: '999px',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
          height: '0.55rem',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            background: barColor,
            borderRadius: '999px',
            height: '100%',
            transition: 'width 400ms cubic-bezier(0.22,0.61,0.36,1)',
            width: `${fillPercent}%`,
          }}
        />
      </div>

      {/* Numeric value */}
      <span
        style={{
          color: isHighest ? '#9bd8f4' : '#c8bfb5',
          fontFamily: 'var(--tm-font-display)',
          fontSize: '0.8rem',
          fontWeight: isHighest || isSecond ? 700 : 500,
          minWidth: '3rem',
          textAlign: 'right',
        }}
      >
        {formatValue(value)}
      </span>

      {/* rank visually hidden for screen readers */}
      <span
        style={{
          clip: 'rect(0,0,0,0)',
          height: '1px',
          overflow: 'hidden',
          position: 'absolute',
          whiteSpace: 'nowrap',
          width: '1px',
        }}
      >
        Ranked {rank} of 10
      </span>
    </div>
  );
}

// ─── Chart body ────────────────────────────────────────────────────────────────

function ScoreChart({ entries }: { entries: ScoreProfileEntry[] }) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (entries.length === 0) return null;

  // Sort highest → lowest
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, e) => sum + (Number.isFinite(e.value) && e.value > 0 ? e.value : 0), 0);
  const max = sorted[0]?.value ?? 0;
  const secondValue = sorted[1]?.value ?? 0;

  // Determine a nice x-axis scale
  const upperBound = max <= 0 ? 1 : Math.ceil(max / 5) * 5;
  const gridStep = upperBound <= 20 ? 5 : upperBound <= 40 ? 10 : 15;
  const gridLines = [];
  for (let v = gridStep; v <= upperBound; v += gridStep) {
    gridLines.push(v);
  }

  return (
    <div
      data-chart-container
      style={{ position: 'relative' }}
    >
      {/* Tooltip */}
      {tooltip !== null && (
        <ScoreTooltip data={tooltip} />
      )}

      {/* X-axis grid overlay (decorative) */}
      <div
        aria-hidden="true"
        style={{
          bottom: '1.6rem',
          insetInline: 'calc(2rem + 0.5rem + 7.5rem + 0.5rem)',
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
        }}
      >
        {gridLines.map((v) => (
          <div
            key={v}
            style={{
              borderLeft: '1px solid rgba(192,162,127,0.12)',
              bottom: 0,
              left: `${(v / upperBound) * 100}%`,
              position: 'absolute',
              top: 0,
            }}
          />
        ))}
      </div>

      {/* Rows */}
      <div
        aria-label="Score breakdown chart"
        role="rowgroup"
        style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
      >
        {sorted.map((entry, index) => (
          <ScoreChartRow
            categoryId={entry.categoryId}
            fillPercent={max > 0 ? Math.max(1, (entry.value / upperBound) * 100) : 1}
            isHighest={index === 0}
            isSecond={index === 1 && entry.value === secondValue}
            key={entry.categoryId}
            onTooltipClose={() => setTooltip(null)}
            onTooltipOpen={(data) => setTooltip(data)}
            rank={index + 1}
            total={total}
            value={entry.value}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          fontSize: '0.68rem',
          justifyContent: 'space-between',
          marginLeft: 'calc(2rem + 0.5rem + 7.5rem + 0.5rem)',
          marginTop: '0.4rem',
          paddingRight: '3.5rem',
        }}
      >
        <span style={{ color: '#6b6560' }}>0</span>
        {gridLines.map((v) => (
          <span key={v} style={{ color: '#6b6560' }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

export type CombinationScoreProfileProps = {
  title: string;
  entries: ScoreProfileEntry[];
};

export function CombinationScoreProfile({ title, entries }: CombinationScoreProfileProps) {
  const hasData = entries.some((e) => Number.isFinite(e.value));

  return (
    <section
      aria-label={title}
      style={{
        background: 'linear-gradient(180deg, rgba(29,35,43,0.92), rgba(11,14,20,0.94))',
        border: '1px solid rgba(192,162,127,0.38)',
        borderRadius: '1.25rem',
        boxShadow:
          '0 16px 32px rgba(4,6,10,0.45), inset 0 1px 0 rgba(255,226,184,0.10)',
        overflow: 'hidden',
        padding: '1.25rem 1.25rem 1rem',
        position: 'relative',
      }}
    >
      {/* subtle corner highlight that matches tm-panel */}
      <div
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,216,168,0.07), transparent 22%, transparent 74%, rgba(99,175,214,0.05))',
          inset: 0,
          pointerEvents: 'none',
          position: 'absolute',
        }}
      />

      <div style={{ position: 'relative' }}>
        <ScoreProfileHeader
          description="Average victory points broken out by where they came from, showing which sources drive the scores."
          title={title}
        />

        {hasData ? (
          <ScoreChart entries={entries} />
        ) : (
          <p
            style={{
              color: '#78716c',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
            }}
          >
            Score-source averages will appear here after finalized games exist.
          </p>
        )}
      </div>

      {/* reduced-motion: disable bar transitions */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-chart-container] div { transition: none !important; }
        }
        [role="row"]:focus-visible {
          outline: 2px solid rgba(249,115,22,0.72) !important;
          outline-offset: 2px;
        }
      `}</style>
    </section>
  );
}
