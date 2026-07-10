'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type TopNavItem = {
  href: string;
  label: string;
};

export const defaultTopNavItems: TopNavItem[] = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log a Game' },
  { href: '/log-game/review', label: 'Saved Games' },
  { href: '/group', label: 'Global' },
  { href: '/insights', label: 'Insights' },
];

function isItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  // Treat nested routes as active for their parent (e.g. /group/settings → Global),
  // but keep the more specific Saved Games link from also lighting up Log a Game.
  if (href === '/log-game') {
    return pathname === '/log-game' || pathname.startsWith('/log-game/import');
  }
  return pathname.startsWith(`${href}/`);
}

export function TopNav({
  items = defaultTopNavItems,
}: {
  items?: TopNavItem[];
}) {
  const pathname = usePathname() ?? '';

  return (
    <nav aria-label="Primary" className="tm-top-nav">
      {items.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={`tm-top-nav__link${active ? ' tm-top-nav__link--active' : ''}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
