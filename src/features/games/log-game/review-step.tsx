'use client';

import type { GameReview } from '@/features/games/finalize-game';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';

type ReviewStepProps = {
  playerScores: LogGameDraftInput['playerScores'];
  register: UseFormRegister<LogGameDraftInput>;
  review: GameReview;
  selectedPlayers: Array<{
    id: string;
    display_name: string;
  }>;
};

export function ReviewStep({
  playerScores,
  register,
  review,
  selectedPlayers,
}: ReviewStepProps) {
  const blockingIssues = review.issues.filter((issue) => issue.severity === 'error');
  const warnings = review.issues.filter((issue) => issue.severity === 'warning');

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-900/30 bg-black/25 p-4">
      <h2 className="font-serif text-xl font-semibold">Review and Finalize</h2>
      <p className="text-sm text-stone-300">
        Show validation warnings, optional-data coverage, and finalize or save
        the draft.
      </p>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold text-stone-200">Notes</span>
        <textarea
          aria-label="Notes"
          className="min-h-28 rounded-2xl border border-stone-800 bg-stone-950/60 px-4 py-3"
          {...register('notes')}
        />
      </label>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
            Player Summary
          </h3>
          {selectedPlayers.map((player) => {
            const score = playerScores[player.id] ?? {};

            return (
              <article
                className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4"
                key={player.id}
              >
                <p className="font-semibold text-stone-100">{player.display_name}</p>
                <p className="mt-2 text-sm text-stone-300">
                  Total: {score.totalPoints ?? '-'} | MC: {score.finalMegacredits ?? '-'}
                </p>
              </article>
            );
          })}
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              Review Issues
            </h3>
            {review.issues.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-300">
                No blocking issues detected.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 text-sm text-stone-200">
                {blockingIssues.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`} className="text-rose-300">
                    {issue.message}
                  </li>
                ))}
                {warnings.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`} className="text-amber-300">
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              Optional Coverage
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-stone-200">
              <li>Card breakdowns: {review.coverage.playersWithCardBreakdown}</li>
              <li>Declared styles: {review.coverage.playersWithDeclaredStyle}</li>
              <li>Key-card entries: {review.coverage.playersWithKeyCards}</li>
              <li>Optional subscores: {review.coverage.playersWithOptionalSubscores}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
