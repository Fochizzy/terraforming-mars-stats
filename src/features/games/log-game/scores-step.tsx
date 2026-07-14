'use client';

import { useEffect } from 'react';
import { StepHeading } from '@/components/ui/step-heading';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';

type ManualReviewScoreHighlight = ImportReviewJumpTarget & {
  playerId: string;
};

type ScoresStepProps = {
  manualReviewHighlight?: ManualReviewScoreHighlight | null;
  register: UseFormRegister<LogGameDraftInput>;
  selectedPlayers: Array<{
    id: string;
    display_name: string;
  }>;
};

function ScoreInput({
  highlighted,
  highlightKey,
  label,
  path,
  register,
}: {
  highlighted?: boolean;
  highlightKey?: string;
  label: string;
  path: Parameters<UseFormRegister<LogGameDraftInput>>[0];
  register: UseFormRegister<LogGameDraftInput>;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="tm-data-label">{label}</span>
      <input
        aria-label={label}
        className={`tm-input ${highlighted ? 'border-amber-300 bg-amber-100/10 ring-2 ring-amber-200' : ''}`}
        data-manual-review-highlight={highlighted ? 'true' : undefined}
        data-manual-review-key={highlightKey}
        inputMode="numeric"
        min={0}
        type="number"
        {...register(path, { valueAsNumber: true })}
      />
    </label>
  );
}

function formatManualReviewScoreFieldLabel(
  scoreField: ManualReviewScoreHighlight['scoreField'],
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

export function ScoresStep({
  manualReviewHighlight,
  register,
  selectedPlayers,
}: ScoresStepProps) {
  const highlightKey = manualReviewHighlight
    ? `${manualReviewHighlight.playerId}:${manualReviewHighlight.scoreField}`
    : null;

  useEffect(() => {
    if (!highlightKey) {
      return;
    }

    const highlightedInput = document.querySelector<HTMLInputElement>(
      `[data-manual-review-key="${highlightKey}"]`,
    );

    if (!highlightedInput) {
      return;
    }

    highlightedInput.focus();
    highlightedInput.scrollIntoView({ block: 'center' });
  }, [highlightKey]);

  return (
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="04" title="Final Scores" />
      {manualReviewHighlight ? (
        <div className="tm-banner-warning" role="status">
          <p>
            {manualReviewHighlight.itemLabel} was not read and still needs
            manual entry.
          </p>
          <p>
            Review {manualReviewHighlight.playerName}&apos;s{' '}
            {formatManualReviewScoreFieldLabel(
              manualReviewHighlight.scoreField,
            )}
            . {manualReviewHighlight.message}
          </p>
        </div>
      ) : null}
      <p className="tm-body-copy text-sm">
        <GlossaryRichText>
          Total card points are required; microbe, animal, and Jovian breakdowns stay optional.
        </GlossaryRichText>
      </p>
      <div className="grid gap-4">
        {selectedPlayers.map((player) => (
          <article className="tm-stat-card" key={player.id}>
            <p className="font-semibold text-stone-100">
              {player.display_name}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ScoreInput
                highlightKey={`${player.id}:citiesPoints`}
                label={`${player.display_name} Cities`}
                path={`playerScores.${player.id}.citiesPoints` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:greeneryPoints`}
                label={`${player.display_name} Greenery`}
                path={`playerScores.${player.id}.greeneryPoints` as const}
                register={register}
              />
              <ScoreInput
                highlighted={
                  manualReviewHighlight?.playerId === player.id &&
                  manualReviewHighlight.scoreField === 'cardPointsTotal'
                }
                highlightKey={`${player.id}:cardPointsTotal`}
                label={`${player.display_name} Total Card Points`}
                path={`playerScores.${player.id}.cardPointsTotal` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:cardPointsMicrobes`}
                label={`${player.display_name} Microbe Card Points`}
                path={`playerScores.${player.id}.cardPointsMicrobes` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:cardPointsAnimals`}
                label={`${player.display_name} Animal Card Points`}
                path={`playerScores.${player.id}.cardPointsAnimals` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:cardPointsJovian`}
                label={`${player.display_name} Jovian Points`}
                path={`playerScores.${player.id}.cardPointsJovian` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:trPoints`}
                label={`${player.display_name} Terraform Rating Points`}
                path={`playerScores.${player.id}.trPoints` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:milestonePoints`}
                label={`${player.display_name} Milestone Points`}
                path={`playerScores.${player.id}.milestonePoints` as const}
                register={register}
              />
              <ScoreInput
                highlighted={
                  manualReviewHighlight?.playerId === player.id &&
                  manualReviewHighlight.scoreField === 'awardPoints'
                }
                highlightKey={`${player.id}:awardPoints`}
                label={`${player.display_name} Award Points`}
                path={`playerScores.${player.id}.awardPoints` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:totalPoints`}
                label={`${player.display_name} Total Points`}
                path={`playerScores.${player.id}.totalPoints` as const}
                register={register}
              />
              <ScoreInput
                highlightKey={`${player.id}:finalMegacredits`}
                label={`${player.display_name} Final Megacredits`}
                path={`playerScores.${player.id}.finalMegacredits` as const}
                register={register}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
