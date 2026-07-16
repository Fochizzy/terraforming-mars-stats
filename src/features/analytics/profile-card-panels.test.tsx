import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ProfileCardStat, ProfileTagStat } from "@/lib/db/analytics-repo";
import { ProfileCardPanels } from "./profile-card-panels";

const keyCard: ProfileCardStat = {
  cardId: "ants",
  cardName: "Ants",
  contextLabel:
    "Factorum + Polaris · Balanced · Terraforming · Fast Pace · 2 players · Elysium",
  evidenceConfidence: "Low",
  fullImageUrl: null,
  plays: 2,
  thumbnailUrl: null,
  victoryImpact: 0.49,
  winRate: 1,
  wins: 2,
};

const lossCard: ProfileCardStat = {
  cardId: "towing-a-comet",
  cardName: "Towing A Comet",
  contextLabel:
    "Inventrix · Balanced · Terraforming · Long Pace · 2 players · Hellas",
  evidenceConfidence: "Medium",
  fullImageUrl: null,
  plays: 4,
  thumbnailUrl: null,
  victoryImpact: -0.21,
  winRate: 0,
  wins: 0,
};

const mostPlayedCard = {
  cardId: "invention-contest",
  cardName: "Invention Contest",
  fullImageUrl: null,
  globalPlayRate: 0.67,
  globalWinRate: 0.58,
  personalPlayRate: 0.17,
  plays: 26,
  thumbnailUrl: null,
  winRate: 0.58,
  wins: 15,
};

const tagOutcomes: ProfileTagStat[] = [
  {
    averageTagsPerGame: 12.481,
    games: 27,
    tagCode: "Building",
    tagName: "Building",
    totalTags: 337,
    winRate: 0.26,
    wins: 7,
  },
  {
    averageTagsPerGame: 8.074,
    games: 27,
    tagCode: "Space",
    tagName: "Space",
    totalTags: 218,
    winRate: 0.26,
    wins: 7,
  },
];

function profileCardStat(
  index: number,
  overrides: Partial<ProfileCardStat> = {},
): ProfileCardStat {
  return {
    cardId: `card-${index}`,
    cardName: `Card ${index}`,
    contextLabel:
      "Inventrix · Balanced · Terraforming · Long Pace · 2 players · Hellas",
    evidenceConfidence: "Medium",
    fullImageUrl: null,
    plays: index + 2,
    thumbnailUrl: null,
    victoryImpact: 0.5 - index / 100,
    winRate: 0.6,
    wins: 2,
    ...overrides,
  };
}

describe("ProfileCardPanels", () => {
  it("renders the ranked card surfaces and keeps loss context details", () => {
    render(
      <ProfileCardPanels
        cardOutcomes={[]}
        keyCards={[keyCard]}
        lossCards={[lossCard]}
        playerName="Friday Mars"
        tagOutcomes={[]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /my most helpful cards \(highest victory impact\)/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Card statistics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rank").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Impact score").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Win rate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plays").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Rank 1")[0]).toHaveTextContent("1");
    expect(screen.getByText("+49 pts")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText(
        /estimated lift is \+49 pts after context and play-count adjustment/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Low confidence")).toBeInTheDocument();
    expect(screen.getByText(/how the ranking works/i)).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /my most harmful cards \(lowest victory impact\)/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Impact score").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Win rate").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Plays").length).toBeGreaterThan(1);
    expect(screen.getAllByLabelText("Rank 1").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/21 pts/).length).toBeGreaterThan(1);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Medium confidence")).toBeInTheDocument();
    expect(
      screen.getByText(
        /estimated impact is .*21 pts after context and play-count adjustment/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how loss correlation is calculated/i),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Corporation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Play style").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scoring").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Players").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Map").length).toBeGreaterThan(0);
  });

  it("shows five helpful and harmful cards first and expands each list", async () => {
    const user = userEvent.setup();
    const keyCards = Array.from({ length: 6 }, (_, index) =>
      profileCardStat(index + 1, {
        cardId: `helpful-${index + 1}`,
        cardName: `Helpful ${index + 1}`,
        victoryImpact: 0.5 - index / 100,
      }),
    );
    const lossCards = Array.from({ length: 6 }, (_, index) =>
      profileCardStat(index + 1, {
        cardId: `harmful-${index + 1}`,
        cardName: `Harmful ${index + 1}`,
        victoryImpact: -0.5 + index / 100,
        winRate: 0.1,
        wins: 0,
      }),
    );

    render(
      <ProfileCardPanels
        cardOutcomes={[]}
        keyCards={keyCards}
        lossCards={lossCards}
        playerName="Friday Mars"
        tagOutcomes={[]}
      />,
    );

    expect(screen.getByText("Helpful 5")).toBeInTheDocument();
    expect(screen.queryByText("Helpful 6")).not.toBeInTheDocument();
    expect(screen.getByText("Harmful 5")).toBeInTheDocument();
    expect(screen.queryByText("Harmful 6")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /view all 1 harmful card/i }),
    );

    expect(screen.getByText("Harmful 6")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show top 5/i }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.click(
      screen.getByRole("button", { name: /view all 1 helpful card/i }),
    );

    expect(screen.getByText("Helpful 6")).toBeInTheDocument();
  });

  it("renders the redesigned card dashboard with usage comparisons", () => {
    render(
      <ProfileCardPanels
        cardOutcomes={[mostPlayedCard]}
        keyCards={[]}
        lossCards={[]}
        playerName="Friday Mars"
        tagOutcomes={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Most-played cards in wins" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Your play rate")).toBeInTheDocument();
    expect(screen.getByText("Global play rate")).toBeInTheDocument();

    const row = screen.getByRole("button", {
      name: /show statistics for invention contest/i,
    });

    expect(within(row).getByText("15/26")).toBeInTheDocument();
    expect(within(row).getByText("26")).toBeInTheDocument();
    expect(within(row).getByText("58%")).toBeInTheDocument();

    expect(
      screen.getByRole("progressbar", {
        name: "Your play rate for Invention Contest",
      }),
    ).toHaveAttribute("aria-valuenow", "17");
    expect(
      screen.getByRole("progressbar", {
        name: "Global play rate for Invention Contest",
      }),
    ).toHaveAttribute("aria-valuenow", "67");
  });

  it("renders profile tags as a compact stat list", () => {
    render(
      <ProfileCardPanels
        cardOutcomes={[]}
        keyCards={[]}
        lossCards={[]}
        playerName="Friday Mars"
        tagOutcomes={tagOutcomes}
      />,
    );

    const buildingRow = screen.getByText("Building").closest("article");

    expect(buildingRow).not.toBeNull();
    expect(within(buildingRow!).getByText("337")).toBeInTheDocument();
    expect(within(buildingRow!).getByText("27")).toBeInTheDocument();
    expect(within(buildingRow!).getByText("12.481/game")).toBeInTheDocument();
    expect(within(buildingRow!).getByText("26%")).toBeInTheDocument();
    expect(within(buildingRow!).getByText("7/27")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Tag" })).toBeNull();
  });
});
