import type { CSSProperties } from 'react';
import { getSupabaseGameAssetUrl } from '@/lib/assets/supabase-game-assets';
import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';
import styles from './score-profile-panel.module.css';

type ScoreSourceDefinition = {
  accent: string;
  filename: string;
  key: keyof ScoreSourceAverages;
  label: string;
};

type ScoreProfilePanelProps = {
  averages: ScoreSourceAverages | null;
};

function pointSourceAssetUrl(filename: string) {
  return getSupabaseGameAssetUrl('tm-score-icons', filename);
}

const scoreSources: ScoreSourceDefinition[] = [
  { accent: '#4da8ff', filename: 'Terraform_Rating.png', key: 'averageTrPoints', label: 'Terraform Rating' },
  { accent: '#ff8b2c', filename: 'Card_Points.png', key: 'averageCardPoints', label: 'Card Points' },
  { accent: '#66a7ff', filename: 'Other_Card.png', key: 'averageOtherCardPoints', label: 'Other Card' },
  { accent: '#a7d928', filename: 'Greenery.png', key: 'averageGreeneryPoints', label: 'Greenery' },
  { accent: '#8b5cf6', filename: 'City.png', key: 'averageCitiesPoints', label: 'Cities' },
  { accent: '#ffc12e', filename: 'Milestones.png', key: 'averageMilestonePoints', label: 'Milestones' },
  { accent: '#9b6cff', filename: 'Awards.png', key: 'averageAwardPoints', label: 'Awards' },
  { accent: '#f28b24', filename: 'Jovian.png', key: 'averageJovianPoints', label: 'Jovian' },
  { accent: '#28c7bd', filename: 'Microbe.png', key: 'averageMicrobePoints', label: 'Microbe' },
  { accent: '#ff9a28', filename: 'Animal.png', key: 'averageAnimalPoints', label: 'Animal' },
];

function formatPoints(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function getIdentity(entries: Array<ScoreSourceDefinition & { value: number }>) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const values = Object.fromEntries(entries.map((entry) => [entry.label, entry.value]));
  const cardShare = ((values['Card Points'] ?? 0) + (values['Other Card'] ?? 0)) / total;
  const boardShare = ((values.Cities ?? 0) + (values.Greenery ?? 0)) / total;
  const engineShare = ((values.Animal ?? 0) + (values.Microbe ?? 0) + (values.Jovian ?? 0)) / total;
  const trShare = (values['Terraform Rating'] ?? 0) / total;

  if (cardShare >= 0.34) return ['Card-driven', 'Card scoring supplies an unusually large share of the final total.'];
  if (boardShare >= 0.22) return ['Board-focused', 'Cities and greenery make the board a major source of points.'];
  if (engineShare >= 0.16) return ['Engine-heavy', 'Resource engines and Jovian payoffs form a meaningful scoring lane.'];
  if (trShare >= 0.34) return ['Terraforming-focused', 'Terraform Rating is the clearest foundation of the scoring profile.'];
  return ['Balanced', 'No single scoring lane dominates the group average.'];
}

export function ScoreProfilePanel({ averages }: ScoreProfilePanelProps) {
  const entries = averages
    ? scoreSources
        .map((source) => ({ ...source, value: averages[source.key] }))
        .filter((entry) => entry.value > 0)
        .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    : [];
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  if (total <= 0) {
    return (
      <section className="tm-panel">
        <h2 className="tm-panel-title text-lg font-semibold">Group Scoring DNA</h2>
        <p className="tm-muted-copy mt-4 text-sm">
          Score-source averages will appear here after finalized games exist.
        </p>
      </section>
    );
  }

  const dominant = entries[0];
  const secondary = entries[1] ?? dominant;
  const [identityLabel, identityDescription] = getIdentity(entries);

  return (
    <section className={`tm-panel ${styles.panel}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Average final-score composition</p>
          <h2 className="tm-panel-title text-lg font-semibold">Group Scoring DNA</h2>
          <p className={styles.description}>
            See which scoring lanes define the group and how much each source contributes.
          </p>
        </div>
        <div className={styles.identityBadge}>
          <span>Scoring identity</span>
          <strong>{identityLabel}</strong>
        </div>
      </header>

      <div className={styles.metrics}>
        <article><span>Average score</span><strong>{formatPoints(total)}</strong><small>points represented</small></article>
        <article><span>Primary strength</span><strong>{dominant.label}</strong><small>{Math.round((dominant.value / total) * 100)}% of score</small></article>
        <article><span>Secondary lane</span><strong>{secondary.label}</strong><small>{formatPoints(secondary.value)} average points</small></article>
      </div>

      <div className={styles.composition} aria-label="Average score composition">
        {entries.map((entry) => {
          const share = (entry.value / total) * 100;
          return (
            <div
              className={styles.segment}
              key={entry.label}
              style={{ '--score-accent': entry.accent, flexGrow: Math.max(entry.value, total * 0.018) } as CSSProperties}
              title={`${entry.label}: ${formatPoints(entry.value)} points (${Math.round(share)}%)`}
            >
              {share >= 7 ? <><img alt="" src={pointSourceAssetUrl(entry.filename)} /><span>{Math.round(share)}%</span></> : null}
            </div>
          );
        })}
      </div>

      <div className={styles.body}>
        <div className={styles.cards}>
          {entries.map((entry, index) => {
            const share = (entry.value / total) * 100;
            return (
              <article className={styles.card} key={entry.label} style={{ '--score-accent': entry.accent } as CSSProperties}>
                <div className={styles.iconShell}><img alt="" src={pointSourceAssetUrl(entry.filename)} /></div>
                <div className={styles.cardCopy}>
                  <div className={styles.cardHeading}><h3>{entry.label}</h3><span>#{index + 1}</span></div>
                  <div className={styles.cardValue}><strong>{formatPoints(entry.value)}</strong><span>avg points</span></div>
                  <div className={styles.shareTrack} aria-hidden="true"><span style={{ width: `${Math.max(share, 2)}%` }} /></div>
                  <p>{Math.round(share)}% of the average final score</p>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.insight} style={{ '--score-accent': dominant.accent } as CSSProperties}>
          <p className={styles.insightLabel}>Profile readout</p>
          <div className={styles.heroIcon}><img alt="" src={pointSourceAssetUrl(dominant.filename)} /></div>
          <h3>{identityLabel}</h3>
          <p>{identityDescription}</p>
          <dl>
            <div><dt>Lead source</dt><dd>{dominant.label}</dd></div>
            <div><dt>Lead contribution</dt><dd>{formatPoints(dominant.value)} pts</dd></div>
            <div><dt>Top-two share</dt><dd>{Math.round(((dominant.value + secondary.value) / total) * 100)}%</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
