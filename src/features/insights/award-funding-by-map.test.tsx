import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AwardFundingByMap,
  buildAwardFundingGroups,
} from './award-funding-by-map';

describe('buildAwardFundingGroups', () => {
  it('keeps map milestone names with the resolved award group', () => {
    const groups = buildAwardFundingGroups(
      [{ award_name: 'Landlord', funded_count: 2, funder_won_count: 1 }],
      [
        {
          awardNames: ['Landlord', 'Banker'],
          mapCode: 'tharsis',
          mapId: 'map-tharsis',
          mapName: 'Tharsis',
          milestoneNames: ['Terraformer'],
        },
      ],
    );

    expect(groups).toEqual([
      {
        awards: [
          { award_name: 'Landlord', funded_count: 2, funder_won_count: 1 },
          { award_name: 'Banker', funded_count: 0, funder_won_count: 0 },
        ],
        awardNames: ['Landlord', 'Banker'],
        mapCode: 'tharsis',
        mapName: 'Tharsis',
        milestoneNames: ['Terraformer'],
      },
    ]);
  });
});

describe('AwardFundingByMap', () => {
  it('renders the selected map name as a detail button', () => {
    render(
      <AwardFundingByMap
        mapGroups={[
          {
            awardNames: ['Landlord'],
            mapCode: 'tharsis',
            mapId: 'map-tharsis',
            mapName: 'Tharsis',
            milestoneNames: ['Terraformer'],
          },
        ]}
        rows={[{ award_name: 'Landlord', funded_count: 2, funder_won_count: 1 }]}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Show map details for Tharsis' }),
    ).toBeInTheDocument();
  });

  it('ranks funded awards by ROI and highlights the best result', () => {
    render(
      <AwardFundingByMap
        mapGroups={[
          {
            awardNames: ['Landlord', 'Banker', 'Scientist'],
            mapCode: 'tharsis',
            mapId: 'map-tharsis',
            mapName: 'Tharsis',
            milestoneNames: ['Terraformer'],
          },
        ]}
        rows={[
          { award_name: 'Landlord', funded_count: 2, funder_won_count: 1 },
          { award_name: 'Banker', funded_count: 5, funder_won_count: 5 },
        ]}
      />,
    );

    const awardRows = screen.getAllByRole('listitem');

    expect(
      within(awardRows[0]).getByRole('button', {
        name: 'Show award details for Banker',
      }),
    ).toBeInTheDocument();
    expect(within(awardRows[0]).getByText('100%')).toBeInTheDocument();
    expect(within(awardRows[0]).getByText('Best ROI')).toBeInTheDocument();
    expect(
      within(awardRows[2]).getByRole('button', {
        name: 'Show award details for Scientist',
      }),
    ).toBeInTheDocument();
    expect(within(awardRows[2]).getByText('No data')).toBeInTheDocument();
  });
});
