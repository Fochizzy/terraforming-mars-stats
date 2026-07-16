'use client';

type PlayerOption = {
  id: string;
  displayName: string;
};

type PlayerComparisonSelectProps = {
  players: PlayerOption[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
};

export function PlayerComparisonSelect({
  players,
  selectedId,
  onChange,
}: PlayerComparisonSelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label
        htmlFor="player-comparison-select"
        style={{
          color: 'rgb(253,186,116)',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        Compare with player
      </label>
      <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <select
          id="player-comparison-select"
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          style={{
            background: 'rgba(7,10,15,0.82)',
            border: '1px solid rgba(192,162,127,0.28)',
            borderRadius: '0.65rem',
            boxShadow: 'inset 0 1px 0 rgba(255,231,200,0.05)',
            color: 'var(--tm-text)',
            cursor: 'pointer',
            fontFamily: 'var(--tm-font-body)',
            fontSize: '0.82rem',
            maxWidth: '18rem',
            outline: 'none',
            padding: '0.38rem 0.7rem',
            width: '100%',
          }}
          value={selectedId ?? ''}
          onFocus={(e) => {
            (e.currentTarget as HTMLSelectElement).style.boxShadow =
              '0 0 0 2px rgba(249,115,22,0.5), inset 0 1px 0 rgba(255,231,200,0.05)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLSelectElement).style.boxShadow =
              'inset 0 1px 0 rgba(255,231,200,0.05)';
          }}
        >
          <option value="">No player selected</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>

        {selectedId !== null && (
          <button
            aria-label="Clear comparison"
            onClick={() => onChange(null)}
            style={{
              background: 'rgba(120,113,108,0.15)',
              border: '1px solid rgba(120,113,108,0.28)',
              borderRadius: '0.65rem',
              color: 'rgb(168,162,158)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              padding: '0.38rem 0.6rem',
              transition: 'background 120ms ease, color 120ms ease',
              whiteSpace: 'nowrap',
            }}
            type="button"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,113,108,0.28)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgb(214,211,209)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(120,113,108,0.15)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgb(168,162,158)';
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
