'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCreateImportDraftFormData } from '@/lib/imports/import-draft-form-data';
import { describeUnknownError } from '@/lib/errors/describe-unknown-error';
import { SelectChevron } from '@/components/ui/select-chevron';
import { StatusBanner } from '@/components/ui/status-banner';
import { StepHeading } from '@/components/ui/step-heading';
import type { MapOption } from '@/lib/db/reference-repo';
import type { ImportReviewModel } from '@/lib/imports/build-import-review-model';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';
import { ImportReviewPanel } from './import-review-panel';

export type WebImportDraftValues = {
  boardScreenshots: File[];
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  participantNames: string[];
  playedOn: string;
  playerCount: number;
};

export type WebImportActionResult = {
  gameId?: string;
  message?: string;
  review?: ImportReviewModel;
  status: 'error' | 'idle' | 'success';
};

function getClipboardImageFile(
  clipboardData: DataTransfer | null,
): File | null {
  if (!clipboardData) {
    return null;
  }

  for (const file of Array.from(clipboardData.files ?? [])) {
    if (file.type.startsWith('image/')) {
      return file;
    }
  }

  for (const item of Array.from(clipboardData.items ?? [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) {
      continue;
    }

    return item.getAsFile();
  }

  return null;
}

function getImportErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes('Server Components render')
  ) {
    return 'The import save failed on the server. If this only happens in the deployed app, the web import server configuration may be incomplete.';
  }

  return describeUnknownError(error, 'Unable to save this import draft right now.');
}

function formatManualReviewScoreFieldLabel(
  scoreField: ImportReviewJumpTarget['scoreField'],
) {
  switch (scoreField) {
    case 'awardPoints':
      return 'Award Points';
    case 'cardPointsTotal':
      return 'Total Card Points';
    default:
      return scoreField;
  }
}

function resolveManualReviewJumpTargetWithPlayerSelection(input: {
  playerSelections: Record<string, string>;
  target: ImportReviewJumpTarget | null;
}): ImportReviewJumpTarget | null {
  if (!input.target) {
    return null;
  }

  const selectedPlayerId = input.playerSelections[input.target.playerName]?.trim() ?? '';

  if (!selectedPlayerId) {
    return input.target;
  }

  return {
    ...input.target,
    playerId: selectedPlayerId,
  };
}

type WebImportPageProps = {
  initialValues: Omit<
    WebImportDraftValues,
    | 'boardScreenshots'
    | 'endgameScreenshot'
    | 'exportedGameLog'
    | 'participantNames'
  >;
  mapOptions: MapOption[];
  onAnalyzeImportEvidence: (
    formData: FormData,
  ) => Promise<WebImportActionResult>;
  onConfirmImportReview: (
    formData: FormData,
    jumpTarget?: ImportReviewJumpTarget | null,
  ) => Promise<WebImportActionResult>;
};

