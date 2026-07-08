import { AppShell } from '@/components/layout/app-shell';
import { CardLookupBrowser } from '@/features/catalog/card-lookup-browser';
import { listCardLookupRecords } from '@/lib/db/reference-repo';

export default async function CardsPage() {
  const cards = await listCardLookupRecords();

  return (
    <AppShell title="Cards" wide>
      <CardLookupBrowser cards={cards} />
    </AppShell>
  );
}
