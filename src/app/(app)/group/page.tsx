import { AppShell } from '@/components/layout/app-shell';
import { GroupDashboard } from '@/features/analytics/group-dashboard';

export default function GroupPage() {
  return (
    <AppShell title="Group">
      <GroupDashboard />
    </AppShell>
  );
}