export function WebImportPage({
  initialValues,
  mapOptions,
  onAnalyzeImportEvidence,
  onConfirmImportReview,
}: WebImportPageProps) {
  const exportedGameLogRef = useRef<HTMLTextAreaElement | null>(null);
  const [playedOn, setPlayedOn] = useState(initialValues.playedOn);
  const [mapId, setMapId] = useState(initialValues.mapId);
  const [playerCount, setPlayerCount] = useState(initialValues.playerCount);
  const [generationCount, setGenerationCount] = useState(
    initialValues.generationCount,
  );
  const [exportedGameLog, setExportedGameLog] = useState('');
  const [participantsText, setParticipantsText] = useState('');
  const [endgameScreenshot, setEndgameScreenshot] = useState<File | null>(null);
  const [boardScreenshots, setBoardScreenshots] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<WebImportActionResult>({
    status: 'idle',
  });
  const [review, setReview] = useState<ImportReviewModel | null>(null);
  const [playerSelections, setPlayerSelections] = useState<Record<string, string>>(
    {},
  );
  const [manualReviewJumpTarget, setManualReviewJumpTarget] =
    useState<ImportReviewJumpTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!endgameScreenshot) {
      setScreenshotPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(endgameScreenshot);
    setScreenshotPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [endgameScreenshot]);

  useEffect(() => {
    if (!review) {
      setPlayerSelections({});
      setManualReviewJumpTarget(null);
      return;
    }

    setPlayerSelections((current) =>
      Object.fromEntries(
        review.playerLinks.map((link) => {
          const currentSelection = current[link.importedName]?.trim() ?? '';
          const hasCurrentCandidate = link.candidates.some(
            (candidate) => candidate.id === currentSelection,
          );

          return [
            link.importedName,
            hasCurrentCandidate ? currentSelection : link.selectedPlayerId ?? '',
          ];
        }),
      ),
    );
  }, [review]);

  function invalidateReview() {
    setFeedback({
      status: 'idle',
    });
    setReview(null);
    setManualReviewJumpTarget(null);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLFormElement>) {
    const pastedScreenshot = getClipboardImageFile(event.clipboardData);

    if (!pastedScreenshot) {
      return;
    }

    event.preventDefault();
    invalidateReview();
    setEndgameScreenshot(pastedScreenshot);
  }

  function handleScreenshotDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const droppedFile = Array.from(event.dataTransfer.files ?? []).find(
      (file) => file.type.startsWith('image/'),
    );

    if (droppedFile) {
      invalidateReview();
      setEndgameScreenshot(droppedFile);
    }
  }

  function handleBoardScreenshotChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    invalidateReview();
    setBoardScreenshots(Array.from(event.target.files ?? []));
  }

  function buildCurrentFormData() {
    return buildCreateImportDraftFormData({
      boardScreenshots,
      confirmedPlayerLinks: review
        ? review.playerLinks.flatMap((link) => {
            const playerId = playerSelections[link.importedName]?.trim() ?? '';
            return playerId ? [{ importedName: link.importedName, playerId }] : [];
          })
        : [],
      endgameScreenshot,
      exportedGameLog: exportedGameLog.trim(),
      generationCount,
      mapId,
      participants: participantsText,
      playedOn,
      playerCount,
    });
  }

  const hasDuplicateSelections = useMemo(() => {
    if (!review) {
      return false;
    }

    const selectedIds = review.playerLinks
      .map((link) => playerSelections[link.importedName]?.trim() ?? '')
      .filter(Boolean);

    return new Set(selectedIds).size !== selectedIds.length;
  }, [playerSelections, review]);

  const hasMissingSelections = useMemo(() => {
    if (!review) {
      return false;
    }

    return review.playerLinks.some(
      (link) => !(playerSelections[link.importedName]?.trim()),
    );
  }, [playerSelections, review]);

  async function handleAnalyzeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setReview(null);
    setManualReviewJumpTarget(null);

    try {
      const result = await onAnalyzeImportEvidence(buildCurrentFormData());

      if (
        !participantsText.trim() &&
        result.review?.detectedParticipantNames?.length
      ) {
        setParticipantsText(result.review.detectedParticipantNames.join('\n'));
      }

      setFeedback(result);
      setReview(result.review ?? null);
    } catch (error) {
      setFeedback({
        status: 'error',
        message: getImportErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmImport() {
    setIsConfirming(true);

    try {
      const result = await onConfirmImportReview(
        buildCurrentFormData(),
        resolveManualReviewJumpTargetWithPlayerSelection({
          playerSelections,
          target: manualReviewJumpTarget,
        }),
      );

      setFeedback(result);
    } catch (error) {
      setFeedback({
        status: 'error',
        message: getImportErrorMessage(error),
      });
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="tm-panel flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tm-data-label">Field Report · Manual Entry</p>
            <h1 className="tm-panel-title mt-1 text-xl">
              Web Import Manifest
            </h1>
          </div>
          <span className="tm-coverage-badge shrink-0">Unlogged</span>
        </div>
        <p className="tm-body-copy text-sm">
          Paste an exported game log, attach the endgame screenshot, and
          prepare a guided handoff into the shared scoring flow.
        </p>
      </section>

      <form
        className="tm-panel flex flex-col gap-6"
        onPaste={handlePaste}
        onSubmit={handleAnalyzeSubmit}
      >
        <div className="flex flex-col gap-4">
          <StepHeading step="01" title="Match Setup" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="tm-data-label">Played On</span>
              <input
                aria-label="Played On"
                className="tm-input"
                onChange={(event) => {
                  invalidateReview();
                  setPlayedOn(event.target.value);
                }}
                type="date"
                value={playedOn}
              />
            </label>

            <label className="relative flex flex-col gap-2 text-sm">
              <span className="tm-data-label">Map</span>
              <select
                aria-label="Map"
                className="tm-input appearance-none pr-9"
                onChange={(event) => {
                  invalidateReview();
                  setMapId(event.target.value);
                }}
                value={mapId}
              >
                {mapOptions.map((map) => (
                  <option key={map.id} value={map.id}>
                    {map.name}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </label>

            <label className="relative flex flex-col gap-2 text-sm">
              <span className="tm-data-label">Player Count</span>
              <select
                aria-label="Player Count"
                className="tm-input appearance-none pr-9"
                onChange={(event) => {
                  invalidateReview();
                  setPlayerCount(Number(event.target.value));
                }}
                value={playerCount}
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="tm-data-label">Generation Count</span>
              <input
                aria-label="Generation Count"
                className="tm-input"
                min={1}
                onChange={(event) => {
                  invalidateReview();
                  setGenerationCount(Number(event.target.value));
                }}
                type="number"
                value={generationCount}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <StepHeading step="02" title="Game Log" />
          <div
            className="overflow-hidden rounded-2xl border"
            onClick={() => exportedGameLogRef.current?.focus()}
            style={{ borderColor: 'var(--tm-panel-border)' }}
          >
            <div
              className="flex items-center gap-2 border-b px-4 py-2"
              style={{
                background: 'rgba(4, 6, 10, 0.55)',
                borderColor: 'var(--tm-panel-border)',
              }}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="tm-data-label text-[10px]">
                Exported Game Log Feed
              </span>
            </div>
            <textarea
              aria-label="Exported Game Log"
              className="min-h-36 w-full resize-y bg-black/40 px-4 py-3 font-mono text-xs leading-relaxed text-emerald-100/90 outline-none placeholder:text-stone-500"
              onChange={(event) => {
                invalidateReview();
                setExportedGameLog(event.target.value);
              }}
              placeholder="Paste the exported log text here."
              ref={exportedGameLogRef}
              value={exportedGameLog}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <StepHeading step="03" title="Participants (Optional)" />
          <label className="flex flex-col gap-2 text-sm">
            <span className="sr-only">Participants</span>
            <textarea
              aria-label="Participants"
              className="tm-input min-h-24"
              onChange={(event) => {
                invalidateReview();
                setParticipantsText(event.target.value);
              }}
              placeholder="Leave blank to detect names from the pasted log, or enter one name per line."
              value={participantsText}
            />
            <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
              Leave this blank to auto-detect names from the pasted log when
              possible, or enter one participant name per line to override the
              detected list.
            </p>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <StepHeading step="04" title="Endgame Evidence" />
          <div
            className="relative rounded-2xl border border-dashed px-4 py-6 text-center transition-colors"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleScreenshotDrop}
            style={{ borderColor: 'rgba(192, 162, 127, 0.4)' }}
          >
            {screenshotPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Endgame screenshot preview"
                className="mx-auto max-h-40 rounded-xl border"
                src={screenshotPreviewUrl}
                style={{ borderColor: 'var(--tm-panel-border)' }}
              />
            ) : (
              <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
                Drop the endgame screenshot here, or choose a file below.
              </p>
            )}
            <input
              aria-label="Endgame Screenshot"
              accept="image/*"
              className="mx-auto mt-4 block max-w-xs text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--tm-copper-500)] file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-[#27150e]"
              onChange={(event) => {
                invalidateReview();
                setEndgameScreenshot(event.target.files?.[0] ?? null);
              }}
              type="file"
            />
            <p className="mt-3 text-xs" style={{ color: 'var(--tm-muted)' }}>
              Paste a copied screenshot anywhere in this form to attach it.
            </p>
            {endgameScreenshot ? (
              <p className="mt-1 text-xs tm-accent-copy">
                Attached screenshot: {endgameScreenshot.name}
              </p>
            ) : null}
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="tm-data-label">Board Screenshots (Optional)</span>
            <input
              aria-label="Board Screenshots"
              accept="image/*"
              className="block max-w-xs text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--tm-copper-500)] file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-[#27150e]"
              multiple
              onChange={handleBoardScreenshotChange}
              type="file"
            />
            <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
              Add zero or more board-state screenshots when endgame card
              scoring needs tile, tag, or resource context.
            </p>
            {boardScreenshots.length ? (
              <p className="text-xs tm-accent-copy">
                Attached board screenshots:{' '}
                {boardScreenshots.map((file) => file.name).join(', ')}
              </p>
            ) : null}
          </label>
        </div>

        {feedback.message ? (
          <StatusBanner message={feedback.message} status={feedback.status} />
        ) : null}

        <button
          className="tm-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Analyzing Import Evidence...' : 'Analyze Import Evidence'}
        </button>
      </form>

      <ImportReviewPanel
        onSelectionChange={(importedName, playerId) =>
          setPlayerSelections((current) => ({
            ...current,
            [importedName]: playerId,
          }))
        }
        onSelectManualReviewJumpTarget={setManualReviewJumpTarget}
        playerSelections={playerSelections}
        review={review}
        selectedManualReviewJumpTarget={manualReviewJumpTarget}
      />

      {review ? (
        <div className="flex flex-col gap-3">
          {manualReviewJumpTarget ? (
            <p className="text-sm tm-accent-copy">
              After the draft is created, we&apos;ll jump to{' '}
              {manualReviewJumpTarget.playerName}{' '}
              {formatManualReviewScoreFieldLabel(
                manualReviewJumpTarget.scoreField,
              )}{' '}
              so you can fill them manually.
            </p>
          ) : null}
          {hasMissingSelections ? (
            <p className="text-sm tm-text-warning">
              Choose a roster player for every imported name before creating the
              draft.
            </p>
          ) : null}
          {hasDuplicateSelections ? (
            <p className="text-sm tm-text-danger">
              Each imported player must map to a different roster player.
            </p>
          ) : null}
          <button
            className="tm-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirming || hasDuplicateSelections || hasMissingSelections}
            onClick={handleConfirmImport}
            type="button"
          >
            {isConfirming ? 'Saving Import Draft...' : 'Confirm Import Draft'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
