import { z } from 'zod';

export const groupSettingsSchema = z.object({
  groupName: z.string().min(2),
  globalAnalyticsEnabled: z.boolean(),
  defaultGuaranteedMergerOffer: z.boolean(),
  defaultExpansionCodes: z.array(z.string()).default([]),
  defaultPromoSetSlugs: z.array(z.string()).default([]),
});

export type GroupSettingsInput = z.input<typeof groupSettingsSchema>;
