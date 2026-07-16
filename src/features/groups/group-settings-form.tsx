'use client';

import { startTransition, useState } from 'react';
import type { CurrentUserGroup } from '@/lib/db/group-context-repo';
import type { GroupRenameInput } from '@/lib/validation/group-settings';

type SaveResult = {
  status: 'success' | 'error';
  message: string;
};

export function GroupSettingsForm({
  currentGroupId,
  groups,
  onRename,
}: {
  currentGroupId: string;
  groups: CurrentUserGroup[];
  onRename: (values: GroupRenameInput) => Promise<SaveResult>;
}) {
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);

  return (
    <section className="tm-panel flex flex-col gap-4">
      <div>
        <h2 className="tm-panel-title text-lg">Your Groups</h2>
      </div>
      {groups.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          No group memberships were found for this account.
        </p>
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => {
            const isPending = pendingGroupId === group.groupId;
            const isActive = group.groupId === currentGroupId;

            return (
              <form
                className="tm-stat-card grid gap-3"
                key={group.groupId}
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const groupName = String(formData.get('groupName') ?? '');

                  setPendingGroupId(group.groupId);
                  setResult(null);
                  startTransition(async () => {
                    try {
                      const nextResult = await onRename({
                        groupId: group.groupId,
                        groupName,
                      });
                      setResult(nextResult);
                    } catch (error) {
                      setResult({
                        status: 'error',
                        message:
                          error instanceof Error
                            ? error.message
                            : 'Unable to rename that group right now.',
                      });
                    } finally {
                      setPendingGroupId(null);
                    }
                  });
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="tm-data-label">{group.role}</p>
                  {isActive ? (
                    <span className="tm-coverage-badge">Active group</span>
                  ) : null}
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="sr-only">Rename {group.groupName}</span>
                  <input
                    aria-label={`Rename ${group.groupName}`}
                    className="tm-input"
                    defaultValue={group.groupName}
                    name="groupName"
                  />
                </label>
                <button
                  className="tm-button-secondary w-fit px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? 'Saving...' : `Save ${group.groupName}`}
                </button>
              </form>
            );
          })}
        </div>
      )}
      {result ? (
        <p
          className={
            result.status === 'success'
              ? 'text-sm tm-text-success'
              : 'text-sm tm-text-danger'
          }
        >
          {result.message}
        </p>
      ) : null}
    </section>
  );
}
