import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function SavedGamesPage() {
  const context = await requireGroupContextOrRedirect();
  const supabase = await createSupabaseServerClient();
  const { data: games, error } = await supabase
    .from('games')
    .select('id, played_on, status, player_count, generation_count, updated_at')
    .eq('group_id', context.groupId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/saved-games" />
      }
      title="Saved Games"
    >
      <section className="tm-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="tm-panel-title text-lg">Game Library</h2>
            <p className="tm-muted-copy mt-2 text-sm">
              Reopen drafts or review the games saved for this group.
            </p>
          </div>
          <Link className="tm-button-primary" href="/log-game">
            Log a Game
          </Link>
        </div>

        {games.length === 0 ? (
          <p className="tm-muted-copy mt-6 text-sm">No saved games yet.</p>
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => {
              const isDraft = game.status === 'draft';
              const content = (
                <article className="tm-stat-card h-full">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-stone-100">
                      {game.played_on}
                    </h3>
                    <span className="tm-coverage-badge">
                      {isDraft ? 'Draft' : 'Finalized'}
                    </span>
                  </div>
                  <p className="tm-muted-copy mt-3 text-sm">
                    {game.player_count} players | {game.generation_count} generations
                  </p>
                  <p className="tm-data-label mt-4">
                    {isDraft ? 'Open draft' : 'Saved result'}
                  </p>
                </article>
              );

              return isDraft ? (
                <Link href={`/log-game?gameId=${game.id}`} key={game.id}>
                  {content}
                </Link>
              ) : (
                <div key={game.id}>{content}</div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
