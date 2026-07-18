'use client';

import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';

type ScoresStepProps = {
  register: UseFormRegister<LogGameDraftInput>;
  selectedPlayers: Array<{
    id: string;
    display_name: string;
  }>;
};

function ScoreInput({
  label,
  path,
  register,
}: {
  label: string;
  path: Parameters<UseFormRegister<LogGameDraftInput>>[0];
  register: UseFormRegister<LogGameDraftInput>;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="tm-data-label">{label}</span>
      <input
        aria-label={label}
        className="tm-input"
        inputMode="numeric"
        min={0}
        type="number"
        {...register(path, { valueAsNumber: true })}
      />
    </label>
  );
}

export function ScoresStep({ register, selectedPlayers }: ScoresStepProps) {
  return (
    <div className="grid gap-4">
      {selectedPlayers.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          Add players on the Players &amp; Corporations step to enter scores.
        </p>
      ) : null}
      {selectedPlayers.map((player) => (
        <article className="tm-stat-card" key={player.id}>
          <h3 className="font-serif text-lg font-semibold">
            {player.display_name}
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ScoreInput
              label={`${player.display_name} Cities`}
              path={`playerScores.${player.id}.citiesPoints` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Greenery`}
              path={`playerScores.${player.id}.greeneryPoints` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Total Card Points`}
              path={`playerScores.${player.id}.cardPointsTotal` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Microbe Card Points`}
              path={`playerScores.${player.id}.cardPointsMicrobes` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Animal Card Points`}
              path={`playerScores.${player.id}.cardPointsAnimals` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Jovian Points`}
              path={`playerScores.${player.id}.cardPointsJovian` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Terraform Rating Points`}
              path={`playerScores.${player.id}.trPoints` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Milestone Points`}
              path={`playerScores.${player.id}.milestonePoints` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Award Points`}
              path={`playerScores.${player.id}.awardPoints` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Total Points`}
              path={`playerScores.${player.id}.totalPoints` as const}
              register={register}
            />
            <ScoreInput
              label={`${player.display_name} Final Megacredits`}
              path={`playerScores.${player.id}.finalMegacredits` as const}
              register={register}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
