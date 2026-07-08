import type { SupportedBoardMapId } from './board-space-maps';

export type BoardMapAliasEntry = {
  aliases?: string[];
  term: string;
  weight: number;
};

export const boardMapAliasDictionary: Record<
  SupportedBoardMapId,
  BoardMapAliasEntry[]
> = {
  tharsis: [
    { term: 'tharsis', weight: 5 },
    { term: 'noctis city', aliases: ['noctis'], weight: 4 },
    { term: 'banker', weight: 3 },
    { term: 'scientist', weight: 3 },
    { term: 'thermalist', weight: 3 },
    { term: 'miner', weight: 3 },
    { term: 'landlord', weight: 3 },
    { term: 'mayor', weight: 3 },
    { term: 'gardener', weight: 3 },
    { term: 'builder', weight: 3 },
    { term: 'planner', weight: 3 },
    { term: 'terraformer', weight: 3 },
  ],
  hellas: [
    { term: 'hellas', weight: 5 },
    { term: 'cultivator', weight: 3 },
    { term: 'magnate', weight: 3 },
    { term: 'space baron', weight: 3 },
    { term: 'excentric', aliases: ['eccentric'], weight: 3 },
    { term: 'contractor', weight: 3 },
    { term: 'diversifier', weight: 3 },
    { term: 'tactician', weight: 3 },
    { term: 'polar explorer', weight: 3 },
    { term: 'energizer', weight: 3 },
    { term: 'rim settler', weight: 3 },
  ],
  elysium: [
    { term: 'elysium', weight: 5 },
    { term: 'estate dealer', weight: 3 },
    { term: 'benefactor', weight: 3 },
    { term: 'celebrity', weight: 3 },
    { term: 'industrialist', weight: 3 },
    { term: 'desert settler', weight: 3 },
    { term: 'generalist', weight: 3 },
    { term: 'specialist', weight: 3 },
    { term: 'ecologist', weight: 3 },
    { term: 'tycoon', weight: 3 },
    { term: 'legend', weight: 3 },
  ],
};

export function expandBoardMapAliasEntry(input: BoardMapAliasEntry) {
  const aliases = new Set([input.term, ...(input.aliases ?? [])]);

  for (const alias of [...aliases]) {
    if (!alias.includes(' ')) {
      continue;
    }

    aliases.add(alias.replace(/\s+/g, ''));
  }

  return [...aliases].map((term) => ({
    term,
    weight: input.weight,
  }));
}
