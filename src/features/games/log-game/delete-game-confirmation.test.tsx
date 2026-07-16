import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteGameConfirmation } from './delete-game-confirmation';

describe('DeleteGameConfirmation', () => {
  it('requires confirmation before deleting a finished game', async () => {
    const user = userEvent.setup();
    const deleteGameAction = vi.fn(async (_formData: FormData) => {});

    render(
      <DeleteGameConfirmation
        deleteGameAction={deleteGameAction}
        gameId="game-1"
        groupId="group-1"
        playerNames={['Friday Mars', 'Izzy Hodnett']}
        status="finalized"
      />,
    );

    const trigger = screen.getByRole('button', {
      name: /delete game friday mars, izzy hodnett/i,
    });

    await user.click(trigger);

    expect(deleteGameAction).not.toHaveBeenCalled();

    let dialog = screen.getByRole('dialog', {
      name: /delete this game/i,
    });

    expect(dialog).toHaveTextContent(
      'This permanently deletes the game, its saved import evidence, and its contribution to statistics. This cannot be undone.',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('dialog', {
        name: /delete this game/i,
      }),
    ).not.toBeInTheDocument();
    expect(deleteGameAction).not.toHaveBeenCalled();

    await user.click(trigger);

    dialog = screen.getByRole('dialog', {
      name: /delete this game/i,
    });

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Delete Game',
      }),
    );

    await waitFor(() => {
      expect(deleteGameAction).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = deleteGameAction.mock.calls[0]?.[0];

    expect(submittedFormData?.get('gameId')).toBe('game-1');
    expect(submittedFormData?.get('groupId')).toBe('group-1');
  });

  it('uses draft-specific confirmation wording', async () => {
    const user = userEvent.setup();

    render(
      <DeleteGameConfirmation
        deleteGameAction={async () => {}}
        gameId="draft-1"
        groupId="group-1"
        playerNames={['Friday Mars']}
        status="draft"
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: /delete draft friday mars/i,
      }),
    );

    const dialog = screen.getByRole('dialog', {
      name: /delete this draft/i,
    });

    expect(dialog).toHaveTextContent(
      'This permanently deletes the draft and its saved import evidence. This cannot be undone.',
    );
  });

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup();

    render(
      <DeleteGameConfirmation
        deleteGameAction={async () => {}}
        gameId="game-1"
        groupId="group-1"
        playerNames={['Friday Mars']}
        status="finalized"
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: /delete game friday mars/i,
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: /delete this game/i,
      }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', {
        name: /delete this game/i,
      }),
    ).not.toBeInTheDocument();
  });
});
