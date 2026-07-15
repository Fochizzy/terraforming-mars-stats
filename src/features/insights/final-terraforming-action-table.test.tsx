import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FinalTerraformingActionStat } from '@/lib/db/selection-stats-repo';
import { FinalTerraformingActionTable } from './final-terraforming-action-table';

const rows: FinalTerraformingActionStat[] = [
  {
    final_action_games: 2,
    final_action_rate: 0.4,
    final_action_win_rate: 0.5,
    final_action_wins: 1,
    imported_games: 5,
    most_common_action_count: 2,
    most_common_action_type: 'ocean',
    overall_win_rate: 0.2,
    overall_wins: 1,
    player_id: 'alpha',
    player_name: 'Alpha Mars',
    win_rate_delta: 0.3,
  },
  {
    final_action_games: 5,
    final_action_rate: 0.625,
    final_action_win_rate: 0.8,
    final_action_wins: 4,
    imported_games: 8,
    most_common_action_count: 5,
    most_common_action_type: 'oxygen',
    overall_win_rate: 0.5,
    overall_wins: 4,
    player_id: 'bravo',
    player_name: 'Bravo Mars',
    win_rate_delta: 0.3,
  },
  {
    final_action_games: 3,
    final_action_rate: 0.5,
    final_action_win_rate: 1,
    final_action_wins: 3,
    imported_games: 6,
    most_common_action_count: 3,
    most_common_action_type: 'oxygen',
    overall_win_rate: 0.8333,
    overall_wins: 5,
    player_id: 'charlie',
    player_name: 'Charlie Mars',
    win_rate_delta: 0.1667,
  },
];

function bodyPlayerNames() {
  const table = screen.getByRole('table', {
    name: /sortable final terraforming action statistics/i,
  });
  const body = table.querySelector('tbody');

  if (!body) {
    throw new Error('Expected final-action table body');
  }

  return within(body)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

describe('FinalTerraformingActionTable', () => {
  it('adds summary cards, compact metrics, semantic finishers, and progress bars', () => {
    render(<FinalTerraformingActionTable rows={rows} />);

    expect(screen.getByText('Imported player-games')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('Most frequent finisher')).toBeInTheDocument();
    expect(screen.getAllByText('Oxygen').length).toBeGreaterThan(0);
    expect(screen.getByText('Highest final-action win rate')).toBeInTheDocument();
    expect(screen.getByText('Largest positive delta')).toBeInTheDocument();

    const bravoRow = screen.getByText('Bravo Mars').closest('tr');
    expect(bravoRow).not.toBeNull();
    expect(bravoRow).toHaveTextContent('5 / 8');
    expect(bravoRow).toHaveTextContent('80%');
    expect(bravoRow).toHaveTextContent('4 wins');
    expect(bravoRow).toHaveTextContent('+30%');
    expect(bravoRow).toHaveTextContent('Oxygen');
    expect(bravoRow).toHaveTextContent('5');

    expect(
      screen.getByRole('progressbar', {
        name: /bravo mars final-action frequency/i,
      }),
    ).toHaveAttribute('aria-valuenow', '63');
    expect(screen.getByLabelText('Rank 1')).toBeInTheDocument();
  });

  it('sorts every column from accessible sticky header controls', () => {
    render(<FinalTerraformingActionTable rows={rows} />);

    expect(bodyPlayerNames()).toEqual([
      expect.stringContaining('Bravo Mars'),
      expect.stringContaining('Charlie Mars'),
      expect.stringContaining('Alpha Mars'),
    ]);

    const finalActionsButton = screen.getByRole('button', {
      name: /sort by final actions/i,
    });
    expect(finalActionsButton.closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    fireEvent.click(
      screen.getByRole('button', { name: /sort by player/i }),
    );
    expect(bodyPlayerNames()).toEqual([
      expect.stringContaining('Alpha Mars'),
      expect.stringContaining('Bravo Mars'),
      expect.stringContaining('Charlie Mars'),
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: /sort by player/i }),
    );
    expect(bodyPlayerNames()).toEqual([
      expect.stringContaining('Charlie Mars'),
      expect.stringContaining('Bravo Mars'),
      expect.stringContaining('Alpha Mars'),
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: /sort by delta/i }),
    );
    expect(
      screen.getByRole('button', { name: /sort by delta/i }).closest('th'),
    ).toHaveAttribute('aria-sort', 'descending');
  });
});
