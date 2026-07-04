import { describe, expect, it } from 'vitest';
import { buildImportDraftNotes } from './build-import-draft-notes';

describe('buildImportDraftNotes', () => {
  it('keeps the draft note concise when imported evidence is attached separately', () => {
    expect(
      buildImportDraftNotes({
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: 'Friday Mars won by 6 points.',
      }),
    ).toBe(
      [
        'Imported evidence attached.',
        'Review the saved game log and screenshot details before finalizing.',
      ].join('\n\n'),
    );
  });
});
