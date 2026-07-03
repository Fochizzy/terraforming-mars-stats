import { AppShell } from '@/components/layout/app-shell';
import { GroupSettingsForm } from '@/features/groups/group-settings-form';

export default function GroupSettingsPage() {
  return (
    <AppShell title="Group Settings">
      <GroupSettingsForm
        initialValues={{
          groupName: 'Friday Mars',
          globalAnalyticsEnabled: false,
          defaultExpansionCodes: ['base', 'prelude'],
          defaultPromoSetSlugs: [],
        }}
      />
    </AppShell>
  );
}
