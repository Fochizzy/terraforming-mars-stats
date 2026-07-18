'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { startTransition, useEffect, useRef, useState } from 'react';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';
import { StepHeading } from '@/components/ui/step-heading';
import { buildGameReview } from '@/features/games/finalize-game';
import type {
  CardOption,
  CorporationOption,
  MapAwardOption,
  MapMilestoneOption,
  MapOption,
  PreludeOption,
  PromoSetOption,
  StyleOption,
} from '@/lib/db/reference-repo';
import { logGameDraftSchema, type LogGameDraftInput } from '@/lib/validation/log-game';
import { EntryMethodSelector } from './entry-method-selector';
import {
  manualEntryHref,
  type LogGameWorkflowStateKind,
} from './log-game-entry';
import {
  MANUAL_ENTRY_STEPS,
  getAdjacentManualEntryStepId,
  getManualEntryStep,
  getManualEntryStepIndex,
  resolveManualEntryStepErrors,
  resolveManualEntryStepForFieldPath,
  type ManualEntryStepId,
} from './manual-entry-steps';
import { ManualEntryStepNavigation } from './manual-entry-step-navigation';
import { MilestonesStep } from './milestones-step';
import { PlayersStep } from './players-step';
import { ReviewStep } from './review-step';
import { ScoresStep } from './scores-step';
import { SetupStep } from './setup-step';
import { StyleStep } from './style-step';

type GameSubmitResult = {
  status: 'success' | 'error';
  gameId?: string;
  message: string;
};

type LogGameWizardProps = {
  awardOptions: MapAwardOption[];
  cardOptions: CardOption[];
  corporationOptions: CorporationOption[];
  groupName: string;
  initialValues: LogGameDraftInput;
  mapOptions: MapOption[];
  milestoneOptions: MapMilestoneOption[];
  onFinalizeGame: (values: LogGameDraftInput) => Promise<GameSubmitResult>;
  onSaveDraft: (values: LogGameDraftInput) => Promise<GameSubmitResult>;
  playerOptions: Array<{
    id: string;
    display_name: string;
  }>;
  preludeOptions: PreludeOption[];
  promoSetOptions: PromoSetOption[];
  styleOptions: StyleOption[];
};

function resolveSchemaErrorStepIds(
  errors: FieldErrors<LogGameDraftInput>,
): ManualEntryStepId[] {
  const erroredSteps = new Set<ManualEntryStepId>();

  for (const fieldName of Object.keys(errors)) {
    const stepId = resolveManualEntryStepForFieldPath(fieldName);

    if (stepId) {
      erroredSteps.add(stepId);
    }
  }

  return MANUAL_ENTRY_STEPS.filter((step) => erroredSteps.has(step.id)).map(
    (step) => step.id,
  );
}

