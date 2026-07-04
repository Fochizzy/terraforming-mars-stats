export function StatusBanner({
  message,
  status,
}: {
  message: string;
  status: 'error' | 'idle' | 'success';
}) {
  return (
    <div
      className={
        status === 'error'
          ? 'flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200'
          : 'flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200'
      }
    >
      <span aria-hidden>{status === 'error' ? '⚠' : '✓'}</span>
      <p>{message}</p>
    </div>
  );
}
