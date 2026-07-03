import { describe, expect, it } from 'vitest';
import { groupSettingsSchema } from '@/lib/validation/group-settings';

describe('groupSettingsSchema', () => {
  it('requires a group name and allows promo and expansion defaults', () => {
    const parsed = groupSettingsSchema.parse({
      groupName: 'Friday Mars',
      globalAnalyticsEnabled: true,
      defaultExpansionCodes: ['base', 'prelude', 'colonies'],
      defaultPromoSetSlugs: ['2021-promos'],
    });

    expect(parsed.groupName).toBe('Friday Mars');
    expect(parsed.defaultExpansionCodes).toHaveLength(3);
  });
});
