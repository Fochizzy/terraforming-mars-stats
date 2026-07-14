'use client';

import { useMemo, useState } from 'react';
import { SelectChevron } from '@/components/ui/select-chevron';
import { TagIcon } from '@/components/ui/tag-icon';
import type {
  CorporationTagStat,
  SelectionDialogData,
} from '@/lib/db/selection-stats-repo';
import { SelectionNameButton } from './selection-name-link';

export function CorporationTagProfiles({
  dialogData,
  rows,
}: {
  dialogData?: SelectionDialogData;
  rows: CorporationTagStat[];
}) {
  const corporationNames = useMemo(
    () =>
      [...new Set(rows.map((row) => row.corporation_name))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [rows],
  );
  const [selected, setSelected] = useState('');
  const activeCorporation =
    selected && corporationNames.includes(selected)
      ? selected
      : corporationNames[0] ?? '';

  // Highest-count tags first so the corporation's signature tags lead.
  const tagsForCorporation = useMemo(
    () =>
      rows
        .filter((row) => row.corporation_name === activeCorporation)
        .sort((left, right) => right.avg_tag_count - left.avg_tag_count),
    [rows, activeCorporation],
  );

  if (corporationNames.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold tm-accent-copy">
        Tag Profiles by Corporation
      </h4>
      <div className="relative max-w-[240px]">
        <label className="tm-data-label" htmlFor="corporation-tag-profile-select">
          Corporation
        </label>
        <select
          className="tm-input mt-2 w-full appearance-none pr-9"
          id="corporation-tag-profile-select"
          onChange={(event) => setSelected(event.target.value)}
          value={activeCorporation}
        >
          {corporationNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="mt-2 block">
          <SelectChevron />
        </span>
      </div>
      <p className="mt-3 text-sm">
        <SelectionNameButton
          dialogData={dialogData}
          kind="Corporation"
          name={activeCorporation}
        />
      </p>

      {tagsForCorporation.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          {tagsForCorporation.map((tagStat) => (
            <li className="flex items-center gap-2" key={tagStat.tag_code}>
              <TagIcon code={tagStat.tag_code} size={20} />
              <span className="font-semibold tabular-nums text-stone-100">
                {tagStat.avg_tag_count}
              </span>
              <span className="tm-muted-copy">{tagStat.tag_code} / game</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tm-muted-copy mt-3 text-xs">
          No tag profile recorded for this corporation yet.
        </p>
      )}
    </div>
  );
}
