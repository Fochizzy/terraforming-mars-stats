'use client';

import { startTransition, useState } from 'react';
import { guestPersonalNameSchema } from '@/lib/player-identity/guest-personal-name';

type PlayerListProps = {
  onAddPlayer: (input: { firstName: string; lastName: string }) => Promise<{
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{
    status: 'success' | 'error';
    text: string;
  } | null>(null);
  const personalNameResult = guestPersonalNameSchema.safeParse({
    firstName,
    lastName,
  });
  const canAddPlayer = personalNameResult.success;

  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">
        Recurring Player Profiles
      </h2>
      <p className="mt-2 text-sm text-stone-300">
        Add shared player records, link signed-in users when needed, and keep
        the group roster consistent between games. A guest&rsquo;s first and
        last name stay private: the roster shows a neutral guest label until
        the person registers and claims the profile.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!personalNameResult.success) {
            setMessage({
              status: 'error',
              text:
                personalNameResult.error.issues[0]?.message ??
                'Enter both a first and last name.',
            });
            return;
          }
          setIsPending(true);
          setMessage(null);
          startTransition(async () => {
            try {
              const result = await onAddPlayer(personalNameResult.data);
              setMessage({ status: result.status, text: result.message });
              if (result.status === 'success') {
                setFirstName('');
                setLastName('');
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
          <span className="font-semibold text-stone-200">First Name</span>
          <input
            aria-label="First Name"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3 text-stone-100"
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            value={firstName}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Last Name</span>
          <input
            aria-label="Last Name"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3 text-stone-100"
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Last name"
            value={lastName}
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
