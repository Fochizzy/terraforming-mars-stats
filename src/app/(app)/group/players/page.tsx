import { AppShell } from '@/components/layout/app-shell';
import { PlayerList } from '@/features/groups/player-list';

export default function PlayersPage() {
  return (
    <AppShell title="Players">
      <PlayerList
        players={[
          { id: 'p1', display_name: 'Friday Mars' },
          { id: 'p2', display_name: 'Second Seat' },
        ]}
      />
    </AppShell>
  );
}
