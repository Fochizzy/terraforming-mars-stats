export function CoverageBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
      {label}: {Math.round(value * 100)}%
    </span>
  );
}
