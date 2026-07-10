'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCreateImportDraftFormData,
  type ScreenshotOcrPayload,
} from '@/lib/imports/import-draft-form-data';
import { extractGameLogParticipantNames } from '@/lib/imports/extract-game-log-participant-names';
import { parseGameLog } from '@/lib/imports/parse-game-log';
import { parseImportParticipants } from '@/lib/imports/parse-import-participants';
import { describeUnknownError } from '@/lib/errors/describe-unknown-error';
import { StatusBanner } from '@/components/ui/status-banner';
import { StepHeading } from '@/components/ui/step-heading';
import { applyCreatedImportPlayerToReview } from '@/lib/imports/apply-created-import-player-to-review';
import type { ImportReviewModel } from '@/lib/imports/build-import-review-model';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';
import { ImportReviewPanel } from './import-review-panel';

export type WebImportDraftValues = {
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount: number | null;
  participantNames: string[];
  playedOn: string;
};

export type WebImportActionResult = {
  gameId?: string;
  message?: string;
  review?: ImportReviewModel;
  status: 'error' | 'idle' | 'success';
};

export type WebImportCreatePlayerResult = {
  createdPlayer?: {
    displayName: string;
    id: string;
  };
  message?: string;
  status: 'error' | 'success';
};

function isPdfFile(file: File) {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

function isSupportedGameResultFile(file: File) {
  return file.type.startsWith('image/') || isPdfFile(file);
}

/** Pasted screenshots arrive as images; a PDF copied from the file manager
 * arrives as a file entry, so both are accepted here. */
function getClipboardGameResultFile(
  clipboardData: DataTransfer | null,
): File | null {
  if (!clipboardData) {
    return null;
  }

  for (const file of Array.from(clipboardData.files ?? [])) {
    if (isSupportedGameResultFile(file)) {
      return file;
    }
  }

  for (const item of Array.from(clipboardData.items ?? [])) {
    if (item.kind !== 'file') {
      continue;
    }

    const file = item.getAsFile();

    if (file && isSupportedGameResultFile(file)) {
      return file;
    }
  }

  return null;
}

function getDroppedGameLogFile(dataTransfer: DataTransfer | null): File | null {
  if (!dataTransfer) {
    return null;
  }

  for (const file of Array.from(dataTransfer.files ?? [])) {
    if (file.type.startsWith('text/') || /\.(log|txt)$/i.test(file.name)) {
      return file;
    }
  }

  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') {
      continue;
    }

    if (!item.type.startsWith('text/')) {
      continue;
    }

    return item.getAsFile();
  }

  return null;
}

