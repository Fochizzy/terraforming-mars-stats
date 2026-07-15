import Image from 'next/image';
import Link from 'next/link';
import bannerImage from '../../../assets/banner.png';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { LogoutButton } from '@/components/navigation/logout-button';
import styles from './app-shell.module.css';

type PrimaryNavigationItem = {
  href: string;
  label: string;
  highlighted?: boolean;
};

const primaryNavigationItems: ReadonlyArray<PrimaryNavigationItem> = [
  { href: '/log-game', label: 'Log a Game', highlighted: true },
  { href: '/profile', label: 'My Profile' },
  { href: '/insights#global-statistics', label: 'Global Data' },
  { href: '/insights?scope=individual', label: 'Individual Insights' },
  { href: '/group', label: 'Group Insights' },
  { href: '/insights?scope=compare', label: 'Comparisons' },
] as const;

export function AppShell({
  title,
  children,
  headerActions,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  return (
    <main className="tm-app-shell">
      <div className={styles.pageFrame}>
        <section className={styles.shellHeader}>
          <div className={styles.bannerFrame}>
            <Image
              alt="Terraforming Mars Statistics"
              className={styles.bannerImage}
              height={793}
              priority
              sizes="(min-width: 1800px) 1720px, calc(100vw - 48px)"
              src={bannerImage}
              width={1983}
            />
          </div>

          <div className={styles.controlDeck}>
            <div className={styles.headerRow}>
              <header className={styles.pageHeader}>
                <p className={styles.eyebrow}>Mission Control</p>
                <h1 className={styles.pageTitle}>{title}</h1>
              </header>

              <div className={styles.headerControls}>
                <nav
                  aria-label="Saved games and account"
                  className={styles.utilityBar}
                >
                  <LogoutButton className={styles.logoutButton} />
                  <Link className={styles.utilityLink} href="/saved-games">
                    Saved Games
                  </Link>
                </nav>
                {headerActions ? (
                  <div className={styles.headerActions}>{headerActions}</div>
                ) : null}
              </div>
            </div>

            <nav
              aria-label="Primary navigation"
              className={styles.navigationRow}
            >
              <div className={styles.primaryNavigation}>
                {primaryNavigationItems.map((item) => (
                  <Link
                    className={`${styles.primaryNavigationLink} ${
                      item.highlighted
                        ? styles.primaryNavigationLinkHighlighted
                        : ''
                    }`}
                    data-highlighted={item.highlighted ? 'true' : undefined}
                    href={item.href}
                    key={item.label}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <Link
                className={styles.leaderboardCard}
                data-leaderboard-button="true"
                href="/group"
              >
                <span aria-hidden="true" className={styles.leaderboardIcon}>
                  <span />
                  <span />
                  <span />
                </span>
                <span className={styles.leaderboardLabel}>Leaderboard</span>
              </Link>
            </nav>
          </div>
        </section>

        <section className={styles.content}>{children}</section>
      </div>
      <BottomNav />
    </main>
  );
}
