import type { EndgameScoreLayout } from './parse-endgame-score-screenshot';

export type GameResultGlobalParameters = {
  oceans: number;
  oxygen: number;
  playerName: string;
  temperature: number;
  total: number;
  // The Venus contribution column is present only when Venus Next is enabled;
  // it is omitted for base-layout rows. Its presence is trusted Venus option
  // evidence, but it carries per-player Venus TR, not the final Venus scale.
  venus?: number;
};

export type ReadGameResultEvidenceResult = {
  endgameLayout?: EndgameScoreLayout;
  endgameLines: string[];
  generationCount?: number | null;
  globalParameters?: GameResultGlobalParameters[];
  scoreDetailsColumns: Array<{
    textLines: string[];
  }>;
};
