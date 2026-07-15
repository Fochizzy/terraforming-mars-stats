'use client';

import { useMemo, useState } from 'react';
import { MapImage } from '@/components/ui/map-image';
import { MapInfoButton } from '@/components/ui/map-info-button';
import {
  ObjectiveInfoButton,
  type AwardObjectiveStats,
} from '@/components/ui/objective-info-button';
import { SelectChevron } from '@/components/ui/select-chevron';
import type { MapAwardGroup } from '@/lib/db/reference-repo';
import type { AwardFundingStat } from '@/lib/db/selection-stats-repo';

// Awards that aren't tied to a known map (e.g. randomized draws) still deserve a
// home, so they collect under a mapless "Other awards" option with no image.
const OTHER_CODE = '';
const OTHER_NAME = 'Other awards';

type ResolvedGroup = {
  awards: AwardFundingStat[];
  awardNames: string[];
  mapCode: string;
  mapName: string;
  milestoneNames: string[];
};

function formatRoi(funding: AwardFundingStat) {
  return funding.funded_count > 0
    ? Math.round((funding.funder_won_count / funding.funded_count) * 100)
    : 0;
}

function formatCount(value: number) {
  return value.toLocaleString('en-US');
}

function zeroFunding(awardName: string): AwardFundingStat {
  return { award_name: awardName, funded_count: 0, funder_won_count: 0 };
}

function rate(count: number, denominator: number) {
  return denominator > 0 ? count / denominator : 0;
}

function mapAwardStats(
  row: AwardFundingStat | null | undefined,
): AwardObjectiveStats['personal'] {
  if (!row) {
    return null;
  }

  const firstPlaceCount =
    row.funder_first_place_count ?? row.funder_won_count ?? 0;
  const secondPlaceCount = row.funder_second_place_count ?? 0;
  const gameWonCount = row.funder_game_won_count ?? 0;

  return {
    firstPlace: {
      count: firstPlaceCount,
      denominator: row.funded_count,
      rate:
        row.funder_first_place_rate ??
        rate(firstPlaceCount, row.funded_count),
    },
    fundedCount: row.funded_count,
    gameWins: {
      count: gameWonCount,
      denominator: row.funded_count,
      rate: row.funder_game_won_rate ?? rate(gameWonCount, row.funded_count),
    },
    secondPlace: {
      count: secondPlaceCount,
      denominator: row.funded_count,
      rate:
        row.funder_second_place_rate ??
        rate(secondPlaceCount, row.funded_count),
    },
  };
}

export function buildAwardFundingGroups(
  rows: AwardFundingStat[],
  mapGroups: MapAwardGroup[],
): ResolvedGroup[] {
  const fundingByName = new Map(rows.map((row) => [row.award_name, row]));
  const claimed = new Set<string>();
  const resolved: ResolvedGroup[] = [];

  for (const mapGroup of mapGroups) {
    // List every award on the map, funded or not, so a map's full award slate is
    // always visible; unfunded awards show as zeros rather than being dropped.
    const awards = mapGroup.awardNames.map(
      (awardName) => fundingByName.get(awardName) ?? zeroFunding(awardName),
    );
    const hasFundedAward = mapGroup.awardNames.some((awardName) =>
      fundingByName.has(awardName),
    );

    for (const awardName of mapGroup.awardNames) {
      claimed.add(awardName);
    }

    // Only surface maps that saw at least one funded award, so scopes with no
    // games on a map don't clutter the dropdown with all-zero slates.
    if (hasFundedAward) {
      resolved.push({
        awards,
        awardNames: mapGroup.awardNames,
        mapCode: mapGroup.mapCode,
        mapName: mapGroup.mapName,
        milestoneNames: mapGroup.milestoneNames,
      });
    }
  }

  const leftover = rows.filter((row) => !claimed.has(row.award_name));

  if (leftover.length > 0) {
    resolved.push({
      awards: leftover,
      awardNames: leftover.map((row) => row.award_name),
      mapCode: OTHER_CODE,
      mapName: OTHER_NAME,
      milestoneNames: [],
    });
  }

  return resolved;
}

