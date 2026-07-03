'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  groupSettingsSchema,
  type GroupSettingsInput,
} from '@/lib/validation/group-settings';

export function GroupSettingsForm({
  initialValues,
}: {
  initialValues: GroupSettingsInput;
}) {
  const form = useForm<GroupSettingsInput>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: initialValues,
  });

  return (
    <form className="flex flex-col gap-4">
      <input
        className="rounded-xl bg-stone-950 px-4 py-3"
        {...form.register('groupName')}
      />
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" {...form.register('globalAnalyticsEnabled')} />
        Contribute anonymous aggregate analytics
      </label>
      <button
        className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950"
        type="submit"
      >
        Save Group Defaults
      </button>
    </form>
  );
}
