'use client';

import styles from './score-profile-panel.module.css';

type ScoreSourceEntry = {
  label: string;
  value: number;
};

type ScoreProfilePanelProps = {
  entries: ScoreSourceEntry[];
  subjectName?: string | null;
};

type ScoreSourceDefinition = {
  accent: string;
  filename: string;
  label: string;
};

const STORAGE_BASE_URL =
  'https://qjtwgrjjwnqafbvkkfex.supabase.co/storage/v1/object/public/tm-score-icons';

const scoreSourceDefinitions: ScoreSourceDefinition[] = [
  { accent: '#4da8ff', filename: 'Terraform_Rating.png', label: 'Terraform Rating' },
  { accent: '#ff8b2c', filename: 'Card_Points.png', label: 'Card Points' },
  { accent: '#66a7ff', filename: 'Other_Card.png', label: 'Other Card' },
  { accent: '#a7d928', filename: 'Greenery.png', label: 'Greenery' },
  {
    accent: '#8b5cf6',
    filename: 'a5bca072-12a2-4080-863c-1b75c8a20889.png',
    label: 'Cities',
  },
  { accent: '#ffc12e', filename: 'Milestones.png', label: 'Milestones' },
  { accent: '#9b6cff', filename: 'Awards.png', label: 'Awards' },
  { accent: '#f28b24', filename: 'Jovian.png', label: 'Jovian' },
  { accent: '#28c7bd', filename: 'Microbe.png', label: 'Microbe' },
  { accent: '#ff9a28', filename: 'Animal.png', label: 'Animal' },
];

function formatPoints(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function getIdentityLabel(entries: Array<ScoreSourceDefinition & ScoreSourceEntry>) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const byLabel = Object.fromEntries(entries.map((entry) => [entry.label, entry.value]));
  const cardShare = ((byLabel['Card Points'] ?? 0) + (byLabel['Other Card'] ?? 0)) / total;
  const boardShare = ((byLabel.Cities ?? 0) + (byLabel.Greenery ?? 0)) / total;
  const engineShare =
    ((byLabel.Animal ?? 0) + (byLabel.Microbe ?? 0) + (byLabel.Jovian ?? 0)) / total;
  const trShare = (byLabel['Terraform Rating'] ?? 0) / total;

  if (cardShare >= 0.34) {
    return {
      description: 'Card scoring supplies an unusually large share of the final total.',
      label: 'Card-driven',
    };
  }

  if (boardShare >= 0.22) {
    return {
      description: 'Cities and greenery make the board a major source of points.',
      label: 'Board-focused',
    };
  }

  if (engineShare >= 0.16) {
    return {
      description: 'Resource engines and Jovian payoffs form a meaningful scoring lane.',
      label: 'Engine-heavy',
    };
  }

  if (trShare >= 0.34) {
    return {
      description: 'Terraform Rating is the clearest foundation of the scoring profile.',
      label: 'Terraforming-focused',
    };
  }

  return {
    description: 'No single scoring lane dominates the group’s average result.',
    label: 'Balanced',
  };
}

