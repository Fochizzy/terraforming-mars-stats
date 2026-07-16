import Image from 'next/image';
import Link from 'next/link';
import bannerImage from '../../../assets/banner.png';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { LogoutButton } from '@/components/navigation/logout-button';
import { CorporationLogoDecorator } from './corporation-logo-decorator';
import styles from './app-shell.module.css';

type PrimaryNavigationItem = {
  href: string;
  label: string;
  highlighted?: boolean;
  leaderboard?: boolean;
};

const primaryNavigationItems: ReadonlyArray<PrimaryNavigationItem> = [
  { href: '/log-game', label: 'Log a Game', highlighted: true },
  { href: '/profile', label: 'My Profile' },
  { href: '/group', label: 'Global Data' },
  { href: '/insights/individual', label: 'Individual Insights' },
  { href: '/insights/group', label: 'Group Insights' },
  { href: '/comparisons', label: 'Comparisons' },
] as const;

const leaderboardItem: PrimaryNavigationItem = {
  href: '/leaderboard',
  label: 'Leaderboard',
  leaderboard: true,
};

function PrimaryNavigationLink({ item }: { item: PrimaryNavigationItem }) {
  return (
    <Link
      className={`${styles.primaryNavigationLink} ${
        item.highlighted ? styles.primaryNavigationLinkHighlighted : ''
      } ${item.leaderboard ? styles.primaryNavigationLinkLeaderboard : ''}`}
      data-highlighted={item.highlighted ? 'true' : undefined}
      data-leaderboard-button={item.leaderboard ? 'true' : undefined}
      href={item.href}
    >
      {item.label}
    </Link>
  );
}

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
      <CorporationLogoDecorator />
      <div className="flex min-h-screen w-full flex-col">
        <div className={styles.bannerFrame}>
          <Image
            alt="Terraforming Mars Statistics"
            className={styles.bannerImage}
            height={793}
            priority
            sizes="100vw"
            src={bannerImage}
            width={1983}
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
            <LogoutButton className={styles.logoutButton} />
          </div>
        </nav>

        <nav aria-label="Primary navigation" className={styles.primaryNavigation}>
          <div className={styles.primaryNavigationStart}>
            {primaryNavigationItems.map((item) => (
              <PrimaryNavigationLink item={item} key={item.label} />
            ))}
          </div>
          <div className={styles.primaryNavigationEnd}>
            <PrimaryNavigationLink item={leaderboardItem} />
          </div>
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
        <section className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          {children}
        </section>
        <BottomNav />
      </div>
    </main>
  );
}
