import { AppShell } from '@/components/layout/app-shell';
import { ProfileDashboard } from '@/features/analytics/profile-dashboard';

export default function ProfilePage() {
  return (
    <AppShell title="My Profile">
      <ProfileDashboard />
    </AppShell>
  );
}
