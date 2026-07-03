import { AppShell } from '@/components/layout/app-shell';

export default function GroupPage() {
  return (
    <AppShell title="Group">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
          <h2 className="font-serif text-lg font-semibold">Group Defaults</h2>
          <p className="mt-2 text-sm text-stone-300">
            Manage the default expansion profile, promo sets, and aggregate
            analytics opt-in.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
