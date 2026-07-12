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
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
  { href: '/group', label: 'Global' },
  { href: '/cards', label: 'Cards' },
  { href: '/glossary', label: 'Glossary' },
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

function shouldShowInsightsLoading(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string,
) {
  return (
    href === '/insights' &&
    pathname !== '/insights' &&
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
  const cardsItem = navigationItems.find((item) => item.href === '/cards');
  const glossaryItem = navigationItems.find((item) => item.href === '/glossary');
  // Insights has its own dedicated icon at the end of the strip, so keep it out
  // of the text links to avoid a duplicate, and only surface the icon when the
  // active navigation set actually includes it (e.g. hidden for profile-only).
  const insightsItem = navigationItems.find((item) => item.href === '/insights');
  const edgeItems = [cardsItem, glossaryItem].filter(
    (item): item is BottomNavItem => Boolean(item),
  );
  const stripItems = navigationItems.filter(
    (item) => !edgeItems.includes(item) && item !== insightsItem,
  );

  return (
    <>
      <nav aria-label="Primary" className="tm-bottom-nav">
        <Link
          aria-label="Home"
          className="tm-bottom-nav__icon"
          href={navigationItems[0]?.href ?? '/'}
        >
          <HomeIcon />
        </Link>
        <div className="tm-bottom-nav__links">
          {stripItems.map((item) => (
            <Link
              className="tm-bottom-nav__link"
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
        {insightsItem ? (
          <Link
            aria-label="Open Insights"
            className="tm-bottom-nav__icon"
            href="/insights"
            onClick={(event) => {
              if (shouldShowInsightsLoading(event, '/insights', pathname)) {
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
