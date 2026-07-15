import Image from 'next/image';
import Link from 'next/link';
import { BottomNav, type BottomNavItem } from '@/components/navigation/bottom-nav';
import { TopNav } from '@/components/navigation/top-nav';
import { PlayAnalysisEnhancer } from '@/features/analytics/play-analysis-enhancer';
import { signOut } from '@/features/auth/sign-out';
import { GroupInsightsLabEnhancer } from '@/features/insights/group-insights-lab-enhancer';
import { InsightFormattingEnhancer } from '@/features/insights/insight-formatting-enhancer';

export function AppShell({
  title,
  children,
  headerActions,
  navItems,
  showReviewSavedGamesLink = false,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  navItems?: BottomNavItem[];
  showReviewSavedGamesLink?: boolean;
  wide?: boolean;
}) {
  return (
    <main className="tm-app-shell">
      <PlayAnalysisEnhancer />
      <InsightFormattingEnhancer />
      <GroupInsightsLabEnhancer />
      <div
        className={`mx-auto flex min-h-screen flex-col ${wide ? 'max-w-6xl' : 'max-w-md'}`}
      >
        <header className="tm-app-header">
          <div className="tm-app-header__inner">
            <div className="tm-app-header-banner tm-landing-hero-module">
              <div className="tm-landing-banner-frame tm-landing-banner-frame--cropped">
                <Image
                  alt="Terraforming Mars Statistics"
                  className="tm-landing-banner-image"
                  height={793}
                  src="/banner.png"
                  unoptimized
                  width={1983}
                />
              </div>
            </div>
            <div className="tm-app-header__content">
              <div className="tm-app-header__title-group">
                <p className="tm-display-eyebrow">Mission Control</p>
                <h1 className="tm-display-title text-2xl font-bold lg:text-3xl">
                  {title}
                </h1>
              </div>
              <div className="tm-app-header__actions">
                <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                  {headerActions}
                  {showReviewSavedGamesLink ? (
                    <Link
                      className="tm-button-secondary px-4 py-2 text-xs"
                      href="/log-game/review"
                    >
                      Review Saved Games
                    </Link>
                  ) : null}
                  <form action={signOut}>
                    <button className="tm-button-secondary px-4 py-2 text-xs" type="submit">
                      Log Out
                    </button>
                  </form>
                </div>
                <Link
                  className="tm-button-leaderboard w-full px-4 py-2 text-xs"
                  href="/leaderboard"
                >
                  Leaderboard
                </Link>
              </div>
            </div>
            <TopNav />
          </div>
        </header>
        <section className="flex-1 px-5 py-5 lg:px-8 lg:py-8">{children}</section>
        <BottomNav items={navItems} />
      </div>
    </main>
  );
}
