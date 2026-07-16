'use client';

import { startTransition, useState } from 'react';
import { signupFullNameSchema } from '@/features/auth/username-auth';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';

type ActionResult = {
  status: 'success' | 'error';
  message: string;
};

type PlayerListProps = {
  currentUserFullName?: string | null;
  currentUserId?: string | null;
  onAddPlayer: (displayName: string) => Promise<ActionResult>;
  onLinkPlayer?: (playerId: string) => Promise<ActionResult>;
  players: Array<{
    id: string;
    display_name: string;
    linked_user_id?: string | null;
  }>;
};

export function PlayerList({
  currentUserFullName = null,
  currentUserId = null,
  onAddPlayer,
  onLinkPlayer,
  players,
}: PlayerListProps) {
  const [displayName, setDisplayName] = useState('');
  const [isAddPending, setIsAddPending] = useState(false);
  const [pendingLinkPlayerId, setPendingLinkPlayerId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<{
    status: 'success' | 'error';
    text: string;
  } | null>(null);
  const fullNameResult = signupFullNameSchema.safeParse(displayName);
  const canAddPlayer = fullNameResult.success;
  const normalizedCurrentUserFullName = currentUserFullName
    ? normalizePlayerAlias(currentUserFullName)
    : null;

  return (
    <section className="tm-panel flex flex-col gap-4">
      <h2 className="tm-panel-title text-lg">Recurring Player Profiles</h2>
      <p className="tm-body-copy text-sm">
        Add shared player records, link signed-in users when needed, and keep
        the group roster consistent between games.
      </p>
      {currentUserId ? (
        <p className="tm-muted-copy text-sm">
          {currentUserFullName
            ? `Signed in as ${currentUserFullName}. Link the matching roster row to unlock your personal analytics.`
            : 'Use the matching roster row to link your signed-in account.'}
        </p>
      ) : null}
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!fullNameResult.success) {
            setMessage({
              status: 'error',
              text:
                fullNameResult.error.issues[0]?.message ??
                'Enter a full player name in First Name Last Name format.',
            });
            return;
          }
          setIsAddPending(true);
          setMessage(null);
          startTransition(async () => {
            try {
              const result = await onAddPlayer(fullNameResult.data);
              setMessage({ status: result.status, text: result.message });
              if (result.status === 'success') {
                setDisplayName('');
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
          <span className="tm-data-label">Add Player Name</span>
          <input
            aria-label="Add Player Name"
            className="tm-input"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="First Name Last Name"
            value={displayName}
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
          const matchesCurrentUserName =
            normalizedCurrentUserFullName &&
            normalizePlayerAlias(player.display_name) ===
              normalizedCurrentUserFullName;

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
