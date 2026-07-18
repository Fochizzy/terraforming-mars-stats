import { z } from 'zod';

export const groupSettingsSchema = z.object({
  groupName: z.string().min(2),
  globalAnalyticsEnabled: z.boolean(),
  defaultPromoSetSlugs: z.array(z.string()).default([]),
});

export type GroupSettingsInput = z.input<typeof groupSettingsSchema>;

export const groupRenameSchema = z.object({
  groupId: z.string().uuid(),
  groupName: z.string().trim().min(2),
});

export type GroupRenameInput = z.input<typeof groupRenameSchema>;
