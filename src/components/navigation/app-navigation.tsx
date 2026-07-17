'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  activeNavigationId,
  navigationItemsFor,
  type NavigationItem,
} from '@/lib/navigation/app-navigation';
import { BottomNav } from './bottom-nav';
import { LogoutButton } from './logout-button';
import styles from '@/components/layout/app-shell.module.css';

type AppNavigationProps = {
  hasActiveGroup: boolean;
};

function NavigationLink({
  activeId,
  item,
  onNavigate,
}: {
  activeId?: string;
  item: NavigationItem;
  onNavigate?: () => void;
}) {
  const isActive = activeId === item.id;

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={`${styles.primaryNavigationLink} ${
        item.prominent ? styles.primaryNavigationLinkHighlighted : ''
      } ${isActive ? styles.primaryNavigationLinkActive : ''}`}
      data-highlighted={item.prominent ? 'true' : undefined}
      href={item.href}
      onClick={onNavigate}
    >
      {item.label}
    </Link>
  );
}

export function AppNavigation({ hasActiveGroup }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const restoreFocusOnCloseRef = useRef(true);
  const navigationContext = { authenticated: true, hasActiveGroup };
  const activeId = activeNavigationId(pathname);
  const desktopPrimaryItems = navigationItemsFor('desktop-primary', navigationContext);
  const desktopUtilityItems = navigationItemsFor('desktop-utility', navigationContext);
  const mobilePrimaryItems = navigationItemsFor('mobile-primary', navigationContext);
  const mobileMoreItems = navigationItemsFor('mobile-more', navigationContext);
  const moreIsActive = mobileMoreItems.some((item) => item.id === activeId);

  function closeMoreNavigation({ restoreFocus = true } = {}) {
    const dialog = dialogRef.current;
    restoreFocusOnCloseRef.current = restoreFocus;
    if (dialog?.open) {
      dialog.close();
    }
    setIsMoreOpen(false);

    if (restoreFocus && !dialog?.open) {
      moreTriggerRef.current?.focus();
    }
  }

  function openMoreNavigation() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) {
      return;
    }

    restoreFocusOnCloseRef.current = true;
    dialog.showModal();
    setIsMoreOpen(true);
    requestAnimationFrame(() => moreCloseRef.current?.focus());
  }

  useEffect(() => {
    closeMoreNavigation({ restoreFocus: false });
    // A route change is the closing signal for the mobile menu.
  }, [pathname]);

  return (
    <>
      <nav
        aria-label="Account and reference navigation"
        className={`${styles.utilityBar} ${styles.desktopOnly}`}
      >
        <div className={styles.utilityActions}>
          {desktopUtilityItems.map((item) => (
            <Link
              aria-current={activeId === item.id ? 'page' : undefined}
              className={styles.utilityLink}
              href={item.href}
              key={item.id}
            >
              {item.label}
            </Link>
          ))}
          <LogoutButton className={styles.logoutButton} />
        </div>
      </nav>

      <nav
        aria-label="Primary navigation"
        className={`${styles.primaryNavigation} ${styles.desktopOnly}`}
      >
        {desktopPrimaryItems.map((item) => (
          <NavigationLink activeId={activeId} item={item} key={item.id} />
        ))}
      </nav>

      <BottomNav
        activeId={activeId}
        isMoreActive={moreIsActive}
        isMoreOpen={isMoreOpen}
        items={mobilePrimaryItems}
        moreTriggerRef={moreTriggerRef}
        onOpenMore={openMoreNavigation}
      />

      <dialog
        aria-labelledby="mobile-more-title"
        className={styles.mobileMoreDialog}
        onCancel={(event) => {
          event.preventDefault();
          closeMoreNavigation();
        }}
        onClose={() => {
          setIsMoreOpen(false);
          if (restoreFocusOnCloseRef.current) {
            moreTriggerRef.current?.focus();
          }
        }}
        ref={dialogRef}
      >
        <div className={styles.mobileMoreDialogHeader}>
          <h2 className={styles.mobileMoreDialogTitle} id="mobile-more-title">
            More navigation
          </h2>
          <button
            className={styles.mobileMoreCloseButton}
            onClick={() => closeMoreNavigation()}
            ref={moreCloseRef}
            type="button"
          >
            Close menu
          </button>
        </div>
        <nav aria-label="More navigation destinations" className={styles.mobileMoreLinks}>
          {mobileMoreItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`${styles.mobileMoreLink} ${
                  isActive ? styles.mobileMoreLinkActive : ''
                }`}
                href={item.href}
                key={item.id}
                onClick={() => closeMoreNavigation({ restoreFocus: false })}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton className={styles.mobileMoreLogoutButton} />
      </dialog>
    </>
  );
}
