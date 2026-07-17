import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GroupSettingsForm } from './group-settings-form';
import { groupSettingsSchema } from '@/lib/validation/group-settings';

describe('groupSettingsSchema', () => {
  it('requires a group name and allows promo and expansion defaults', () => {
    const parsed = groupSettingsSchema.parse({
      groupName: 'Friday Mars',
      globalAnalyticsEnabled: true,
      defaultGuaranteedMergerOffer: true,
      defaultExpansionCodes: ['base', 'prelude', 'colonies'],
      defaultPromoSetSlugs: ['2021-promos'],
    });

    expect(parsed.groupName).toBe('Friday Mars');
    expect(parsed.defaultExpansionCodes).toHaveLength(3);
  });
});

describe('GroupSettingsForm', () => {
  it('submits the selected defaults and analytics preference', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Saved.',
    });

    render(
      <GroupSettingsForm
        expansionOptions={[
          { id: 'e1', code: 'base', name: 'Base Game' },
          { id: 'e2', code: 'prelude', name: 'Prelude' },
          { id: 'e3', code: 'colonies', name: 'Colonies' },
        ]}
        initialValues={{
          groupName: 'Friday Mars',
          globalAnalyticsEnabled: false,
          defaultGuaranteedMergerOffer: true,
          defaultExpansionCodes: ['base', 'prelude'],
          defaultPromoSetSlugs: [],
        }}
        onSave={onSave}
        promoSetOptions={[
          {
            id: 'promo-2021',
            slug: '2021-promos',
            displayName: '2021 Promo Pack',
            editionLabel: '2021 Promo Pack',
            promoYear: 2021,
          },
        ]}
      />,
    );

    await user.clear(screen.getByLabelText(/group name/i));
    await user.type(screen.getByLabelText(/group name/i), 'Friday Terraformers');
    await user.click(screen.getByLabelText(/contribute anonymous aggregate analytics/i));
    await user.click(screen.getByLabelText(/colonies/i));
    await user.click(screen.getByLabelText(/2021 promo pack/i));
    await user.click(
      screen.getByRole('button', { name: /save group defaults/i }),
    );

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        groupName: 'Friday Terraformers',
        globalAnalyticsEnabled: true,
        defaultGuaranteedMergerOffer: true,
        defaultExpansionCodes: ['base', 'prelude', 'colonies'],
        defaultPromoSetSlugs: ['2021-promos'],
      }),
    );
  });
});
