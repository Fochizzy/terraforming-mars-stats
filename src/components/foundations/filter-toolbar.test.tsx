import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  FilterToolbar,
  FilterToolbarField,
  FilterToolbarGroup,
} from './filter-toolbar';

describe('FilterToolbar', () => {
  it('renders a named group with responsive wrapping styles', () => {
    render(
      <FilterToolbar label="Leaderboard filters">
        <button type="button">Apply</button>
      </FilterToolbar>,
    );

    const toolbar = screen.getByRole('group', { name: 'Leaderboard filters' });
    expect(toolbar).toHaveClass('tm-toolbar');
  });

  it('associates field labels with their controls', () => {
    render(
      <FilterToolbar label="Filters">
        <FilterToolbarField label="Map">
          <select className="tm-input" defaultValue="tharsis">
            <option value="tharsis">Tharsis</option>
            <option value="hellas">Hellas</option>
          </select>
        </FilterToolbarField>
      </FilterToolbar>,
    );

    expect(screen.getByLabelText('Map')).toHaveValue('tharsis');
  });

  it('keeps controls keyboard reachable in native tab order', async () => {
    const user = userEvent.setup();
    render(
      <FilterToolbar label="Filters">
        <FilterToolbarField label="Player">
          <input className="tm-input" type="text" />
        </FilterToolbarField>
        <FilterToolbarGroup label="Actions">
          <button type="button">Reset</button>
        </FilterToolbarGroup>
      </FilterToolbar>,
    );

    await user.tab();
    expect(screen.getByLabelText('Player')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveFocus();
  });

  it('names non-labelable control clusters', () => {
    render(
      <FilterToolbar label="Filters">
        <FilterToolbarGroup label="Applied filters">
          <span>Map: Tharsis</span>
        </FilterToolbarGroup>
      </FilterToolbar>,
    );

    expect(
      screen.getByRole('group', { name: 'Applied filters' }),
    ).toBeInTheDocument();
  });
});
