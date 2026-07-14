import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { ChartFrame } from '@/components/charts/chart-frame';
import { GlossaryLink } from '@/features/glossary/glossary-link';

export default function ComparisonsPage() {
  return (
    <AppShell showReviewSavedGamesLink title="Comparisons" wide>
      <ChartFrame
        description="Choose a comparison lens for player-to-player results or your performance inside a specific group."
        title="Comparisons"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="tm-stat-card flex flex-col items-start gap-3">
            <h2 className="tm-panel-title text-lg">Compare Players</h2>
            <p className="text-sm text-stone-300">
              Put your record beside another player and compare results, scoring,
              styles, maps, and shared-game patterns.
            </p>
            <Link className="tm-button-primary mt-auto inline-flex w-fit" href="/profile/compare">
              Open Player Comparison
            </Link>
          </article>
          <article className="tm-stat-card flex flex-col items-start gap-3">
            <h2 className="tm-panel-title text-lg">My Play vs Overall</h2>
            <p className="text-sm text-stone-300">
              Compare your play in any group you have joined against your{' '}
              <GlossaryLink slug="overall-view">overall</GlossaryLink> record.
            </p>
            <Link
              className="tm-button-secondary mt-auto inline-flex w-fit px-4 py-2 text-xs"
              href="/profile/comparison"
            >
              Open Group Comparison
            </Link>
          </article>
        </div>
      </ChartFrame>
    </AppShell>
  );
}
