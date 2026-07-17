import { AppShell } from '@/components/layout/app-shell';
import { CardLookupBrowser } from '@/features/catalog/card-lookup-browser';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { listCardLookupRecords } from '@/lib/db/reference-repo';
import { pageMetadata } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/cards');

export default async function CardsPage() {
  const context = await requireGroupContextOrRedirect();
  const cards = await listCardLookupRecords();

  return (
    <AppShell
      hasActiveGroup
      headerActions={
        <GroupSwitcher
          currentGroupId={context.groupId}
          returnPath="/cards"
        />
      }
      title="Cards"
    >
      <CardLookupBrowser cards={cards} />
    </AppShell>
  );
}
