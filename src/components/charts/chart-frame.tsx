import { HeadToHeadLensFrame } from './head-to-head-lens-frame';

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

  return (
    <section className="tm-panel">
      <div>
        <h2
          aria-label={accessibleTitle}
          className="tm-panel-title text-lg font-semibold tracking-[0.08em]"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
