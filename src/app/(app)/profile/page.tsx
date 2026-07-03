import { AppShell } from '@/components/layout/app-shell';

export default function ProfilePage() {
  return (
    <AppShell title="My Profile">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
          <h2 className="font-serif text-lg font-semibold">Recent Results</h2>
          <p className="mt-2 text-sm text-stone-300">
            Show win rate, average placement, recent games, and score
            composition trends.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
