'use client';

import { useState } from 'react';
import { parseEndgameScoreScreenshot } from '@/lib/imports/parse-endgame-score-screenshot';

export function OcrHarness() {
  const [file, setFile] = useState<File | null>(null);
  const [namesText, setNamesText] = useState('James, Izzy');
  const [status, setStatus] = useState<'error' | 'done' | 'idle' | 'running'>(
    'idle',
  );
  const [output, setOutput] = useState('');

  async function loadFixture() {
    const response = await fetch('/dev/ocr-harness/fixture');
    const blob = await response.blob();

    setFile(
      new File([blob], 'combined-game-result.jpeg', { type: 'image/jpeg' }),
    );
  }

  async function run() {
    if (!file) {
      return;
    }

    setStatus('running');
    setOutput('');

    try {
      const { readGameResultScreenshotInBrowser } = await import(
        '@/lib/imports/ocr/read-game-result-screenshot-in-browser'
      );
      const expectedPlayerNames = namesText
        .split(/[\n,]/)
        .map((name) => name.trim())
        .filter(Boolean);
      const startedAt = Date.now();
      const read = await readGameResultScreenshotInBrowser(file, {
        expectedPlayerCount: expectedPlayerNames.length,
        expectedPlayerNames,
      });
      const parsed = parseEndgameScoreScreenshot(read.endgameLines);

      setOutput(
        JSON.stringify(
          {
            elapsedMs: Date.now() - startedAt,
            parsed,
            read,
          },
          null,
          2,
        ),
      );
      setStatus('done');
    } catch (error) {
      setOutput(error instanceof Error ? `${error.message}\n${error.stack}` : String(error));
      setStatus('error');
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Browser OCR Harness (dev only)</h1>
      <p className="text-sm">
        Runs the game-result screenshot OCR pipeline entirely in this browser,
        exactly as the web import page does before submitting.
      </p>
      <input
        accept="image/*"
        data-testid="ocr-file"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        type="file"
      />
      <button
        className="w-fit rounded border px-3 py-1 text-sm"
        data-testid="ocr-load-fixture"
        onClick={loadFixture}
        type="button"
      >
        Load sample fixture
      </button>
      <label className="flex flex-col gap-1 text-sm">
        Expected player names (comma separated)
        <input
          className="rounded border px-2 py-1"
          data-testid="ocr-names"
          onChange={(event) => setNamesText(event.target.value)}
          value={namesText}
        />
      </label>
      <p className="text-sm" data-testid="ocr-attached">
        {file ? `Attached: ${file.name}` : 'No image attached.'}
      </p>
      <button
        className="w-fit rounded border px-3 py-1 text-sm font-semibold"
        data-testid="ocr-run"
        disabled={!file || status === 'running'}
        onClick={run}
        type="button"
      >
        {status === 'running' ? 'Running…' : 'Run browser OCR'}
      </button>
      <p className="text-sm" data-testid="ocr-status">
        Status: {status}
      </p>
      <pre
        className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded border p-3 text-xs"
        data-testid="ocr-output"
      >
        {output}
      </pre>
    </main>
  );
}
