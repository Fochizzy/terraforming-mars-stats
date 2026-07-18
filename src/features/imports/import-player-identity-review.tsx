'use client';

import {
  evaluateImportPlayerIdentity,
  findExactImportedSourceCandidates,
  type ImportPlayerIdentityCandidate,
  type ImportPlayerIdentityDraftInput,
  type ImportPlayerResolutionState,
} from '@/lib/player-identity/guest-identity';

type ImportPlayerIdentityReviewProps = {
  candidates: ImportPlayerIdentityCandidate[];
  onChange: (values: ImportPlayerIdentityDraftInput[]) => void;
  values: ImportPlayerIdentityDraftInput[];
};

function updateValue(
  values: ImportPlayerIdentityDraftInput[],
  index: number,
  nextValue: ImportPlayerIdentityDraftInput,
) {
  return values.map((value, valueIndex) =>
    valueIndex === index ? nextValue : value,
  );
}

function stateMessage(state: ImportPlayerResolutionState) {
  switch (state.kind) {
    case 'linked_registered_player':
      return `Linked registered player: ${state.player.publicName}`;
    case 'existing_unlinked_guest':
      return `Existing unlinked guest confirmed: ${state.player.publicName}`;
    case 'newly_created_unlinked_guest':
      return `New unlinked guest will be created: ${state.publicName}`;
    case 'ambiguous_match':
      return 'Multiple matching guests found. Select the intended player.';
    case 'duplicate_guest_candidate':
      return 'An exact guest candidate already exists. Confirm reuse.';
    default:
      return state.message;
  }
}

function isErrorState(state: ImportPlayerResolutionState) {
  return [
    'ambiguous_match',
    'duplicate_guest_candidate',
    'inaccessible_identity',
    'invalid_identity_input',
    'unavailable_identity',
    'unresolved_player',
  ].includes(state.kind);
}

