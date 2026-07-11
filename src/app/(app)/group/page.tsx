import { AppShell } from '@/components/layout/app-shell';
import { GlossaryLink } from '@/features/glossary/glossary-link';
import { AwardEconomicsSection } from '@/features/insights/milestone-award-section';
import { SelectionStatsScope } from '@/features/insights/selection-stats-section';
import { WinningCardsSection } from '@/features/insights/winning-cards-section';
import {
  getAwardEconomics,
  type AwardEconomics,
} from '@/lib/db/extended-analytics-repo';
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
  totalGames: 0,
};

const emptyAwardEconomics: AwardEconomics = {
  awardFunderWinnerRows: [],
  awardOutcomeRows: [],
};

async function loadGlobalStatsOrDefault(): Promise<SelectionStats> {
  try {
    return await getSelectionStats('global');
  } catch (error) {
    console.error('[global] Failed to load global selection stats', error);
    return emptySelectionStats;
  }
}

async function loadPersonalStatsOrDefault(): Promise<SelectionStats> {
  try {
    return await getSelectionStats('personal');
  } catch (error) {
    console.error('[global] Failed to load personal selection stats', error);
    return emptySelectionStats;
  }
}

async function loadAwardEconomicsOrDefault(): Promise<AwardEconomics> {
  try {
    return await getAwardEconomics('personal');
  } catch (error) {
    console.error('[global] Failed to load award economics', error);
    return emptyAwardEconomics;
  }
}

export default async function GlobalStatisticsPage() {
  const [globalStats, personalStats, awardEconomics] = await Promise.all([
    loadGlobalStatsOrDefault(),
    loadPersonalStatsOrDefault(),
    loadAwardEconomicsOrDefault(),
  ]);

  const personalCardPlaysByName = new Map(
    personalStats.cards.map((card) => [card.card_name, card.plays]),
  );

  return (
    <AppShell showReviewSavedGamesLink title="Global Statistics" wide>
      <section className="tm-panel flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="tm-panel-title text-lg">
            <GlossaryLink slug="personal-vs-global">All Recorded Games</GlossaryLink>
          </h2>
          <p className="tm-muted-copy text-sm">
            <GlossaryLink slug="corporation">Corporation</GlossaryLink>,{' '}
            <GlossaryLink slug="prelude">prelude</GlossaryLink>, and{' '}
            <GlossaryLink slug="card-outcomes">card</GlossaryLink> performance
            across every recorded game — including games you didn&apos;t play in.
          </p>
        </div>
        <SelectionStatsScope
          heading="Corporation &amp; Prelude Performance"
          stats={globalStats}
        />
        <WinningCardsSection
          cards={globalStats.cards}
          globalTotalGames={globalStats.totalGames}
          personalTotalGames={personalStats.totalGames}
          personalPlaysByCardName={personalCardPlaysByName}
        />
      </section>
      <section className="tm-panel flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="tm-panel-title text-lg">
            <GlossaryLink slug="award-economics">Your Award Funding</GlossaryLink>
          </h2>
          <p className="tm-muted-copy text-sm">
            Who profits from whose{' '}
            <GlossaryLink slug="award-funding-roi">award funding</GlossaryLink>,
            across every game you&apos;ve played in — spanning all your groups,
            not just the active one.
          </p>
        </div>
        <AwardEconomicsSection
          focusPlayerId={null}
          focusPlayerName={null}
          matrixRows={awardEconomics.awardFunderWinnerRows}
          outcomeRows={awardEconomics.awardOutcomeRows}
        />
      </section>
    </AppShell>
  );
}
