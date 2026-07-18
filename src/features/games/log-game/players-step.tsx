'use client';

import { useState } from 'react';
import { SelectChevron } from '@/components/ui/select-chevron';
import {
  signupFullNameSchema,
} from '@/features/auth/username-auth';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import type {
  CorporationOption,
  PreludeOption,
} from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';

type PlayersStepProps = {
  corporationOptions: CorporationOption[];
  playerCount: number;
  playerOptions: Array<{
    id: string;
    display_name: string;
  }>;
  preludeOptions: PreludeOption[];
  register: UseFormRegister<LogGameDraftInput>;
  selectedPlayerIds: string[];
  setValue: UseFormSetValue<LogGameDraftInput>;
};

export function PlayersStep({
  corporationOptions,
  playerCount,
  playerOptions,
  preludeOptions,
  register,
  selectedPlayerIds,
  setValue,
}: PlayersStepProps) {
  const [playerEntry, setPlayerEntry] = useState('');
  const [playerEntryError, setPlayerEntryError] = useState('');
  const selectedPlayers = selectedPlayerIds
    .map(
      (playerId) =>
        playerOptions.find((player) => player.id === playerId) ?? {
          id: playerId,
          display_name: playerId,
        },
    );

  function handleAddPlayer() {
    try {
      setPlayerEntryError('');
      const rawValue = playerEntry.trim();

      if (!rawValue) {
        return;
      }

      if (selectedPlayerIds.length >= playerCount) {
        setPlayerEntryError('Remove a player before adding another seat.');
        return;
      }

      const normalizedEntry = normalizePlayerAlias(rawValue);
      const existingSelection = selectedPlayers.find(
        (player) =>
          normalizePlayerAlias(player.display_name) === normalizedEntry,
      );

      if (existingSelection) {
        setPlayerEntryError('That player is already selected for this game.');
        return;
      }

      const existingPlayer = playerOptions.find(
        (player) =>
          normalizePlayerAlias(player.display_name) === normalizedEntry,
      );
      const nextReference = existingPlayer
        ? existingPlayer.id
        : signupFullNameSchema.parse(rawValue);

      setValue('selectedPlayerIds', [...selectedPlayerIds, nextReference], {
        shouldDirty: true,
      });
      setPlayerEntry('');
    } catch (error) {
      setPlayerEntryError(
        error instanceof Error
          ? error.message
          : 'Enter a full player name in First Name Last Name format.',
      );
    }
  }

  function handleRemovePlayer(playerId: string) {
    setValue(
      'selectedPlayerIds',
      selectedPlayerIds.filter((selectedPlayerId) => selectedPlayerId !== playerId),
      {
        shouldDirty: true,
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="tm-data-label">
        {selectedPlayers.length} of {playerCount} seats filled
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Add Or Select Player</span>
          <input
            aria-label="Add Or Select Player"
            className="tm-input"
            list="group-player-roster"
            onChange={(event) => setPlayerEntry(event.target.value)}
            placeholder="First Name Last Name"
            value={playerEntry}
          />
          <datalist id="group-player-roster">
            {playerOptions.map((player) => (
              <option key={player.id} value={player.display_name} />
            ))}
          </datalist>
        </label>
        <button
          className="tm-button-secondary tm-focus-ring min-h-11 self-end px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={selectedPlayers.length >= playerCount || playerEntry.trim().length === 0}
          onClick={handleAddPlayer}
          type="button"
        >
          Add Player
        </button>
      </div>
      {playerEntryError ? (
        <p className="text-sm text-red-300" role="alert">
          {playerEntryError}
        </p>
      ) : null}
      <div className="grid gap-3">
        {selectedPlayers.map((player) => (
          <div
            className="tm-stat-card flex items-center justify-between gap-3 text-sm"
            key={player.id}
          >
            <span>{player.display_name}</span>
            <button
              aria-label={`Remove ${player.display_name}`}
              className="tm-button-secondary tm-focus-ring px-4 py-2 text-xs"
              onClick={() => handleRemovePlayer(player.id)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {selectedPlayers.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          Add at least one player to assign corporations and preludes.
        </p>
      ) : (
        <div className="grid gap-4">
          {selectedPlayers.map((player) => (
            <article className="tm-stat-card" key={player.id}>
              <h3 className="font-semibold text-stone-100">
                {player.display_name}
              </h3>
              <div className="mt-4 grid gap-4">
                <label className="relative flex flex-col gap-2 text-sm">
                  <span className="tm-data-label">Corporation</span>
                  <select
                    aria-label={`${player.display_name} Corporation`}
                    className="tm-input appearance-none pr-9"
                    defaultValue=""
                    {...register(
                      `playerSelections.${player.id}.corporationId` as const,
                    )}
                  >
                    <option value="">Select corporation</option>
                    {corporationOptions.map((corporation) => (
                      <option key={corporation.id} value={corporation.id}>
                        {corporation.name}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </label>
                <div className="grid gap-3 lg:grid-cols-3">
                  {[0, 1, 2].map((slotIndex) => (
                    <label
                      className="relative flex flex-col gap-2 text-sm"
                      key={slotIndex}
                    >
                      <span className="tm-data-label">
                        Prelude {slotIndex + 1}
                      </span>
                      <select
                        aria-label={`${player.display_name} Prelude ${slotIndex + 1}`}
                        className="tm-input appearance-none pr-9"
                        defaultValue=""
                        {...register(
                          `playerSelections.${player.id}.preludeIds.${slotIndex}` as const,
                        )}
                      >
                        <option value="">No prelude</option>
                        {preludeOptions.map((prelude) => (
                          <option key={prelude.id} value={prelude.id}>
                            {prelude.name}
                          </option>
                        ))}
                      </select>
                      <SelectChevron />
                    </label>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
