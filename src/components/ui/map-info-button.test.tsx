import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MapInfoButton } from './map-info-button';

describe('MapInfoButton', () => {
  it('opens a map details dialog with map art, award rules, and milestone rules', () => {
    render(
      <MapInfoButton
        awardNames={['Landlord']}
        mapCode="tharsis"
        mapName="Tharsis"
        milestoneNames={['Terraformer', 'Mayor']}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Show map details for Tharsis' }),
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Tharsis map details',
    );
    expect(screen.getByAltText('Tharsis board map')).toBeInTheDocument();
    expect(screen.getByText('Landlord')).toBeInTheDocument();
    expect(
      screen.getByText(/Own the most non-ocean tiles/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Terraformer')).toBeInTheDocument();
    expect(screen.getByText('Mayor')).toBeInTheDocument();
    expect(
      screen.getByText(/When playing with Turmoil/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Definition pending.')).not.toBeInTheDocument();
  });

  it('explains Hollandia randomized objective sets', () => {
    render(<MapInfoButton mapCode="hollandia" mapName="Hollandia" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Show map details for Hollandia' }),
    );

    expect(
      screen.getByText('Randomized awards - no fixed map set.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Uses a randomly generated selection of milestones rather than five permanent milestones.',
      ),
    ).toBeInTheDocument();
  });

  it('renders plain text when no map code is available', () => {
    render(<MapInfoButton mapName="Other awards" />);

    expect(screen.getByText('Other awards')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /show map details/i }),
    ).not.toBeInTheDocument();
  });
});
