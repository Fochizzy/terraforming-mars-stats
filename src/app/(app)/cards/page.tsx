import { AppShell } from '@/components/layout/app-shell';
import { PromoSetBrowser } from '@/features/catalog/promo-set-browser';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { listPromoCards, listPromoSets } from '@/lib/db/reference-repo';

export default async function CardsPage() {
  await requireGroupContextOrRedirect();
  const [promoSets, promoCards] = await Promise.all([
    listPromoSets(),
    listPromoCards(),
  ]);

  return (
    <AppShell title="Cards">
      <PromoSetBrowser cards={promoCards} promoSets={promoSets} />
    </AppShell>
  );
}
