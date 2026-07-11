import Link from 'next/link';
import type { SavedGameListItem } from '@/lib/db/game-draft-repo';
import { StepHeading } from '@/components/ui/step-heading';

type DeleteGameAction = (formData: FormData) => Promise<void>;
type ReopenGameAction = (formData: FormData) => Promise<void>;

type SavedGamesPickerGroup = {
  groupId: string;
  groupName: string;
};

function formatGameStatus(status: SavedGameListItem['status']) {
  return status === 'draft' ? 'In progress' : 'Finished';
}

function SavedGameCard({
  deleteGameAction,
  game,
  groupName,
  reopenGameAction,
}: {
  deleteGameAction: DeleteGameAction;
  game: SavedGameListItem;
  groupName?: string;
  reopenGameAction: ReopenGameAction;
}) {
  const playerNames =
    game.playerNames.length > 0
      ? game.playerNames.join(', ')
      : 'Saved player list not available yet.';
  const playerCountLabel = `${game.playerCount} ${
    game.playerCount === 1 ? 'player' : 'players'
  }`;
  const reviewHref = `/log-game/review?gameId=${encodeURIComponent(
    game.gameId,
  )}&groupId=${encodeURIComponent(game.groupId)}`;

  return (
    <article
      className={`tm-saved-game-card tm-saved-game-card--${game.status} flex flex-col gap-3`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          {groupName ? (
            <p className="tm-data-label uppercase">{groupName}</p>
          ) : null}
          <p className="tm-data-label uppercase">{formatGameStatus(game.status)}</p>
          <p className="font-semibold text-stone-100">{playerNames}</p>
          <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
            Played on {game.playedOn} | {playerCountLabel}
          </p>
          <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
            Updated {game.updatedAt}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            className="tm-button-secondary px-4 py-2 text-xs"
            href={reviewHref}
          >
            {game.status === 'draft' ? 'Resume Draft' : 'Correct Players'}
          </Link>
          {game.status === 'finalized' ? (
            <form action={reopenGameAction}>
              <input name="gameId" type="hidden" value={game.gameId} />
              <input name="groupId" type="hidden" value={game.groupId} />
              <button
                aria-label={`Reopen game ${
                  game.playerNames.join(', ') || game.gameId
                } as a draft`}
                className="tm-button-secondary px-4 py-2 text-xs"
                type="submit"
              >
                Reopen as Draft
              </button>
            </form>
          ) : null}
          <form action={deleteGameAction}>
            <input name="gameId" type="hidden" value={game.gameId} />
            <input name="groupId" type="hidden" value={game.groupId} />
            <button
              aria-label={`Delete ${game.status === 'draft' ? 'draft' : 'game'} ${
                game.playerNames.join(', ') || game.gameId
              }`}
              className="tm-button-secondary tm-text-danger px-4 py-2 text-xs"
              type="submit"
            >
              {game.status === 'draft' ? 'Delete Draft' : 'Delete Game'}
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function SavedGameSection({
  deleteGameAction,
  emptyScopeLabel,
  games,
  groupNameById,
  reopenGameAction,
  showGroupNames,
  status,
}: {
  deleteGameAction: DeleteGameAction;
  emptyScopeLabel: string;
  games: SavedGameListItem[];
  groupNameById: Map<string, string>;
  reopenGameAction: ReopenGameAction;
  showGroupNames: boolean;
  status: SavedGameListItem['status'];
}) {
  const title = status === 'draft' ? 'In Progress Games' : 'Finished Games';
  const emptyLabel =
    status === 'draft'
      ? `No in-progress games are available ${emptyScopeLabel}.`
      : `No finished games are available ${emptyScopeLabel}.`;

  return (
    <section
      className={`tm-saved-game-section tm-saved-game-section--${status} flex flex-col gap-3`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="tm-panel-title text-xs">{title}</h3>
        <span aria-label={`${title} count`} className="tm-saved-game-count">
          {games.length}
        </span>
      </div>
      {games.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          {emptyLabel}
        </p>
      ) : (
        <div className="grid gap-3">
          {games.map((game) => (
            <SavedGameCard
              deleteGameAction={deleteGameAction}
              game={game}
              groupName={showGroupNames ? groupNameById.get(game.groupId) : undefined}
              key={game.gameId}
              reopenGameAction={reopenGameAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function SavedGamesPicker({
  deleteGameAction,
  emptyScopeLabel = 'in this group',
  games,
  groups = [],
  reopenGameAction,
  showGroupNames = false,
}: {
  deleteGameAction: DeleteGameAction;
  emptyScopeLabel?: string;
  games: SavedGameListItem[];
  groups?: SavedGamesPickerGroup[];
  reopenGameAction: ReopenGameAction;
  showGroupNames?: boolean;
}) {
  const draftGames = games.filter((game) => game.status === 'draft');
  const finalizedGames = games.filter((game) => game.status === 'finalized');
  const groupNameById = new Map(
    groups.map((group) => [group.groupId, group.groupName]),
  );

  return (
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="01" title="Saved Games" />
      <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
        Resume a draft, or correct players on a finished game. Reopening a
        finished game moves it back to In Progress and removes it from stats
        until you finalize it again.
      </p>
      <div className="grid gap-4">
        <SavedGameSection
          deleteGameAction={deleteGameAction}
          emptyScopeLabel={emptyScopeLabel}
          games={draftGames}
          groupNameById={groupNameById}
          reopenGameAction={reopenGameAction}
          showGroupNames={showGroupNames}
          status="draft"
        />
        <SavedGameSection
          deleteGameAction={deleteGameAction}
          emptyScopeLabel={emptyScopeLabel}
          games={finalizedGames}
          groupNameById={groupNameById}
          reopenGameAction={reopenGameAction}
          showGroupNames={showGroupNames}
          status="finalized"
        />
      </div>
    </section>
  );
}
