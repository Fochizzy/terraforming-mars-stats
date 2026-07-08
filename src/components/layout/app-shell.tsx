import Image from 'next/image';
import { BottomNav, type BottomNavItem } from '@/components/navigation/bottom-nav';
import { signOut } from '@/features/auth/sign-out';

export function AppShell({
  title,
  children,
  headerActions,
  navItems,
  wide = false,
  icon = false,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  navItems?: BottomNavItem[];
  wide?: boolean;
  icon?: boolean;
}) {
  return (
    <main className="tm-app-shell">
      <div
        className={`mx-auto flex min-h-screen flex-col ${wide ? 'max-w-6xl' : 'max-w-md'}`}
      >
        <header className="tm-app-header">
          <div className="flex items-start justify-between gap-3 lg:justify-start lg:gap-8">
            <div className="flex items-center gap-3">
              {icon ? (
                <Image
                  alt="Terraforming Mars Statistics"
                  className="h-10 w-10 shrink-0 rounded-lg lg:h-12 lg:w-12"
                  height={128}
                  src="/logo-wordmark.png"
                  unoptimized
                  width={128}
                />
              ) : null}
              <div>
                {icon ? null : (
                  <p className="tm-display-eyebrow text-[11px]">
                    Terraforming Mars Stats
                  </p>
                )}
                <h1
                  className={`tm-display-title text-2xl font-bold lg:text-3xl ${icon ? '' : 'mt-2'}`}
                >
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {headerActions}
              <form action={signOut}>
                <button className="tm-button-secondary px-4 py-2 text-xs" type="submit">
                  Log Out
                </button>
              </form>
            </div>
          </div>
        </header>
        <section className="flex-1 px-5 py-5 lg:px-8 lg:py-8">{children}</section>
        <BottomNav items={navItems} />
      </div>
    </main>
  );
}
