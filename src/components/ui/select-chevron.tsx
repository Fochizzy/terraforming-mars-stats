export function SelectChevron() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2"
      fill="none"
      stroke="currentColor"
      style={{ color: 'var(--tm-copper-400)' }}
      viewBox="0 0 12 8"
    >
      <path
        d="M1 1.5 6 6.5 11 1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
