import { AppShell } from '@/components/layout/app-shell';
import { PromoSetBrowser } from '@/features/catalog/promo-set-browser';

export default function InsightsPage() {
  return (
    <AppShell title="Insights">
      <div className="flex flex-col gap-4">
        <PromoSetBrowser />
      </div>
    </AppShell>
  );
}
