import { AppShell } from '@/components/layout/app-shell';
import { GroupSettingsForm } from '@/features/groups/group-settings-form';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { listCurrentUserGroups } from '@/lib/db/group-context-repo';
import { renameGroup } from '@/lib/db/group-settings-repo';
import {
  groupRenameSchema,
  type GroupRenameInput,
} from '@/lib/validation/group-settings';
import { revalidatePath } from 'next/cache';

export default async function GroupSettingsPage() {
  const context = await requireGroupContextOrRedirect();
  const groups = await listCurrentUserGroups();

  async function handleRenameGroup(values: GroupRenameInput) {
    'use server';

    const parsed = groupRenameSchema.parse(values);
    const memberships = await listCurrentUserGroups();

    if (!memberships.some((group) => group.groupId === parsed.groupId)) {
      throw new Error('You can only rename groups you belong to.');
    }

    await renameGroup({
      group_id: parsed.groupId,
      group_name: parsed.groupName,
    });
    revalidatePath('/group');
    revalidatePath('/group/settings');
    revalidatePath('/insights');
    revalidatePath('/profile');

    return {
      status: 'success' as const,
      message: 'Group renamed.',
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
        currentGroupId={context.groupId}
        groups={groups}
        onRename={handleRenameGroup}
      />
    </AppShell>
  );
}
