'use client';

import Link from 'next/link';
import { useEffect, type MouseEvent } from 'react';
import {
  LOG_GAME_ENTRY_METHODS,
  LOG_GAME_WORKFLOW_STATE_LABELS,
  type LogGameEntryMethod,
  type LogGameWorkflowStateKind,
} from './log-game-entry';

const UNSAVED_WORK_MESSAGE =
  'You have unsaved game-entry changes. Leave this method and discard them?';

export function EntryMethodSelector({
  currentMethod,
  groupName,
  hasUnsavedChanges,
  manualHref = '/log-game',
  workflowState,
}: {
  currentMethod: LogGameEntryMethod;
  groupName: string;
  hasUnsavedChanges: boolean;
  manualHref?: string;
  workflowState: LogGameWorkflowStateKind;
}) {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  function handleMethodNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    method: LogGameEntryMethod,
  ) {
    if (method === currentMethod) {
      event.preventDefault();
      return;
    }

    if (hasUnsavedChanges && !window.confirm(UNSAVED_WORK_MESSAGE)) {
      event.preventDefault();
    }
  }

  function handleUnsavedExit(event: MouseEvent<HTMLAnchorElement>) {
    if (hasUnsavedChanges && !window.confirm(UNSAVED_WORK_MESSAGE)) {
      event.preventDefault();
    }
  }

  return (
    <section
      aria-labelledby="entry-method-heading"
      className="tm-panel flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="tm-display-eyebrow text-[11px]">Log a Game</p>
          <h2 className="tm-panel-title mt-2 text-lg" id="entry-method-heading">
            Entry method
          </h2>
          <p className="tm-muted-copy mt-2 max-w-3xl text-sm">
            Manual Entry and Import Game share the same saved-draft, review, and
            finalization workflow.
          </p>
        </div>
        <Link
          className="tm-button-secondary tm-focus-ring min-h-11 shrink-0 px-4 py-2"
          href="/games"
          onClick={handleUnsavedExit}
        >
          Saved Games
        </Link>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="tm-data-label">Current group</dt>
          <dd className="mt-1 break-words text-stone-100">{groupName}</dd>
        </div>
        <div className="min-w-0">
          <dt className="tm-data-label">Workflow status</dt>
          <dd className="mt-1 text-stone-100">
            {LOG_GAME_WORKFLOW_STATE_LABELS[workflowState]}
          </dd>
        </div>
      </dl>

      <nav aria-label="Log a Game entry methods">
        <ul className="grid gap-3 sm:grid-cols-2">
          {LOG_GAME_ENTRY_METHODS.map((method) => {
            const active = method.id === currentMethod;
            const href = method.id === 'manual' ? manualHref : method.href;

            return (
              <li className="min-w-0" key={method.id}>
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'tm-focus-ring flex min-h-20 w-full min-w-0 flex-col justify-center rounded-2xl border px-4 py-3 transition',
                    active
                      ? 'border-orange-300/70 bg-orange-300/10 text-orange-50'
                      : 'border-stone-700 bg-stone-950/60 text-stone-100 hover:border-cyan-300/60',
                  ].join(' ')}
                  href={href}
                  onClick={(event) => handleMethodNavigation(event, method.id)}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                    <span>{method.label}</span>
                    {active ? (
                      <span className="rounded-full border border-current px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                        Current
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 text-sm text-stone-300">
                    {method.description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
