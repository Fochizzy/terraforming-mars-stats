import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SelectionDialogData } from '@/lib/db/selection-stats-repo';
import {
  parseSelectionPairLabel,
  SelectionPairLabel,
} from './selection-name-link';

const dialogData: SelectionDialogData = {
  cardMetaByName: new Map([
    [
      'Tharsis Republic',
      { fullImageUrl: null, id: 'corp-1', thumbnailUrl: null },
    ],
    ['Merger', { fullImageUrl: null, id: 'prelude-1', thumbnailUrl: null }],
  ]),
  corporationWinRates: new Map([
    [
      'Tharsis Republic',
      {
        global: { plays: 10, winRate: 0.6 },
        personal: { plays: 4, winRate: 0.75 },
      },
    ],
  ]),
  preludeWinRates: new Map([
    [
      'Merger',
      {
        global: { plays: 8, winRate: 0.5 },
        personal: { plays: 2, winRate: 1 },
      },
    ],
  ]),
};

describe('selection name links', () => {
  it('parses corporation plus one or more preludes from interaction labels', () => {
    expect(
      parseSelectionPairLabel('Tharsis Republic | Merger + Early Settlement'),
    ).toEqual({
      corporationName: 'Tharsis Republic',
      preludeNames: ['Merger', 'Early Settlement'],
    });
    expect(parseSelectionPairLabel('Tharsis Republic | No Prelude')).toEqual({
      corporationName: 'Tharsis Republic',
      preludeNames: [],
    });
    expect(parseSelectionPairLabel('not a pair')).toBeNull();
  });

  it('opens the corporation/prelude stats dialog from an interaction label', () => {
    render(
      <SelectionPairLabel
        dialogData={dialogData}
        label="Tharsis Republic | Merger"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /show statistics for tharsis republic/i }),
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Tharsis Republic statistics',
    );
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});
