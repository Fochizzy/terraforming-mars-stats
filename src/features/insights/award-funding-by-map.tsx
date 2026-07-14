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

  if (groups.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold tm-accent-copy">
        Award Funding ROI
      </h4>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-1">
          <div className="relative max-w-[240px]">
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
          {activeGroup?.mapCode ? (
            <p className="text-sm">
              <MapInfoButton
                awardNames={activeGroup.awardNames}
                mapCode={activeGroup.mapCode}
                mapName={activeGroup.mapName}
                milestoneNames={activeGroup.milestoneNames}
              />
            </p>
          ) : null}
          {activeGroup ? (
            <ul className="flex flex-col gap-1 text-xs">
              {activeGroup.awards.map((funding) => (
                <li key={funding.award_name}>
                  <ObjectiveInfoButton
                    awardStats={{
                      global: mapAwardStats(globalRowsByName.get(funding.award_name)),
                      personal: mapAwardStats(
                        personalRowsByName.get(funding.award_name),
                      ),
                    }}
                    kind="award"
                    name={funding.award_name}
                  />
                  :{' '}
                  {funding.funded_count > 0 ? (
                    <>
                      funded {funding.funded_count}×, funder took 1st{' '}
                      {funding.funder_won_count}× ({formatRoi(funding)}% ROI)
                    </>
                  ) : (
                    <span className="tm-muted-copy">not funded yet</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {activeGroup && activeGroup.mapCode ? (
          <MapImage
            className="w-full max-w-[320px] rounded-lg object-contain sm:w-[280px]"
            code={activeGroup.mapCode}
            height={210}
            mapName={activeGroup.mapName}
            width={280}
          />
        ) : null}
      </div>
    </div>
  );
}
