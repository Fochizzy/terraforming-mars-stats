'use client';

import Link from 'next/link';
import type { UseFormRegister } from 'react-hook-form';
import { SelectChevron } from '@/components/ui/select-chevron';
import { StepHeading } from '@/components/ui/step-heading';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { MapOption } from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';

type SetupStepProps = {
  mapOptions: MapOption[];
  register: UseFormRegister<LogGameDraftInput>;
};

export function SetupStep({ mapOptions, register }: SetupStepProps) {
  return (
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="01" title="Game Setup" />
      <p className="tm-body-copy text-sm">
        <GlossaryRichText>
          Choose the group, map, player count, and generation count.
        </GlossaryRichText>
      </p>
      <Link className="tm-button-secondary w-fit" href="/log-game">
        Open Web Import
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Played On</span>
          <input
            aria-label="Played On"
            className="tm-input"
            type="date"
            {...register('playedOn')}
          />
        </label>
        <label className="relative flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Map</span>
          <select
            aria-label="Map"
            className="tm-input appearance-none pr-9"
            {...register('mapId')}
          >
            {mapOptions.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
          <SelectChevron />
        </label>
        <label className="relative flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Player Count</span>
          <select
            aria-label="Player Count"
            className="tm-input appearance-none pr-9"
            {...register('playerCount', { valueAsNumber: true })}
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <SelectChevron />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Generation Count</span>
          <input
            aria-label="Generation Count"
            className="tm-input"
            min={1}
            type="number"
            {...register('generationCount', { valueAsNumber: true })}
          />
        </label>
      </div>
    </section>
  );
}
