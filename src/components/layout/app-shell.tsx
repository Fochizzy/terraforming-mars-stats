import { BottomNav, type BottomNavItem } from '@/components/navigation/bottom-nav';

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
        className={`mx-auto flex min-h-screen flex-col ${wide ? 'max-w-md lg:max-w-4xl xl:max-w-6xl' : 'max-w-md'}`}
      >
        <header className="tm-app-header">
          <div className="flex items-start justify-between gap-3 lg:justify-start lg:gap-8">
            <div>
              <p className="tm-display-eyebrow text-[11px]">
                Terraforming Mars Stats
              </p>
              <h1 className="tm-display-title mt-2 text-2xl font-bold lg:text-3xl">
                {title}
              </h1>
            </div>
            {headerActions}
          </div>
        </header>
        <section className="flex-1 px-5 py-5 lg:px-8 lg:py-8">{children}</section>
        <BottomNav items={navItems} />
      </div>
    </main>
  );
}
