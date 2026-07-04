'use client';

import type {
  MapAwardOption,
  MapMilestoneOption,
} from '@/lib/db/reference-repo';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import type { UseFormRegister } from 'react-hook-form';

type MilestonesStepProps = {
  awardClaims: LogGameDraftInput['awardClaims'];
  awardOptions: MapAwardOption[];
  milestoneClaims: LogGameDraftInput['milestoneClaims'];
  milestoneOptions: MapMilestoneOption[];
  register: UseFormRegister<LogGameDraftInput>;
  selectedPlayers: Array<{
    id: string;
    display_name: string;
  }>;
};

export function MilestonesStep({
  awardClaims,
  awardOptions,
  milestoneClaims,
  milestoneOptions,
  register,
  selectedPlayers,
}: MilestonesStepProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-900/30 bg-black/25 p-4">
      <h2 className="font-serif text-xl font-semibold">
        Milestones and Awards
      </h2>
      <p className="text-sm text-stone-300">
        Record claimed milestones, funded awards, and who placed on each award.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
            Milestones
          </h3>
          {milestoneOptions.length === 0 ? (
            <p className="text-sm text-stone-400">
              No milestones are mapped to this board yet.
            </p>
          ) : (
            milestoneOptions.map((milestone) => {
              const claim = milestoneClaims[milestone.milestoneId];

              return (
                <article
                  className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4"
                  key={milestone.milestoneId}
                >
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      aria-label={`${milestone.milestoneName} Claimed`}
                      type="checkbox"
                      {...register(
                        `milestoneClaims.${milestone.milestoneId}.claimed` as const,
                      )}
                    />
                    {milestone.milestoneName}
                  </label>
                  {claim?.claimed ? (
                    <div className="mt-3 grid gap-2">
                      {selectedPlayers.map((player) => (
                        <label
                          className="flex items-center gap-3 text-sm"
                          key={player.id}
                        >
                          <input
                            aria-label={`${milestone.milestoneName} Winner ${player.display_name}`}
                            type="radio"
                            value={player.id}
                            {...register(
                              `milestoneClaims.${milestone.milestoneId}.winnerPlayerId` as const,
                            )}
                          />
                          {player.display_name}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
        <div className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
            Awards
          </h3>
          {awardOptions.length === 0 ? (
            <p className="text-sm text-stone-400">
              No awards are mapped to this board yet.
            </p>
          ) : (
            awardOptions.map((award) => {
              const claim = awardClaims[award.awardId];

              return (
                <article
                  className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4"
                  key={award.awardId}
                >
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      aria-label={`${award.awardName} Funded`}
                      type="checkbox"
                      {...register(`awardClaims.${award.awardId}.funded` as const)}
                    />
                    {award.awardName}
                  </label>
                  {claim?.funded ? (
                    <div className="mt-4 grid gap-4">
                      <label className="flex flex-col gap-2 text-sm">
                        <span className="font-semibold text-stone-200">
                          Funded By
                        </span>
                        <select
                          aria-label={`${award.awardName} Funded By`}
                          className="rounded-xl border border-stone-800 bg-black/30 px-4 py-3"
                          defaultValue=""
                          {...register(
                            `awardClaims.${award.awardId}.fundedByPlayerId` as const,
                          )}
                        >
                          <option value="">Select funder</option>
                          {selectedPlayers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.display_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid gap-2">
                        <p className="text-sm font-semibold text-stone-200">
                          First Place
                        </p>
                        {selectedPlayers.map((player) => (
                          <label
                            className="flex items-center gap-3 text-sm"
                            key={`first-${award.awardId}-${player.id}`}
                          >
                            <input
                              aria-label={`${award.awardName} First Place ${player.display_name}`}
                              type="checkbox"
                              value={player.id}
                              {...register(
                                `awardClaims.${award.awardId}.firstPlaceWinnerPlayerIds` as const,
                              )}
                            />
                            {player.display_name}
                          </label>
                        ))}
                      </div>
                      <div className="grid gap-2">
                        <p className="text-sm font-semibold text-stone-200">
                          Second Place
                        </p>
                        {selectedPlayers.map((player) => (
                          <label
                            className="flex items-center gap-3 text-sm"
                            key={`second-${award.awardId}-${player.id}`}
                          >
                            <input
                              aria-label={`${award.awardName} Second Place ${player.display_name}`}
                              type="checkbox"
                              value={player.id}
                              {...register(
                                `awardClaims.${award.awardId}.secondPlaceWinnerPlayerIds` as const,
                              )}
                            />
                            {player.display_name}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
