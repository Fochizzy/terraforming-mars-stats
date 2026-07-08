import { describe, expect, it } from 'vitest';
import { inferSupportedBoardMapId } from './infer-supported-board-map';

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
