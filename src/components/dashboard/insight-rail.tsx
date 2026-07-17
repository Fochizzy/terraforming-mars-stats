'use client';

import {
  DataStateRenderer,
  LowSampleNotice,
  MissingDataNotice,
  PartialCoverageNotice,
  SectionHeader,
  type DataDisplayState,
} from '@/components/foundations';
import type {
  CoverageObservation,
  SampleSize,
} from '@/lib/metrics/metric-value';

export type DashboardInsightItem = {
  id: string;
  title: string;
  finding: string;
  evidence?: string;
  relatedItemId?: string;
  sample?: SampleSize;
  coverage?: CoverageObservation;
  valueState?: 'ready' | 'missing' | 'unavailable';
};

export function DashboardInsightRail({
  title = 'Insights',
  description,
  items,
  selectedItemId,
  state,
  onFocusItem,
}: {
  title?: string;
  description?: string;
  items: readonly DashboardInsightItem[];
  selectedItemId: string | null;
  state?: DataDisplayState;
  onFocusItem?: (itemId: string) => void;
}) {
  const resolvedState =
    state ??
    (items.length === 0
      ? ({ status: 'empty', title: 'No fixture insights' } as const)
      : ({ status: 'ready' } as const));

  return (
    <section aria-label={title} className="tm-panel h-full">
      <SectionHeader
        description={description}
        headingLevel={2}
        title={title}
      />
      <div className="mt-4">
        <DataStateRenderer state={resolvedState}>
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const selected =
                item.relatedItemId === selectedItemId || item.id === selectedItemId;
              return (
                <article
                  aria-label={item.title}
                  className="tm-dashboard-insight"
                  data-selected={selected ? 'true' : 'false'}
                  key={item.id}
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="tm-data-label break-words">{item.title}</h3>
                    <p className="break-words text-sm text-[color:var(--tm-text)]">
                      {item.finding}
                    </p>
                    {item.valueState === 'missing' ? (
                      <MissingDataNotice label="Fixture value not recorded" />
                    ) : null}
                    {item.valueState === 'unavailable' ? (
                      <span
                        className="tm-notice"
                        data-state="unavailable"
                        data-tone="neutral"
                      >
                        <span aria-hidden="true">⊘</span>
                        Fixture value unavailable
                      </span>
                    ) : null}
                    {item.evidence ? (
                      <p className="tm-muted-copy break-words text-xs">
                        {item.evidence}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {item.sample ? <LowSampleNotice sample={item.sample} /> : null}
                      {item.coverage ? (
                        <PartialCoverageNotice coverage={item.coverage} />
                      ) : null}
                    </div>
                  </div>
                  {item.relatedItemId && onFocusItem ? (
                    <button
                      aria-pressed={selected}
                      className="tm-button-secondary tm-focus-ring mt-3 min-h-11 w-full"
                      onClick={() => onFocusItem(item.relatedItemId!)}
                      type="button"
                    >
                      Focus related evidence
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </DataStateRenderer>
      </div>
    </section>
  );
}
