'use client';

import { MilestonesStep } from './milestones-step';
import { PlayersStep } from './players-step';
import { ReviewStep } from './review-step';
import { ScoresStep } from './scores-step';
import { SetupStep } from './setup-step';
import { StyleStep } from './style-step';

export function LogGameWizard() {
  return (
    <div className="flex flex-col gap-8">
      <SetupStep />
      <PlayersStep />
      <MilestonesStep />
      <ScoresStep />
      <StyleStep />
      <ReviewStep />
    </div>
  );
}
