'use client';

import { useMemo, useState } from 'react';
import { SelectChevron } from '@/components/ui/select-chevron';
import { StepHeading } from '@/components/ui/step-heading';
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
import {
  findMatchingPlayerOptions,
  formatSelectedPlayerLabel,
  type LogGamePlayerOption,
} from './player-picker';

// Board of Directors plays one prelude per director, so there is no hard cap.
// Eight slots covers the deepest prelude engine we have seen; only these slots
// are editable, so a longer run needs another slot adding here.
const MIDGAME_PRELUDE_SLOT_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7];

type PlayersStepProps = {
  corporationOptions: CorporationOption[];
  playerCount: number;
  playerOptions: LogGamePlayerOption[];
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
  const matchingPlayerOptions = useMemo(
    () =>
      findMatchingPlayerOptions({
        playerEntry,
        playerOptions,
      }),
    [playerEntry, playerOptions],
  );
  const selectedPlayers = selectedPlayerIds
    .map(
      (playerId) =>
        playerOptions.find((player) => player.id === playerId) ?? {
          id: playerId,
          display_name: playerId,
        },
    );
  const availableMatches = matchingPlayerOptions.filter(
    (match) => !selectedPlayerIds.includes(match.player.id),
  );

  function addPlayerReference(nextReference: string) {
    setValue('selectedPlayerIds', [...selectedPlayerIds, nextReference], {
      shouldDirty: true,
    });
    setPlayerEntry('');
    setPlayerEntryError('');
  }

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

      const topScore = matchingPlayerOptions[0]?.score ?? 0;
      const topMatches = matchingPlayerOptions.filter(
        (match) => match.score === topScore,
      );

      if (topMatches.length === 1) {
        const resolvedPlayer = topMatches[0]?.player;

        if (!resolvedPlayer) {
          return;
        }

        if (selectedPlayerIds.includes(resolvedPlayer.id)) {
          setPlayerEntryError('That player is already selected for this game.');
          return;
        }

        addPlayerReference(resolvedPlayer.id);
        return;
      }

      if (availableMatches.length > 0) {
        setPlayerEntryError('Pick a saved player from the list below.');
        return;
      }

      const nextReference = signupFullNameSchema.parse(rawValue);
      addPlayerReference(nextReference);
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
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="02" title="Players" />
      <p className="tm-body-copy text-sm">
        Pick saved players from the roster or type a full name to create that
        player on save.
      </p>
      <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
        Saved players can be found by roster name, username, or first name plus
        last initial.
      </p>
      <p className="tm-data-label">
        {selectedPlayers.length} of {playerCount} seats filled
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Add Or Select Player</span>
          <input
            aria-label="Add Or Select Player"
            className="tm-input"
            autoComplete="off"
            onChange={(event) => setPlayerEntry(event.target.value)}
            placeholder="Username or First Name Last Name"
            value={playerEntry}
          />
        </label>
        <button
          className="tm-button-secondary self-end px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={selectedPlayers.length >= playerCount || playerEntry.trim().length === 0}
          onClick={handleAddPlayer}
          type="button"
        >
          Add Player
        </button>
      </div>
      {availableMatches.length > 0 ? (
        <div
          className="rounded-2xl border border-white/10 bg-black/20 p-3"
          role="list"
        >
          <p className="tm-data-label text-[10px]">Matching Roster Players</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableMatches.map((match) => (
              <button
                className="tm-button-secondary px-3 py-2 text-xs"
                key={match.player.id}
                onClick={() => addPlayerReference(match.player.id)}
                type="button"
              >
                {formatSelectedPlayerLabel(match.player)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {playerEntryError ? (
        <p className="text-sm tm-text-danger">{playerEntryError}</p>
      ) : null}
      <div className="grid gap-3">
        {selectedPlayers.map((player) => (
          <div
            className="tm-stat-card flex items-center justify-between gap-3 text-sm"
            key={player.id}
          >
            <span>{formatSelectedPlayerLabel(player)}</span>
            <button
              className="tm-button-secondary px-4 py-2 text-xs"
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
              <p className="font-semibold text-stone-100">
                {formatSelectedPlayerLabel(player)}
              </p>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-3 lg:grid-cols-3">
                  {[0, 1, 2].map((slotIndex) => (
                    <label
                      className="relative flex flex-col gap-2 text-sm"
                      key={slotIndex}
                    >
                      <span className="tm-data-label">
                        Corporation {slotIndex + 1}
                      </span>
                      <select
                        aria-label={`${player.display_name} Corporation ${slotIndex + 1}`}
                        className="tm-input appearance-none pr-9"
                        defaultValue=""
                        {...register(
                          `playerSelections.${player.id}.corporationIds.${slotIndex}` as const,
                        )}
                      >
                        <option value="">
                          {slotIndex === 0
                            ? 'Select corporation'
                            : 'No extra corporation'}
                        </option>
                        {corporationOptions.map((corporation) => (
                          <option key={corporation.id} value={corporation.id}>
                            {corporation.name}
                          </option>
                        ))}
                      </select>
                      <SelectChevron />
                    </label>
                  ))}
                </div>
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
                <div className="grid gap-3">
                  <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
                    Preludes played later in the game, by Valley Trust, Board of
                    Directors or New Partner. These are kept apart from the
                    preludes dealt at setup.
                  </p>
                  <div className="grid gap-3 lg:grid-cols-4">
                    {MIDGAME_PRELUDE_SLOT_INDEXES.map((slotIndex) => (
                      <label
                        className="relative flex flex-col gap-2 text-sm"
                        key={slotIndex}
                      >
                        <span className="tm-data-label">
                          Mid-game prelude {slotIndex + 1}
                        </span>
                        <select
                          aria-label={`${player.display_name} Mid-game prelude ${slotIndex + 1}`}
                          className="tm-input appearance-none pr-9"
                          defaultValue=""
                          {...register(
                            `playerSelections.${player.id}.midgamePreludeIds.${slotIndex}` as const,
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
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
