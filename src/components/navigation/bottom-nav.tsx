'use client';

import Link from 'next/link';
import type { RefObject } from 'react';
import type { NavigationItem } from '@/lib/navigation/app-navigation';

export function BottomNav({
  activeId,
  isMoreActive,
  isMoreOpen,
  items,
  moreTriggerRef,
  onOpenMore,
}: {
  activeId?: string;
  isMoreActive: boolean;
  isMoreOpen: boolean;
  items: readonly NavigationItem[];
  moreTriggerRef: RefObject<HTMLButtonElement | null>;
  onOpenMore: () => void;
}) {
  return (
    <nav
      aria-label="Bottom navigation"
      className="tm-bottom-nav sticky bottom-0 z-30 grid-cols-5 md:hidden"
    >
      {items.map((item) => (
        <Link
          aria-current={activeId === item.id ? 'page' : undefined}
          className="tm-bottom-nav__link"
          href={item.href}
          key={item.id}
        >
          {item.mobileLabel ?? item.label}
        </Link>
      ))}
      <button
        aria-current={isMoreActive ? 'page' : undefined}
        aria-expanded={isMoreOpen}
        aria-haspopup="dialog"
        className="tm-bottom-nav__link"
        onClick={onOpenMore}
        ref={moreTriggerRef}
        type="button"
      >
        More
      </button>
    </nav>
  );
}
