'use client';

export type AutoSubmitGroupOption = {
  groupId: string;
  groupName: string;
};

export function AutoSubmitGroupSelect({
  groups,
  selectedGroupId,
}: {
  groups: AutoSubmitGroupOption[];
  selectedGroupId: string;
}) {
  return (
    <form
      action="/profile/comparison"
      className="grid max-w-2xl gap-2 sm:grid-cols-[auto_minmax(16rem,24rem)] sm:items-center sm:gap-3"
      method="get"
    >
      <label className="tm-data-label" htmlFor="compare-group">
        Group
      </label>
      <div className="min-w-0">
        <select
          aria-describedby="compare-group-help"
          aria-label="Group"
          className="tm-input h-11 w-full min-w-0"
          defaultValue={selectedGroupId}
          id="compare-group"
          name="groupId"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {groups.map((group) => (
            <option key={group.groupId} value={group.groupId}>
              {group.groupName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500" id="compare-group-help">
          Results update automatically when the group changes.
        </p>
      </div>
    </form>
  );
}
