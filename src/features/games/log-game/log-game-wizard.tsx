'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { startTransition, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';
import { buildGameReview } from '@/features/games/finalize-game';
import type {
  CardOption,
  CorporationOption,
  ExpansionOption,
  MapAwardOption,
  MapMilestoneOption,
  MapOption,
  PreludeOption,
  PromoSetOption,
  StyleOption,
} from '@/lib/db/reference-repo';
import { logGameDraftSchema, type LogGameDraftInput } from '@/lib/validation/log-game';
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
  expansionOptions: ExpansionOption[];
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

export function LogGameWizard({
  awardOptions,
  cardOptions,
  corporationOptions,
  expansionOptions,
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
  const selectedPlayerIds =
    useWatch({
      control: form.control,
      name: 'selectedPlayerIds',
    }) ?? [];
  const currentMapId = useWatch({ control: form.control, name: 'mapId' });
  const playerCount =
    useWatch({ control: form.control, name: 'playerCount' }) ?? 0;
  const expansionCodes =
    useWatch({ control: form.control, name: 'expansionCodes' }) ?? [];
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
    expansionCodes,
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

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={form.handleSubmit((values) => {
        setIsPending(true);
        setResult(null);
        startTransition(async () => {
          try {
            const action =
              submitMode === 'finalize' ? onFinalizeGame : onSaveDraft;
            const nextResult = await action(values);

            if (nextResult.gameId) {
              form.setValue('gameId', nextResult.gameId);
            }

            setResult(nextResult);
          } catch (error) {
            setResult({
              status: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : submitMode === 'finalize'
                    ? 'Unable to finalize this game right now.'
                    : 'Unable to save this draft right now.',
            });
          } finally {
            setIsPending(false);
          }
        });
      })}
    >
      <SetupStep
        expansionOptions={expansionOptions}
        mapOptions={mapOptions}
        promoSetOptions={promoSetOptions}
        register={form.register}
      />
      <PlayersStep
        corporationOptions={corporationOptions}
        playerCount={playerCount}
        playerOptions={playerOptions}
        preludeOptions={preludeOptions}
        register={form.register}
        selectedPlayerIds={selectedPlayerIds}
        setValue={form.setValue}
      />
      <MilestonesStep
        awardClaims={awardClaims}
        awardOptions={visibleAwards}
        milestoneClaims={milestoneClaims}
        milestoneOptions={visibleMilestones}
        register={form.register}
        selectedPlayers={selectedPlayers}
      />
      <ScoresStep register={form.register} selectedPlayers={selectedPlayers} />
      <StyleStep
        cardOptions={cardOptions}
        register={form.register}
        selectedPlayers={selectedPlayers}
        styleOptions={styleOptions}
      />
      <ReviewStep
        playerScores={playerScores}
        register={form.register}
        review={review}
        selectedPlayers={selectedPlayers}
      />
      {result ? (
        <p
          className={
            result.status === 'success'
              ? 'text-sm text-emerald-300'
              : 'text-sm text-rose-300'
          }
        >
          {result.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={() => setSubmitMode('draft')}
          type="submit"
        >
          {isPending && submitMode === 'draft' ? 'Saving...' : 'Save Draft Setup'}
        </button>
        <button
          className="rounded-full border border-cyan-300/60 px-5 py-3 font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || hasBlockingIssues}
          onClick={() => setSubmitMode('finalize')}
          type="submit"
        >
          {isPending && submitMode === 'finalize'
            ? 'Finalizing...'
            : 'Finalize Game'}
        </button>
      </div>
    </form>
  );
}
