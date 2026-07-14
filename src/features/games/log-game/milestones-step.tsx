'use client';

import { ObjectiveInfoButton } from '@/components/ui/objective-info-button';
import { SelectChevron } from '@/components/ui/select-chevron';
import { StepHeading } from '@/components/ui/step-heading';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
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

const OBJECTIVE_LINK_CLASS =
  'text-left font-semibold text-stone-100 underline decoration-dotted underline-offset-2 transition hover:text-[rgb(221,161,93)]';

export function MilestonesStep({
  awardClaims,
  awardOptions,
  milestoneClaims,
  milestoneOptions,
  register,
  selectedPlayers,
}: MilestonesStepProps) {
  return (
    <section className="tm-panel flex flex-col gap-4">
      <StepHeading step="03" title="Milestones and Awards" />
      <p className="tm-body-copy text-sm">
        <GlossaryRichText>
          Record claimed milestones, funded awards, and who placed on each award.
        </GlossaryRichText>
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          <h3 className="tm-data-label">Milestones</h3>
          {milestoneOptions.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
              No milestones are mapped to this board yet.
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {milestoneOptions.map((milestone) => {
                const claim = milestoneClaims[milestone.milestoneId];

                return (
                  <article className="tm-stat-card" key={milestone.milestoneId}>
                    <div className="flex items-center gap-3 text-sm">
                      <input
                        aria-label={`${milestone.milestoneName} Claimed`}
                        type="checkbox"
                        {...register(
                          `milestoneClaims.${milestone.milestoneId}.claimed` as const,
                        )}
                      />
                      <ObjectiveInfoButton
                        className={OBJECTIVE_LINK_CLASS}
                        kind="milestone"
                        name={milestone.milestoneName}
                      />
                    </div>
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
              })}
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <h3 className="tm-data-label">Awards</h3>
          {awardOptions.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
              No awards are mapped to this board yet.
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {awardOptions.map((award) => {
                const claim = awardClaims[award.awardId];

                return (
                  <article className="tm-stat-card" key={award.awardId}>
                    <div className="flex items-center gap-3 text-sm">
                      <input
                        aria-label={`${award.awardName} Funded`}
                        type="checkbox"
                        {...register(`awardClaims.${award.awardId}.funded` as const)}
                      />
                      <ObjectiveInfoButton
                        className={OBJECTIVE_LINK_CLASS}
                        kind="award"
                        name={award.awardName}
                      />
                    </div>
                    {claim?.funded ? (
                      <div className="mt-4 grid gap-4">
                        <label className="relative flex flex-col gap-2 text-sm">
                          <span className="tm-data-label">Funded By</span>
                          <select
                            aria-label={`${award.awardName} Funded By`}
                            className="tm-input appearance-none pr-9"
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
                          <SelectChevron />
                        </label>
                        <div className="grid gap-2">
                          <p className="tm-data-label">First Place</p>
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
                          <p className="tm-data-label">Second Place</p>
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
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
