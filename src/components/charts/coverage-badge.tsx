export function CoverageBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="tm-coverage-badge">
      {label}: {Math.round(value * 100)}%
    </span>
  );
}
