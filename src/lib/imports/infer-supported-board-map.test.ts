import { describe, expect, it } from 'vitest';
import {
  inferBoardMapFromImportEvidence,
  inferSupportedBoardMapId,
} from './infer-supported-board-map';

describe('inferSupportedBoardMapId', () => {
  it('prefers map-specific board evidence text when OCR includes unique award and milestone labels', () => {
    expect(
      inferSupportedBoardMapId([
        'Awards: Desert Settler, Celebrity',
        'Milestones: Ecologist, Tycoon',
      ]),
    ).toBe('elysium');
  });

  it('recognizes tharsis-specific board evidence from Noctis and award labels', () => {
    expect(
      inferSupportedBoardMapId([
        'Noctis City',
        'Awards: Banker, Thermalist',
      ]),
    ).toBe('tharsis');
  });

  it('returns null when the evidence does not clearly identify one supported map', () => {
    expect(
      inferSupportedBoardMapId([
        'Final situation on the board',
        'City',
        'Greenery',
      ]),
    ).toBeNull();
  });

  it('recognizes Hellas from OCR-style merged labels and Excentric spelling', () => {
    expect(
      inferSupportedBoardMapId([
        'Awards: Excentric, SpaceBaron',
        'Milestones: PolarExplorer, RimSettler',
      ]),
    ).toBe('hellas');
  });

  it('recognizes Elysium from OCR-style merged award and milestone labels', () => {
    expect(
      inferSupportedBoardMapId([
        'Awards: EstateDealer, DesertSettler',
        'Milestones: Generalist, Ecologist',
      ]),
    ).toBe('elysium');
  });

  it('recognizes Tharsis from OCR-style merged landmark and milestone labels', () => {
    expect(
      inferSupportedBoardMapId([
        'NoctisCity',
        'Milestones: Terraformer, Gardener',
      ]),
    ).toBe('tharsis');
  });
});

describe('inferBoardMapFromImportEvidence', () => {
  const hellasLogLines = [
    'Izzy claimed Diversifier milestone',
    'James claimed Tactician milestone',
    'Izzy claimed Energizer milestone',
    'Izzy funded Space Baron award',
    'James funded Excentric award',
    'Izzy funded Contractor award',
  ];
  const elysiumScreenshotLines = [
    'Claimed Generalist milestone',
    'Claimed Tycoon milestone',
    '1st place for Estate Dealer award (funded by Izzy)',
    '1st place for Celebrity award',
    'Claimed Legend milestone',
    '1st place for Benefactor award (funded by James)',
  ];

  it('reports a conflict when the log and the screenshot identify different maps', () => {
    expect(
      inferBoardMapFromImportEvidence({
        logLines: hellasLogLines,
        screenshotLines: elysiumScreenshotLines,
      }),
    ).toEqual({
      kind: 'conflict',
      logMapId: 'hellas',
      screenshotMapId: 'elysium',
    });
  });

  it('detects the log map even when pooled evidence would tie across maps', () => {
    // Regression: a Hellas log paired with an Elysium screenshot used to tie
    // 18-18 in the pooled corpus and read as "no detection" instead of a
    // conflict the player can act on.
    expect(
      inferSupportedBoardMapId([...hellasLogLines, ...elysiumScreenshotLines]),
    ).toBeNull();
    expect(
      inferBoardMapFromImportEvidence({
        logLines: hellasLogLines,
        screenshotLines: [],
      }),
    ).toEqual({ kind: 'detected', mapId: 'hellas' });
  });

  it('detects the map from the screenshot when the log has no map evidence', () => {
    expect(
      inferBoardMapFromImportEvidence({
        logLines: ['Izzy played Development Center'],
        screenshotLines: elysiumScreenshotLines,
      }),
    ).toEqual({ kind: 'detected', mapId: 'elysium' });
  });

  it('detects the shared map when both sources agree', () => {
    expect(
      inferBoardMapFromImportEvidence({
        logLines: hellasLogLines,
        screenshotLines: ['Awards: Excentric, Space Baron'],
      }),
    ).toEqual({ kind: 'detected', mapId: 'hellas' });
  });

  it('returns unknown when neither source has map evidence', () => {
    expect(
      inferBoardMapFromImportEvidence({
        logLines: ['Izzy played Development Center'],
        screenshotLines: ['Victory points breakdown after 12 generations'],
      }),
    ).toEqual({ kind: 'unknown' });
  });
});
