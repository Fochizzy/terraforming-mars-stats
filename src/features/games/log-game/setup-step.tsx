'use client';

import Link from 'next/link';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { ExpansionOption, MapOption, PromoSetOption } from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';

type SetupStepProps = {
  expansionOptions: ExpansionOption[];
  guaranteedMergerOffer: boolean | null;
  mapOptions: MapOption[];
  mergerOfferRuleSource: LogGameDraftInput['mergerOfferRuleSource'];
  promoSetOptions: PromoSetOption[];
  register: UseFormRegister<LogGameDraftInput>;
  setValue: UseFormSetValue<LogGameDraftInput>;
};

export function SetupStep({
  expansionOptions,
  guaranteedMergerOffer,
  mapOptions,
  mergerOfferRuleSource,
  promoSetOptions,
  register,
  setValue,
}: SetupStepProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-900/30 bg-black/25 p-4">
      <h2 className="font-serif text-xl font-semibold">Game Setup</h2>
      <p className="text-sm text-stone-300">
        Choose the group, map, player count, expansions, promos, and generation
        count.
      </p>
      <Link
        className="w-fit rounded-full border border-cyan-300/40 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:text-cyan-50"
        href="/log-game/import"
      >
        Open Web Import
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Played On</span>
          <input
            aria-label="Played On"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            type="date"
            {...register('playedOn')}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Map</span>
          <select
            aria-label="Map"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            {...register('mapId')}
          >
            {mapOptions.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Player Count</span>
          <select
            aria-label="Player Count"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            {...register('playerCount', { valueAsNumber: true })}
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Generation Count</span>
          <input
            aria-label="Generation Count"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            min={1}
            type="number"
            {...register('generationCount', { valueAsNumber: true })}
          />
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Expansions</h3>
          <div className="mt-3 grid gap-3">
            {expansionOptions.map((expansion) => (
              <label
                className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-3 text-sm"
                key={expansion.code}
              >
                <input
                  type="checkbox"
                  value={expansion.code}
                  {...register('expansionCodes')}
                />
                {expansion.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Promo Sets</h3>
          <div className="mt-3 grid gap-3">
            {promoSetOptions.length === 0 ? (
              <p className="text-sm text-stone-400">
                No promo sets imported yet.
              </p>
            ) : (
              promoSetOptions.map((promoSet) => (
                <label
                  className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-3 text-sm"
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
      </div>
      <fieldset
        aria-describedby="merger-offer-help"
        className="rounded-2xl border border-orange-900/30 bg-stone-950/40 p-4"
      >
        <legend className="px-1 font-serif text-lg font-semibold">
          Merger availability
        </legend>
        <p className="mt-2 text-sm text-stone-300" id="merger-offer-help">
          This saved game rule controls analytics. Merger is an additional
          guaranteed option when enabled, but each player still selects only two
          Preludes. The group default is copied to a new game; later group
          changes do not change this game.
        </p>
        <label className="mt-3 flex max-w-md flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Saved Merger rule</span>
          <select
            aria-label="Saved Merger rule"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
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
        </label>
        <p className="mt-2 text-xs text-stone-400">
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
    </section>
  );
}
