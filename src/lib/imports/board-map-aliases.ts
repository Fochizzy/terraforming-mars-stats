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
  // Several milestones/awards below are shared across the newer maps (Terran,
  // Promoter, Land Specialist, Pioneer, Tradesman, Smith, Botanist, Edgedancer,
  // Incorporator). The map name carries the highest weight so it breaks ties
  // whenever it appears in the evidence.
  amazonis_planitia: [
    { term: 'amazonis planitia', aliases: ['amazonis', 'amazonis p'], weight: 5 },
    { term: 'colonizer', weight: 3 },
    { term: 'forester', weight: 3 },
    { term: 'minimalist', weight: 3 },
    { term: 'terran', weight: 3 },
    { term: 'tropicalist', weight: 3 },
    { term: 'curator', weight: 3 },
    { term: 'a. engineer', aliases: ['amazonis engineer'], weight: 3 },
    { term: 'promoter', weight: 3 },
    { term: 'tourist', weight: 3 },
    { term: 'a. zoologist', weight: 3 },
  ],
  arabia_terra: [
    { term: 'arabia terra', aliases: ['arabia'], weight: 5 },
    { term: 'economizer', weight: 3 },
    { term: 'pioneer', weight: 3 },
    { term: 'land specialist', weight: 3 },
    { term: 'martian', weight: 3 },
    { term: 'terran', weight: 3 },
    { term: 'cosmic settler', weight: 3 },
    { term: 'botanist', weight: 3 },
    { term: 'promoter', weight: 3 },
    { term: 'zoologist', weight: 3 },
    { term: 'a. manufacturer', weight: 3 },
  ],
  terra_cimmeria: [
    { term: 'terra cimmeria', aliases: ['t. cimmeria', 'cimmeria'], weight: 5 },
    { term: 't. collector', weight: 3 },
    { term: 'firestarter', weight: 3 },
    { term: 'terra pioneer', weight: 3 },
    { term: 'spacefarer', weight: 3 },
    { term: 'gambler', weight: 3 },
    { term: 'biologist', weight: 3 },
    { term: 'incorporator', weight: 3 },
    { term: 't. politician', weight: 3 },
    { term: 'urbanist', weight: 3 },
    { term: 'warmonger', weight: 3 },
  ],
  vastitas_borealis: [
    { term: 'vastitas borealis', aliases: ['vastitas'], weight: 5 },
    { term: 'v. electrician', weight: 3 },
    { term: 'smith', weight: 3 },
    { term: 'tradesman', weight: 3 },
    { term: 'irrigator', weight: 3 },
    { term: 'capitalist', weight: 3 },
    { term: 'forecaster', weight: 3 },
    { term: 'edgedancer', weight: 3 },
    { term: 'visionary', weight: 3 },
    { term: 'naturalist', weight: 3 },
    { term: 'voyager', weight: 3 },
  ],
  utopia_planitia: [
    { term: 'utopia planitia', aliases: ['utopia'], weight: 5 },
    { term: 'land specialist', weight: 3 },
    { term: 'pioneer', weight: 3 },
    { term: 'tradesman', weight: 3 },
    { term: 'smith', weight: 3 },
    { term: 'researcher', weight: 3 },
    { term: 'edgedancer', weight: 3 },
    { term: 'investor', weight: 3 },
    { term: 'botanist', weight: 3 },
    { term: 'incorporator', weight: 3 },
    { term: 'metropolist', weight: 3 },
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
