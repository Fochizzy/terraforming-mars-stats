import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerList } from './player-list';

describe('PlayerList', () => {
  it('submits explicit first and last name components for a new guest', async () => {
    const user = userEvent.setup();
    const onAddPlayer = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Added Guest 1A2B3C4D to the shared roster.',
    });

    render(
      <PlayerList
        onAddPlayer={onAddPlayer}
        players={[{ id: 'p1', display_name: 'Guest 9F8E7D6C' }]}
      />,
    );

    await user.type(screen.getByLabelText(/first name/i), 'Second');
    await user.type(screen.getByLabelText(/last name/i), 'Seat');
    await user.click(screen.getByRole('button', { name: /add player/i }));

    // The identity mode is explicit first-and-last-name — never one
    // unlabeled string that could ambiguously mean a username.
    await waitFor(() =>
      expect(onAddPlayer).toHaveBeenCalledWith({
        firstName: 'Second',
        lastName: 'Seat',
      }),
    );
  });

  it('requires both name components before allowing a roster add', async () => {
    const user = userEvent.setup();

    render(<PlayerList onAddPlayer={vi.fn()} players={[]} />);

    const firstName = screen.getByLabelText(/first name/i);
    const lastName = screen.getByLabelText(/last name/i);
    const button = screen.getByRole('button', { name: /add player/i });

    await user.type(firstName, 'Friday');
    expect(button).toBeDisabled();

    await user.type(lastName, 'Mars');
    expect(button).toBeEnabled();
  });

  it('renders roster entries by their privacy-safe public label only', () => {
    render(
      <PlayerList
        onAddPlayer={vi.fn()}
        players={[
          { id: 'p1', display_name: 'Guest 9F8E7D6C' },
          { id: 'p2', display_name: 'registered-handle', linked_user_id: 'u1' },
        ]}
      />,
    );

    expect(screen.getByText('Guest 9F8E7D6C')).toBeInTheDocument();
    expect(screen.getByText('registered-handle')).toBeInTheDocument();
  });
});
