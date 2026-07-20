import type { IndependentMapDetection } from './detect-import-board-map-independent';

/**
 * The ONE map-gate rule shared by the client preview and the
 * server-authoritative import action (audit F-05/H1): a save is blocked only
 * by a true detector conflict or by a confident detection of a different map
 * than the confirmed one. Ambiguous or missing detection defers to the
 * importer's confirmed map, and an unknown map stays unknown.
 *
 * Both callers must feed the detector identical inputs — including the
 * verified off-reserve-ocean exception space ids — so a valid special action
 * (for example Artificial Lake placing an ocean off-reserve) is never
 * rejected by a premature client-only conflict the server would not raise.
 */
export function evaluateImportMapGate(input: {
  confirmedMapId: string;
  mapReview: Pick<IndependentMapDetection, 'detectedMapId' | 'kind' | 'message'>;
}): {
  blocked: boolean;
  message: string | null;
  reason: 'conflicting' | 'confident_mismatch' | null;
} {
  if (input.mapReview.kind === 'conflicting') {
    return {
      blocked: true,
      message: input.mapReview.message,
      reason: 'conflicting',
    };
  }
  if (
    input.mapReview.kind === 'confident' &&
    input.mapReview.detectedMapId !== null &&
    input.mapReview.detectedMapId !== input.confirmedMapId
  ) {
    return {
      blocked: true,
      message: input.mapReview.message,
      reason: 'confident_mismatch',
    };
  }
  return { blocked: false, message: null, reason: null };
}
