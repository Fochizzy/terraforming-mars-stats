'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, useState } from 'react';
import { InsightsLoadingPopup } from './insights-loading-popup';
import { ProfileLoadingPopup } from './profile-loading-popup';

export type TopNavItem = {
  href: string;
  label: string;
  align?: 'start' | 'end';
};

export const defaultTopNavItems: TopNavItem[] = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log a Game' },
  { href: '/group', label: 'Global' },
  { href: '/insights/individual', label: 'Individual Insights' },
  { href: '/insights/group', label: 'Group Insights' },
  { href: '/cards', label: 'Cards', align: 'end' },
  { href: '/glossary', label: 'Glossary', align: 'end' },
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

function shouldShowInsightsLoading(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string,
) {
  return (
    href.startsWith('/insights') &&
    pathname !== href &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function shouldShowProfileLoading(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string,
) {
  return (
    href === '/profile' &&
    pathname !== href &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function TopNav({
  items = defaultTopNavItems,
}: {
  items?: TopNavItem[];
}) {
  const pathname = usePathname() ?? '';
  const [showInsightsLoading, setShowInsightsLoading] = useState(false);
  const [showProfileLoading, setShowProfileLoading] = useState(false);

  const firstEndHref = items.find((item) => item.align === 'end')?.href;

  return (
    <>
      <nav aria-label="Primary" className="tm-top-nav">
        {items.map((item) => {
          const active = isItemActive(pathname, item.href);
          const spacer = item.href === firstEndHref;
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`tm-top-nav__link${active ? ' tm-top-nav__link--active' : ''}${spacer ? ' tm-top-nav__link--end' : ''}`}
              href={item.href}
              key={item.href}
              onClick={(event) => {
                if (shouldShowInsightsLoading(event, item.href, pathname)) {
                  setShowInsightsLoading(true);
                }
                if (shouldShowProfileLoading(event, item.href, pathname)) {
                  setShowProfileLoading(true);
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {showInsightsLoading ? <InsightsLoadingPopup /> : null}
      {showProfileLoading ? <ProfileLoadingPopup /> : null}
    </>
  );
}