export function AwardFundingByMap({
  globalRows,
  mapGroups,
  personalRows,
  rows,
}: {
  globalRows?: AwardFundingStat[];
  mapGroups: MapAwardGroup[];
  personalRows?: AwardFundingStat[];
  rows: AwardFundingStat[];
}) {
  const groups = useMemo(
    () => buildAwardFundingGroups(rows, mapGroups),
    [rows, mapGroups],
  );
  const [selectedMap, setSelectedMap] = useState('');
  const activeGroup =
    groups.find((group) => group.mapName === selectedMap) ?? groups[0] ?? null;
  const globalRowsByName = useMemo(
    () => new Map((globalRows ?? rows).map((row) => [row.award_name, row])),
    [globalRows, rows],
  );
  const personalRowsByName = useMemo(
    () => new Map((personalRows ?? []).map((row) => [row.award_name, row])),
    [personalRows],
  );
  const rankedAwards = useMemo(() => {
    if (!activeGroup) {
      return [];
    }

    return [...activeGroup.awards].sort(
      (left, right) =>
        Number(right.funded_count > 0) - Number(left.funded_count > 0) ||
        formatRoi(right) - formatRoi(left) ||
        right.funded_count - left.funded_count ||
        left.award_name.localeCompare(right.award_name),
    );
  }, [activeGroup]);
  const bestRoi = rankedAwards.reduce(
    (best, funding) =>
      funding.funded_count > 0 ? Math.max(best, formatRoi(funding)) : best,
    -1,
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-stone-100">
            Award Funding ROI
          </h4>
          <p className="tm-muted-copy mt-1 text-xs">
            Ranked by how often the funding player finished 1st in the award.
          </p>
        </div>
        <div className="relative w-full max-w-[270px]">
          <label className="tm-data-label" htmlFor="award-funding-map-select">
            Map
          </label>
          <select
            className="tm-input mt-2 w-full appearance-none pr-9"
            id="award-funding-map-select"
            onChange={(event) => setSelectedMap(event.target.value)}
            value={activeGroup?.mapName ?? ''}
          >
            {groups.map((group) => (
              <option key={group.mapName} value={group.mapName}>
                {group.mapName}
              </option>
            ))}
          </select>
          <span className="mt-2 block">
            <SelectChevron />
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/15">
          {activeGroup ? (
            <>
              <div className="tm-data-label hidden grid-cols-[minmax(9rem,1fr)_5rem_5rem_5rem_6rem] gap-3 border-b border-white/10 px-4 py-2 text-[0.68rem] sm:grid">
                <span>Award</span>
                <span className="text-right">Funded</span>
                <span className="text-right">1st</span>
                <span className="text-right">ROI</span>
                <span className="text-right">Signal</span>
              </div>
              <ul className="divide-y divide-white/10 text-xs">
                {rankedAwards.map((funding) => {
                  const roi = formatRoi(funding);
                  const isBest =
                    funding.funded_count > 0 && roi === bestRoi && bestRoi >= 0;

                  return (
                    <li
                      className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(9rem,1fr)_5rem_5rem_5rem_6rem] sm:items-center"
                      key={funding.award_name}
                    >
                      <div className="min-w-0">
                        <ObjectiveInfoButton
                          awardStats={{
                            global: mapAwardStats(
                              globalRowsByName.get(funding.award_name),
                            ),
                            personal: mapAwardStats(
                              personalRowsByName.get(funding.award_name),
                            ),
                          }}
                          className="font-semibold text-stone-100 transition hover:text-[rgb(221,161,93)]"
                          kind="award"
                          name={funding.award_name}
                        />
                        <p className="tm-muted-copy mt-1 sm:hidden">
                          {funding.funded_count > 0
                            ? `${formatCount(funding.funded_count)} funded, ${formatCount(
                                funding.funder_won_count,
                              )} firsts`
                            : 'Not funded yet'}
                        </p>
                      </div>
                      <span className="hidden text-right text-stone-100 sm:block">
                        {formatCount(funding.funded_count)}
                      </span>
                      <span className="hidden text-right text-stone-100 sm:block">
                        {formatCount(funding.funder_won_count)}
                      </span>
                      <span className="text-left font-semibold text-stone-100 sm:text-right">
                        {funding.funded_count > 0 ? `${roi}%` : '-'}
                      </span>
                      <span className="text-left sm:text-right">
                        {isBest ? (
                          <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                            Best ROI
                          </span>
                        ) : funding.funded_count > 0 ? (
                          <span className="tm-muted-copy">Recorded</span>
                        ) : (
                          <span className="tm-muted-copy">No data</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>

        {activeGroup && activeGroup.mapCode ? (
          <aside className="flex flex-col gap-3 lg:items-center">
            <div className="flex items-center justify-between gap-3 lg:w-full">
              <p className="tm-data-label text-xs">
                {activeGroup.mapName} map reference
              </p>
              <MapInfoButton
                awardNames={activeGroup.awardNames}
                mapCode={activeGroup.mapCode}
                mapName={activeGroup.mapName}
                milestoneNames={activeGroup.milestoneNames}
              />
            </div>
            <MapImage
              className="w-full max-w-[340px] rounded-lg object-contain lg:max-w-full"
              code={activeGroup.mapCode}
              height={255}
              mapName={activeGroup.mapName}
              width={340}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