async function readDroppedGameLog(
  dataTransfer: DataTransfer | null,
): Promise<string | null> {
  if (!dataTransfer) {
    return null;
  }

  const droppedGameLogFile = getDroppedGameLogFile(dataTransfer);

  if (droppedGameLogFile) {
    return (await droppedGameLogFile.text()).replace(/\r\n/g, '\n');
  }

  const droppedText = dataTransfer.getData('text/plain').trim();

  return droppedText ? droppedText : null;
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

function clampPlayerCount(playerCount: number) {
  return Math.min(5, Math.max(1, playerCount));
}

function inferDetectedPlayerCount(review: ImportReviewModel | null | undefined) {
  if (!review) {
    return null;
  }

  const detectedParticipantNames = Array.isArray(review.detectedParticipantNames)
    ? review.detectedParticipantNames
    : [];
  const screenshotRows = Array.isArray(review.scoreCandidates)
    ? review.scoreCandidates
    : [];
  const detectedPlayerCount = Math.max(
    detectedParticipantNames.length,
    screenshotRows.length,
  );

  return detectedPlayerCount > 0
    ? clampPlayerCount(detectedPlayerCount)
    : null;
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
  initialValues: Pick<WebImportDraftValues, 'playedOn'>;
  onAnalyzeImportEvidence: (
    formData: FormData,
  ) => Promise<WebImportActionResult>;
  onCreateImportPlayer?: (
    importedName: string,
  ) => Promise<WebImportCreatePlayerResult>;
  onConfirmImportReview: (
    formData: FormData,
    jumpTarget?: ImportReviewJumpTarget | null,
  ) => Promise<WebImportActionResult>;
};

export function WebImportPage({
  initialValues,
  onAnalyzeImportEvidence,
  onCreateImportPlayer,
  onConfirmImportReview,
}: WebImportPageProps) {
  const exportedGameLogRef = useRef<HTMLTextAreaElement | null>(null);
  const screenshotPasteTargetRef = useRef<HTMLDivElement | null>(null);
  const [playedOn, setPlayedOn] = useState(initialValues.playedOn);
  const [exportedGameLog, setExportedGameLog] = useState('');
  const [participantsText, setParticipantsText] = useState('');
  const [endgameScreenshot, setEndgameScreenshot] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<WebImportActionResult>({
    status: 'idle',
  });
  const [review, setReview] = useState<ImportReviewModel | null>(null);
  const [playerSelections, setPlayerSelections] = useState<Record<string, string>>(
    {},
  );
  const [creatingImportedName, setCreatingImportedName] = useState<string | null>(
    null,
  );
  const [manualReviewJumpTarget, setManualReviewJumpTarget] =
    useState<ImportReviewJumpTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReadingScreenshot, setIsReadingScreenshot] = useState(false);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<
    string | null
  >(null);
  const screenshotOcrCacheRef = useRef<{
    file: File;
    payload: ScreenshotOcrPayload;
  } | null>(null);
  const generationCount = null;

  useEffect(() => {
    if (!endgameScreenshot || isPdfFile(endgameScreenshot)) {
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

  function resetFeedback() {
    setFeedback({
      status: 'idle',
    });
  }

  function attachEndgameScreenshot(file: File | null) {
    setEndgameScreenshot(file);
    resetFeedback();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLFormElement>) {
    const pastedScreenshot = getClipboardGameResultFile(event.clipboardData);

    if (!pastedScreenshot) {
      return;
    }

    event.preventDefault();
    attachEndgameScreenshot(pastedScreenshot);
  }

  function handleScreenshotPaste(
    event: React.ClipboardEvent<HTMLDivElement>,
  ) {
    const pastedScreenshot = getClipboardGameResultFile(event.clipboardData);

    if (!pastedScreenshot) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    attachEndgameScreenshot(pastedScreenshot);
  }

  function focusPasteTarget(
    event: React.MouseEvent<HTMLDivElement>,
    targetRef: React.RefObject<HTMLDivElement | null>,
  ) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('input')
    ) {
      return;
    }

    targetRef.current?.focus();
  }

  function handleScreenshotDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const droppedFile = Array.from(event.dataTransfer.files ?? []).find(
      isSupportedGameResultFile,
    );

    if (droppedFile) {
      attachEndgameScreenshot(droppedFile);
    }
  }

  async function handleGameLogDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();

    const droppedGameLog = await readDroppedGameLog(event.dataTransfer);

    if (!droppedGameLog) {
      return;
    }

    setExportedGameLog(droppedGameLog);
  }

  function buildExpectedScreenshotPlayerNames() {
    const participantNames = parseImportParticipants(participantsText);

    if (participantNames.length > 0) {
      return participantNames;
    }

    try {
      return extractGameLogParticipantNames(parseGameLog(exportedGameLog));
    } catch {
      return [];
    }
  }

  // The map and player count are no longer asked for in this form; the server
  // infers the map from the log evidence, and the player count travels as the
  // best count derivable from participant names and analyzed evidence.
  function deriveSubmittedPlayerCount() {
    return clampPlayerCount(
      Math.max(
        1,
        buildExpectedScreenshotPlayerNames().length,
        inferDetectedPlayerCount(review) ?? 0,
      ),
    );
  }

  function buildCurrentFormData(screenshotOcr: ScreenshotOcrPayload | null) {
    return buildCreateImportDraftFormData({
      boardScreenshots: [],
      confirmedPlayerLinks: review
        ? review.playerLinks.flatMap((link) => {
            const playerId = playerSelections[link.importedName]?.trim() ?? '';
            return playerId ? [{ importedName: link.importedName, playerId }] : [];
          })
        : [],
      endgameScreenshot,
      exportedGameLog: exportedGameLog.trim(),
      generationCount,
      participants: participantsText,
      playedOn,
      playerCount: deriveSubmittedPlayerCount(),
      screenshotOcr,
    });
  }

  // The deployed server runtime cannot run OCR, so the screenshot is read in
  // the browser before submitting and the extracted lines travel with the
  // form. Falls back to server-side OCR when this fails.
  async function resolveScreenshotOcr(): Promise<ScreenshotOcrPayload | null> {
    if (!endgameScreenshot) {
      return null;
    }

    if (screenshotOcrCacheRef.current?.file === endgameScreenshot) {
      return screenshotOcrCacheRef.current.payload;
    }

    setIsReadingScreenshot(true);

    try {
      const { readGameResultScreenshotInBrowser } = await import(
        '@/lib/imports/ocr/read-game-result-screenshot-in-browser'
      );
      const expectedPlayerNames = buildExpectedScreenshotPlayerNames();
      const payload = await readGameResultScreenshotInBrowser(
        endgameScreenshot,
        {
          expectedPlayerCount: Math.max(1, expectedPlayerNames.length),
          expectedPlayerNames,
        },
      );

      screenshotOcrCacheRef.current = {
        file: endgameScreenshot,
        payload,
      };

      return payload;
    } catch {
      return null;
    } finally {
      setIsReadingScreenshot(false);
    }
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
      const screenshotOcr = await resolveScreenshotOcr();
      const result = await onAnalyzeImportEvidence(
        buildCurrentFormData(screenshotOcr),
      );

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
      const screenshotOcr = await resolveScreenshotOcr();
      const result = await onConfirmImportReview(
        buildCurrentFormData(screenshotOcr),
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

  async function handleCreatePlayer(importedName: string) {
    if (!onCreateImportPlayer) {
      return;
    }

    setCreatingImportedName(importedName);

    try {
      const result = await onCreateImportPlayer(importedName);

      setFeedback({
        message: result.message,
        status: result.status,
      });

      if (!result.createdPlayer) {
        return;
      }

      const createdPlayer = result.createdPlayer;

      setReview((current) =>
        current
          ? applyCreatedImportPlayerToReview(current, {
              createdPlayerId: createdPlayer.id,
              displayName: createdPlayer.displayName,
              importedName,
            })
          : current,
      );
      setPlayerSelections((current) => ({
        ...current,
        [importedName]: createdPlayer.id,
      }));
    } catch (error) {
      setFeedback({
        status: 'error',
        message: getImportErrorMessage(error),
      });
    } finally {
      setCreatingImportedName(null);
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
          <div className="flex flex-col items-end gap-2">
            <span className="tm-coverage-badge shrink-0">Unlogged</span>
            <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100">
              Single Upload Mode
            </span>
          </div>
        </div>
        <p className="tm-body-copy text-sm">
          Paste an exported game log, attach one combined game-result image,
          and prepare a guided handoff into the shared scoring flow.
        </p>
        <p className="text-xs text-emerald-100/85">
          Only one image is needed here. Board screenshots are no longer part of
          this import flow.
        </p>
      </section>

      <form
        className="tm-panel flex flex-col gap-6"
        onPaste={handlePaste}
        onSubmit={handleAnalyzeSubmit}
      >
        <div className="flex flex-col gap-4">
          <StepHeading step="01" title="Match Setup" />
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="tm-data-label">Played On</span>
              <input
                aria-label="Played On"
                className="tm-input"
                onChange={(event) => setPlayedOn(event.target.value)}
                type="date"
                value={playedOn}
              />
            </label>
          </div>
          <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
            The map and player count are detected automatically from the
            pasted log evidence, and generations are inferred from the
            uploaded victory point breakdown when possible.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <StepHeading step="02" title="Game Log" />
          <div
            aria-label="Import Log File Dropzone"
            className="overflow-hidden rounded-2xl border"
            onClick={() => exportedGameLogRef.current?.focus()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleGameLogDrop}
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
              onChange={(event) => setExportedGameLog(event.target.value)}
              placeholder="Paste the exported log text here."
              ref={exportedGameLogRef}
              value={exportedGameLog}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
            Paste the exported log text directly, or drop a `.txt` or `.log`
            file into this panel.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <StepHeading step="03" title="Game Result Screenshot or PDF" />
          <div
            aria-label="Paste Target for Game Result Screenshot or PDF"
            className="relative rounded-2xl border border-dashed px-4 py-6 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(214,135,66,0.45)]"
            onClick={(event) =>
              focusPasteTarget(event, screenshotPasteTargetRef)
            }
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleScreenshotDrop}
            onPaste={handleScreenshotPaste}
            ref={screenshotPasteTargetRef}
            style={{ borderColor: 'rgba(192, 162, 127, 0.4)' }}
            tabIndex={0}
          >
            {screenshotPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Game result screenshot preview"
                className="mx-auto max-h-40 rounded-xl border"
                src={screenshotPreviewUrl}
                style={{ borderColor: 'var(--tm-panel-border)' }}
              />
            ) : endgameScreenshot && isPdfFile(endgameScreenshot) ? (
              <p className="text-sm tm-accent-copy">
                PDF attached — its text is read directly, so no OCR is needed.
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
                Click here and paste a copied image, drop an image or PDF here,
                or choose a file below.
              </p>
            )}
            <input
              aria-label="Game Result Screenshot or PDF"
              accept="image/*,application/pdf,.pdf"
              className="mx-auto mt-4 block max-w-xs text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--tm-copper-500)] file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-[#27150e]"
              onChange={(event) =>
                attachEndgameScreenshot(event.target.files?.[0] ?? null)
              }
              type="file"
            />
            <p className="mt-3 text-xs" style={{ color: 'var(--tm-muted)' }}>
              Use the combined result image that includes the final victory
              point breakdown and score details, or print the game result page
              to PDF — a PDF is read exactly and skips OCR entirely. Click this
              panel to paste, or paste anywhere else in the form to attach it
              here automatically.
            </p>
            {endgameScreenshot ? (
              <p className="mt-1 text-xs tm-accent-copy">
                Attached game result{' '}
                {isPdfFile(endgameScreenshot) ? 'PDF' : 'screenshot'}:{' '}
                {endgameScreenshot.name}
              </p>
            ) : null}
            {isReadingScreenshot ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--tm-muted)' }}>
                {endgameScreenshot && isPdfFile(endgameScreenshot)
                  ? 'Reading the PDF…'
                  : 'Reading the screenshot in your browser… this can take a minute on the first run.'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <StepHeading step="04" title="Participants (Optional)" />
          <label className="flex flex-col gap-2 text-sm">
            <span className="sr-only">Participants</span>
            <textarea
              aria-label="Participants"
              className="tm-input min-h-24"
              onChange={(event) => setParticipantsText(event.target.value)}
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
        creatingImportedName={creatingImportedName}
        onCreatePlayer={handleCreatePlayer}
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
