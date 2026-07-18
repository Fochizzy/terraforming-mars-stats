'use client';

import type { CardOption, StyleOption } from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';
import { LOG_GAME_WORKFLOW_STEP_LABELS } from './log-game-entry';

type StyleStepProps = {
  cardOptions: CardOption[];
  register: UseFormRegister<LogGameDraftInput>;
  selectedPlayers: Array<{
    id: string;
    display_name: string;
  }>;
  styleOptions: StyleOption[];
};

export function StyleStep({
  cardOptions,
  register,
  selectedPlayers,
  styleOptions,
}: StyleStepProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-900/30 bg-black/25 p-4">
      <h2 className="font-serif text-xl font-semibold">
        {LOG_GAME_WORKFLOW_STEP_LABELS.details}
      </h2>
      <p className="text-sm text-stone-300">
        Optionally record declared style, style modifiers, and key cards from
        the cached catalog.
      </p>
      <div className="grid gap-4">
        {selectedPlayers.map((player) => (
          <article
            className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4"
            key={player.id}
          >
            <h3 className="font-serif text-lg font-semibold">
              {player.display_name}
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-stone-200">
                  Declared Style
                </span>
                <select
                  aria-label={`${player.display_name} Declared Style`}
                  className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3"
                  defaultValue=""
                  {...register(
                    `playerStyles.${player.id}.primaryStyleCode` as const,
                  )}
                >
                  <option value="">No declared style</option>
                  {styleOptions.map((style) => (
                    <option key={style.id} value={style.code}>
                      {style.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((slotIndex) => (
                  <label className="flex flex-col gap-2 text-sm" key={slotIndex}>
                    <span className="font-semibold text-stone-200">
                      Style Modifier {slotIndex + 1}
                    </span>
                    <select
                      aria-label={`${player.display_name} Style Modifier ${slotIndex + 1}`}
                      className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3"
                      defaultValue=""
                      {...register(
                        `playerStyles.${player.id}.modifierStyleCodes.${slotIndex}` as const,
                      )}
                    >
                      <option value="">No modifier</option>
                      {styleOptions.map((style) => (
                        <option key={style.id} value={style.code}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((slotIndex) => (
                  <label className="flex flex-col gap-2 text-sm" key={slotIndex}>
                    <span className="font-semibold text-stone-200">
                      Key Card {slotIndex + 1}
                    </span>
                    <select
                      aria-label={`${player.display_name} Key Card ${slotIndex + 1}`}
                      className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3"
                      defaultValue=""
                      {...register(
                        `playerStyles.${player.id}.keyCardIds.${slotIndex}` as const,
                      )}
                    >
                      <option value="">No key card</option>
                      {cardOptions.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.cardNumber} - {card.cardName}
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
    </section>
  );
}