function formatLastSavedTime(lastSavedAt: Date) {
  return lastSavedAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function LogGameWizard({
  awardOptions,
  cardOptions,
  corporationOptions,
  groupName,
  initialValues,
  mapOptions,
  milestoneOptions,
  onFinalizeGame,
  onSaveDraft,
  playerOptions,
  preludeOptions,
  promoSetOptions,
  styleOptions,
}: LogGameWizardProps) {
  const form = useForm<LogGameDraftInput>({
    resolver: zodResolver(logGameDraftSchema) as Resolver<LogGameDraftInput>,
    defaultValues: initialValues,
  });
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const [submitMode, setSubmitMode] = useState<'draft' | 'finalize'>('draft');
  // The clicked button chooses the server action through this ref so the
  // submit handler never races the `submitMode` state flush; the state copy
  // only drives labels and status text.
  const submitModeRef = useRef<'draft' | 'finalize'>('draft');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isResumedDraft = Boolean(initialValues.gameId);
  const [activeStepId, setActiveStepId] = useState<ManualEntryStepId>('setup');
  // A resumed draft has been through every section before, so its steps start
  // visited and any attributed validation state is immediately visible. A new
  // game starts quiet and marks steps visited as the user reaches them.
  const [visitedStepIds, setVisitedStepIds] = useState<
    ReadonlySet<ManualEntryStepId>
  >(() =>
    isResumedDraft
      ? new Set(MANUAL_ENTRY_STEPS.map((step) => step.id))
      : new Set<ManualEntryStepId>(['setup']),
  );
  const focusStepIdRef = useRef<ManualEntryStepId | null>(null);
  const currentGameId = useWatch({ control: form.control, name: 'gameId' });
  const selectedPlayerIds =
    useWatch({
      control: form.control,
      name: 'selectedPlayerIds',
    }) ?? [];
  const currentMapId = useWatch({ control: form.control, name: 'mapId' });
  const playerCount =
    useWatch({ control: form.control, name: 'playerCount' }) ?? 0;
  const milestoneClaims =
    useWatch({ control: form.control, name: 'milestoneClaims' }) ?? {};
  const awardClaims =
    useWatch({ control: form.control, name: 'awardClaims' }) ?? {};
  const playerScores =
    useWatch({ control: form.control, name: 'playerScores' }) ?? {};
  const playerSelections =
    useWatch({ control: form.control, name: 'playerSelections' }) ?? {};
  const playerStyles =
    useWatch({ control: form.control, name: 'playerStyles' }) ?? {};
  const guaranteedMergerOffer = useWatch({
    control: form.control,
    name: 'guaranteedMergerOffer',
  });
  const mergerOfferRuleSource = useWatch({
    control: form.control,
    name: 'mergerOfferRuleSource',
  });
  const selectedPlayers = selectedPlayerIds
    .map(
      (playerId) =>
        playerOptions.find((player) => player.id === playerId) ?? {
          id: playerId,
          display_name: playerId,
        },
    );
  const visibleMilestones = milestoneOptions.filter(
    (milestone) => milestone.mapId === currentMapId,
  );
  const visibleAwards = awardOptions.filter((award) => award.mapId === currentMapId);
  const review = buildGameReview({
    awardClaims,
    gameId: form.getValues('gameId'),
    mapAwardIds: visibleAwards.map((award) => award.awardId),
    mapMilestoneIds: visibleMilestones.map((milestone) => milestone.milestoneId),
    milestoneClaims,
    notes: form.getValues('notes'),
    playerCount,
    playerScores,
    playerSelections,
    playerStyles,
    selectedPlayerIds,
  });
  const hasBlockingIssues = review.issues.some(
    (issue) => issue.severity === 'error',
  );
  const stepErrorCounts = resolveManualEntryStepErrors(review);
  const schemaErrorStepIds = resolveSchemaErrorStepIds(form.formState.errors);
  const isDirty = form.formState.isDirty;
  const activeStep = getManualEntryStep(activeStepId);
  const activeStepIndex = getManualEntryStepIndex(activeStepId);
  const previousStepId = getAdjacentManualEntryStepId(activeStepId, 'previous');
  const nextStepId = getAdjacentManualEntryStepId(activeStepId, 'next');
  let workflowState: LogGameWorkflowStateKind = currentGameId
    ? 'editing_manual_draft'
    : 'creating_manual_draft';

  if (isPending) {
    workflowState = submitMode === 'finalize' ? 'finalizing' : 'saving';
  } else if (!isDirty && result?.status === 'success') {
    workflowState = submitMode === 'finalize' ? 'finalized' : 'saved';
  } else if (result?.status === 'error') {
    workflowState =
      submitMode === 'finalize' ? 'finalization_failed' : 'save_failed';
  }

  function goToStep(stepId: ManualEntryStepId) {
    if (stepId === activeStepId) {
      return;
    }

    focusStepIdRef.current = stepId;
    setVisitedStepIds((previous) =>
      previous.has(stepId)
        ? previous
        : new Set<ManualEntryStepId>([...previous, stepId]),
    );
    setActiveStepId(stepId);
  }

  useEffect(() => {
    if (focusStepIdRef.current !== activeStepId) {
      return;
    }

    focusStepIdRef.current = null;
    document
      .getElementById(getManualEntryStep(activeStepId).headingId)
      ?.focus();
  }, [activeStepId]);

  function handleInvalidSubmit(errors: FieldErrors<LogGameDraftInput>) {
    const [firstErrorStepId] = resolveSchemaErrorStepIds(errors);

    // React Hook Form focuses the first invalid mounted field itself. When the
    // invalid field lives on another step, open that step so the error is
    // visible instead of failing silently against an unmounted input.
    if (firstErrorStepId && firstErrorStepId !== activeStepId) {
      goToStep(firstErrorStepId);
    }
  }

  const saveStatusText = isPending
    ? submitMode === 'finalize'
      ? 'Finalizing game…'
      : 'Saving draft…'
    : result?.status === 'error'
      ? submitMode === 'finalize'
        ? 'Finalization failed — your entries are still here.'
        : 'Save failed — your entries are still here.'
      : isDirty
        ? 'Unsaved changes.'
        : result?.status === 'success'
          ? submitMode === 'finalize'
            ? 'Game finalized.'
            : 'All changes saved.'
          : isResumedDraft
            ? 'No changes since the last save.'
            : 'Not saved yet.';
  const lastSavedText =
    !isPending && lastSavedAt ? ` Last saved ${formatLastSavedTime(lastSavedAt)}.` : '';

  return (
    <form
      aria-busy={isPending}
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit((values) => {
        const activeSubmitMode = submitModeRef.current;

        setIsPending(true);
        setResult(null);
        startTransition(async () => {
          try {
            const action =
              activeSubmitMode === 'finalize' ? onFinalizeGame : onSaveDraft;
            const nextResult = await action(values);

            if (nextResult.status === 'success') {
              form.reset({
                ...values,
                gameId: nextResult.gameId ?? values.gameId,
              });
              setLastSavedAt(new Date());
            } else if (nextResult.gameId) {
              form.setValue('gameId', nextResult.gameId);
            }

            setResult(nextResult);
          } catch (error) {
            setResult({
              status: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : activeSubmitMode === 'finalize'
                    ? 'Unable to finalize this game right now.'
                    : 'Unable to save this draft right now.',
            });
          } finally {
            setIsPending(false);
          }
        });
      }, handleInvalidSubmit)}
    >
      <EntryMethodSelector
        currentMethod="manual"
        groupName={groupName}
        hasUnsavedChanges={isDirty}
        manualHref={manualEntryHref(currentGameId)}
        workflowState={workflowState}
      />
      <section
        aria-label="Manual entry progress"
        className="tm-panel flex flex-col gap-4"
      >
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="tm-data-label">Draft</dt>
            <dd className="mt-1 break-words text-stone-100">
              {currentGameId
                ? `Saved draft ${currentGameId.slice(0, 8)}`
                : 'New manual game — not saved yet'}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="tm-data-label">Save status</dt>
            <dd className="mt-1 text-stone-100">
              <span>{saveStatusText}</span>
              {lastSavedText ? <span>{lastSavedText}</span> : null}
            </dd>
          </div>
        </dl>
        <ManualEntryStepNavigation
          activeStepId={activeStepId}
          errorCounts={stepErrorCounts}
          onSelectStep={goToStep}
          visitedStepIds={visitedStepIds}
        />
      </section>
      <section
        aria-labelledby={activeStep.headingId}
        className="tm-panel flex flex-col gap-4"
      >
        <StepHeading
          headingId={activeStep.headingId}
          size="lg"
          step={String(activeStepIndex + 1).padStart(2, '0')}
          title={activeStep.label}
        />
        <p className="tm-body-copy text-sm">{activeStep.description}</p>
        {activeStepId === 'setup' ? (
          <SetupStep
            guaranteedMergerOffer={guaranteedMergerOffer}
            mapOptions={mapOptions}
            mergerOfferRuleSource={mergerOfferRuleSource}
            promoSetOptions={promoSetOptions}
            register={form.register}
            setValue={form.setValue}
          />
        ) : null}
        {activeStepId === 'players' ? (
          <PlayersStep
            corporationOptions={corporationOptions}
            playerCount={playerCount}
            playerOptions={playerOptions}
            preludeOptions={preludeOptions}
            register={form.register}
            selectedPlayerIds={selectedPlayerIds}
            setValue={form.setValue}
          />
        ) : null}
        {activeStepId === 'milestones' ? (
          <MilestonesStep
            awardClaims={awardClaims}
            awardOptions={visibleAwards}
            milestoneClaims={milestoneClaims}
            milestoneOptions={visibleMilestones}
            register={form.register}
            selectedPlayers={selectedPlayers}
          />
        ) : null}
        {activeStepId === 'scores' ? (
          <ScoresStep register={form.register} selectedPlayers={selectedPlayers} />
        ) : null}
        {activeStepId === 'details' ? (
          <StyleStep
            cardOptions={cardOptions}
            register={form.register}
            selectedPlayers={selectedPlayers}
            styleOptions={styleOptions}
          />
        ) : null}
        {activeStepId === 'review' ? (
          <ReviewStep
            guaranteedMergerOffer={guaranteedMergerOffer}
            mergerOfferRuleSource={mergerOfferRuleSource}
            onNavigateToStep={goToStep}
            playerScores={playerScores}
            register={form.register}
            review={review}
            selectedPlayers={selectedPlayers}
          />
        ) : null}
      </section>
      {schemaErrorStepIds.length > 0 ? (
        <div
          className="rounded-2xl border border-rose-400/50 bg-rose-950/30 p-4 text-sm text-rose-100"
          role="alert"
        >
          <p className="font-semibold">
            Some entries need attention before this game can be saved:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {schemaErrorStepIds.map((stepId) => (
              <li key={stepId}>
                <button
                  className="tm-focus-ring rounded-full border border-rose-400/60 px-3 py-1"
                  onClick={() => goToStep(stepId)}
                  type="button"
                >
                  {getManualEntryStep(stepId).label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result ? (
        <p
          aria-live={result.status === 'success' ? 'polite' : 'assertive'}
          className={
            result.status === 'success'
              ? 'text-sm text-emerald-300'
              : 'text-sm text-rose-300'
          }
          role={result.status === 'success' ? 'status' : 'alert'}
        >
          {result.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {previousStepId ? (
            <button
              className="tm-button-secondary tm-focus-ring min-h-11 w-full px-5 py-3 sm:w-auto"
              onClick={() => goToStep(previousStepId)}
              type="button"
            >
              Back
              <span className="sr-only">
                : {getManualEntryStep(previousStepId).label}
              </span>
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="tm-button-secondary tm-focus-ring min-h-11 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() => {
              submitModeRef.current = 'draft';
              setSubmitMode('draft');
            }}
            type="submit"
          >
            {isPending && submitMode === 'draft' ? 'Saving...' : 'Save Draft'}
          </button>
          {nextStepId ? (
            <button
              className="tm-button-primary tm-focus-ring min-h-11 px-5 py-3"
              onClick={() => goToStep(nextStepId)}
              type="button"
            >
              Continue
              <span className="sr-only">
                : {getManualEntryStep(nextStepId).label}
              </span>
            </button>
          ) : (
            <button
              className="tm-button-primary tm-focus-ring min-h-11 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending || hasBlockingIssues}
              onClick={() => {
                submitModeRef.current = 'finalize';
                setSubmitMode('finalize');
              }}
              type="submit"
            >
              {isPending && submitMode === 'finalize'
                ? 'Finalizing...'
                : 'Finalize Game'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
