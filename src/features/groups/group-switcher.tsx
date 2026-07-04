import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  listCurrentUserGroups,
  requireCurrentGroupContext,
} from '@/lib/db/group-context-repo';
import { setCurrentUserLastActiveGroup } from '@/lib/db/user-profile-repo';

export async function GroupSwitcher({
  currentGroupId,
  returnPath,
}: {
  currentGroupId: string;
  returnPath: string;
}) {
  const groups = await listCurrentUserGroups();

  async function handleSwitch(formData: FormData) {
    'use server';

    const context = await requireCurrentGroupContext();
    const groupId = z.string().uuid().parse(formData.get('groupId'));

    await setCurrentUserLastActiveGroup({
      groupId,
      userId: context.userId,
    });

    redirect(returnPath);
  }

  if (groups.length < 2) {
    return null;
  }

  return (
    <form action={handleSwitch} className="flex items-center gap-2">
      <label className="sr-only" htmlFor="active-group">
        Active Group
      </label>
      <select
        className="tm-input min-w-44"
        defaultValue={currentGroupId}
        id="active-group"
        name="groupId"
      >
        {groups.map((group) => (
          <option key={group.groupId} value={group.groupId}>
            {group.groupName}
          </option>
        ))}
      </select>
      <button className="tm-button-secondary px-4 py-2 text-xs" type="submit">
        Switch
      </button>
    </form>
  );
}
