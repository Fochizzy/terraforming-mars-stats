import { AppShell } from '@/components/layout/app-shell';
import { LogGameWizard } from '@/features/games/log-game/log-game-wizard';

export default function LogGamePage() {
  return (
    <AppShell title="Log Game">
      <LogGameWizard />
    </AppShell>
  );
}
