import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TableContainer } from './table-container';

function rows() {
  return (
    <>
      <thead>
        <tr>
          <th scope="col">Player</th>
          <th data-align="numeric" scope="col">
            Final Score
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A very long recurring player display name that wraps</td>
          <td data-align="numeric">1,204</td>
        </tr>
      </tbody>
    </>
  );
}

describe('TableContainer', () => {
  it('renders a semantic table inside a named, keyboard-focusable region', () => {
    render(
      <TableContainer caption="Finalized games only." label="Leaderboard table">
        {rows()}
      </TableContainer>,
    );

    const region = screen.getByRole('region', { name: 'Leaderboard table' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('tm-table-container');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Finalized games only.')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Player' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1,204')).toHaveAttribute('data-align', 'numeric');
  });

  it('renders the shared empty state instead of an empty table shell', () => {
    render(
      <TableContainer
        label="Leaderboard table"
        state={{ status: 'empty', title: 'No finalized rows yet' }}
      >
        {rows()}
      </TableContainer>,
    );

    expect(screen.getByText('No finalized rows yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('announces query errors distinctly from empty data', () => {
    render(
      <TableContainer label="Leaderboard table" state={{ status: 'error' }}>
        {rows()}
      </TableContainer>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
