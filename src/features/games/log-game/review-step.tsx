'use client';

import { StepHeading } from '@/components/ui/step-heading';
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
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="05" title="Review and Finalize" />
      <p className="tm-body-copy text-sm">
        Show validation warnings, optional-data coverage, and finalize or save
        the draft.
      </p>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Notes</span>
        <textarea aria-label="Notes" className="tm-input min-h-28" {...register('notes')} />
      </label>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3">
          <h3 className="tm-data-label">Player Summary</h3>
          <div className="grid gap-3 xl:grid-cols-2">
            {selectedPlayers.map((player) => {
              const score = playerScores[player.id] ?? {};

              return (
                <article className="tm-stat-card" key={player.id}>
                  <p className="font-semibold text-stone-100">{player.display_name}</p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--tm-muted)' }}>
                    Total: {score.totalPoints ?? '-'} | MC: {score.finalMegacredits ?? '-'}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="tm-stat-card">
            <h3 className="tm-data-label">Review Issues</h3>
            {review.issues.length === 0 ? (
              <span className="tm-coverage-badge mt-3 inline-flex">
                No blocking issues detected
              </span>
            ) : (
              <ul className="mt-3 grid gap-2 text-sm">
                {blockingIssues.map((issue) => (
                  <li
                    className="tm-text-danger"
                    key={`${issue.code}-${issue.message}`}
                  >
                    {issue.message}
                  </li>
                ))}
                {warnings.map((issue) => (
                  <li
                    className="tm-text-warning"
                    key={`${issue.code}-${issue.message}`}
                  >
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="tm-stat-card">
            <h3 className="tm-data-label">Optional Coverage</h3>
            <ul className="mt-3 grid gap-2 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--tm-muted)' }}>Card breakdowns</span>
                <span className="tm-accent-copy">
                  {review.coverage.playersWithCardBreakdown}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--tm-muted)' }}>Declared styles</span>
                <span className="tm-accent-copy">
                  {review.coverage.playersWithDeclaredStyle}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--tm-muted)' }}>Key-card entries</span>
                <span className="tm-accent-copy">
                  {review.coverage.playersWithKeyCards}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--tm-muted)' }}>Optional subscores</span>
                <span className="tm-accent-copy">
                  {review.coverage.playersWithOptionalSubscores}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
