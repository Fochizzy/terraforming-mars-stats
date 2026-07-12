import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { PlayersStep } from './players-step';
import type { LogGamePlayerOption } from './player-picker';

const playerOptions: LogGamePlayerOption[] = [
  // Previously entered, never linked to an account.
  { id: 'p-hodnett', display_name: 'James Hodnett' },
  // Registered: linked to an account with a username.
  {
    id: 'p-howard',
    display_name: 'James Howard',
    linked_full_name: 'James Howard',
    linked_username: 'jhoward',
  },
];

function renderStep(overrides?: {
  selectedPlayerIds?: string[];
  setValue?: UseFormSetValue<LogGameDraftInput>;
}) {
  const setValue = overrides?.setValue ?? vi.fn();
  const register = (() => ({})) as unknown as UseFormRegister<LogGameDraftInput>;

  render(
    <PlayersStep
      corporationOptions={[]}
      playerCount={4}
      playerOptions={playerOptions}
      preludeOptions={[]}
      register={register}
      selectedPlayerIds={overrides?.selectedPlayerIds ?? []}
      setValue={setValue}
    />,
  );

  return { setValue };
}

describe('PlayersStep new-player resolution', () => {
  it('offers previously-entered and registered matches separately', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(screen.getByLabelText(/add or select player/i), 'James');

    expect(screen.getByText(/previously entered/i)).toBeInTheDocument();
    expect(screen.getByText(/registered players/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'James Hodnett' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /james.*@jhoward/i }),
    ).toBeInTheDocument();
    // A brand-new player is still an explicit option.
    expect(
      screen.getByRole('button', { name: /create new player/i }),
    ).toBeInTheDocument();
  });

  it('matches a previously-entered player when chosen', async () => {
    const user = userEvent.setup();
    const { setValue } = renderStep();

    await user.type(screen.getByLabelText(/add or select player/i), 'James');
    await user.click(screen.getByRole('button', { name: 'James Hodnett' }));

    expect(setValue).toHaveBeenCalledWith(
      'selectedPlayerIds',
      ['p-hodnett'],
      { shouldDirty: true },
    );
  });

  it('matches a registered player when chosen', async () => {
    const user = userEvent.setup();
    const { setValue } = renderStep();

    await user.type(screen.getByLabelText(/add or select player/i), 'James');
    await user.click(screen.getByRole('button', { name: /james.*@jhoward/i }));

    expect(setValue).toHaveBeenCalledWith(
      'selectedPlayerIds',
      ['p-howard'],
      { shouldDirty: true },
    );
  });

  it('creates a brand-new player when the name does not exactly match', async () => {
    const user = userEvent.setup();
    const { setValue } = renderStep();

    await user.type(
      screen.getByLabelText(/add or select player/i),
      'James Bond',
    );
    // No roster player matches "James Bond", so the button is a plain add.
    await user.click(screen.getByRole('button', { name: /^add player$/i }));

    expect(setValue).toHaveBeenCalledWith(
      'selectedPlayerIds',
      ['James Bond'],
      { shouldDirty: true },
    );
  });

  it('refuses to create a duplicate when the exact name already exists', async () => {
    const user = userEvent.setup();
    const { setValue } = renderStep();

    await user.type(
      screen.getByLabelText(/add or select player/i),
      'James Hodnett',
    );
    await user.click(screen.getByRole('button', { name: /create new player/i }));

    expect(setValue).not.toHaveBeenCalled();
    expect(
      screen.getByText(/exact name is listed below/i),
    ).toBeInTheDocument();
  });

  it('accepts a single-word username as a new player', async () => {
    const user = userEvent.setup();
    const { setValue } = renderStep();

    await user.click(screen.getByRole('button', { name: /^username$/i }));
    await user.type(screen.getByLabelText(/add or select player/i), 'Revloki');
    await user.click(screen.getByRole('button', { name: /^add player$/i }));

    expect(setValue).toHaveBeenCalledWith(
      'selectedPlayerIds',
      ['Revloki'],
      { shouldDirty: true },
    );
  });
});
