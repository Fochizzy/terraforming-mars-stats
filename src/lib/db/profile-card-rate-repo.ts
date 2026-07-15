import {
  getProfileAnalytics,
  type ProfileAnalytics,
  type ProfileCardStat,
} from "@/lib/db/analytics-repo";
import {
  getSelectionStats,
  type SelectionStats,
} from "@/lib/db/selection-stats-repo";

export type ProfileCardComparisonStat = ProfileCardStat & {
  globalPlayRate?: number;
  globalWinRate?: number;
  personalPlayRate?: number;
};

export type ProfileAnalyticsWithCardRates = Omit<
  ProfileAnalytics,
  "cardOutcomes"
> & {
  cardOutcomes: ProfileCardComparisonStat[];
};

function normalizeCardName(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return undefined;
  }

  return Math.max(0, Math.min(numerator / denominator, 1));
}

export function enrichProfileCardRates(
  cards: ProfileCardStat[],
  personalStats: SelectionStats | null,
  globalStats: SelectionStats | null,
  fallbackPersonalGames = 0,
): ProfileCardComparisonStat[] {
  const personalByName = new Map(
    (personalStats?.cards ?? []).map((card) => [
      normalizeCardName(card.card_name),
      card,
    ]),
  );
  const globalByName = new Map(
    (globalStats?.cards ?? []).map((card) => [
      normalizeCardName(card.card_name),
      card,
    ]),
  );
  const personalGames = personalStats?.totalGames ?? fallbackPersonalGames;
  const globalGames = globalStats?.totalGames ?? 0;

  return cards.map((card) => {
    const key = normalizeCardName(card.cardName);
    const personalCard = personalByName.get(key);
    const globalCard = globalByName.get(key);

    return {
      ...card,
      globalPlayRate: globalCard
        ? safeRate(globalCard.plays, globalGames)
        : undefined,
      globalWinRate: globalCard?.win_rate_when_played,
      personalPlayRate: safeRate(
        personalCard?.plays ?? card.plays,
        personalGames,
      ),
    };
  });
}

export async function getProfileAnalyticsWithCardRates(
  userId: string,
  options: { groupId?: string | null } = {},
): Promise<ProfileAnalyticsWithCardRates | null> {
  const profile = await getProfileAnalytics(userId, options);

  if (!profile) {
    return null;
  }

  const [personalResult, globalResult] = await Promise.allSettled([
    getSelectionStats("personal"),
    getSelectionStats("global"),
  ]);
  const personalStats =
    personalResult.status === "fulfilled" ? personalResult.value : null;
  const globalStats =
    globalResult.status === "fulfilled" ? globalResult.value : null;

  if (personalResult.status === "rejected") {
    console.warn(
      "[profile] Optional personal card play-rate lookup failed",
      personalResult.reason,
    );
  }

  if (globalResult.status === "rejected") {
    console.warn(
      "[profile] Optional global card play-rate lookup failed",
      globalResult.reason,
    );
  }

  return {
    ...profile,
    cardOutcomes: enrichProfileCardRates(
      profile.cardOutcomes,
      personalStats,
      globalStats,
      profile.performance?.gamesPlayed ?? 0,
    ),
  };
}
