'use client';

import { SelectChevron } from '@/components/ui/select-chevron';
import { StepHeading } from '@/components/ui/step-heading';
import type { CardOption, StyleOption } from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';

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
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="05" title="Styles and Key Cards" />
      <p className="tm-body-copy text-sm">
        Optionally record declared style, style modifiers, and key cards from
        the cached catalog.
      </p>
      <div className="grid gap-4">
        {selectedPlayers.map((player) => (
          <article className="tm-stat-card" key={player.id}>
            <p className="font-semibold text-stone-100">
              {player.display_name}
            </p>
            <div className="mt-4 grid gap-3">
              <label className="relative flex flex-col gap-2 text-sm">
                <span className="tm-data-label">Declared Style</span>
                <select
                  aria-label={`${player.display_name} Declared Style`}
                  className="tm-input appearance-none pr-9"
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
                <SelectChevron />
              </label>
              <div className="grid gap-3 lg:grid-cols-2">
                {[0, 1].map((slotIndex) => (
                  <label
                    className="relative flex flex-col gap-2 text-sm"
                    key={slotIndex}
                  >
                    <span className="tm-data-label">
                      Style Modifier {slotIndex + 1}
                    </span>
                    <select
                      aria-label={`${player.display_name} Style Modifier ${slotIndex + 1}`}
                      className="tm-input appearance-none pr-9"
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
                    <SelectChevron />
                  </label>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {[0, 1, 2].map((slotIndex) => (
                  <label
                    className="relative flex flex-col gap-2 text-sm"
                    key={slotIndex}
                  >
                    <span className="tm-data-label">
                      Key Card {slotIndex + 1}
                    </span>
                    <select
                      aria-label={`${player.display_name} Key Card ${slotIndex + 1}`}
                      className="tm-input appearance-none pr-9"
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
                    <SelectChevron />
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
