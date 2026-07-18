export function StepHeading({
  headingId,
  size = 'sm',
  step,
  title,
}: {
  /**
   * When set, the heading becomes a programmatic focus target so wizard
   * navigation can move focus to the active step heading.
   */
  headingId?: string;
  size?: 'sm' | 'lg';
  step: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="tm-data-label flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]"
        style={{ borderColor: 'var(--tm-panel-border)' }}
      >
        {step}
      </span>
      <h2
        className={
          size === 'lg'
            ? 'tm-focus-ring tm-panel-title text-lg'
            : 'tm-focus-ring tm-panel-title text-sm'
        }
        id={headingId}
        tabIndex={headingId ? -1 : undefined}
      >
        {title}
      </h2>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: 'var(--tm-panel-border)' }}
      />
    </div>
  );
}
