import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerList } from './player-list';

describe('PlayerList', () => {
  it('submits a new recurring player name', async () => {
    const user = userEvent.setup();
    const onAddPlayer = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Player added.',
    });

    render(
      <PlayerList
        onAddPlayer={onAddPlayer}
        players={[{ id: 'p1', display_name: 'Friday Mars' }]}
      />,
    );

    await user.type(screen.getByLabelText(/add player name/i), 'Second Seat');
    await user.click(screen.getByRole('button', { name: /add player/i }));

    await waitFor(() => expect(onAddPlayer).toHaveBeenCalledWith('Second Seat'));
  });
});
