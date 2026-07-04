import type { ImportReviewModel } from '@/lib/imports/build-import-review-model';
import { ImportPlayerResolutionPanel } from './import-player-resolution-panel';
import { ImportScoreCandidatesPanel } from './import-score-candidates-panel';

type ImportReviewPanelProps = {
  review: ImportReviewModel | null;
};

export function ImportReviewPanel({ review }: ImportReviewPanelProps) {
  if (!review) {
    return null;
  }

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
      {review.requiresPlayerConfirmation ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          Some imported names still need profile confirmation before final
          scoring.
        </p>
      ) : null}
      <ImportPlayerResolutionPanel playerLinks={review.playerLinks} />
      <ImportScoreCandidatesPanel scoreCandidates={review.scoreCandidates} />
    </section>
  );
}
