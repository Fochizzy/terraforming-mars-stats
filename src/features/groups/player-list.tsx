'use client';

import { startTransition, useState } from 'react';
import { usernameHandleSchema } from '@/features/auth/username-auth';

type ActionResult = {
  status: 'success' | 'error';
  message: string;
};

type PlayerListProps = {
  currentUserId?: string | null;
  currentUserUsername?: string | null;
  onAddPlayer: (username: string) => Promise<ActionResult>;
  onLinkPlayer?: (playerId: string) => Promise<ActionResult>;
  players: Array<{
    id: string;
    display_name: string;
    linked_user_id?: string | null;
    matches_current_user?: boolean;
  }>;
};

export function PlayerList({
  currentUserId = null,
  currentUserUsername = null,
  onAddPlayer,
  onLinkPlayer,
  players,
}: PlayerListProps) {
  const [username, setUsername] = useState('');
  const [isAddPending, setIsAddPending] = useState(false);
  const [pendingLinkPlayerId, setPendingLinkPlayerId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<{
    status: 'success' | 'error';
    text: string;
  } | null>(null);
  const usernameResult = usernameHandleSchema.safeParse(username);
  const canAddPlayer = usernameResult.success;

  return (
    <section className="tm-panel flex flex-col gap-4">
      <h2 className="tm-panel-title text-lg">Recurring Player Profiles</h2>
      <p className="tm-body-copy text-sm">
        Add shared player records, link signed-in users when needed, and keep
        the group roster consistent between games.
      </p>
      {currentUserId ? (
        <p className="tm-muted-copy text-sm">
          {currentUserUsername
            ? `Signed in as @${currentUserUsername}. Link the matching roster row to unlock your personal analytics.`
            : 'Use the matching roster row to link your signed-in account.'}
        </p>
      ) : null}
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!usernameResult.success) {
            setMessage({
              status: 'error',
              text:
                usernameResult.error.issues[0]?.message ??
                'Enter a username.',
            });
            return;
          }
          setIsAddPending(true);
          setMessage(null);
          startTransition(async () => {
            try {
              const result = await onAddPlayer(usernameResult.data);
              setMessage({ status: result.status, text: result.message });
              if (result.status === 'success') {
                setUsername('');
              }
            } catch (error) {
              setMessage({
                status: 'error',
                text:
                  error instanceof Error
                    ? error.message
                    : 'Unable to add that player right now.',
              });
            } finally {
              setIsAddPending(false);
            }
          });
        }}
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Add Player Username</span>
          <input
            aria-label="Add Player Username"
            autoCapitalize="none"
            className="tm-input"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            value={username}
          />
        </label>
        <button
          className="self-end tm-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isAddPending || pendingLinkPlayerId !== null || !canAddPlayer}
          type="submit"
        >
          {isAddPending ? 'Adding...' : 'Add Player'}
        </button>
      </form>
      {message ? (
        <p
          className={
            message.status === 'success'
              ? 'text-sm tm-text-success'
              : 'text-sm tm-text-danger'
          }
        >
          {message.text}
        </p>
      ) : null}
      <ul className="grid gap-2">
        {players.map((player) => {
          const isLinkedToCurrentUser = Boolean(
            currentUserId && player.linked_user_id === currentUserId,
          );
          const isLinkedToAnotherUser = Boolean(
            player.linked_user_id && player.linked_user_id !== currentUserId,
          );
          const matchesCurrentUserName = player.matches_current_user;

          return (
            <li className="tm-stat-card" key={player.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-100">{player.display_name}</p>
                  {matchesCurrentUserName ? (
                    <p className="tm-muted-copy mt-1 text-xs">
                      Matches your account name
                    </p>
                  ) : null}
                </div>
                {isLinkedToCurrentUser ? (
                  <span className="tm-coverage-badge">Linked to you</span>
                ) : isLinkedToAnotherUser ? (
                  <span
                    className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-300"
                    style={{ borderColor: 'var(--tm-panel-border)' }}
                  >
                    Linked
                  </span>
                ) : currentUserId && onLinkPlayer ? (
                  <button
                    aria-label={`Link ${player.display_name}`}
                    className="tm-button-secondary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isAddPending || pendingLinkPlayerId !== null}
                    onClick={() => {
                      setPendingLinkPlayerId(player.id);
                      setMessage(null);
                      startTransition(async () => {
                        try {
                          const result = await onLinkPlayer(player.id);
                          setMessage({ status: result.status, text: result.message });
                        } catch (error) {
                          setMessage({
                            status: 'error',
                            text:
                              error instanceof Error
                                ? error.message
                                : 'Unable to link that player right now.',
                          });
                        } finally {
                          setPendingLinkPlayerId(null);
                        }
                      });
                    }}
                    type="button"
                  >
                    {pendingLinkPlayerId === player.id ? 'Linking...' : 'Link to My Profile'}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
