import { describe, expect, it } from 'vitest';
import type {
  MapAwardOption,
  MapMilestoneOption,
  MapOption,
} from '@/lib/db/reference-repo';
import { parseGameLog } from './parse-game-log';
import { inferImportMapFromLog } from './infer-import-map-from-log';

const mapOptions: MapOption[] = [
  { code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' },
  { code: 'hellas', id: 'map-hellas', name: 'Hellas' },
  { code: 'elysium', id: 'map-elysium', name: 'Elysium' },
];

const milestoneOptions: MapMilestoneOption[] = [
  {
    mapId: 'map-tharsis',
    milestoneId: 'milestone-mayor',
    milestoneName: 'Mayor',
  },
  {
    mapId: 'map-hellas',
    milestoneId: 'milestone-diversifier',
    milestoneName: 'Diversifier',
  },
  {
    mapId: 'map-elysium',
    milestoneId: 'milestone-generalist',
    milestoneName: 'Generalist',
  },
];

const awardOptions: MapAwardOption[] = [
  { awardId: 'award-landlord', awardName: 'Landlord', mapId: 'map-tharsis' },
  { awardId: 'award-space-baron', awardName: 'Space Baron', mapId: 'map-hellas' },
  { awardId: 'award-benefactor', awardName: 'Benefactor', mapId: 'map-elysium' },
];

describe('inferImportMapFromLog', () => {
  it('returns the only map matched by parsed milestone and award labels', () => {
    expect(
      inferImportMapFromLog({
        awardOptions,
        mapOptions,
        milestoneOptions,
        parsedGameLog: parseGameLog(
          [
            'Friday Mars claimed Diversifier milestone',
            'Friday Mars funded Space Baron award',
            'Friday Mars got 1st place for Space Baron award',
          ].join('\n'),
        ),
      }),
    ).toEqual({ mapId: 'map-hellas' });
  });

  it('does not infer a map when parsed labels point to different maps', () => {
    expect(
      inferImportMapFromLog({
        awardOptions,
        mapOptions,
        milestoneOptions,
        parsedGameLog: parseGameLog(
          [
            'Friday Mars claimed Mayor milestone',
            'Second Seat funded Space Baron award',
          ].join('\n'),
        ),
      }),
    ).toBeNull();
  });

  it('does not infer a map when no parsed milestone or award labels match', () => {
    expect(
      inferImportMapFromLog({
        awardOptions,
        mapOptions,
        milestoneOptions,
        parsedGameLog: parseGameLog('Friday Mars played Earth Catapult'),
      }),
    ).toBeNull();
  });
});
