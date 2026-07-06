import type { ImportReviewModel } from '@/lib/imports/build-import-review-model';
import { ImportPlayerResolutionPanel } from './import-player-resolution-panel';
import { ImportScoreCandidatesPanel } from './import-score-candidates-panel';

type ImportReviewPanelProps = {
  creatingImportedName?: string | null;
  onCreatePlayer?: (importedName: string) => Promise<void>;
  onSelectionChange: (importedName: string, playerId: string) => void;
  review: ImportReviewModel | null;
  playerSelections: Record<string, string>;
};

export function ImportReviewPanel({
  creatingImportedName,
  onCreatePlayer,
  onSelectionChange,
  review,
  playerSelections,
}: ImportReviewPanelProps) {
  if (!review) {
    return null;
  }

  const detectedParticipantNames = review.detectedParticipantNames ?? [];

  return (
    <section className="tm-panel flex flex-col gap-3">
      <h2 className="tm-panel-title text-lg">Import Review</h2>
      <p className="tm-body-copy text-sm">
        Parsed {review.parsedEventCount} actionable log events and ignored{' '}
        {review.ignoredLineCount} filler lines.
      </p>
      <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
        {review.drawInfoLineCount} draw-only lines were kept as context.
      </p>
      {detectedParticipantNames.length > 0 ? (
        <p className="text-xs" style={{ color: 'var(--tm-muted)' }}>
          Detected from log: {detectedParticipantNames.join(', ')}
        </p>
      ) : null}
      {review.requiresPlayerConfirmation ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          Some imported names still need profile confirmation before final
          scoring.
        </p>
      ) : null}
      <ImportPlayerResolutionPanel
        creatingImportedName={creatingImportedName}
        onCreatePlayer={onCreatePlayer}
        onSelectionChange={onSelectionChange}
        playerLinks={review.playerLinks}
        playerSelections={playerSelections}
      />
      <ImportScoreCandidatesPanel scoreCandidates={review.scoreCandidates} />
    </section>
  );
}
