import { AppShell } from '@/components/layout/app-shell';
import { SelectionStatsScope } from '@/features/insights/selection-stats-section';
import {
  getSelectionStats,
  type SelectionStats,
} from '@/lib/db/selection-stats-repo';

const emptySelectionStats: SelectionStats = {
  awardFunding: [],
  baselineWinRate: 0,
  cards: [],
  corporations: [],
  corporationTags: [],
  pairs: [],
  preludes: [],
  tagWins: [],
};

async function loadGlobalStatsOrDefault(): Promise<SelectionStats> {
  try {
    return await getSelectionStats('global');
  } catch (error) {
    console.error('[global] Failed to load global selection stats', error);
    return emptySelectionStats;
  }
}

export default async function GlobalStatisticsPage() {
  const globalStats = await loadGlobalStatsOrDefault();

  return (
    <AppShell showReviewSavedGamesLink title="Global Statistics" wide>
      <section className="tm-panel flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="tm-panel-title text-lg">All Recorded Games</h2>
          <p className="tm-muted-copy text-sm">
            Corporation, prelude, and card performance across every recorded game
            — including games you didn&apos;t play in.
          </p>
        </div>
        <SelectionStatsScope
          heading="Corporation &amp; Prelude Performance"
          stats={globalStats}
        />
      </section>
    </AppShell>
  );
}
