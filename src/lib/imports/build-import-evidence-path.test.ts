import { describe, expect, it } from 'vitest';
import { buildImportEvidencePath } from './build-import-evidence-path';

describe('buildImportEvidencePath', () => {
  it('stores evidence under the game id with a safe filename suffix', () => {
    const path = buildImportEvidencePath({
      fileName: 'Endgame Results!!.PNG',
      gameId: 'game-1',
    });

    expect(path).toMatch(/^game-1\/[a-z0-9-]+-endgame-results-png$/);
  });
});
