import type { ImportPlayerCardScoringSummary } from '@/lib/imports/card-scoring/card-scoring-types';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';

function formatBreakdown(summary: ImportPlayerCardScoringSummary['totals']) {
  return [
    summary.animals > 0 ? `${summary.animals} animal` : null,
    summary.microbes > 0 ? `${summary.microbes} microbe` : null,
    summary.jovian > 0 ? `${summary.jovian} Jovian` : null,
    summary.other > 0 ? `${summary.other} other` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

type ImportCardScoringPanelProps = {
  onSelectManualReviewJumpTarget?: (target: ImportReviewJumpTarget) => void;
  selectedManualReviewJumpTarget?: ImportReviewJumpTarget | null;
  summaries: ImportPlayerCardScoringSummary[];
};

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

function buildPendingCardJumpTarget(
  summary: ImportPlayerCardScoringSummary,
  card: ImportPlayerCardScoringSummary['pendingCards'][number],
): ImportReviewJumpTarget | null {
  if (card.reviewKind !== 'board_evidence') {
    return null;
  }

  return {
    itemLabel: card.cardName,
    message: card.reason,
    playerName: summary.playerName,
    scoreField: 'cardPointsTotal',
  };
}

export function ImportCardScoringPanel({
  onSelectManualReviewJumpTarget,
  selectedManualReviewJumpTarget,
  summaries,
}: ImportCardScoringPanelProps) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
      <h3 className="tm-data-label text-xs">Calculated Card Scoring</h3>
      <div className="mt-3 flex flex-col gap-3 text-sm text-emerald-50">
        {summaries.map((summary) => (
          <section
            className="rounded-xl bg-white/[0.03] px-3 py-3"
            key={summary.playerName}
          >
            <p className="font-semibold">
              {summary.playerName}: {summary.totals.total} calculated card points
            </p>
            <p className="mt-1 text-xs text-emerald-100/80">
              {formatBreakdown(summary.totals) || 'No variable card points detected.'}
            </p>
            {summary.autoScoredCards.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2 text-xs">
                {summary.autoScoredCards.map((card) => (
                  <li key={`${summary.playerName}-${card.cardId}`}>
                    {card.cardName}: {card.points} VP. {card.evidenceSummary}
                  </li>
                ))}
              </ul>
            ) : null}
            {summary.pendingCards.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2 text-xs text-amber-100">
                {summary.pendingCards.map((card) => {
                  const jumpTarget = buildPendingCardJumpTarget(summary, card);
                  const isSelected =
                    jumpTarget != null &&
                    selectedManualReviewJumpTarget?.itemLabel ===
                      jumpTarget.itemLabel &&
                    selectedManualReviewJumpTarget.playerName ===
                      jumpTarget.playerName &&
                    selectedManualReviewJumpTarget.scoreField ===
                      jumpTarget.scoreField;

                  if (!jumpTarget) {
                    return (
                      <li key={`${summary.playerName}-${card.cardId}-pending`}>
                        Review {card.cardName}: {card.reason}
                      </li>
                    );
                  }

                  return (
                    <li
                      className="rounded-xl bg-white/[0.03] px-3 py-3"
                      key={`${summary.playerName}-${card.cardId}-pending`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <span>
                          Review {card.cardName}: {card.reason}
                        </span>
                        <button
                          aria-label={`Fill manually ${jumpTarget.itemLabel} for ${jumpTarget.playerName}`}
                          className="tm-button-secondary shrink-0"
                          onClick={() =>
                            onSelectManualReviewJumpTarget?.(jumpTarget)
                          }
                          type="button"
                        >
                          {isSelected
                            ? (
                                <>
                                  Manual fill selected &middot;{' '}
                                  {formatManualReviewScoreFieldLabel(
                                    jumpTarget.scoreField,
                                  )}
                                </>
                              )
                            : 'Fill manually'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
