export function StatusBanner({
  message,
  status,
}: {
  message: string;
  status: 'error' | 'idle' | 'success';
}) {
  return (
    <div
      className={status === 'error' ? 'tm-banner-danger' : 'tm-banner-success'}
    >
      <span aria-hidden>{status === 'error' ? '⚠' : '✓'}</span>
      <p>{message}</p>
    </div>
  );
}
