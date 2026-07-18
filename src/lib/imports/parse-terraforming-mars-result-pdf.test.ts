import { describe, expect, it } from 'vitest';
import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import { buildTerraformingMarsResultPdfParse } from './parse-terraforming-mars-result-pdf';

const catalog: ImportGameReferenceCatalog = {
  aliases: [
    {
      aliasText: 'Amazonis Engineer',
      entityId: 'award-amazonis-engineer',
      entityType: 'award',
    },
  ],
  allAwards: [{ id: 'award-amazonis-engineer', name: 'A. Engineer' }],
  allMilestones: [{ id: 'milestone-polar-explorer', name: 'Polar Explorer' }],
  awards: [
    { awardId: 'award-amazonis-engineer', awardName: 'A. Engineer', mapId: 'map-hellas' },
  ],
  cards: [],
  corporations: [],
  entityAliases: [],
  maps: [{ code: 'hellas', id: 'map-hellas', name: 'Hellas' }],
  milestones: [
    {
      mapId: 'map-hellas',
      milestoneId: 'milestone-polar-explorer',
      milestoneName: 'Polar Explorer',
    },
  ],
  preludes: [],
};

describe('buildTerraformingMarsResultPdfParse', () => {
  it('maps exact PDF scores and approved objective aliases to canonical IDs and log players', () => {
    const result = buildTerraformingMarsResultPdfParse({
      catalog,
      evidence: {
        endgameLayout: 'victory_breakdown',
        endgameLines: [
          'James 44 5 5 7 10 17 88 87',
          'Colette 29 0 2 0 2 25 58 56',
        ],
        generationCount: 10,
        globalParameters: [
          { oceans: 3, oxygen: 4, playerName: 'James', temperature: 5, total: 12 },
        ],
        scoreDetailsColumns: [
          {
            textLines: [
              'James',
              'Claimed Polar Explorer milestone 5',
              '1st place for Amazonis Engineer award 5',
              '(funded by Colette)',
            ],
          },
          {
            textLines: [
              'Colette',
              '2nd place for Amazonis Engineer award 2',
              '(funded by Colette)',
            ],
          },
        ],
      },
      playedEntityEvidence: [],
      players: [
        { normalizedValue: 'james hodnett', originalValue: 'James Hodnett' },
        { normalizedValue: 'colette hodnett', originalValue: 'Colette Hodnett' },
      ],
    });

    expect(result.generationCount).toBe(10);
    expect(result.scoreRows).toEqual([
      expect.objectContaining({
        awardPoints: 5,
        finalMegacredits: 87,
        normalizedPlayerName: 'james hodnett',
        originalPlayerName: 'James Hodnett',
        totalPoints: 88,
      }),
      expect.objectContaining({
        awardPoints: 2,
        finalMegacredits: 56,
        normalizedPlayerName: 'colette hodnett',
        originalPlayerName: 'Colette Hodnett',
        totalPoints: 58,
      }),
    ]);
    expect(result.milestoneClaims).toEqual([
      expect.objectContaining({
        matchedMilestoneId: 'milestone-polar-explorer',
        playerName: 'James',
      }),
    ]);
    expect(result.awardPlacements).toEqual([
      expect.objectContaining({
        fundedByPlayerName: 'Colette',
        matchedAwardId: 'award-amazonis-engineer',
        placement: 1,
        playerName: 'James',
      }),
      expect.objectContaining({
        fundedByPlayerName: 'Colette',
        matchedAwardId: 'award-amazonis-engineer',
        placement: 2,
        playerName: 'Colette',
      }),
    ]);
    expect(result.objectiveEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'result_pdf', type: 'milestone' }),
        expect.objectContaining({
          canonicalName: 'A. Engineer',
          originalValue: 'Amazonis Engineer',
          resolution: 'alias',
          source: 'result_pdf',
          type: 'award',
        }),
      ]),
    );
    expect(result.rawText).toContain('Claimed Polar Explorer milestone 5');
  });
});
