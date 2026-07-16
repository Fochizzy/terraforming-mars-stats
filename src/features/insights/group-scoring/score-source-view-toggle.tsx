'use client';

type View = 'bar' | 'radar';

type ScoreSourceViewToggleProps = {
  value: View;
  onChange: (view: View) => void;
};

const OPTIONS: Array<{ id: View; label: string }> = [
  { id: 'bar', label: 'Bar chart' },
  { id: 'radar', label: 'Radar profile' },
];

export function ScoreSourceViewToggle({ value, onChange }: ScoreSourceViewToggleProps) {
  return (
    <div
      aria-label="Chart view"
      role="group"
      style={{
        display: 'inline-flex',
        background: 'rgba(8, 10, 15, 0.62)',
        border: '1px solid rgba(120, 113, 108, 0.32)',
        borderRadius: '999px',
        gap: 0,
        padding: '0.18rem',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            aria-pressed={active}
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              background: active
                ? 'linear-gradient(180deg, rgba(201,119,56,0.78), rgba(181,83,18,0.78))'
                : 'transparent',
              border: 'none',
              borderRadius: '999px',
              color: active ? 'rgb(255, 237, 213)' : 'rgb(168, 162, 158)',
              cursor: 'pointer',
              fontFamily: 'var(--tm-font-body)',
              fontSize: '0.78rem',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.03em',
              padding: '0.35rem 0.9rem',
              transition: 'background 140ms ease, color 140ms ease',
              outline: 'none',
            }}
            type="button"
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 0 2px rgba(249,115,22,0.6)';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
