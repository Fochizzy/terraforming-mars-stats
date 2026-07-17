import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';

type RouteSkeletonPageProps = {
  description: string;
  returnPath: string;
  title: string;
};

/**
 * A truthful route owner for destinations whose feature content belongs to a
 * later explicitly assigned redesign step. It fetches no analytics data.
 */
export async function RouteSkeletonPage({
  description,
  returnPath,
  title,
}: RouteSkeletonPageProps) {
  const context = await requireGroupContextOrRedirect();

  return (
    <AppShell
      hasActiveGroup
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath={returnPath} />
      }
      title={title}
    >
      <section aria-labelledby="route-skeleton-heading" className="tm-panel">
        <p className="tm-display-eyebrow text-[11px]">Phase 3 route shell</p>
        <h2 className="tm-panel-title mt-2 text-xl" id="route-skeleton-heading">
          {title}
        </h2>
        <p className="tm-muted-copy mt-3 max-w-2xl text-sm">{description}</p>
        <p aria-live="polite" className="tm-muted-copy mt-5 text-sm" role="status">
          This destination is available for direct navigation. Its feature content
          will be implemented in a later approved redesign step.
        </p>
      </section>
    </AppShell>
  );
}