export function ImportPlayerIdentityReview({
  candidates,
  onChange,
  values,
}: ImportPlayerIdentityReviewProps) {
  return (
    <section
      aria-labelledby="import-player-identities-heading"
      className="rounded-2xl border border-orange-900/30 bg-black/25 p-4"
    >
      <h2
        className="font-serif text-xl font-semibold"
        id="import-player-identities-heading"
      >
        Resolve Imported Players
      </h2>
      <p className="mt-2 text-sm text-stone-300">
        The original log text is preserved as evidence. Verify the matched
        registered player, or identify an unlinked guest by username or by
        first and last name.
      </p>

      <div className="mt-4 grid gap-4">
        {values.map((value, index) => {
          const importedSourceCandidates =
            value.mode === 'existing_player' && !value.selectedPlayerId
              ? findExactImportedSourceCandidates({
                  candidates,
                  sourcePlayerText: value.sourcePlayerText,
                })
              : [];
          const evaluatedState = evaluateImportPlayerIdentity({
            candidates,
            value,
          });
          const state: ImportPlayerResolutionState =
            importedSourceCandidates.length > 1
              ? {
                  kind: 'ambiguous_match',
                  candidates: importedSourceCandidates,
                }
              : evaluatedState;
          const exactCandidates =
            state.kind === 'ambiguous_match'
              ? state.candidates
              : state.kind === 'duplicate_guest_candidate'
                ? [state.candidate]
                : state.kind === 'existing_unlinked_guest' &&
                    value.mode !== 'existing_player'
                  ? [state.player]
                : [];

          return (
            <fieldset
              className="tm-stat-card grid min-w-0 gap-4"
              key={`import-player-${index}`}
            >
              <legend className="px-1 font-semibold text-stone-100">
                Imported player {index + 1}
              </legend>

              <label className="grid gap-2 text-sm">
                <span className="tm-data-label">Original imported player text</span>
                <input
                  aria-label={`Imported player ${index + 1} original text`}
                  className="tm-input read-only:cursor-default read-only:text-stone-300"
                  readOnly
                  value={value.sourcePlayerText ?? ''}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="tm-data-label">Identity method</span>
                <select
                  aria-label={`Imported player ${index + 1} identity method`}
                  className="tm-input"
                  onChange={(event) => {
                    const mode = event.target.value;
                    const sourcePlayerText = value.sourcePlayerText ?? '';
                    const nextValue: ImportPlayerIdentityDraftInput =
                      mode === 'username'
                        ? {
                            createNew: false,
                            mode: 'username',
                            selectedPlayerId: null,
                            sourcePlayerText,
                            username: '',
                            valueSource: 'user_corrected',
                          }
                        : mode === 'personal_name'
                          ? {
                              createNew: false,
                              firstName: '',
                              lastName: '',
                              mode: 'personal_name',
                              selectedPlayerId: null,
                              sourcePlayerText,
                              valueSource: 'user_corrected',
                            }
                          : {
                              mode: 'existing_player',
                              selectedPlayerId: '',
                              sourcePlayerText,
                              valueSource: 'user_corrected',
                            };
                    onChange(updateValue(values, index, nextValue));
                  }}
                  value={value.mode}
                >
                  <option value="existing_player">Select existing player</option>
                  <option value="username">Guest username</option>
                  <option value="personal_name">Guest first and last name</option>
                </select>
              </label>

              {value.mode === 'existing_player' ? (
                <label className="grid gap-2 text-sm">
                  <span className="tm-data-label">Existing player</span>
                  <select
                    aria-label={`Imported player ${index + 1} existing player`}
                    className="tm-input"
                    onChange={(event) =>
                      onChange(
                        updateValue(values, index, {
                          ...value,
                          selectedPlayerId: event.target.value,
                          valueSource: 'user_corrected',
                        }),
                      )
                    }
                    value={value.selectedPlayerId ?? ''}
                  >
                    <option value="">Select player</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.publicName} —{' '}
                        {candidate.isLinked ? 'registered' : 'unlinked guest'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {value.mode === 'username' ? (
                <label className="grid gap-2 text-sm">
                  <span className="tm-data-label">Guest username</span>
                  <input
                    aria-label={`Imported player ${index + 1} guest username`}
                    className="tm-input"
                    onChange={(event) =>
                      onChange(
                        updateValue(values, index, {
                          ...value,
                          createNew: false,
                          selectedPlayerId: null,
                          username: event.target.value,
                          valueSource: 'user_corrected',
                        }),
                      )
                    }
                    value={value.username ?? ''}
                  />
                </label>
              ) : null}

              {value.mode === 'personal_name' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="tm-data-label">First name</span>
                    <input
                      aria-label={`Imported player ${index + 1} first name`}
                      className="tm-input"
                      onChange={(event) =>
                        onChange(
                          updateValue(values, index, {
                            ...value,
                            createNew: false,
                            firstName: event.target.value,
                            selectedPlayerId: null,
                            valueSource: 'user_corrected',
                          }),
                        )
                      }
                      value={value.firstName ?? ''}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="tm-data-label">Last name</span>
                    <input
                      aria-label={`Imported player ${index + 1} last name`}
                      className="tm-input"
                      onChange={(event) =>
                        onChange(
                          updateValue(values, index, {
                            ...value,
                            createNew: false,
                            lastName: event.target.value,
                            selectedPlayerId: null,
                            valueSource: 'user_corrected',
                          }),
                        )
                      }
                      value={value.lastName ?? ''}
                    />
                  </label>
                </div>
              ) : null}

              {exactCandidates.length > 0 ? (
                <div className="grid gap-2" role="group" aria-label="Matching guests">
                  {exactCandidates.map((candidate) => (
                    <button
                      aria-pressed={value.selectedPlayerId === candidate.id}
                      className="tm-button-secondary tm-focus-ring justify-self-start"
                      key={candidate.id}
                      onClick={() => {
                        if (value.selectedPlayerId === candidate.id) {
                          return;
                        }

                        const nextValue: ImportPlayerIdentityDraftInput =
                          value.mode === 'existing_player'
                            ? {
                                ...value,
                                selectedPlayerId: candidate.id,
                                valueSource: 'user_corrected',
                              }
                            : {
                                ...value,
                                createNew: false,
                                selectedPlayerId: candidate.id,
                                valueSource: 'user_corrected',
                              };
                        onChange(updateValue(values, index, nextValue));
                      }}
                      type="button"
                    >
                      {value.selectedPlayerId === candidate.id
                        ? `Using existing guest ${candidate.publicName}`
                        : `Use existing guest ${candidate.publicName}`}
                    </button>
                  ))}
                </div>
              ) : null}

              {value.mode !== 'existing_player' &&
              (state.kind === 'unresolved_player' ||
                state.kind === 'newly_created_unlinked_guest') ? (
                <button
                  aria-pressed={state.kind === 'newly_created_unlinked_guest'}
                  className="tm-button-secondary tm-focus-ring justify-self-start"
                  onClick={() => {
                    if (state.kind === 'newly_created_unlinked_guest') {
                      return;
                    }

                    onChange(
                      updateValue(values, index, {
                        ...value,
                        createNew: true,
                        selectedPlayerId: null,
                        valueSource: 'user_corrected',
                      }),
                    );
                  }}
                  type="button"
                >
                  {state.kind === 'newly_created_unlinked_guest'
                    ? 'New guest creation confirmed'
                    : 'Create new unlinked guest'}
                </button>
              ) : null}

              <p
                aria-live="polite"
                className={isErrorState(state) ? 'text-sm text-amber-200' : 'text-sm text-emerald-300'}
                role={isErrorState(state) ? 'alert' : 'status'}
              >
                {stateMessage(state)}
              </p>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
