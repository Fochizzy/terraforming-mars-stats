import { Children, isValidElement, type CSSProperties, type ReactNode } from 'react';
import { HeadToHeadLensFrame } from './head-to-head-lens-frame';
import styles from './chart-frame.module.css';
import scoreStyles from './score-profile-frame.module.css';

type ScoreDatum = {
  label: string;
  value: number;
};

type ScoreCategory = ScoreDatum & {
  color: string;
  icon: string;
  rank: number;
  share: number;
};

const scoreIconRoot =
  'https://qjtwgrjjwnqafbvkkfex.supabase.co/storage/v1/object/public/tm-score-icons';

const scoreCategoryMeta: Record<string, { color: string; icon: string }> = {
  Animal: { color: '#f59e0b', icon: `${scoreIconRoot}/Animal.png` },
  Awards: { color: '#8b5cf6', icon: `${scoreIconRoot}/Awards.png` },
  'Card Points': { color: '#ea580c', icon: `${scoreIconRoot}/Card_Points.png` },
  Cities: {
    color: '#7c3aed',
    icon: `${scoreIconRoot}/a5bca072-12a2-4080-863c-1b75c8a20889.png`,
  },
  Greenery: { color: '#84cc16', icon: `${scoreIconRoot}/Greenery.png` },
  Jovian: { color: '#f97316', icon: `${scoreIconRoot}/Jovian.png` },
  Microbe: { color: '#14b8a6', icon: `${scoreIconRoot}/Microbe.png` },
  Milestones: { color: '#fbbf24', icon: `${scoreIconRoot}/Milestones.png` },
  'Other Card': { color: '#3b82f6', icon: `${scoreIconRoot}/Other_Card.png` },
  'Terraform Rating': {
    color: '#2563eb',
    icon: `${scoreIconRoot}/Terraform_Rating.png`,
  },
};

