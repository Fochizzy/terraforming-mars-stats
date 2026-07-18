'use client';

import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { SelectChevron } from '@/components/ui/select-chevron';
import type { MapOption, PromoSetOption } from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';

type SetupStepProps = {
  guaranteedMergerOffer: boolean | null;
  mapOptions: MapOption[];
  mergerOfferRuleSource: LogGameDraftInput['mergerOfferRuleSource'];
  promoSetOptions: PromoSetOption[];
  register: UseFormRegister<LogGameDraftInput>;
  setValue: UseFormSetValue<LogGameDraftInput>;
};

export function SetupStep({
  guaranteedMergerOffer,
  mapOptions,
  mergerOfferRuleSource,
  promoSetOptions,
  register,
  setValue,
}: SetupStepProps) {
  return (
    <div className="flex flex-col gap-4">
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
      <div>
          <h3 className="tm-data-label">Promo Sets</h3>
          <div className="mt-3 grid gap-3">
            {promoSetOptions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
                No promo sets imported yet.
              </p>
            ) : (
              promoSetOptions.map((promoSet) => (
                <label
                  className="tm-stat-card flex min-h-11 items-center gap-3 text-sm"
                  key={promoSet.slug}
                >
                  <input
                    type="checkbox"
                    value={promoSet.slug}
                    {...register('promoSetSlugs')}
                  />
                  <span>
                    {promoSet.displayName}
                    {promoSet.promoYear ? ` (${promoSet.promoYear})` : ''}
                  </span>
                </label>
              ))
            )}
          </div>
      </div>
      <fieldset
        aria-describedby="merger-offer-help"
        className="rounded-2xl border p-4"
        style={{ borderColor: 'var(--tm-panel-border)' }}
      >
        <legend className="px-1 font-serif text-lg font-semibold">
          Merger availability
        </legend>
        <p className="tm-body-copy mt-2 text-sm" id="merger-offer-help">
          This saved game rule controls analytics. Merger is an additional
          guaranteed option when enabled, but each player still selects only two
          Preludes. The group default is copied to a new game; later group
          changes do not change this game.
        </p>
        <label className="relative mt-3 flex max-w-md flex-col gap-2 text-sm">
          <span className="tm-data-label">Saved Merger rule</span>
          <select
            aria-label="Saved Merger rule"
            className="tm-input appearance-none pr-9"
            onChange={(event) => {
              const value = event.target.value;
              setValue(
                'guaranteedMergerOffer',
                value === 'enabled' ? true : value === 'disabled' ? false : null,
                { shouldDirty: true },
              );
              setValue('mergerOfferRuleSource', 'manual_override', {
                shouldDirty: true,
              });
            }}
            value={
              guaranteedMergerOffer === true
                ? 'enabled'
                : guaranteedMergerOffer === false
                  ? 'disabled'
                  : 'unknown'
            }
          >
            <option value="enabled">On — Merger was guaranteed</option>
            <option value="disabled">Off — Merger was not guaranteed</option>
            <option value="unknown">Unknown — do not infer Off</option>
          </select>
          <SelectChevron />
        </label>
        <p className="mt-2 text-xs" style={{ color: 'var(--tm-muted)' }}>
          Source: {mergerOfferRuleSource === 'group_default'
            ? 'group default copied into this game'
            : mergerOfferRuleSource === 'historical_policy'
              ? 'approved historical policy'
              : mergerOfferRuleSource === 'import_metadata'
                ? 'import metadata'
                : mergerOfferRuleSource === 'manual_override'
                  ? 'editor override'
                  : 'not recorded'}
        </p>
      </fieldset>
    </div>
  );
}
