import { describe, expect, it } from 'vitest';
import { buildTerraformingMarsLogEvents } from './build-terraforming-mars-log-events';
import { parseTerraformingMarsTileActions } from './parse-terraforming-mars-tile-actions';

describe('buildTerraformingMarsLogEvents', () => {
  it('preserves line order, generation context, canonical IDs, and raw evidence', () => {
    const exportedLogText = [
      'Good luck Friday!',
      'Generation 1',
      'First player this generation is Friday',
      'Friday played Ecoline',
      'Friday played Asteroid Mining Consortium',
      'Friday claimed Mayor milestone',
      'Friday funded Scientist award',
      'A source line not yet classified',
    ].join('\n');
    const result = buildTerraformingMarsLogEvents({
      exportedLogText,
      objectiveEvidence: [
        {
          candidateEntityIds: ['milestone-mayor'],
          canonicalId: 'milestone-mayor',
          canonicalName: 'Mayor',
          lineNumber: 6,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'mayor',
          originalLine: 'Friday claimed Mayor milestone',
          originalPlayerValue: 'Friday',
          originalValue: 'Mayor',
          resolution: 'exact',
          source: 'exported_log',
          type: 'milestone',
        },
        {
          candidateEntityIds: ['award-scientist'],
          canonicalId: 'award-scientist',
          canonicalName: 'Scientist',
          lineNumber: 7,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'scientist',
          originalLine: 'Friday funded Scientist award',
          originalPlayerValue: 'Friday',
          originalValue: 'Scientist',
          resolution: 'exact',
          source: 'exported_log',
          type: 'award',
        },
      ],
      playedEntityEvidence: [
        {
          candidateEntityIds: ['corp-ecoline'],
          canonicalId: 'corp-ecoline',
          canonicalName: 'Ecoline',
          entityType: 'corporation',
          lineNumber: 4,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'ecoline',
          originalLine: 'Friday played Ecoline',
          originalPlayerValue: 'Friday',
          originalValue: 'Ecoline',
          promoSetSlug: null,
          resolution: 'exact',
        },
        {
          candidateEntityIds: ['card-amc'],
          canonicalId: 'card-amc',
          canonicalName: 'Asteroid Mining Consortium',
          entityType: 'card',
          lineNumber: 5,
          normalizedPlayerValue: 'friday',
          normalizedValue: 'asteroid mining consortium',
          originalLine: 'Friday played Asteroid Mining Consortium',
          originalPlayerValue: 'Friday',
          originalValue: 'Asteroid Mining Consortium',
          promoSetSlug: null,
          resolution: 'exact',
        },
      ],
    });

    expect(result).toMatchObject({
      lineCount: 8,
      parsedLineCount: 7,
      unparsedLineCount: 1,
    });
    expect(result.events.map((event) => event.event_type)).toEqual([
      'player_identified',
      'generation_started',
      'first_player_selected',
      'corporation_selected',
      'card_played',
      'milestone_claimed',
      'award_funded',
    ]);
    expect(result.events[4]).toMatchObject({
      card_id: 'card-amc',
      event_order: 5,
      generation_number: 1,
      raw_line: 'Friday played Asteroid Mining Consortium',
    });
  });

  it('persists known, special, Moon, removal, and unresolved tile evidence', () => {
    const exportedLogText = [
      'Generation 3',
      'A placed Mining Rights tile at 20',
      'A removed Mining Rights tile at 20',
      'B placed a Mine tile at m03',
      'C placed Unreleased Future Tile tile at 12',
    ].join('\n');
    const tileActions = parseTerraformingMarsTileActions(exportedLogText).actions;
    const result = buildTerraformingMarsLogEvents({
      exportedLogText,
      objectiveEvidence: [],
      playedEntityEvidence: [],
      tileActions,
    });

    expect(result.events.map((event) => event.event_type)).toEqual([
      'generation_started',
      'tile_placed',
      'tile_removed',
      'tile_placed',
      'tile_placed',
    ]);
    expect(result.events[1]).toMatchObject({
      board_space: '20',
      generation_number: 3,
      tile_type: 'mining_rights',
    });
    expect(result.events[3]).toMatchObject({ board_space: 'm03', tile_type: 'moon_mine' });
    expect(result.events[4]).toMatchObject({ confidence_level: 'reviewed' });
  });
});
