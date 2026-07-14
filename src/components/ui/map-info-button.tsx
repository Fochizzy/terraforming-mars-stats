'use client';

import { useEffect, useState } from 'react';
import {
  AWARD_DEFINITIONS,
  MAP_AWARD_FALLBACKS,
  MAP_MILESTONE_FALLBACKS,
  MILESTONE_DEFINITIONS,
} from '@/lib/maps/map-objective-definitions';
import { MapImage, hasMapImage } from './map-image';

const LINK_CLASS =
  'font-semibold text-stone-100 underline decoration-dotted underline-offset-2 transition hover:text-[rgb(221,161,93)]';

function DefinitionList({
  definitions,
  emptyText,
  names,
  title,
}: {
  definitions: Readonly<Record<string, string>>;
  emptyText: string;
  names: string[];
  title: string;
}) {
  return (
    <div className="mt-4">
      <h3 className="tm-data-label text-xs">{title}</h3>
      {names.length > 0 ? (
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {names.map((name) => (
            <li className="tm-stat-card" key={name}>
              <p className="font-semibold text-stone-100">{name}</p>
              <p className="tm-muted-copy mt-1 text-xs">
                {definitions[name] ?? 'Definition pending.'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tm-muted-copy mt-2 text-sm">{emptyText}</p>
      )}
    </div>
  );
}

function MapInfoDialog({
  awardNames,
  mapCode,
  mapName,
  milestoneNames,
  onClose,
}: {
  awardNames: string[];
  mapCode: string;
  mapName: string;
  milestoneNames: string[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      aria-label={`${mapName} map details`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="tm-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tm-data-label text-xs">Board Map</p>
            <h2 className="tm-panel-title text-lg font-semibold">{mapName}</h2>
          </div>
          <button
            aria-label="Close"
            className="tm-button-secondary px-3 py-1 text-sm"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {hasMapImage(mapCode) ? (
          <div className="mt-4 flex justify-center">
            <MapImage
              className="max-h-[420px] w-full rounded-md object-contain"
              code={mapCode}
              height={420}
              mapName={mapName}
              width={640}
            />
          </div>
        ) : null}

        <DefinitionList
          definitions={AWARD_DEFINITIONS}
          emptyText={
            MAP_AWARD_FALLBACKS[mapCode] ??
            'No fixed awards are mapped to this board yet.'
          }
          names={awardNames}
          title="Fixed Awards"
        />

        <DefinitionList
          definitions={MILESTONE_DEFINITIONS}
          emptyText={
            MAP_MILESTONE_FALLBACKS[mapCode] ??
            'No milestones are mapped to this board yet.'
          }
          names={milestoneNames}
          title="Milestones"
        />
      </div>
    </div>
  );
}

export function MapInfoButton({
  awardNames = [],
  className = LINK_CLASS,
  mapCode,
  mapName,
  milestoneNames = [],
}: {
  awardNames?: string[];
  className?: string;
  mapCode?: string | null;
  mapName: string;
  milestoneNames?: string[];
}) {
  const [open, setOpen] = useState(false);

  if (!mapCode) {
    return <span className={className}>{mapName}</span>;
  }

  return (
    <>
      <button
        aria-label={`Show map details for ${mapName}`}
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        {mapName}
      </button>
      {open ? (
        <MapInfoDialog
          awardNames={awardNames}
          mapCode={mapCode}
          mapName={mapName}
          milestoneNames={milestoneNames}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
