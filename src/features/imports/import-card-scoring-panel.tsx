import type { ImportPlayerCardScoringSummary } from '@/lib/imports/card-scoring/card-scoring-types';

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
  summaries: ImportPlayerCardScoringSummary[];
};

export function ImportCardScoringPanel({
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
                {summary.pendingCards.map((card) => (
                  <li key={`${summary.playerName}-${card.cardId}-pending`}>
                    Review {card.cardName}: {card.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
