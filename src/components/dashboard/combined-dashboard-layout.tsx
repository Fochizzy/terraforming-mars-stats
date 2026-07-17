import type { ReactNode } from 'react';
import { DashboardGrid } from '@/components/foundations';

export type CombinedDashboardRegionLabels = {
  toolbar: string;
  primary: string;
  supporting: string;
  insights: string;
  evidence: string;
  detail: string;
};

const defaultLabels: CombinedDashboardRegionLabels = {
  toolbar: 'Dashboard controls',
  primary: 'Primary visualization',
  supporting: 'Supporting visualization',
  insights: 'Insight rail',
  evidence: 'Evidence table',
  detail: 'Selection details',
};

function DashboardRegion({
  name,
  label,
  className,
  children,
}: {
  name: keyof CombinedDashboardRegionLabels;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-label={label}
      className={`tm-dashboard-region ${className}`}
      data-dashboard-region={name}
      role="region"
    >
      {children}
    </div>
  );
}

/**
 * Responsive anatomy shared by future analytics pages. It composes the Step
 * 1.1 `DashboardGrid` rather than introducing a second grid system.
 */
export function CombinedDashboardLayout({
  toolbar,
  primary,
  supporting,
  insights,
  evidence,
  detail,
  labels,
}: {
  toolbar?: ReactNode;
  primary: ReactNode;
  supporting?: ReactNode;
  insights?: ReactNode;
  evidence?: ReactNode;
  detail?: ReactNode;
  labels?: Partial<CombinedDashboardRegionLabels>;
}) {
  const resolvedLabels = { ...defaultLabels, ...labels };

  return (
    <DashboardGrid className="min-w-0 lg:grid-cols-12" variant="single">
      {toolbar ? (
        <DashboardRegion
          className="order-1 lg:col-span-12"
          label={resolvedLabels.toolbar}
          name="toolbar"
        >
          {toolbar}
        </DashboardRegion>
      ) : null}
      <DashboardRegion
        className="order-2 lg:col-span-8"
        label={resolvedLabels.primary}
        name="primary"
      >
        {primary}
      </DashboardRegion>
      {supporting ? (
        <DashboardRegion
          className="order-3 lg:col-span-4"
          label={resolvedLabels.supporting}
          name="supporting"
        >
          {supporting}
        </DashboardRegion>
      ) : null}
      {insights ? (
        <DashboardRegion
          className="order-4 lg:col-span-4"
          label={resolvedLabels.insights}
          name="insights"
        >
          {insights}
        </DashboardRegion>
      ) : null}
      {evidence ? (
        <DashboardRegion
          className="order-5 lg:col-span-8"
          label={resolvedLabels.evidence}
          name="evidence"
        >
          {evidence}
        </DashboardRegion>
      ) : null}
      {detail ? (
        <DashboardRegion
          className="order-6 lg:col-span-12"
          label={resolvedLabels.detail}
          name="detail"
        >
          {detail}
        </DashboardRegion>
      ) : null}
    </DashboardGrid>
  );
}
