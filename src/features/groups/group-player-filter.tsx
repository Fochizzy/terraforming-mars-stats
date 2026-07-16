'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { PlayerRow } from '@/lib/db/player-repo';

export function GroupPlayerFilter({
  players,
  selectedPlayerIds,
}: {
  players: PlayerRow[];
  selectedPlayerIds: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = new Set(selectedPlayerIds);
  const allSelected = players.length > 0 && players.every((player) => selected.has(player.id));

  function applySelection(nextIds: string[]) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextIds.length === players.length) {
      params.delete('players');
    } else {
      params.set('players', nextIds.join(','));
    }

    const query = params.toString();
    router.replace(query ? `/group?${query}` : '/group', { scroll: false });
  }

  function togglePlayer(playerId: string) {
    const next = new Set(selected);

    if (next.has(playerId)) {
      next.delete(playerId);
    } else {
      next.add(playerId);
    }

    applySelection(players.filter((player) => next.has(player.id)).map((player) => player.id));
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-200/80">
            Players included
          </p>
          <p className="mt-1 text-sm text-stone-400">
            Choose any combination of people you have played with for the player-focused sections below.
          </p>
        </div>
        <button
          className="w-fit rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-stone-200 transition hover:border-orange-300/30 hover:text-orange-100"
          onClick={() => applySelection(allSelected ? [] : players.map((player) => player.id))}
          type="button"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {players.map((player) => {
          const checked = selected.has(player.id);

          return (
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                checked
                  ? 'border-orange-300/40 bg-orange-300/[0.10] text-orange-50'
                  : 'border-white/[0.08] bg-black/20 text-stone-400 hover:border-white/20'
              }`}
              key={player.id}
            >
              <input
                checked={checked}
                className="h-4 w-4 accent-orange-500"
                onChange={() => togglePlayer(player.id)}
                type="checkbox"
              />
              <span>{player.display_name}</span>
            </label>
          );
        })}
      </div>

      {selectedPlayerIds.length === 0 ? (
        <p className="mt-3 text-xs text-amber-300/80">
          Select at least one player to show player-specific analytics.
        </p>
      ) : null}
    </section>
  );
}
