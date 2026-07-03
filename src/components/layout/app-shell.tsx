import { BottomNav } from '@/components/navigation/bottom-nav';

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#3f170f,_#0c0f14_28%,_#0c0f14)] text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="border-b border-orange-900/50 px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-orange-300">
            Terraforming Mars Stats
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold">{title}</h1>
        </header>
        <section className="flex-1 px-5 py-5">{children}</section>
        <BottomNav />
      </div>
    </main>
  );
}
