import Image from 'next/image';
import { BottomNav, type BottomNavItem } from '@/components/navigation/bottom-nav';
import { signOut } from '@/features/auth/sign-out';

export function AppShell({
  title,
  children,
  headerActions,
  navItems,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  navItems?: BottomNavItem[];
  wide?: boolean;
}) {
  return (
    <main className="tm-app-shell">
      <div
        className={`mx-auto flex min-h-screen flex-col ${wide ? 'max-w-6xl' : 'max-w-md'}`}
      >
        <header className="tm-app-header">
          <div className="flex items-start justify-between gap-3 lg:justify-start lg:gap-8">
            <div className="flex flex-col items-start gap-2">
              <Image
                alt="Terraforming Mars Statistics"
                className="h-8 w-auto shrink-0 rounded-md lg:h-10"
                height={793}
                src="/banner.png"
                unoptimized
                width={1983}
              />
              <h1 className="tm-display-title text-2xl font-bold lg:text-3xl">
                {title}
              </h1>
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
