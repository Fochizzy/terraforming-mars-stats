import type { GameLogImportSummary } from '@/lib/db/game-import-repo';

function getImportSourceLabel(source: string) {
  if (source === 'manual_web_import') {
    return 'Saved from Web Import';
  }

  return source.replace(/_/g, ' ');
}

function getImportParseStatusLabel(parseStatus: string) {
  switch (parseStatus) {
    case 'log_parsed':
      return 'Log Parsed';
    case 'score_extracted':
      return 'Score Extracted';
    case 'score_extraction_skipped':
      return 'Score Extraction Skipped';
    case 'log_parsed_score_extracted':
      return 'Log Parsed + Score Extracted';
    case 'log_parsed_score_extraction_skipped':
      return 'Log Parsed + Score Extraction Skipped';
    default:
      return parseStatus.replace(/_/g, ' ');
  }
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
    <section className="tm-panel flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="tm-panel-title text-xl">Imported Evidence</h2>
          <p className="tm-body-copy mt-1 text-sm">
            {getImportSourceLabel(importSummary.detectedSource)}. The original
            pasted log and screenshot metadata are saved separately from the
            draft notes.
          </p>
        </div>
        <span className="tm-coverage-badge shrink-0">
          {getImportParseStatusLabel(importSummary.parseStatus)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="tm-stat-card">
          <p className="tm-data-label">Evidence</p>
          <p className="mt-2 text-sm text-stone-100">
            {importSummary.lineCount} log lines saved
          </p>
          <p className="tm-muted-copy mt-1 text-sm">
            Screenshot: {importSummary.screenshotOriginalName ?? 'None attached'}
          </p>
        </article>
        <article className="tm-stat-card">
          <p className="tm-data-label">Log Preview</p>
          {visibleLines.length > 0 ? (
            <>
              <div className="mt-2 grid gap-1 text-sm text-stone-100">
                {visibleLines.map((line, index) => (
                  <p key={`${index}-${line}`}>{line}</p>
                ))}
              </div>
              {hiddenLineCount > 0 ? (
                <p className="tm-muted-copy mt-2 text-xs">
                  +{hiddenLineCount} more lines saved
                </p>
              ) : null}
            </>
          ) : (
            <p className="tm-muted-copy mt-2 text-sm">
              No pasted game log was saved for this draft.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
