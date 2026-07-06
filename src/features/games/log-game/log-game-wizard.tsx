'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { startTransition, useEffect, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';
import { StatusBanner } from '@/components/ui/status-banner';
import { buildGameReview } from '@/features/games/finalize-game';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import {
  consumeImportReviewJumpState,
  type ImportReviewJumpTarget,
} from '@/lib/imports/import-review-jump-state';
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
import {
  filterCardOptions,
  filterCorporationOptions,
  filterPreludeOptions,
  normalizeSelectedExpansionCodes,
} from './reference-filters';

type GameSubmitResult = {
  status: 'success' | 'error';
  gameId?: string;
  message: string;
};

type ManualReviewScoreHighlight = ImportReviewJumpTarget & {
  playerId: string;
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
  const [manualReviewHighlight, setManualReviewHighlight] =
    useState<ManualReviewScoreHighlight | null>(null);
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
  const promoSetSlugs =
    useWatch({ control: form.control, name: 'promoSetSlugs' }) ?? [];
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
  useEffect(() => {
    if (!initialValues.gameId) {
      return;
    }

    const storedJumpState = consumeImportReviewJumpState(initialValues.gameId);

    if (!storedJumpState) {
      return;
    }

    const matchingPlayer = selectedPlayers.find(
      (player) =>
        normalizePlayerAlias(player.display_name) ===
        normalizePlayerAlias(storedJumpState.playerName),
    );

    if (!matchingPlayer) {
      return;
    }

    setManualReviewHighlight({
      itemLabel: storedJumpState.itemLabel,
      message: storedJumpState.message,
      playerId: matchingPlayer.id,
      playerName: matchingPlayer.display_name,
      scoreField: storedJumpState.scoreField,
    });
  }, [initialValues.gameId, selectedPlayers]);
  const normalizedExpansionCodes = normalizeSelectedExpansionCodes(expansionCodes);
  const visibleCorporations = filterCorporationOptions(
    corporationOptions,
    normalizedExpansionCodes,
    promoSetSlugs,
  );
  const visiblePreludes = filterPreludeOptions(
    preludeOptions,
    normalizedExpansionCodes,
    promoSetSlugs,
  );
  const visibleCards = filterCardOptions(
    cardOptions,
    normalizedExpansionCodes,
    promoSetSlugs,
  );
  const visibleMilestones = milestoneOptions.filter(
    (milestone) => milestone.mapId === currentMapId,
  );
  const visibleAwards = awardOptions.filter((award) => award.mapId === currentMapId);
  const review = buildGameReview({
    awardClaims,
    expansionCodes: normalizedExpansionCodes,
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
        corporationOptions={visibleCorporations}
        playerCount={playerCount}
        playerOptions={playerOptions}
        preludeOptions={visiblePreludes}
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
      <ScoresStep
        manualReviewHighlight={manualReviewHighlight}
        register={form.register}
        selectedPlayers={selectedPlayers}
      />
      <StyleStep
        cardOptions={visibleCards}
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
        <StatusBanner message={result.message} status={result.status} />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="tm-button-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={() => setSubmitMode('draft')}
          type="submit"
        >
          {isPending && submitMode === 'draft' ? 'Saving...' : 'Save Draft Setup'}
        </button>
        <button
          className="tm-button-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
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
