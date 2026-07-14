import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerList } from './player-list';

describe('PlayerList', () => {
  it('submits a new recurring player username', async () => {
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

    await user.type(screen.getByLabelText(/add player username/i), 'SecondSeat');
    await user.click(screen.getByRole('button', { name: /add player/i }));

    await waitFor(() => expect(onAddPlayer).toHaveBeenCalledWith('SecondSeat'));
  });

  it('requires a valid username before allowing a roster add', async () => {
    const user = userEvent.setup();

    render(<PlayerList onAddPlayer={vi.fn()} players={[]} />);

    const input = screen.getByLabelText(/add player username/i);
    const button = screen.getByRole('button', { name: /add player/i });

    await user.type(input, '---');
    expect(button).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'FridayMars');
    expect(button).toBeEnabled();
  });

  it('lets the signed-in user link an unclaimed roster player to their profile', async () => {
    const user = userEvent.setup();
    const onLinkPlayer = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Player linked.',
    });

    render(
      <PlayerList
        currentUserId="user-1"
        onAddPlayer={vi.fn()}
        onLinkPlayer={onLinkPlayer}
        players={[
          { id: 'p1', display_name: 'Friday Mars', linked_user_id: null },
          { id: 'p2', display_name: 'Second Seat', linked_user_id: 'user-1' },
          { id: 'p3', display_name: 'Third Seat', linked_user_id: 'user-2' },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /link friday mars/i }));

    await waitFor(() => expect(onLinkPlayer).toHaveBeenCalledWith('p1'));
    expect(screen.getByText(/linked to you/i)).toBeInTheDocument();
    expect(screen.getByText(/^linked$/i)).toBeInTheDocument();
  });
});
