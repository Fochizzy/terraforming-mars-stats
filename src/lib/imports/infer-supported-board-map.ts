import type { SupportedBoardMapId } from './board-space-maps';
import {
  boardMapAliasDictionary,
  expandBoardMapAliasEntry,
} from './board-map-aliases';

type BoardMapSignal = {
  term: string;
  weight: number;
};

const boardMapSignals: Record<SupportedBoardMapId, BoardMapSignal[]> =
  Object.fromEntries(
    Object.entries(boardMapAliasDictionary).map(([mapId, entries]) => [
      mapId,
      entries.flatMap((entry) => expandBoardMapAliasEntry(entry)),
    ]),
  ) as Record<SupportedBoardMapId, BoardMapSignal[]>;

function normalizeEvidenceText(text: string) {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

export function inferSupportedBoardMapId(
  evidenceLines: string[],
): SupportedBoardMapId | null {
  const normalizedCorpus = normalizeEvidenceText(evidenceLines.join(' '));

  if (normalizedCorpus.trim().length === 0) {
    return null;
  }

  let bestMapId: SupportedBoardMapId | null = null;
  let bestScore = 0;
  let hasTie = false;

  for (const mapId of Object.keys(boardMapSignals) as SupportedBoardMapId[]) {
    const score = boardMapSignals[mapId].reduce((total, signal) => {
      const normalizedTerm = normalizeEvidenceText(signal.term);

      return normalizedCorpus.includes(normalizedTerm)
        ? total + signal.weight
        : total;
    }, 0);

    if (score === 0) {
      continue;
    }

    if (score > bestScore) {
      bestMapId = mapId;
      bestScore = score;
      hasTie = false;
      continue;
    }

    if (score === bestScore) {
      hasTie = true;
    }
  }

  if (!bestMapId || hasTie) {
    return null;
  }

  return bestMapId;
}
