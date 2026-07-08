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

export type BoardMapEvidenceInference =
  | { kind: 'detected'; mapId: SupportedBoardMapId }
  | {
      kind: 'conflict';
      logMapId: SupportedBoardMapId;
      screenshotMapId: SupportedBoardMapId;
    }
  | { kind: 'unknown' };

// The log and the screenshot are inferred separately: pooling them lets
// evidence pasted from one game and a screenshot from another cancel each
// other out into a silent "no detection" tie instead of a visible mismatch.
export function inferBoardMapFromImportEvidence(input: {
  logLines: string[];
  screenshotLines: string[];
}): BoardMapEvidenceInference {
  const logMapId = inferSupportedBoardMapId(input.logLines);
  const screenshotMapId = inferSupportedBoardMapId(input.screenshotLines);

  if (logMapId && screenshotMapId && logMapId !== screenshotMapId) {
    return { kind: 'conflict', logMapId, screenshotMapId };
  }

  const mapId = logMapId ?? screenshotMapId;

  return mapId ? { kind: 'detected', mapId } : { kind: 'unknown' };
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
