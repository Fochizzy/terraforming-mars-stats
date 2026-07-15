import { describe, expect, it } from "vitest";
import type { ProfileCardStat } from "@/lib/db/analytics-repo";
import type { SelectionStats } from "@/lib/db/selection-stats-repo";
import { enrichProfileCardRates } from "./profile-card-rate-repo";

function selectionStats(
  totalGames: number,
  cards: SelectionStats["cards"],
): SelectionStats {
  return {
    awardFunding: [],
    baselineWinRate: 0,
    cards,
    corporations: [],
    corporationTags: [],
    pairs: [],
    preludes: [],
    tagWins: [],
    totalGames,
  };
}

const card: ProfileCardStat = {
  cardId: "invention-contest",
  cardName: "Invention Contest",
  fullImageUrl: null,
  plays: 6,
  thumbnailUrl: null,
  winRate: 0.5,
  wins: 3,
};

describe("enrichProfileCardRates", () => {
  it("adds personal and global play rates using the documented game denominators", () => {
    const [result] = enrichProfileCardRates(
      [card],
      selectionStats(24, [
        {
          card_name: "Invention Contest",
          plays: 6,
          win_rate_when_played: 0.5,
        },
      ]),
      selectionStats(100, [
        {
          card_name: "Invention Contest",
          plays: 67,
          win_rate_when_played: 0.58,
        },
      ]),
    );

    expect(result.personalPlayRate).toBe(0.25);
    expect(result.globalPlayRate).toBe(0.67);
    expect(result.globalWinRate).toBe(0.58);
  });

  it("falls back to finalized personal games and leaves unavailable global data blank", () => {
    const [result] = enrichProfileCardRates([card], null, null, 30);

    expect(result.personalPlayRate).toBe(0.2);
    expect(result.globalPlayRate).toBeUndefined();
    expect(result.globalWinRate).toBeUndefined();
  });
});
