import { describe, expect, it } from 'vitest';
import { buildImportedBoardState } from './build-imported-board-state';
import { parseTerraformingMarsTileActions } from './parse-terraforming-mars-tile-actions';

describe('buildImportedBoardState', () => {
  it('reconstructs the final Mars and Moon board state in log order', () => {
    const parsed = parseTerraformingMarsTileActions(
      [
        'A placed ocean tile at 34',
        'B placed Mining Rights tile at 20',
        'B removed Mining Rights tile at 20',
        'C placed city tile at 20',
        'D placed a Mine tile at m03',
      ].join('\n'),
    );
    const state = buildImportedBoardState(parsed.actions);

    expect(state.actionCount).toBe(5);
    expect(state.conflicts).toEqual([]);
    expect(state.occupiedSpaces.map((space) => `${space.board}:${space.spaceId}:${space.currentTile?.canonicalTileCode}`)).toEqual([
      'mars:20:city',
      'mars:34:ocean',
      'moon:m03:moon_mine',
    ]);
  });

  it('keeps contradictory and unknown actions reviewable', () => {
    const parsed = parseTerraformingMarsTileActions(
      [
        'A placed city tile at 20',
        'B placed Unreleased Future Tile tile at 20',
        'B removed ocean tile at 20',
      ].join('\n'),
    );
    const state = buildImportedBoardState(parsed.actions);
    expect(state.unknownTileTypeCount).toBe(1);
    expect(state.conflicts.map((conflict) => conflict.reason)).toEqual([
      'placement_without_removal',
      'removal_mismatch',
    ]);
    expect(state.spaces[0].history).toHaveLength(3);
  });
});
