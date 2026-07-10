import Link from 'next/link';
import type { SavedGameListItem } from '@/lib/db/game-draft-repo';
import { StepHeading } from '@/components/ui/step-heading';

type DeleteGameAction = (formData: FormData) => Promise<void>;

export function SavedGamesPicker({
  deleteGameAction,
  games,
}: {
  deleteGameAction: DeleteGameAction;
  games: SavedGameListItem[];
}) {
  return (
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="01" title="Saved Games" />
      <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
        Reopen a draft or correct players on a finalized game.
      </p>
      {games.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          No saved games are available in this group yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {games.map((game) => (
            <article className="tm-stat-card flex flex-col gap-3" key={game.gameId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="tm-data-label uppercase">{game.status}</p>
                  <p className="font-semibold text-stone-100">
                    {game.playerNames.length > 0
                      ? game.playerNames.join(', ')
                      : 'Saved player list not available yet.'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
                    Played on {game.playedOn} • {game.playerCount} players
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
                    Updated {game.updatedAt}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    className="tm-button-secondary px-4 py-2 text-xs"
                    href={`/log-game/review?gameId=${game.gameId}`}
                  >
                    {game.status === 'draft' ? 'Resume Draft' : 'Correct Players'}
                  </Link>
                  <form action={deleteGameAction}>
                    <input name="gameId" type="hidden" value={game.gameId} />
                    <button
                      aria-label={`Delete ${game.status === 'draft' ? 'draft' : 'game'} ${game.playerNames.join(', ') || game.gameId}`}
                      className="tm-button-secondary tm-text-danger px-4 py-2 text-xs"
                      type="submit"
                    >
                      {game.status === 'draft' ? 'Delete Draft' : 'Delete Game'}
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
