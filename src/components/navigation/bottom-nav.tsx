import Link from 'next/link';

export type BottomNavItem = {
  href: string;
  label: string;
};

export const defaultBottomNavItems: BottomNavItem[] = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
  { href: '/group', label: 'Group' },
  { href: '/cards', label: 'Cards' },
  { href: '/insights', label: 'Insights' },
];

function HomeIcon() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 3.2 3 10.4V21h6v-6.5h6V21h6V10.4L12 3.2Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M4 20V11h3v9H4Zm6.5 0V6h3v14h-3ZM17 20v-6h3v6h-3Z" />
    </svg>
  );
}

export function BottomNav({
  items = defaultBottomNavItems,
}: {
  items?: BottomNavItem[];
}) {
  return (
    <nav aria-label="Primary" className="tm-bottom-nav">
      <Link
        aria-label="Home"
        className="tm-bottom-nav__icon"
        href={items[0]?.href ?? '/'}
      >
        <HomeIcon />
      </Link>
      <div className="tm-bottom-nav__links">
        {items.map((item) => (
          <Link
            className="tm-bottom-nav__link"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <span aria-hidden className="tm-bottom-nav__icon">
        <ChartIcon />
      </span>
    </nav>
  );
}
