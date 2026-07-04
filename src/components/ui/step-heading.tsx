export function StepHeading({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="tm-data-label flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]"
        style={{ borderColor: 'var(--tm-panel-border)' }}
      >
        {step}
      </span>
      <h2 className="tm-panel-title text-sm">{title}</h2>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: 'var(--tm-panel-border)' }}
      />
    </div>
  );
}
