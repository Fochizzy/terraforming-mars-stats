import { AppShell } from '@/components/layout/app-shell';

export default function InsightsPage() {
  return (
    <AppShell title="Insights">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
          <h2 className="font-serif text-lg font-semibold">Insight Lab</h2>
          <p className="mt-2 text-sm text-stone-300">
            Explore weighted leaderboards, head-to-head filters, playstyle
            comparisons, and promo interactions.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
