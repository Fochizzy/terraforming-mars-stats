'use client';

import { PlayersStep } from './players-step';
import { SetupStep } from './setup-step';

export function LogGameWizard() {
  return (
    <div className="flex flex-col gap-8">
      <SetupStep />
      <PlayersStep />
    </div>
  );
}
