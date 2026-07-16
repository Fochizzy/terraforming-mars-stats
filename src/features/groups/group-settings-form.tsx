'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { startTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  groupSettingsSchema,
  type GroupSettingsInput,
} from '@/lib/validation/group-settings';
import type { ExpansionOption, PromoSetOption } from '@/lib/db/reference-repo';

type SaveResult = {
  status: 'success' | 'error';
  message: string;
};

export function GroupSettingsForm({
  expansionOptions,
  initialValues,
  onSave,
  promoSetOptions,
}: {
  expansionOptions: ExpansionOption[];
  initialValues: GroupSettingsInput;
  onSave: (values: GroupSettingsInput) => Promise<SaveResult>;
  promoSetOptions: PromoSetOption[];
}) {
  const form = useForm<GroupSettingsInput>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: initialValues,
  });
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => {
        setIsPending(true);
        setResult(null);
        startTransition(async () => {
          try {
            const nextResult = await onSave(values);
            setResult(nextResult);
          } catch (error) {
            setResult({
              status: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : 'Unable to save group defaults right now.',
            });
          } finally {
            setIsPending(false);
          }
        });
      })}
    >
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Group Name</span>
        <input
          aria-label="Group Name"
          className="tm-input"
          {...form.register('groupName')}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" {...form.register('globalAnalyticsEnabled')} />
        Contribute anonymous aggregate analytics
      </label>
      <section className="tm-panel flex flex-col gap-3">
        <h2 className="tm-panel-title text-lg">Default Expansions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {expansionOptions.map((expansion) => (
            <label className="tm-stat-card flex items-center gap-3 text-sm" key={expansion.code}>
              <input
                type="checkbox"
                value={expansion.code}
                {...form.register('defaultExpansionCodes')}
              />
              {expansion.name}
            </label>
          ))}
        </div>
      </section>
      <section className="tm-panel flex flex-col gap-3">
        <h2 className="tm-panel-title text-lg">Default Promo Sets</h2>
        <div className="grid gap-3">
          {promoSetOptions.length === 0 ? (
            <p className="tm-muted-copy text-sm">
              No promo sets imported yet for this group.
            </p>
          ) : (
            promoSetOptions.map((promoSet) => (
              <label className="tm-stat-card flex items-center gap-3 text-sm" key={promoSet.slug}>
                <input
                  type="checkbox"
                  value={promoSet.slug}
                  {...form.register('defaultPromoSetSlugs')}
                />
                <span>
                  {promoSet.displayName}
                  {promoSet.promoYear ? ` (${promoSet.promoYear})` : ''}
                </span>
              </label>
            ))
          )}
        </div>
      </section>
      {result ? (
        <p
          className={
            result.status === 'success' ? 'text-sm tm-text-success' : 'text-sm tm-text-danger'
          }
        >
          {result.message}
        </p>
      ) : null}
      <button
        className="tm-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Saving…' : 'Save Group Defaults'}
      </button>
    </form>
  );
}
