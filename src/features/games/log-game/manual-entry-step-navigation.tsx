'use client';

import { useEffect, useRef } from 'react';
import {
  MANUAL_ENTRY_STEPS,
  MANUAL_ENTRY_STEP_COUNT,
  getManualEntryStep,
  getManualEntryStepIndex,
  resolveManualEntryStepStatus,
  type ManualEntryStepErrorCounts,
  type ManualEntryStepId,
} from './manual-entry-steps';

function statusText(status: 'completed' | 'error', errorCount: number) {
  if (status === 'completed') {
    return 'completed';
  }

  return errorCount === 1
    ? 'has 1 validation issue'
    : `has ${errorCount} validation issues`;
}

/**
 * Responsive progress navigation for the manual-entry wizard. Steps are
 * buttons because selecting one changes local wizard state, not the URL; the
 * supported `gameId` URL contract is untouched. Revisiting any step is always
 * allowed, matching the existing single-page form where every section was
 * reachable at all times.
 */
export function ManualEntryStepNavigation({
  activeStepId,
  errorCounts,
  onSelectStep,
  visitedStepIds,
}: {
  activeStepId: ManualEntryStepId;
  errorCounts: ManualEntryStepErrorCounts;
  onSelectStep: (stepId: ManualEntryStepId) => void;
  visitedStepIds: ReadonlySet<ManualEntryStepId>;
}) {
  const activeStep = getManualEntryStep(activeStepId);
  const activeIndex = getManualEntryStepIndex(activeStepId);
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const activeButton = listRef.current?.querySelector<HTMLButtonElement>(
      '[aria-current="step"]',
    );

    // Keep the active step visible when the list scrolls horizontally at
    // narrow widths. Guarded because jsdom does not implement scrollIntoView.
    if (activeButton && typeof activeButton.scrollIntoView === 'function') {
      activeButton.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeStepId]);

  return (
    <nav aria-label="Manual entry steps" className="flex min-w-0 flex-col gap-2">
      <p className="tm-data-label" data-testid="manual-entry-step-counter">
        Step {activeIndex + 1} of {MANUAL_ENTRY_STEP_COUNT}
        <span className="sr-only">: {activeStep.label}</span>
      </p>
      <ol
        className="flex min-w-0 gap-2 overflow-x-auto pb-1"
        ref={listRef}
      >
        {MANUAL_ENTRY_STEPS.map((step, index) => {
          const status = resolveManualEntryStepStatus({
            activeStepId,
            errorCounts,
            stepId: step.id,
            visitedStepIds,
          });
          const isCurrent = status === 'current';
          const indicator =
            status === 'completed' ? '✓' : status === 'error' ? '!' : index + 1;

          return (
            <li className="min-w-0 shrink-0" key={step.id}>
              <button
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'tm-focus-ring flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-sm transition sm:px-4',
                  isCurrent
                    ? 'border-orange-300/70 bg-orange-300/10 font-semibold text-orange-50'
                    : status === 'error'
                      ? 'border-rose-400/60 bg-rose-950/30 text-rose-100'
                      : status === 'completed'
                        ? 'border-emerald-400/40 bg-emerald-950/20 text-emerald-100'
                        : 'border-stone-700 bg-stone-950/60 text-stone-200 hover:border-cyan-300/60',
                ].join(' ')}
                onClick={() => onSelectStep(step.id)}
                type="button"
              >
                <span
                  aria-hidden
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                    isCurrent
                      ? 'border-orange-300/70'
                      : status === 'error'
                        ? 'border-rose-400/60'
                        : status === 'completed'
                          ? 'border-emerald-400/50'
                          : 'border-stone-600',
                  ].join(' ')}
                >
                  {indicator}
                </span>
                <span aria-hidden className="whitespace-nowrap xl:hidden">
                  {step.shortLabel}
                </span>
                <span className="sr-only xl:not-sr-only xl:whitespace-nowrap">
                  {step.label}
                </span>
                {status === 'completed' || status === 'error' ? (
                  <span className="sr-only">
                    , {statusText(status, errorCounts[step.id])}
                  </span>
                ) : null}
                {status === 'error' ? (
                  <span
                    aria-hidden
                    className="rounded-full border border-rose-400/60 px-1.5 text-xs"
                  >
                    {errorCounts[step.id]}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
