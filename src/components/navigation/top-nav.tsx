'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, useState } from 'react';
import { InsightsLoadingPopup } from './insights-loading-popup';
import styles from './top-nav.module.css';

export type TopNavItem = {
  href: string;
  label: string;
  align?: 'start' | 'end';
};

export const defaultTopNavItems: TopNavItem[] = [
  { href: '/log-game', label: 'Log a Game' },
  { href: '/profile', label: 'My Profile' },
  { href: '/group', label: 'Global Data' },
  { href: '/insights/individual', label: 'Individual Insights' },
  { href: '/insights/group', label: 'Group Insights' },
  { href: '/comparisons', label: 'Comparisons' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/leaderboard', label: 'Leaderboard', align: 'end' },
];

function isItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  // Treat nested routes as active for their parent (e.g. /group/settings → Global Data),
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

export function TopNav({
  items = defaultTopNavItems,
}: {
  items?: TopNavItem[];
}) {
  const pathname = usePathname() ?? '';
  const [showInsightsLoading, setShowInsightsLoading] = useState(false);
  const primaryItems = items.filter((item) => item.align !== 'end');
  const utilityItems = items.filter((item) => item.align === 'end');

  const renderItem = (item: TopNavItem) => {
    const active = isItemActive(pathname, item.href);
    const isLogGame = item.href === '/log-game';
    const isLeaderboard = item.href === '/leaderboard';
    const className = [
      'tm-top-nav__link',
      styles.link,
      isLogGame ? styles.logGame : '',
      isLeaderboard ? styles.leaderboard : '',
      active ? styles.active : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Link
        aria-current={active ? 'page' : undefined}
        className={className}
        data-nav-position={item.align ?? 'start'}
        href={item.href}
        key={item.href}
        onClick={(event) => {
          if (shouldShowInsightsLoading(event, item.href, pathname)) {
            setShowInsightsLoading(true);
          }
        }}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Primary" className={`tm-top-nav ${styles.nav}`}>
        <div className={styles.inner}>
          <div className={`${styles.group} ${styles.primaryGroup}`}>
            {primaryItems.map(renderItem)}
          </div>
          {utilityItems.length > 0 ? (
            <div className={`${styles.group} ${styles.utilityGroup}`}>
              {utilityItems.map(renderItem)}
            </div>
          ) : null}
        </div>
      </nav>
      {showInsightsLoading ? <InsightsLoadingPopup /> : null}
    </>
  );
}
