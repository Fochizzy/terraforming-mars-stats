'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
  { href: '/insights?scope=individual', label: 'Individual Insights' },
  { href: '/insights?scope=group', label: 'Group Insights' },
  { href: '/comparisons', label: 'Comparisons' },
  { href: '/leaderboard', label: 'Leaderboard', align: 'end' },
];

function isItemActive(pathname: string, search: string, href: string): boolean {
  const [targetPath, targetSearch = ''] = href.split('?');

  if (pathname !== targetPath && !pathname.startsWith(`${targetPath}/`)) {
    return false;
  }

  if (!targetSearch) {
    if (targetPath === '/log-game') {
      return pathname === '/log-game' || pathname.startsWith('/log-game/import');
    }
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
  }

  return search === targetSearch;
}

function shouldShowInsightsLoading(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string,
  search: string,
) {
  const currentHref = search ? `${pathname}?${search}` : pathname;
  return (
    href.startsWith('/insights') &&
    currentHref !== href &&
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
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const [showInsightsLoading, setShowInsightsLoading] = useState(false);
  const primaryItems = items.filter((item) => item.align !== 'end');
  const utilityItems = items.filter((item) => item.align === 'end');

  const renderItem = (item: TopNavItem) => {
    const active = isItemActive(pathname, search, item.href);
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
          if (shouldShowInsightsLoading(event, item.href, pathname, search)) {
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
