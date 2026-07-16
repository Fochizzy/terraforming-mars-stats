'use client';

import { useEffect, useId, useRef, useState } from 'react';

type DeleteGameAction = (formData: FormData) => Promise<void>;
type SavedGameStatus = 'draft' | 'finalized';

export function DeleteGameConfirmation({
  deleteGameAction,
  gameId,
  groupId,
  playerNames,
  status,
}: {
  deleteGameAction: DeleteGameAction;
  gameId: string;
  groupId: string;
  playerNames: string[];
  status: SavedGameStatus;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isDraft = status === 'draft';
  const deleteLabel = isDraft ? 'Delete Draft' : 'Delete Game';
  const playerLabel = playerNames.join(', ') || gameId;
  const title = isDraft ? 'Delete this draft?' : 'Delete this game?';
  const description = isDraft
    ? 'This permanently deletes the draft and its saved import evidence. This cannot be undone.'
    : 'This permanently deletes the game, its saved import evidence, and its contribution to statistics. This cannot be undone.';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`${deleteLabel} ${playerLabel}`}
        className="tm-button-secondary tm-text-danger px-4 py-2 text-xs"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        {deleteLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
          role="presentation"
        >
          <section
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="tm-panel w-full max-w-lg"
            role="dialog"
          >
            <div className="flex flex-col gap-3">
              <h2 className="tm-panel-title text-lg" id={titleId}>
                {title}
              </h2>
              <p
                className="text-sm leading-6"
                id={descriptionId}
                style={{ color: 'var(--tm-muted)' }}
              >
                {description}
              </p>
            </div>

            <form
              action={deleteGameAction}
              className="mt-6 flex flex-wrap justify-end gap-3"
            >
              <input name="gameId" type="hidden" value={gameId} />
              <input name="groupId" type="hidden" value={groupId} />

              <button
                className="tm-button-secondary px-4 py-2 text-sm"
                onClick={() => setIsOpen(false)}
                ref={cancelRef}
                type="button"
              >
                Cancel
              </button>

              <button
                className="tm-button-secondary tm-text-danger px-4 py-2 text-sm"
                type="submit"
              >
                {deleteLabel}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
