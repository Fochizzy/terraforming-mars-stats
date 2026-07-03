import { z } from 'zod';

export const logGameDraftSchema = z.object({
  groupId: z.string().uuid(),
  playedOn: z.string(),
  mapId: z.string(),
  playerCount: z.number().min(1).max(5),
  generationCount: z.number().min(1),
  expansionCodes: z.array(z.string()).default([]),
  promoSetSlugs: z.array(z.string()).default([]),
  selectedPlayerIds: z.array(z.string()).default([]),
});
