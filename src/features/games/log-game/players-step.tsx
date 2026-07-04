'use client';

import type {
  CorporationOption,
  PreludeOption,
} from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';

type PlayersStepProps = {
  corporationOptions: CorporationOption[];
  playerOptions: Array<{
    id: string;
    display_name: string;
  }>;
  preludeOptions: PreludeOption[];
  register: UseFormRegister<LogGameDraftInput>;
  selectedPlayerIds: string[];
};

export function PlayersStep({
  corporationOptions,
  playerOptions,
  preludeOptions,
  register,
  selectedPlayerIds,
}: PlayersStepProps) {
  const selectedPlayers = selectedPlayerIds
    .map((playerId) => playerOptions.find((player) => player.id === playerId))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-900/30 bg-black/25 p-4">
      <h2 className="font-serif text-xl font-semibold">Players</h2>
      <p className="text-sm text-stone-300">
        Pick saved players, then assign corporation and prelude selections.
      </p>
      <p className="text-xs uppercase tracking-[0.22em] text-orange-300">
        {selectedPlayers.length} saved profiles selected
      </p>
      <div className="grid gap-3">
        {playerOptions.map((player) => (
          <label
            className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-3 text-sm"
            key={player.id}
          >
            <input
              type="checkbox"
              value={player.id}
              {...register('selectedPlayerIds')}
            />
            {player.display_name}
          </label>
        ))}
      </div>
      {selectedPlayers.length === 0 ? (
        <p className="text-sm text-stone-400">
          Select at least one saved player to assign corporations and preludes.
        </p>
      ) : (
        <div className="grid gap-4">
          {selectedPlayers.map((player) => (
            <article
              className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4"
              key={player.id}
            >
              <h3 className="font-serif text-lg font-semibold">
                {player.display_name}
              </h3>
              <div className="mt-4 grid gap-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-semibold text-stone-200">
                    Corporation
                  </span>
                  <select
                    aria-label={`${player.display_name} Corporation`}
                    className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3"
                    defaultValue=""
                    {...register(
                      `playerSelections.${player.id}.corporationId` as const,
                    )}
                  >
                    <option value="">Select corporation</option>
                    {corporationOptions.map((corporation) => (
                      <option key={corporation.id} value={corporation.id}>
                        {corporation.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((slotIndex) => (
                    <label className="flex flex-col gap-2 text-sm" key={slotIndex}>
                      <span className="font-semibold text-stone-200">
                        Prelude {slotIndex + 1}
                      </span>
                      <select
                        aria-label={`${player.display_name} Prelude ${slotIndex + 1}`}
                        className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3"
                        defaultValue=""
                        {...register(
                          `playerSelections.${player.id}.preludeIds.${slotIndex}` as const,
                        )}
                      >
                        <option value="">No prelude</option>
                        {preludeOptions.map((prelude) => (
                          <option key={prelude.id} value={prelude.id}>
                            {prelude.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
