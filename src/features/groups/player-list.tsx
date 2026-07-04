'use client';

import { startTransition, useState } from 'react';
import { signupFullNameSchema } from '@/features/auth/username-auth';

type PlayerListProps = {
  onAddPlayer: (displayName: string) => Promise<{
    status: 'success' | 'error';
    message: string;
  }>;
  players: Array<{
    id: string;
    display_name: string;
    linked_user_id?: string | null;
  }>;
};

export function PlayerList({ onAddPlayer, players }: PlayerListProps) {
  const [displayName, setDisplayName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{
    status: 'success' | 'error';
    text: string;
  } | null>(null);
  const fullNameResult = signupFullNameSchema.safeParse(displayName);
  const canAddPlayer = fullNameResult.success;

  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">
        Recurring Player Profiles
      </h2>
      <p className="mt-2 text-sm text-stone-300">
        Add shared player records, link signed-in users when needed, and keep
        the group roster consistent between games.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
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
          setIsPending(true);
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
              setIsPending(false);
            }
          });
        }}
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Add Player Name</span>
          <input
            aria-label="Add Player Name"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3 text-stone-100"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="First Name Last Name"
            value={displayName}
          />
        </label>
        <button
          className="self-end rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !canAddPlayer}
          type="submit"
        >
          {isPending ? 'Adding…' : 'Add Player'}
        </button>
      </form>
      {message ? (
        <p
          className={
            message.status === 'success'
              ? 'mt-3 text-sm text-emerald-300'
              : 'mt-3 text-sm text-rose-300'
          }
        >
          {message.text}
        </p>
      ) : null}
      <ul className="mt-4 grid gap-2">
        {players.map((player) => (
          <li
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3 text-sm text-stone-200"
            key={player.id}
          >
            {player.display_name}
          </li>
        ))}
      </ul>
    </section>
  );
}
