'use client';

import type { GameReview } from '@/features/games/finalize-game';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';
import {
  REVIEW_ISSUE_STEP_MAP,
  getManualEntryStep,
  type ManualEntryStepId,
} from './manual-entry-steps';

type ReviewStepProps = {
  guaranteedMergerOffer: boolean | null;
  mergerOfferRuleSource: LogGameDraftInput['mergerOfferRuleSource'];
  onNavigateToStep?: (stepId: ManualEntryStepId) => void;
  playerScores: LogGameDraftInput['playerScores'];
  register: UseFormRegister<LogGameDraftInput>;
  review: GameReview;
  selectedPlayers: Array<{
    id: string;
    display_name: string;
  }>;
};

export function ReviewStep({
  guaranteedMergerOffer,
  mergerOfferRuleSource,
  onNavigateToStep,
  playerScores,
  register,
  review,
  selectedPlayers,
}: ReviewStepProps) {
  const blockingIssues = review.issues.filter((issue) => issue.severity === 'error');
  const warnings = review.issues.filter((issue) => issue.severity === 'warning');

  function renderIssue(
    issue: GameReview['issues'][number],
    tone: 'error' | 'warning',
  ) {
    const stepId =
      issue.severity === 'error' ? REVIEW_ISSUE_STEP_MAP[issue.code] : null;

    return (
      <li
        className={
          tone === 'error'
            ? 'flex flex-wrap items-center gap-2 text-rose-300'
            : 'flex flex-wrap items-center gap-2 text-amber-300'
        }
        key={`${issue.code}-${issue.message}`}
      >
        <span>{issue.message}</span>
        {stepId && onNavigateToStep ? (
          <button
            className="tm-focus-ring rounded-full border border-current px-2 py-0.5 text-xs"
            onClick={() => onNavigateToStep(stepId)}
            type="button"
          >
            Go to {getManualEntryStep(stepId).label}
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Notes</span>
        <textarea
          aria-label="Notes"
          className="tm-input min-h-28"
          {...register('notes')}
        />
      </label>
      <div className="tm-stat-card text-sm">
        <h3 className="font-semibold text-stone-100">Saved Merger rule</h3>
        <p className="tm-body-copy mt-2">
          {guaranteedMergerOffer === true
            ? 'Merger was guaranteed as an additional Prelude option.'
            : guaranteedMergerOffer === false
              ? 'Merger was not guaranteed as an additional Prelude option.'
              : 'Merger availability was not recorded; analytics will preserve this as unknown.'}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--tm-muted)' }}>
          Provenance: {mergerOfferRuleSource.replaceAll('_', ' ')}.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid content-start gap-3">
          <h3 className="tm-data-label">Player Summary</h3>
          {selectedPlayers.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
              No players selected yet.
            </p>
          ) : null}
          {selectedPlayers.map((player) => {
            const score = playerScores[player.id] ?? {};

            return (
              <article className="tm-stat-card" key={player.id}>
                <p className="font-semibold text-stone-100">{player.display_name}</p>
                <p className="tm-body-copy mt-2 text-sm">
                  Total: {score.totalPoints ?? '-'} | MC: {score.finalMegacredits ?? '-'}
                </p>
              </article>
            );
          })}
        </div>
        <div className="grid content-start gap-3">
          <div className="tm-stat-card">
            <h3 className="tm-data-label">Review Issues</h3>
            {review.issues.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-300">
                No blocking issues detected.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 text-sm text-stone-200">
                {blockingIssues.map((issue) => renderIssue(issue, 'error'))}
                {warnings.map((issue) => renderIssue(issue, 'warning'))}
              </ul>
            )}
          </div>
          <div className="tm-stat-card">
            <h3 className="tm-data-label">Optional Coverage</h3>
            <ul className="mt-3 grid gap-2 text-sm text-stone-200">
              <li>Card breakdowns: {review.coverage.playersWithCardBreakdown}</li>
              <li>Declared styles: {review.coverage.playersWithDeclaredStyle}</li>
              <li>Key-card entries: {review.coverage.playersWithKeyCards}</li>
              <li>Optional subscores: {review.coverage.playersWithOptionalSubscores}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
