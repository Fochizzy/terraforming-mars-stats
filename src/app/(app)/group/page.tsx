import { AppShell } from '@/components/layout/app-shell';
import { GlossaryLink } from '@/features/glossary/glossary-link';
import {
  buildGlobalKeyCardData,
  GlobalKeyCardsSection,
} from '@/features/insights/global-key-cards-section';
import {
  buildGlobalLossCardData,
  GlobalLossCardsSection,
} from '@/features/insights/global-loss-cards-section';
import {
  FinalTerraformingActionBlock,
  SelectionStatsScope,
} from '@/features/insights/selection-stats-section';
import { StyleEffectivenessPanel } from '@/features/insights/style-effectiveness';
import {
  buildStyleScope,
  FIELD_SUBJECT,
  SELF_SUBJECT,
} from '@/features/insights/style-effectiveness-scopes';
import {
  buildWinningCardData,
  WinningCardsSection,
} from '@/features/insights/winning-cards-section';
import {
  getStyleEffectiveness,
  type StyleEffectivenessData,
} from '@/lib/db/analytics-repo';
import {
  listMapAwardGroups,
  type MapAwardGroup,
} from '@/lib/db/reference-repo';
import {
  type CardImageMeta,
  getFinalTerraformingActionStats,
  getCardImageMetaByNames,
  getSelectionDialogData,
  getSelectionStats,
  type FinalTerraformingActionStat,
  type SelectionDialogData,
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

const emptyFinalTerraformingActionStats: FinalTerraformingActionStat[] = [];

const emptyStyleEffectiveness: StyleEffectivenessData = {
  scoreAverages: null,
  styleRows: [],
};

export const dynamic = 'force-dynamic';

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

async function loadFinalTerraformingActionStatsOrDefault(): Promise<
  FinalTerraformingActionStat[]
> {
  try {
    return await getFinalTerraformingActionStats({ scope: 'global' });
  } catch (error) {
    console.error('[global] Failed to load final terraforming action stats', error);
    return emptyFinalTerraformingActionStats;
  }
}

async function loadMapAwardGroupsOrDefault(): Promise<MapAwardGroup[]> {
  try {
    return await listMapAwardGroups();
  } catch (error) {
    console.error('[global] Failed to load map award groups', error);
    return [];
  }
}

async function loadStyleEffectivenessOrDefault(
  scope: 'global' | 'personal',
): Promise<StyleEffectivenessData> {
  try {
    return await getStyleEffectiveness(scope);
  } catch (error) {
    console.error(`[global] Failed to load ${scope} style effectiveness`, error);
    return emptyStyleEffectiveness;
  }
}

export default async function GlobalStatisticsPage() {
  const [
    globalStats,
    personalStats,
    finalTerraformingActionStats,
    mapAwardGroups,
    globalStyleEffectiveness,
    personalStyleEffectiveness,
  ] = await Promise.all([
    loadGlobalStatsOrDefault(),
    loadPersonalStatsOrDefault(),
    loadFinalTerraformingActionStatsOrDefault(),
    loadMapAwardGroupsOrDefault(),
    loadStyleEffectivenessOrDefault('global'),
    loadStyleEffectivenessOrDefault('personal'),
  ]);

  let selectionDialogData: SelectionDialogData | undefined;

  try {
    selectionDialogData = await getSelectionDialogData(personalStats, globalStats);
  } catch (error) {
    console.error('[global] Failed to load selection dialog data', error);
  }

  const personalCardPlaysByName = new Map(
    personalStats.cards.map((card) => [card.card_name, card.plays]),
  );

  // The stats loaded above carry card names only, so look up catalog art for
  // just the cards actually on show across the key, loss, and most-played
  // panels. Optional: on failure the cards still list, just without the
  // click-to-open-image link.
  const linkedCardNames = new Set<string>([
    ...buildGlobalKeyCardData(
      globalStats.cards,
      globalStats.baselineWinRate,
    ).map((card) => card.cardName),
    ...buildGlobalLossCardData(
      globalStats.cards,
      globalStats.baselineWinRate,
    ).map((card) => card.cardName),
    ...buildWinningCardData(globalStats.cards).map((card) => card.cardName),
  ]);
  let cardMeta = new Map<string, CardImageMeta>();

  try {
    cardMeta = await getCardImageMetaByNames([...linkedCardNames]);
  } catch (error) {
    console.error('[global] Failed to load card images', error);
  }

  const styleEffectivenessScopes = [
    buildStyleScope({
      data: globalStyleEffectiveness,
      key: 'global',
      label: 'Global',
      subject: FIELD_SUBJECT,
    }),
    buildStyleScope({
      data: personalStyleEffectiveness,
      key: 'personal',
      label: 'Your games',
      subject: SELF_SUBJECT,
    }),
  ];

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
          dialogData={selectionDialogData}
          heading="Corporation &amp; Prelude Performance"
          mapAwardGroups={mapAwardGroups}
          stats={globalStats}
        />
        <FinalTerraformingActionBlock rows={finalTerraformingActionStats} />
        <StyleEffectivenessPanel scopes={styleEffectivenessScopes} />
        <GlobalKeyCardsSection
          baselineWinRate={globalStats.baselineWinRate}
          cardMetaByName={cardMeta}
          cards={globalStats.cards}
        />
        <GlobalLossCardsSection
          baselineWinRate={globalStats.baselineWinRate}
          cardMetaByName={cardMeta}
          cards={globalStats.cards}
        />
        <WinningCardsSection
          cardMetaByName={cardMeta}
          cards={globalStats.cards}
          globalTotalGames={globalStats.totalGames}
          personalTotalGames={personalStats.totalGames}
          personalPlaysByCardName={personalCardPlaysByName}
        />
      </section>
    </AppShell>
  );
}
