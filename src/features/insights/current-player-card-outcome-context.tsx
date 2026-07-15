'use client';

import { createContext, type ReactNode, useContext } from 'react';

type CurrentPlayerCardOutcome = {
  playerId: string | null;
  playerName: string | null;
};

const CurrentPlayerCardOutcomeContext =
  createContext<CurrentPlayerCardOutcome | null>(null);

export function CurrentPlayerCardOutcomeProvider({
  children,
  playerId,
  playerName,
}: CurrentPlayerCardOutcome & { children: ReactNode }) {
  return (
    <CurrentPlayerCardOutcomeContext.Provider value={{ playerId, playerName }}>
      {children}
    </CurrentPlayerCardOutcomeContext.Provider>
  );
}

export function useCurrentPlayerCardOutcome() {
  return useContext(CurrentPlayerCardOutcomeContext);
}
