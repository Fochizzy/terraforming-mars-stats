export type ParsedScreenshotPlayerRow = {
  awardPoints?: number;
  cardPointsAnimals?: number;
  cardPointsJovian?: number;
  cardPointsMicrobes?: number;
  cardPointsTotal?: number;
  citiesPoints?: number;
  finalMegacredits?: number;
  greeneryPoints?: number;
  milestonePoints?: number;
  playerName: string;
  totalPoints?: number;
  trPoints?: number;
};

export type ParsedEndgameScoreScreenshot = {
  playerRows: ParsedScreenshotPlayerRow[];
};

const SCORE_ROW_PATTERN =
  /^([A-Za-z][A-Za-z0-9 .'-]*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/;

const CARD_BREAKDOWN_PATTERN =
  /^([A-Za-z][A-Za-z0-9 .'-]*?)\s+Microbes\s+(\d+)\s+Animals\s+(\d+)\s+Jovian\s+(\d+)$/i;

function toNumber(value: string) {
  return Number(value);
}

export function parseEndgameScoreScreenshot(
  ocrLines: string[],
): ParsedEndgameScoreScreenshot {
  const playerRows: ParsedScreenshotPlayerRow[] = [];
  const pendingBreakdowns = new Map<
    string,
    Pick<
      ParsedScreenshotPlayerRow,
      'cardPointsAnimals' | 'cardPointsJovian' | 'cardPointsMicrobes'
    >
  >();

  for (const line of ocrLines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const scoreMatch = SCORE_ROW_PATTERN.exec(trimmedLine);
    if (
      scoreMatch?.[1] &&
      scoreMatch[2] &&
      scoreMatch[3] &&
      scoreMatch[4] &&
      scoreMatch[5] &&
      scoreMatch[6] &&
      scoreMatch[7] &&
      scoreMatch[8]
    ) {
      const playerName = scoreMatch[1].trim();
      const pendingBreakdown = pendingBreakdowns.get(playerName);

      playerRows.push({
        ...pendingBreakdown,
        awardPoints: toNumber(scoreMatch[6]),
        citiesPoints: toNumber(scoreMatch[4]),
        finalMegacredits: toNumber(scoreMatch[8]),
        greeneryPoints: toNumber(scoreMatch[3]),
        milestonePoints: toNumber(scoreMatch[5]),
        playerName,
        totalPoints: toNumber(scoreMatch[7]),
        trPoints: toNumber(scoreMatch[2]),
      });
      continue;
    }

    const breakdownMatch = CARD_BREAKDOWN_PATTERN.exec(trimmedLine);
    if (
      breakdownMatch?.[1] &&
      breakdownMatch[2] &&
      breakdownMatch[3] &&
      breakdownMatch[4]
    ) {
      const playerName = breakdownMatch[1].trim();
      const breakdown = {
        cardPointsAnimals: toNumber(breakdownMatch[3]),
        cardPointsJovian: toNumber(breakdownMatch[4]),
        cardPointsMicrobes: toNumber(breakdownMatch[2]),
      };
      const playerRow = playerRows.find(
        (row) => row.playerName === playerName,
      );

      if (!playerRow) {
        pendingBreakdowns.set(playerName, breakdown);
        continue;
      }

      Object.assign(playerRow, breakdown);
    }
  }

  return { playerRows };
}
