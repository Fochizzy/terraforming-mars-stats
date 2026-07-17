'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  activeNavigationId,
  navigationItemsFor,
  type NavigationItem,
} from '@/lib/navigation/app-navigation';
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

/**
 * One responsive website navigation architecture. The primary destination
 * row renders identically from narrow to desktop widths (it scrolls
 * horizontally where it doesn't fit); only the secondary utility links
 * collapse into a single "Menu" overflow panel below the desktop breakpoint.
 * No destination exists only at one viewport width.
 */
export function AppNavigation({ hasActiveGroup }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const restoreFocusOnCloseRef = useRef(true);
  const navigationContext = { authenticated: true, hasActiveGroup };
  const activeId = activeNavigationId(pathname);
  const primaryItems = navigationItemsFor('primary', navigationContext);
  const utilityItems = navigationItemsFor('utility', navigationContext);
  const menuIsActive = utilityItems.some((item) => item.id === activeId);

  function closeMenu({ restoreFocus = true } = {}) {
    const dialog = dialogRef.current;
    restoreFocusOnCloseRef.current = restoreFocus;
    if (dialog?.open) {
      dialog.close();
    }
    setIsMenuOpen(false);

    if (restoreFocus && !dialog?.open) {
      menuTriggerRef.current?.focus();
    }
  }

  function openMenu() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) {
      return;
    }

    restoreFocusOnCloseRef.current = true;
    dialog.showModal();
    setIsMenuOpen(true);
    requestAnimationFrame(() => menuCloseRef.current?.focus());
  }

  useEffect(() => {
    closeMenu({ restoreFocus: false });
    // A route change is the closing signal for the narrow-screen menu.
  }, [pathname]);

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className={styles.primaryNavigation}
      >
        {primaryItems.map((item) => (
          <NavigationLink activeId={activeId} item={item} key={item.id} />
        ))}
      </nav>

      <nav
        aria-label="Account and reference navigation"
        className={`${styles.utilityBar} ${styles.desktopOnly}`}
      >
        <div className={styles.utilityActions}>
          {utilityItems.map((item) => (
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

      <div className={`${styles.narrowMenuBar} ${styles.narrowOnly}`}>
        <button
          aria-controls="site-menu-panel"
          aria-current={menuIsActive ? 'page' : undefined}
          aria-expanded={isMenuOpen}
          aria-haspopup="dialog"
          className={styles.narrowMenuTrigger}
          onClick={openMenu}
          ref={menuTriggerRef}
          type="button"
        >
          Menu
        </button>
      </div>

      <dialog
        aria-labelledby="site-menu-title"
        className={styles.siteMenuDialog}
        id="site-menu-panel"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => {
          setIsMenuOpen(false);
          if (restoreFocusOnCloseRef.current) {
            menuTriggerRef.current?.focus();
          }
        }}
        ref={dialogRef}
      >
        <div className={styles.siteMenuDialogHeader}>
          <h2 className={styles.siteMenuDialogTitle} id="site-menu-title">
            Menu
          </h2>
          <button
            className={styles.siteMenuCloseButton}
            onClick={() => closeMenu()}
            ref={menuCloseRef}
            type="button"
          >
            Close menu
          </button>
        </div>
        <nav aria-label="Menu destinations" className={styles.siteMenuLinks}>
          {utilityItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`${styles.siteMenuLink} ${
                  isActive ? styles.siteMenuLinkActive : ''
                }`}
                href={item.href}
                key={item.id}
                onClick={() => closeMenu({ restoreFocus: false })}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton className={styles.siteMenuLogoutButton} />
      </dialog>
    </>
  );
}
