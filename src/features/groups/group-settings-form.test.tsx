import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GroupSettingsForm } from './group-settings-form';
import { groupSettingsSchema } from '@/lib/validation/group-settings';

describe('groupSettingsSchema', () => {
  it('requires a group name and allows promo defaults', () => {
    const parsed = groupSettingsSchema.parse({
      groupName: 'Friday Mars',
      globalAnalyticsEnabled: true,
      defaultGuaranteedMergerOffer: true,
      defaultPromoSetSlugs: ['2021-promos'],
    });

    expect(parsed.groupName).toBe('Friday Mars');
    expect(parsed.defaultPromoSetSlugs).toEqual(['2021-promos']);
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
        initialValues={{
          groupName: 'Friday Mars',
          globalAnalyticsEnabled: false,
          defaultGuaranteedMergerOffer: true,
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
    await user.click(screen.getByLabelText(/2021 promo pack/i));
    await user.click(
      screen.getByRole('button', { name: /save group defaults/i }),
    );

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        groupName: 'Friday Terraformers',
        globalAnalyticsEnabled: true,
        defaultGuaranteedMergerOffer: true,
        defaultPromoSetSlugs: ['2021-promos'],
      }),
    );
  });
});
