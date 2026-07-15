'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, useState } from 'react';
import { InsightsLoadingPopup } from './insights-loading-popup';

export type BottomNavItem = {
  href: string;
  label: string;
};

export const defaultBottomNavItems: BottomNavItem[] = [
  { href: '/log-game', label: 'Log Game' },
  { href: '/profile', label: 'My Profile' },
  { href: '/group', label: 'Global Data' },
  { href: '/insights/individual', label: 'Individual Insights' },
  { href: '/insights/group', label: 'Group Insights' },
  { href: '/comparisons', label: 'Comparisons' },
  { href: '/cards', label: 'Cards' },
  { href: '/glossary', label: 'Glossary' },
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

export function BottomNav({
  items = defaultBottomNavItems,
}: {
  items?: BottomNavItem[];
}) {
  const pathname = usePathname() ?? '';
  const [showInsightsLoading, setShowInsightsLoading] = useState(false);
  const navigationItems = items;
  const glossaryItem = navigationItems.find((item) => item.href === '/glossary');
  // When a custom navigation set has a single Insights link, keep the compact
  // chart icon. The default set has Individual + Group Insights, so both render
  // as text links.
  const insightsItems = navigationItems.filter((item) =>
    item.href.startsWith('/insights'),
  );
  const insightsIconItem = insightsItems.length === 1 ? insightsItems[0] : null;
  const edgeItems = [glossaryItem].filter(
    (item): item is BottomNavItem => Boolean(item),
  );
  const stripItems = navigationItems.filter(
    (item) => !edgeItems.includes(item) && item !== insightsIconItem,
  );

  return (
    <>
      <nav aria-label="Primary" className="tm-bottom-nav">
        <Link
          aria-label="Home"
          className="tm-bottom-nav__icon"
          href="/profile"
        >
          <HomeIcon />
        </Link>
        <div className="tm-bottom-nav__links">
          {stripItems.map((item) => (
            <Link
              className={`tm-bottom-nav__link${item.href === '/log-game' ? ' tm-bottom-nav__link--log-game' : ''}`}
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
          ))}
        </div>
        {edgeItems.map((item) => (
          <Link
            className="tm-bottom-nav__link tm-bottom-nav__link--edge"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
        {insightsIconItem ? (
          <Link
            aria-label={`Open ${insightsIconItem.label}`}
            className="tm-bottom-nav__icon"
            href={insightsIconItem.href}
            onClick={(event) => {
              if (
                shouldShowInsightsLoading(
                  event,
                  insightsIconItem.href,
                  pathname,
                )
              ) {
                setShowInsightsLoading(true);
              }
            }}
          >
            <ChartIcon />
          </Link>
        ) : null}
      </nav>
      {showInsightsLoading ? <InsightsLoadingPopup /> : null}
    </>
  );
}
