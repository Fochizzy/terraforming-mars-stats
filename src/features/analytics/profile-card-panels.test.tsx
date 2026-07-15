import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProfileCardStat } from "@/lib/db/analytics-repo";
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

describe("ProfileCardPanels", () => {
  it("renders the ranked key-card surface and keeps loss context details", () => {
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
    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getAllByText("Impact score").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Win rate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plays").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Rank 1")).toHaveTextContent("1");
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

    expect(screen.getByText("My Most Harmful Cards")).toBeInTheDocument();
    expect(screen.getAllByText("Adjusted impact").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sample").length).toBeGreaterThan(0);
    expect(screen.getByText("−21 pp")).toBeInTheDocument();
    expect(screen.getByText("0 / 4 wins")).toBeInTheDocument();
    expect(screen.getByText("0% win rate · 4 games")).toBeInTheDocument();
    expect(screen.getByText("Inventrix")).toBeInTheDocument();
    expect(screen.getByText("Long Pace")).toBeInTheDocument();
    expect(screen.getByText("Medium confidence")).toBeInTheDocument();
    expect(
      screen.getByText(
        /why it ranked: 0 wins in 4 comparable games; adjusted win rate was 21 percentage points lower/i,
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
});
