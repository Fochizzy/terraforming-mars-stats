import Image from 'next/image';
import Link from 'next/link';
import bannerImage from '../../../assets/banner.png';
import styles from './app-shell.module.css';

const primaryNavigationItems = [
  { href: '/log-game', label: 'Log a Game', highlighted: true },
  { href: '/profile', label: 'My Profile' },
  { href: '/insights?scope=individual', label: 'Individual Insights' },
  { href: '/group', label: 'Group Insights' },
  { href: '/insights?scope=compare', label: 'Compare' },
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
      <div className="flex min-h-screen w-full flex-col">
        <div className={styles.bannerFrame}>
          <Image
            alt="Terraforming Mars Statistics"
            className={styles.bannerImage}
            priority
            sizes="100vw"
            src={bannerImage}
          />
        </div>

        <nav
          aria-label="Saved games and account"
          className={styles.utilityBar}
        >
          <div className={styles.utilityActions}>
            <Link className={styles.utilityLink} href="/saved-games">
              Saved Games
            </Link>
            <form action="/auth/logout" method="post">
              <button className={styles.logoutButton} type="submit">
                Log Out
              </button>
            </form>
          </div>
        </nav>

        <nav aria-label="Primary navigation" className={styles.primaryNavigation}>
          {primaryNavigationItems.map((item) => (
            <Link
              className={`${styles.primaryNavigationLink} ${
                item.highlighted ? styles.primaryNavigationLinkHighlighted : ''
              }`}
              data-highlighted={item.highlighted ? 'true' : undefined}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <header className="tm-app-header">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tm-display-eyebrow text-[11px]">
                Terraforming Mars Stats
              </p>
              <h1 className="tm-display-title mt-2 text-2xl font-bold">{title}</h1>
            </div>
            {headerActions}
          </div>
        </header>
        <section className="flex-1 w-full px-5 py-5">{children}</section>
      </div>
    </main>
  );
}
