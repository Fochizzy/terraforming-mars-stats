import { AppShell } from '@/components/layout/app-shell';
import { GroupSettingsForm } from '@/features/groups/group-settings-form';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings, saveGroupSettings } from '@/lib/db/group-settings-repo';
import { listExpansions, listPromoSets } from '@/lib/db/reference-repo';
import {
  groupSettingsSchema,
  type GroupSettingsInput,
} from '@/lib/validation/group-settings';
import { revalidatePath } from 'next/cache';
import { normalizeSelectedExpansionCodes } from '@/features/games/log-game/reference-filters';

export default async function GroupSettingsPage() {
  const context = await requireGroupContextOrRedirect();
  const [settings, expansionOptions, promoSetOptions] = await Promise.all([
    getGroupSettings(context.groupId),
    listExpansions(),
    listPromoSets(),
  ]);

  async function handleSaveGroupSettings(values: GroupSettingsInput) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const parsed = groupSettingsSchema.parse(values);
    await saveGroupSettings({
      group_id: activeContext.groupId,
      group_name: parsed.groupName,
      global_analytics_enabled: parsed.globalAnalyticsEnabled,
      default_expansion_codes: parsed.defaultExpansionCodes,
      default_promo_set_slugs: parsed.defaultPromoSetSlugs,
    });
    revalidatePath('/group');
    revalidatePath('/group/settings');
    revalidatePath('/log-game');

    return {
      status: 'success' as const,
      message: 'Group defaults saved for future games.',
    };
  }

  return (
    <AppShell
      headerActions={
        <GroupSwitcher
          currentGroupId={context.groupId}
          returnPath="/group/settings"
        />
      }
      title="Group Settings"
    >
      <GroupSettingsForm
        initialValues={{
          groupName: settings.groupName,
          globalAnalyticsEnabled: settings.globalAnalyticsEnabled,
          defaultExpansionCodes: normalizeSelectedExpansionCodes(
            settings.defaultExpansionCodes,
          ),
          defaultPromoSetSlugs: settings.defaultPromoSetSlugs,
        }}
        expansionOptions={expansionOptions}
        onSave={handleSaveGroupSettings}
        promoSetOptions={promoSetOptions}
      />
    </AppShell>
  );
}
