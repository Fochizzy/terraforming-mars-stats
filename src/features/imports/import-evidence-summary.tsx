import type { GameLogImportSummary } from '@/lib/db/game-import-repo';

function getImportSourceLabel(source: string) {
  if (source === 'manual_web_import') {
    return 'Saved from Web Import';
  }

  return source.replace(/_/g, ' ');
}

function getPreviewLines(rawLogText: string) {
  return rawLogText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ImportEvidenceSummary({
  importSummary,
}: {
  importSummary: GameLogImportSummary;
}) {
  const previewLines = getPreviewLines(importSummary.rawLogText);
  const visibleLines = previewLines.slice(0, 3);
  const hiddenLineCount = Math.max(0, previewLines.length - visibleLines.length);

  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-stone-50">
            Imported Evidence
          </h2>
          <p className="mt-1 text-sm text-cyan-100/90">
            {getImportSourceLabel(importSummary.detectedSource)}. The original
            pasted log and screenshot metadata are saved separately from the
            draft notes.
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
          {importSummary.parseStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-300">
            Evidence
          </p>
          <p className="mt-2 text-sm text-stone-100">
            {importSummary.lineCount} log lines saved
          </p>
          <p className="mt-1 text-sm text-stone-300">
            Screenshot: {importSummary.screenshotOriginalName ?? 'None attached'}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-300">
            Log Preview
          </p>
          {visibleLines.length > 0 ? (
            <>
              <div className="mt-2 grid gap-1 text-sm text-stone-100">
                {visibleLines.map((line, index) => (
                  <p key={`${index}-${line}`}>{line}</p>
                ))}
              </div>
              {hiddenLineCount > 0 ? (
                <p className="mt-2 text-xs text-stone-400">
                  +{hiddenLineCount} more lines saved
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-400">
              No pasted game log was saved for this draft.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
