'use client';

import type { SelectionDialogData } from '@/lib/db/selection-stats-repo';
import { SelectionStatsButton } from './selection-stats-dialog';

export const SELECTION_NAME_LINK_CLASS =
  'font-semibold text-stone-100 underline decoration-dotted underline-offset-2 transition hover:text-[rgb(221,161,93)]';

type SelectionKind = 'Card' | 'Corporation' | 'Prelude';

export function SelectionNameButton({
  className = SELECTION_NAME_LINK_CLASS,
  dialogData,
  kind,
  name,
}: {
  className?: string;
  dialogData?: SelectionDialogData;
  kind: SelectionKind;
  name: string;
}) {
  const winRates = kind === 'Card'
    ? dialogData?.cardWinRates
    : kind === 'Corporation'
      ? dialogData?.corporationWinRates
      : dialogData?.preludeWinRates;

  return (
    <SelectionStatsButton
      className={className}
      entry={winRates?.get(name)}
      kind={kind}
      meta={dialogData?.cardMetaByName.get(name)}
      name={name}
    />
  );
}

export function parseSelectionPairLabel(label: string) {
  const [corporationName, preludeLabel, extra] = label
    .split(' | ')
    .map((part) => part.trim());

  if (!corporationName || !preludeLabel || extra !== undefined) {
    return null;
  }

  return {
    corporationName,
    preludeNames:
      preludeLabel === 'No Prelude'
        ? []
        : preludeLabel
            .split(' + ')
            .map((name) => name.trim())
            .filter(Boolean),
  };
}

export function SelectionPairLabel({
  className = SELECTION_NAME_LINK_CLASS,
  dialogData,
  label,
}: {
  className?: string;
  dialogData?: SelectionDialogData;
  label: string;
}) {
  const pair = parseSelectionPairLabel(label);

  if (!pair) {
    return <span className={className}>{label}</span>;
  }

  return (
    <>
      <SelectionNameButton
        className={className}
        dialogData={dialogData}
        kind="Corporation"
        name={pair.corporationName}
      />
      {' | '}
      {pair.preludeNames.length > 0
        ? pair.preludeNames.map((preludeName, index) => (
            <span key={preludeName}>
              {index > 0 ? ' + ' : ''}
              <SelectionNameButton
                className={className}
                dialogData={dialogData}
                kind="Prelude"
                name={preludeName}
              />
            </span>
          ))
        : 'No Prelude'}
    </>
  );
}
