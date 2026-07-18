'use client';

import { useState } from 'react';
import type { MapOption } from '@/lib/db/reference-repo';
import { recognizeScreenshotInBrowser } from '@/lib/ocr/browser-tesseract';
import { EntryMethodSelector } from '@/features/games/log-game/entry-method-selector';
import type { LogGameWorkflowStateKind } from '@/features/games/log-game/log-game-entry';
import { ImportReviewPanel } from './import-review-panel';

export type WebImportDraftValues = {
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  ocrConfidence: number | null;
  playedOn: string;
  playerCount: number;
  rawOcrText: string;
};

export type WebImportActionResult = {
  gameId?: string;
  message?: string;
  status: 'error' | 'idle' | 'success';
};

type WebImportPageProps = {
  groupName: string;
  initialValues: Omit<
    WebImportDraftValues,
    | 'endgameScreenshot'
    | 'exportedGameLog'
    | 'ocrConfidence'
    | 'rawOcrText'
  >;
  mapOptions: MapOption[];
  onStartImport: (
    values: WebImportDraftValues,
  ) => Promise<WebImportActionResult>;
};

function importDraftFingerprint(values: WebImportDraftValues) {
  return JSON.stringify({
    ...values,
    endgameScreenshot: values.endgameScreenshot
      ? {
          lastModified: values.endgameScreenshot.lastModified,
          name: values.endgameScreenshot.name,
          size: values.endgameScreenshot.size,
          type: values.endgameScreenshot.type,
        }
      : null,
    exportedGameLog: values.exportedGameLog.trim(),
    rawOcrText: values.rawOcrText.trim(),
  });
}

export function WebImportPage({
  groupName,
  initialValues,
  mapOptions,
  onStartImport,
}: WebImportPageProps) {
  const [playedOn, setPlayedOn] = useState(initialValues.playedOn);
  const [mapId, setMapId] = useState(initialValues.mapId);
  const [playerCount, setPlayerCount] = useState(initialValues.playerCount);
  const [generationCount, setGenerationCount] = useState(
    initialValues.generationCount,
  );
  const [exportedGameLog, setExportedGameLog] = useState('');
  const [endgameScreenshot, setEndgameScreenshot] = useState<File | null>(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [feedback, setFeedback] = useState<WebImportActionResult>({
    status: 'idle',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentValues: WebImportDraftValues = {
    endgameScreenshot,
    exportedGameLog,
    generationCount,
    mapId,
    ocrConfidence,
    playedOn,
    playerCount,
    rawOcrText,
  };
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    importDraftFingerprint(currentValues),
  );
  const hasUnsavedChanges =
    importDraftFingerprint(currentValues) !== savedFingerprint;
  let workflowState: LogGameWorkflowStateKind = 'importing';

  if (isSubmitting) {
    workflowState = 'saving';
  } else if (feedback.status === 'success' && !hasUnsavedChanges) {
    workflowState = 'saved';
  } else if (feedback.status === 'error') {
    workflowState = 'save_failed';
  }

  async function handleScreenshotChange(file: File | null) {
    setEndgameScreenshot(file);
    setRawOcrText('');
    setOcrConfidence(null);
    setOcrProgress(0);
    setOcrStatus(null);

    if (!file) {
      return;
    }

    setIsRecognizing(true);
    setOcrStatus('Loading OCR…');

    try {
      const result = await recognizeScreenshotInBrowser(file, (progress) => {
        setOcrProgress(progress.progress);
        setOcrStatus(progress.status);
      });

      setRawOcrText(result.text);
      setOcrConfidence(result.confidence);
      setOcrProgress(1);
      setOcrStatus('OCR complete');
    } catch (error) {
      setOcrStatus(
        error instanceof Error
          ? error.message
          : 'Unable to read text from this screenshot.',
      );
    } finally {
      setIsRecognizing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (endgameScreenshot && isRecognizing) {
      setFeedback({
        status: 'error',
        message: 'Wait for screenshot OCR to finish before saving.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submittedValues = {
        ...currentValues,
        exportedGameLog: exportedGameLog.trim(),
      };
      const result = await onStartImport(submittedValues);

      setFeedback(result);
      if (result.status === 'success') {
        setSavedFingerprint(importDraftFingerprint(submittedValues));
      }
    } catch (error) {
      setFeedback({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to save this import draft right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <EntryMethodSelector
        currentMethod="import"
        groupName={groupName}
        hasUnsavedChanges={hasUnsavedChanges}
        workflowState={workflowState}
      />
      <section className="rounded-2xl border border-orange-900/30 bg-black/25 p-4">
        <h2 className="font-serif text-2xl font-semibold">Import Game</h2>
        <p className="mt-2 text-sm text-stone-300">
          Paste an exported game log, attach the endgame screenshot reference,
          and prepare a guided handoff into the shared scoring flow.
        </p>
      </section>

      <form
        aria-busy={isSubmitting || isRecognizing}
        className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-950/50 p-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-stone-200">Played On</span>
            <input aria-label="Played On" className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3" onChange={(event) => setPlayedOn(event.target.value)} type="date" value={playedOn} />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-stone-200">Map</span>
            <select aria-label="Map" className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3" onChange={(event) => setMapId(event.target.value)} value={mapId}>
              {mapOptions.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-stone-200">Player Count</span>
            <select aria-label="Player Count" className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3" onChange={(event) => setPlayerCount(Number(event.target.value))} value={playerCount}>
              {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-stone-200">Generation Count</span>
            <input aria-label="Generation Count" className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3" min={1} onChange={(event) => setGenerationCount(Number(event.target.value))} type="number" value={generationCount} />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Exported Game Log</span>
          <textarea aria-label="Exported Game Log" className="min-h-36 rounded-2xl border border-stone-800 bg-black/30 px-4 py-3" onChange={(event) => setExportedGameLog(event.target.value)} placeholder="Paste the exported log text here." value={exportedGameLog} />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Endgame Screenshot</span>
          <input aria-label="Endgame Screenshot" accept="image/*" className="rounded-xl border border-dashed border-stone-700 bg-black/20 px-4 py-3 text-sm" onChange={(event) => void handleScreenshotChange(event.target.files?.[0] ?? null)} type="file" />
        </label>

        {ocrStatus ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-stone-800 bg-black/20 p-3 text-sm text-stone-300"
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{ocrStatus}</span>
              <span>{Math.round(ocrProgress * 100)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
              <div className="h-full bg-orange-400 transition-[width]" style={{ width: `${Math.round(ocrProgress * 100)}%` }} />
            </div>
            {rawOcrText ? <p className="mt-2 text-xs text-stone-400">Recognized {rawOcrText.length.toLocaleString()} characters{ocrConfidence === null ? '' : ` at ${Math.round(ocrConfidence * 100)}% confidence`}.</p> : null}
          </div>
        ) : null}

        {feedback.message ? (
          <p
            aria-live={feedback.status === 'error' ? 'assertive' : 'polite'}
            className={feedback.status === 'error' ? 'text-sm text-amber-200' : 'text-sm text-emerald-300'}
            role={feedback.status === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        ) : null}

        <button className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting || isRecognizing} type="submit">
          {isRecognizing ? 'Reading Screenshot…' : isSubmitting ? 'Saving Import Draft...' : 'Save Import Draft'}
        </button>
      </form>

      <ImportReviewPanel />
    </div>
  );
}