export function ScoreProfilePanel({ entries, subjectName }: ScoreProfilePanelProps) {
  const enrichedEntries = scoreSourceDefinitions
    .map((definition) => ({
      ...definition,
      value: entries.find((entry) => entry.label === definition.label)?.value ?? 0,
    }))
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));

  const total = enrichedEntries.reduce((sum, entry) => sum + entry.value, 0);

  if (total <= 0) {
    return (
      <section className="tm-panel">
        <h2 className="tm-panel-title text-lg font-semibold tracking-[0.08em]">
          {subjectName ? `Scoring DNA for ${subjectName}` : 'Group Scoring DNA'}
        </h2>
        <p className="mt-4 text-sm text-stone-400">
          Score-source averages will appear here after finalized games exist.
        </p>
      </section>
    );
  }

  const dominant = enrichedEntries[0];
  const secondary = enrichedEntries[1] ?? dominant;
  const identity = getIdentityLabel(enrichedEntries);
  const subject = subjectName ?? 'The group';

  return (
    <section className={`tm-panel ${styles.panel}`}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Average final-score composition</p>
          <h2 className="tm-panel-title text-lg font-semibold tracking-[0.08em]">
            {subjectName ? `Scoring DNA for ${subjectName}` : 'Group Scoring DNA'}
          </h2>
          <p className={styles.description}>
            See which scoring lanes define {subjectName ? `${subjectName}’s` : 'the group’s'}
            results and how much each source contributes.
          </p>
        </div>
        <div className={styles.identityBadge}>
          <span>Scoring identity</span>
          <strong>{identity.label}</strong>
        </div>
      </div>

      <div className={styles.metrics}>
        <article>
          <span>Average score</span>
          <strong>{formatPoints(total)}</strong>
          <small>points represented</small>
        </article>
        <article>
          <span>Primary strength</span>
          <strong>{dominant.label}</strong>
          <small>{Math.round((dominant.value / total) * 100)}% of the score</small>
        </article>
        <article>
          <span>Secondary lane</span>
          <strong>{secondary.label}</strong>
          <small>{formatPoints(secondary.value)} average points</small>
        </article>
      </div>

      <div className={styles.composition} aria-label="Average score composition">
        {enrichedEntries.map((entry) => {
          const share = (entry.value / total) * 100;
          return (
            <div
              className={styles.segment}
              key={entry.label}
              style={{
                '--score-accent': entry.accent,
                flexGrow: Math.max(entry.value, total * 0.018),
              } as React.CSSProperties}
              title={`${entry.label}: ${formatPoints(entry.value)} points (${Math.round(share)}%)`}
            >
              {share >= 7 ? (
                <>
                  <img alt="" aria-hidden="true" src={`${STORAGE_BASE_URL}/${entry.filename}`} />
                  <span>{Math.round(share)}%</span>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={styles.body}>
        <div className={styles.cards}>
          {enrichedEntries.map((entry, index) => {
            const share = (entry.value / total) * 100;
            return (
              <article
                className={styles.card}
                key={entry.label}
                style={{ '--score-accent': entry.accent } as React.CSSProperties}
              >
                <div className={styles.iconShell}>
                  <img alt="" aria-hidden="true" src={`${STORAGE_BASE_URL}/${entry.filename}`} />
                </div>
                <div className={styles.cardCopy}>
                  <div className={styles.cardHeading}>
                    <h3>{entry.label}</h3>
                    <span>#{index + 1}</span>
                  </div>
                  <div className={styles.cardValue}>
                    <strong>{formatPoints(entry.value)}</strong>
                    <span>avg points</span>
                  </div>
                  <div className={styles.shareTrack} aria-hidden="true">
                    <span style={{ width: `${Math.max(share, 2)}%` }} />
                  </div>
                  <p>{Math.round(share)}% of the average final score</p>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.insight} style={{ '--score-accent': dominant.accent } as React.CSSProperties}>
          <p className={styles.insightLabel}>Profile readout</p>
          <div className={styles.heroIcon}>
            <img alt="" aria-hidden="true" src={`${STORAGE_BASE_URL}/${dominant.filename}`} />
          </div>
          <h3>{identity.label}</h3>
          <p>{identity.description}</p>
          <dl>
            <div>
              <dt>Lead source</dt>
              <dd>{dominant.label}</dd>
            </div>
            <div>
              <dt>Lead contribution</dt>
              <dd>{formatPoints(dominant.value)} pts</dd>
            </div>
            <div>
              <dt>Top-two share</dt>
              <dd>{Math.round(((dominant.value + secondary.value) / total) * 100)}%</dd>
            </div>
          </dl>
          <small>{subject} scores most heavily through {dominant.label.toLowerCase()}.</small>
        </aside>
      </div>
    </section>
  );
}
