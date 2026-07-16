import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BestStyleSnapshot } from "./best-style-snapshot";
import type { GroupStylePerformanceRow } from "@/lib/db/analytics-repo";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRow(
  overrides: Partial<GroupStylePerformanceRow> & { styleCode: string },
): GroupStylePerformanceRow {
  return {
    averageGenerationCount: 10,
    averagePlacement: 2.0,
    averageScore: 85.0,
    gamesPlayed: 10,
    groupId: "g1",
    winRate: 0.5,
    wins: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Sorting and top-3 selection
// ---------------------------------------------------------------------------

describe("BestStyleSnapshot – sorting and top-3", () => {
  it("shows styles sorted by win rate (highest first)", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "balanced", winRate: 0.34 }),
          makeRow({ styleCode: "jovian_payoff", winRate: 0.42 }),
          makeRow({ styleCode: "board_control", winRate: 0.28 }),
        ]}
      />,
    );

    // Each style label appears twice (chart row + detail row); compare first occurrences
    const jovianEls = screen.getAllByText("Jovian Payoff");
    const balancedEls = screen.getAllByText("Balanced");
    expect(jovianEls.length).toBeGreaterThan(0);
    expect(balancedEls.length).toBeGreaterThan(0);
    // Jovian Payoff (42%) must appear before Balanced (34%) in DOM order
    expect(
      jovianEls[0].compareDocumentPosition(balancedEls[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows at most three styles", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "a", winRate: 0.6 }),
          makeRow({ styleCode: "b", winRate: 0.5 }),
          makeRow({ styleCode: "c", winRate: 0.4 }),
          makeRow({ styleCode: "d", winRate: 0.3 }),
          makeRow({ styleCode: "e", winRate: 0.2 }),
        ]}
      />,
    );

    // Style 'd' and 'e' should not appear
    expect(screen.queryByText("D")).not.toBeInTheDocument();
    expect(screen.queryByText("E")).not.toBeInTheDocument();
    // Top 3 are present
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("C").length).toBeGreaterThan(0);
  });

  it("handles fewer than three eligible styles", () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "solo_engine", winRate: 0.6 })]}
      />,
    );
    expect(screen.getAllByText("Solo Engine").length).toBeGreaterThan(0);
    // Only #1 rank — no #2 or #3
    expect(screen.getAllByText("#1").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
    expect(screen.queryByText("#3")).not.toBeInTheDocument();
  });

  it("excludes styles with zero games", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "real_style", gamesPlayed: 5, winRate: 0.4 }),
          makeRow({ styleCode: "zero_games", gamesPlayed: 0, winRate: 0.9 }),
        ]}
      />,
    );
    expect(screen.getAllByText("Real Style").length).toBeGreaterThan(0);
    expect(screen.queryByText("Zero Games")).not.toBeInTheDocument();
  });

  it("deduplicates entries with the same styleCode", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "balanced", winRate: 0.5 }),
          makeRow({ styleCode: "balanced", winRate: 0.9 }), // duplicate
        ]}
      />,
    );
    // Only two occurrences of 'Balanced' (chart label + detail name), not four
    expect(screen.getAllByText("Balanced").length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Percentage-point insight sentence
// ---------------------------------------------------------------------------

describe("BestStyleSnapshot – insight sentence", () => {
  it("shows lead insight with percentage-point difference", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "jovian_payoff", winRate: 0.42 }),
          makeRow({ styleCode: "balanced", winRate: 0.34 }),
        ]}
      />,
    );
    expect(
      screen.getByText(
        /jovian payoff leads with a 42% win rate, 8 percentage points above balanced/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows tie message when top two share the same win rate", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "jovian_payoff", winRate: 0.42 }),
          makeRow({ styleCode: "balanced", winRate: 0.42 }),
        ]}
      />,
    );
    // Tie-break is alphabetical by styleCode: 'balanced' < 'jovian_payoff'
    // so the sentence reads "Balanced and Jovian Payoff share..."
    expect(
      screen.getByText(
        /balanced and jovian payoff share the highest win rate at 42%/i,
      ),
    ).toBeInTheDocument();
  });

  it("hides comparison sentence when fewer than two valid styles exist", () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "only_style", winRate: 0.5 })]}
      />,
    );
    expect(screen.queryByText(/leads with/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/share the highest win rate/i),
    ).not.toBeInTheDocument();
  });

  it('uses singular "percentage point" when difference is 1', () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "top", winRate: 0.41 }),
          makeRow({ styleCode: "second", winRate: 0.4 }),
        ]}
      />,
    );
    expect(
      screen.getByText(/1 percentage point above second/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

describe("BestStyleSnapshot – number formatting", () => {
  it("formats win rate as a whole-number percentage", () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "engine_builder", winRate: 0.571 })]}
      />,
    );
    // 57% not 57.1%
    expect(screen.getAllByText("57%").length).toBeGreaterThan(0);
  });

  it("formats average score to one decimal", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({
            styleCode: "board_control",
            averageScore: 88.459999,
            winRate: 0.5,
          }),
        ]}
      />,
    );
    expect(screen.getByText(/88\.5 avg points/i)).toBeInTheDocument();
  });

  it("formats average placement to two decimals", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({
            styleCode: "tr_rush",
            averagePlacement: 1.9444,
            winRate: 0.5,
          }),
        ]}
      />,
    );
    expect(screen.getByText(/1\.94 avg placement/i)).toBeInTheDocument();
  });

  it('uses singular "game" for one game', () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "solo", gamesPlayed: 1, winRate: 0.5 })]}
      />,
    );
    // "1 game ·" — not "1 games"
    expect(screen.getByText(/1 game\b/i)).toBeInTheDocument();
  });

  it('uses plural "games" for multiple games', () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "multi", gamesPlayed: 24, winRate: 0.5 })]}
      />,
    );
    expect(screen.getByText(/24 games/i)).toBeInTheDocument();
  });

  it("does not show avg points when average score is null", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({
            styleCode: "incomplete",
            averageScore: null as unknown as number,
            winRate: 0.5,
          }),
        ]}
      />,
    );
    // The detail meta paragraph should not include "avg points" when score is null
    expect(screen.queryByText(/avg points/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Long style names
// ---------------------------------------------------------------------------

describe("BestStyleSnapshot – long style names", () => {
  it("renders a very long style name without crashing", () => {
    const longCode = "a".repeat(40) + "_style";
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: longCode, winRate: 0.6 })]}
      />,
    );
    // Component should render without throwing
    expect(screen.getAllByText("#1").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("BestStyleSnapshot – empty state", () => {
  it("shows empty-state message when rows array is empty", () => {
    render(<BestStyleSnapshot rows={[]} />);
    expect(
      screen.getByText(/no style performance data yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /style comparisons will appear after finalized game data is available/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows empty-state when all rows have zero games", () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "empty", gamesPlayed: 0, winRate: 0.8 })]}
      />,
    );
    expect(
      screen.getByText(/no style performance data yet/i),
    ).toBeInTheDocument();
  });

  it("does not render a chart when there is no data", () => {
    render(<BestStyleSnapshot rows={[]} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Heading and accessible structure
// ---------------------------------------------------------------------------

describe("BestStyleSnapshot – accessibility", () => {
  it("renders the section heading in sentence case", () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "balanced", winRate: 0.5 })]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /best style snapshot/i }),
    ).toBeInTheDocument();
  });

  it("renders chart with accessible table role", () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "engine_builder", winRate: 0.5 })]}
      />,
    );
    expect(
      screen.getByRole("table", {
        name: /top inferred play styles ranked by win rate/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders win rate label text in detail rows", () => {
    render(
      <BestStyleSnapshot
        rows={[makeRow({ styleCode: "balanced", winRate: 0.5 })]}
      />,
    );
    // The label "win rate" appears at least once in the visible detail row
    expect(screen.getAllByText(/win rate/i).length).toBeGreaterThan(0);
  });

  it("renders Top performer badge for the first-ranked style", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "best", winRate: 0.7 }),
          makeRow({ styleCode: "second", winRate: 0.4 }),
        ]}
      />,
    );
    expect(screen.getByText(/top performer/i)).toBeInTheDocument();
  });

  it("does not render Top performer badge for non-first styles", () => {
    render(
      <BestStyleSnapshot
        rows={[
          makeRow({ styleCode: "best", winRate: 0.7 }),
          makeRow({ styleCode: "second", winRate: 0.4 }),
        ]}
      />,
    );
    expect(screen.getAllByText(/top performer/i)).toHaveLength(1);
  });
});
