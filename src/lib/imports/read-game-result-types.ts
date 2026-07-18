import type { EndgameScoreLayout } from './parse-endgame-score-screenshot';

export type GameResultGlobalParameters = {
  oceans: number;
  oxygen: number;
  playerName: string;
  temperature: number;
  total: number;
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
