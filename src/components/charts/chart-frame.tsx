import { HeadToHeadLensFrame } from './head-to-head-lens-frame';
import styles from './chart-frame.module.css';

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

  const accessibleTitle =
    title === 'Award Funding ROI'
      ? 'Award Funding ROI Global Award Meta'
      : undefined;
  const isBestStyleSnapshot = title === 'Best Style Snapshot';
  const isLegacyScoreProfile =
    title === 'Group Score Profile' || title.startsWith('Score Profile for ');
  const resolvedDescription = isBestStyleSnapshot
    ? 'Compare your strongest inferred play styles and the results behind each one.'
    : description;

  return (
    <section
      className={[
        'tm-panel',
        isBestStyleSnapshot ? styles.snapshot : '',
        isLegacyScoreProfile ? 'sr-only' : '',
      ]
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
