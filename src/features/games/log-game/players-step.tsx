'use client';

import { useMemo, useState } from 'react';
import { SelectChevron } from '@/components/ui/select-chevron';
import { StepHeading } from '@/components/ui/step-heading';
import {
  signupFullNameSchema,
  usernameHandleSchema,
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

// A roster player is "registered" once it is linked to an account, which is the
// only time the linked profile fields are populated.
function isRegisteredPlayer(player: LogGamePlayerOption) {
  return Boolean(
    player.linked_username?.trim() || player.linked_full_name?.trim(),
  );
}

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
  const [newPlayerKind, setNewPlayerKind] = useState<'name' | 'username'>(
    'name',
  );
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
  const previouslyEnteredMatches = availableMatches.filter(
    (match) => !isRegisteredPlayer(match.player),
  );
  const registeredMatches = availableMatches.filter((match) =>
    isRegisteredPlayer(match.player),
  );
  const hasExactNameMatch = availableMatches.some(
    (match) =>
      normalizePlayerAlias(match.player.display_name) ===
      normalizePlayerAlias(playerEntry.trim()),
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

      // Matches are never merged silently: when the typed name matches players
      // already on the roster, the chooser below lets the user pick one of them
      // instead. "Add Player" only ever creates a brand-new player.
      if (hasExactNameMatch) {
        setPlayerEntryError(
          'A player with that exact name is listed below — pick them, or change the name to create a new player.',
        );
        return;
      }

      const nextReference =
        newPlayerKind === 'username'
          ? usernameHandleSchema.parse(rawValue)
          : signupFullNameSchema.parse(rawValue);
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
      <div className="flex flex-col gap-2">
        <span className="tm-data-label">New player is a</span>
        <div className="flex gap-2" role="group" aria-label="New player type">
          <button
            aria-pressed={newPlayerKind === 'name'}
            className={
              newPlayerKind === 'name'
                ? 'tm-button-primary flex-1 px-3 py-2 text-xs'
                : 'tm-button-secondary flex-1 px-3 py-2 text-xs'
            }
            onClick={() => {
              setNewPlayerKind('name');
              setPlayerEntryError('');
            }}
            type="button"
          >
            Real Name
          </button>
          <button
            aria-pressed={newPlayerKind === 'username'}
            className={
              newPlayerKind === 'username'
                ? 'tm-button-primary flex-1 px-3 py-2 text-xs'
                : 'tm-button-secondary flex-1 px-3 py-2 text-xs'
            }
            onClick={() => {
              setNewPlayerKind('username');
              setPlayerEntryError('');
            }}
            type="button"
          >
            Username
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
          {newPlayerKind === 'name'
            ? 'Real names need a first and last name (e.g. James Hodnett).'
            : 'A username is a single handle (e.g. Revloki).'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-2 text-sm">
          <span className="tm-data-label">Add Or Select Player</span>
          <input
            aria-label="Add Or Select Player"
            className="tm-input"
            autoComplete="off"
            autoCapitalize={newPlayerKind === 'username' ? 'none' : undefined}
            onChange={(event) => setPlayerEntry(event.target.value)}
            placeholder={
              newPlayerKind === 'username' ? 'Revloki' : 'First Name Last Name'
            }
            value={playerEntry}
          />
        </label>
        <button
          className="tm-button-secondary self-end px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={selectedPlayers.length >= playerCount || playerEntry.trim().length === 0}
          onClick={handleAddPlayer}
          type="button"
        >
          {availableMatches.length > 0 ? 'Create New Player' : 'Add Player'}
        </button>
      </div>
      {availableMatches.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="tm-data-label text-[10px]">
            Match a player you have entered before
          </p>
          {previouslyEnteredMatches.length > 0 ? (
            <div role="list">
              <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
                Previously entered
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {previouslyEnteredMatches.map((match) => (
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
          {registeredMatches.length > 0 ? (
            <div role="list">
              <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
                Registered players
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {registeredMatches.map((match) => (
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
          <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
            None of these? Use “Create New Player” to add someone new.
          </p>
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
                    Directors or New Partner. Enter them separately here; they
                    still count under preludes in stats.
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
