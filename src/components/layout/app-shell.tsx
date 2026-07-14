import { BottomNav } from '@/components/navigation/bottom-nav';

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
        <BottomNav />
      </div>
    </main>
  );
}