function findScoreData(node: ReactNode): ScoreDatum[] | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) {
      continue;
    }

    const props = child.props as { children?: ReactNode; data?: unknown };
    if (
      Array.isArray(props.data) &&
      props.data.every(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as ScoreDatum).label === 'string' &&
          typeof (entry as ScoreDatum).value === 'number',
      )
    ) {
      return props.data as ScoreDatum[];
    }

    const nested = findScoreData(props.children);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function formatPoints(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function getScoringIdentity(categories: ScoreCategory[]) {
  const shareFor = (...labels: string[]) =>
    categories
      .filter((category) => labels.includes(category.label))
      .reduce((total, category) => total + category.share, 0);

  const terraformingShare = shareFor('Terraform Rating');
  const boardShare = shareFor('Greenery', 'Cities');
  const engineShare = shareFor('Card Points', 'Other Card', 'Animal', 'Microbe', 'Jovian');
  const objectiveShare = shareFor('Milestones', 'Awards');

  if (terraformingShare >= 34) {
    return {
      chips: ['Fast tempo', 'TR-led scoring', boardShare >= 15 ? 'Board support' : 'Lean board'],
      copy: 'Terraform Rating supplies an unusually large share of the final total, pointing to a group that advances the global parameters and converts tempo into points.',
      label: 'Terraforming-focused',
    };
  }

  if (engineShare >= 44) {
    return {
      chips: ['Card economy', 'Engine payoff', objectiveShare >= 10 ? 'Objective support' : 'Low objectives'],
      copy: 'Most points arrive through cards and resource engines, suggesting longer development arcs and a strong preference for compounding scoring systems.',
      label: 'Engine-driven',
    };
  }

  if (boardShare >= 22) {
    return {
      chips: ['Map pressure', 'Tile scoring', terraformingShare >= 25 ? 'Strong tempo' : 'Patient tempo'],
      copy: 'Cities and greenery make up a meaningful portion of the score, showing that spatial play and tile placement are central to this scoring profile.',
      label: 'Board-focused',
    };
  }

  if (objectiveShare >= 14) {
    return {
      chips: ['Milestone race', 'Award leverage', 'Competitive timing'],
      copy: 'A notable share of the score comes from milestones and awards, indicating that timing, table awareness, and contested objectives shape results.',
      label: 'Objective-minded',
    };
  }

  return {
    chips: ['Multiple lanes', 'Flexible scoring', 'No single dependency'],
    copy: 'The score is distributed across several sources, indicating a flexible group that changes its scoring route from game to game.',
    label: 'Balanced',
  };
}

function ScoreProfileFrame({ children, title }: { children: ReactNode; title: string }) {
  const data = findScoreData(children) ?? [];
  const positiveData = data.filter((entry) => entry.value > 0);
  const total = positiveData.reduce((sum, entry) => sum + entry.value, 0);
  const categories: ScoreCategory[] = [...positiveData]
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .map((entry, index) => ({
      ...entry,
      color: scoreCategoryMeta[entry.label]?.color ?? '#38bdf8',
      icon: scoreCategoryMeta[entry.label]?.icon ?? '',
      rank: index + 1,
      share: total > 0 ? (entry.value / total) * 100 : 0,
    }));
  const dominant = categories[0];
  const identity = getScoringIdentity(categories);
  const focusedName = title.startsWith('Score Profile for ')
    ? title.replace('Score Profile for ', '')
    : null;

  return (
    <section className={scoreStyles.frame}>
      <div className={scoreStyles.header}>
        <div>
          <p className={scoreStyles.eyebrow}>Score composition</p>
          <h2 aria-label={title} className={scoreStyles.title}>
            {focusedName ? `${focusedName}'s Scoring DNA` : 'Group Scoring DNA'}
          </h2>
          <p className={scoreStyles.description}>
            See which scoring lanes build the average final score and what that mix says
            about the way {focusedName ?? 'this group'} plays.
          </p>
        </div>
        <div className={scoreStyles.badge}>
          <span aria-hidden="true">◆</span>
          Average points
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="mt-4">{children}</div>
      ) : (
        <>
          <div className={scoreStyles.metrics}>
            <div className={scoreStyles.metric}>
              <span className={scoreStyles.metricLabel}>Average score</span>
              <strong className={scoreStyles.metricValue}>{formatPoints(total)} pts</strong>
              <span className={scoreStyles.metricNote}>Sum of recorded score sources</span>
            </div>
            <div className={scoreStyles.metric}>
              <span className={scoreStyles.metricLabel}>Primary strength</span>
              <strong className={scoreStyles.metricValue}>{dominant.label}</strong>
              <span className={scoreStyles.metricNote}>
                {formatPoints(dominant.value)} pts · {Math.round(dominant.share)}% of score
              </span>
            </div>
            <div className={scoreStyles.metric}>
              <span className={scoreStyles.metricLabel}>Scoring identity</span>
              <strong className={scoreStyles.metricValue}>{identity.label}</strong>
              <span className={scoreStyles.metricNote}>Based on the current scoring mix</span>
            </div>
          </div>

          <div className={scoreStyles.composition}>
            <div className={scoreStyles.compositionHeader}>
              <span>Average final-score composition</span>
              <span>{categories.length} active scoring sources</span>
            </div>
            <div
              aria-label={`Average score composition totaling ${formatPoints(total)} points`}
              className={scoreStyles.stack}
              role="img"
            >
              {categories.map((category) => (
                <div
                  className={scoreStyles.segment}
                  key={category.label}
                  style={{
                    background: `linear-gradient(135deg, ${category.color}, color-mix(in srgb, ${category.color} 62%, #111827))`,
                    flexBasis: `${category.share}%`,
                  }}
                  title={`${category.label}: ${formatPoints(category.value)} points (${Math.round(category.share)}%)`}
                >
                  {category.share >= 5 && category.icon ? (
                    <img
                      alt=""
                      className={scoreStyles.segmentIcon}
                      src={category.icon}
                    />
                  ) : null}
                  {category.share >= 10 ? (
                    <span className={scoreStyles.segmentText}>
                      {Math.round(category.share)}%
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className={scoreStyles.contentGrid}>
            <div className={scoreStyles.cards}>
              {categories.map((category) => {
                const cardStyle = {
                  '--score-color': category.color,
                } as CSSProperties;

                return (
                  <article className={scoreStyles.card} key={category.label} style={cardStyle}>
                    <div className={scoreStyles.cardTop}>
                      <div className={scoreStyles.cardIconWrap}>
                        {category.icon ? (
                          <img
                            alt=""
                            className={scoreStyles.cardIcon}
                            src={category.icon}
                          />
                        ) : null}
                      </div>
                      <span className={scoreStyles.cardRank}>#{category.rank}</span>
                    </div>
                    <h3 className={scoreStyles.cardTitle}>{category.label}</h3>
                    <p className={scoreStyles.cardValue}>{formatPoints(category.value)} pts</p>
                    <p className={scoreStyles.cardShare}>
                      {Math.round(category.share)}% of average score
                    </p>
                    <div className={scoreStyles.miniTrack} aria-hidden="true">
                      <div
                        className={scoreStyles.miniFill}
                        style={{ width: `${Math.max(category.share, 2)}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className={scoreStyles.insight}>
              <div>
                <p className={scoreStyles.insightLabel}>What the mix suggests</p>
                <h3 className={scoreStyles.insightTitle}>{identity.label}</h3>
                <p className={scoreStyles.insightCopy}>{identity.copy}</p>
              </div>
              <div className={scoreStyles.insightChips}>
                {identity.chips.map((chip) => (
                  <span className={scoreStyles.chip} key={chip}>
                    {chip}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

export function ChartFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  if (title === 'Head-to-Head Lens') {
    return <HeadToHeadLensFrame>{children}</HeadToHeadLensFrame>;
  }

  if (title === 'Group Score Profile' || title.startsWith('Score Profile for ')) {
    return <ScoreProfileFrame title={title}>{children}</ScoreProfileFrame>;
  }

  const accessibleTitle =
    title === 'Award Funding ROI'
      ? 'Award Funding ROI Global Award Meta'
      : undefined;
  const isBestStyleSnapshot = title === 'Best Style Snapshot';
  const resolvedDescription = isBestStyleSnapshot
    ? 'Compare your strongest inferred play styles and the results behind each one.'
    : description;

  return (
    <section
      className={['tm-panel', isBestStyleSnapshot ? styles.snapshot : '']
        .filter(Boolean)
        .join(' ')}
    >
      {isBestStyleSnapshot ? (
        <div className={styles.snapshotHeader}>
          <div className={styles.snapshotTitleGroup}>
            <p className={styles.snapshotEyebrow}>Performance profile</p>
            <h2
              aria-label={accessibleTitle}
              className="tm-panel-title text-lg font-semibold tracking-[0.08em]"
            >
              {title}
            </h2>
            <p className={styles.snapshotDescription}>{resolvedDescription}</p>
          </div>
          <div className={styles.snapshotBadge}>
            <span aria-hidden="true">★</span>
            Top styles
          </div>
        </div>
      ) : (
        <div>
          <h2
            aria-label={accessibleTitle}
            className="tm-panel-title text-lg font-semibold tracking-[0.08em]"
          >
            {title}
          </h2>
          {resolvedDescription ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">
              {resolvedDescription}
            </p>
          ) : null}
        </div>
      )}
      <div className={isBestStyleSnapshot ? styles.snapshotBody : 'mt-4'}>
        {children}
      </div>
    </section>
  );
}
