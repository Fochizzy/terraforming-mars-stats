import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import { WebImportPage } from './web-import-page';

// Candidates carry only public fields (F-01). Unlinked guests are surfaced by a
// neutral public label; the private personal name never reaches the browser, so
// only linked players can be auto-matched from the log by public username.
const playerCandidates = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    isAccessible: true,
    isLinked: true,
    publicName: 'FridayMars',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    isAccessible: true,
    isLinked: false,
    publicName: 'Second Seat',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    isAccessible: true,
    isLinked: false,
    publicName: 'Third Seat',
  },
];

const referenceCatalog: ImportGameReferenceCatalog = {
  aliases: [],
  allAwards: ['Landlord', 'Scientist', 'Banker', 'Thermalist', 'Miner'].map(
    (name) => ({ id: `award-${name}`, name }),
  ),
  allMilestones: ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner'].map(
    (name) => ({ id: `milestone-${name}`, name }),
  ),
  awards: ['Landlord', 'Scientist', 'Banker', 'Thermalist', 'Miner'].map(
    (name) => ({
      awardId: `award-${name}`,
      awardName: name,
      mapId: 'map-tharsis',
    }),
  ),
  cards: [
    {
      cardName: 'Directed Impactors',
      cardNumber: 'X42',
      expansionCode: 'promo',
      id: 'card-directed-impactors',
      promoSetSlug: '2022-promos',
    },
  ],
  corporations: [],
  entityAliases: [],
  maps: [{ code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' }],
  milestones: ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner'].map(
    (name) => ({
      mapId: 'map-tharsis',
      milestoneId: `milestone-${name}`,
      milestoneName: name,
    }),
  ),
  preludes: [],
};

const exportedLog = [
  'Good luck FridayMars!',
  'Good luck Second Seat!',
  'Good luck Third Seat!',
  'Generation 1',
  'Generation 12',
  'FridayMars claimed Mayor milestone',
  'Second Seat funded Scientist award',
].join('\n');

vi.mock('@/lib/ocr/browser-tesseract', () => {
  const rows = [
    ['FridayMars', '40', '5', '5', '12', '8', '20', '90', '12'],
    ['Second', 'Seat', '39', '5', '5', '10', '7', '19', '85', '10'],
    ['Third', 'Seat', '38', '5', '5', '9', '6', '17', '80', '8'],
  ];
  return {
    recognizeScreenshotInBrowser: vi.fn().mockResolvedValue({
      confidence: 0.98,
      text: 'Victory point breakdown after 12 generations',
      words: rows.flatMap((row, rowIndex) =>
        row.map((text, wordIndex) => ({
          confidence: 0.98,
          height: 20,
          left: wordIndex * 100,
          lineKey: String(rowIndex),
          text,
          top: rowIndex * 30,
          width: 80,
        })),
      ),
    }),
  };
});

function renderPage(onStartImport = vi.fn()) {
  return render(
    <WebImportPage
      groupName="Friday Group"
      playerCandidates={playerCandidates}
      referenceCatalog={referenceCatalog}
      onStartImport={onStartImport}
    />,
  );
}

describe('WebImportPage', () => {
  it('asks only for result evidence and the complete log before detection', () => {
    renderPage();

    expect(screen.getByLabelText(/end-game screenshot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/complete exported game log/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^played on$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^map$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^player count$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^generation count$/i)).not.toBeInTheDocument();
  });

  it('links the game-log guide and explains that objective setup is independent of map detection', () => {
    renderPage();

    expect(
      screen.getByRole('link', { name: /how to get your game log/i }),
    ).toHaveAttribute('href', '/import-instructions');
    expect(
      screen.getByText(
        /randomized objectives remain independent from map detection/i,
      ),
    ).toBeInTheDocument();
  });

  it('auto-matches only the linked player and requires explicit guest resolution', async () => {
    const user = userEvent.setup();
    const onStartImport = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });
    renderPage(onStartImport);

    const screenshot = new File(['evidence'], 'endgame.png', {
      lastModified: new Date(2026, 6, 4).getTime(),
      type: 'image/png',
    });

    await user.upload(screen.getByLabelText(/end-game screenshot/i), screenshot);
    fireEvent.change(screen.getByLabelText(/complete exported game log/i), {
      target: { value: exportedLog },
    });

    // The importer confirms the objective setup; board-defined objectives then
    // identify the map, so no ocean evidence is needed for this fixture.
    await user.selectOptions(
      await screen.findByLabelText(/objective setup/i),
      'board_defined',
    );

    expect(
      await screen.findByLabelText(/detected map — verify or correct/i),
    ).toHaveValue('map-tharsis');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Only the linked player is auto-matched by public username. Unlinked guests
    // are never matched from private data in the browser, so each must be
    // resolved explicitly by the importer.
    expect(
      screen.getByText(/linked registered player: FridayMars/i),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText(/imported player 2 existing player/i),
      '22222222-2222-4222-8222-222222222222',
    );
    await user.selectOptions(
      screen.getByLabelText(/imported player 3 existing player/i),
      '33333333-3333-4333-8333-333333333333',
    );

    expect(
      screen.getByText(/existing unlinked guest confirmed: Second Seat/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/existing unlinked guest confirmed: Third Seat/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /save verified import draft/i }),
    );

    await waitFor(() =>
      expect(onStartImport).toHaveBeenCalledWith(expect.objectContaining({
        endgameScreenshot: screenshot,
        exportedGameLog: exportedLog,
        generationCount: 12,
        mapId: 'map-tharsis',
        objectiveConfiguration: 'board_defined',
        ocrConfidence: 0.98,
        playedOn: '2026-07-04',
        playerIdentities: [
          {
            mode: 'existing_player',
            selectedPlayerId: '11111111-1111-4111-8111-111111111111',
            sourcePlayerText: 'FridayMars',
            valueSource: 'imported',
          },
          {
            mode: 'existing_player',
            selectedPlayerId: '22222222-2222-4222-8222-222222222222',
            sourcePlayerText: 'Second Seat',
            valueSource: 'user_corrected',
          },
          {
            mode: 'existing_player',
            selectedPlayerId: '33333333-3333-4333-8333-333333333333',
            sourcePlayerText: 'Third Seat',
            valueSource: 'user_corrected',
          },
        ],
        playerCount: 3,
        rawOcrText: 'Victory point breakdown after 12 generations',
        scoreRows: expect.arrayContaining([
          expect.objectContaining({
            normalizedPlayerName: 'fridaymars',
            totalPoints: 90,
          }),
        ]),
      })),
    );

    expect(screen.getByText(/import draft saved/i)).toBeInTheDocument();
  });

  it('corrects unknown objectives and played cards from canonical review lists', async () => {
    const user = userEvent.setup();
    const onStartImport = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });
    renderPage(onStartImport);

    const screenshot = new File(['evidence'], 'corrected-endgame.png', {
      lastModified: new Date(2026, 6, 5).getTime(),
      type: 'image/png',
    });
    const logWithUnknownValues = [
      'Good luck FridayMars!',
      'Generation 12',
      'FridayMars claimed Mayor milestone',
      'FridayMars funded Imaginary Award award',
      'FridayMars played Totally Unknown Card',
    ].join('\n');

    await user.upload(screen.getByLabelText(/end-game screenshot/i), screenshot);
    fireEvent.change(screen.getByLabelText(/complete exported game log/i), {
      target: { value: logWithUnknownValues },
    });
    await user.selectOptions(
      await screen.findByLabelText(/objective setup/i),
      'board_defined',
    );
    await user.selectOptions(
      await screen.findByLabelText(/correct award imaginary award/i),
      'award-Scientist',
    );
    await user.selectOptions(
      screen.getByLabelText(/correct played value totally unknown card/i),
      'card:card-directed-impactors',
    );
    await user.click(
      screen.getByRole('button', { name: /save verified import draft/i }),
    );

    await waitFor(() =>
      expect(onStartImport).toHaveBeenCalledWith(
        expect.objectContaining({
          objectiveCorrections: [
            {
              canonicalId: 'award-Scientist',
              lineNumber: 4,
              source: 'exported_log',
              type: 'award',
            },
          ],
          playedEntityCorrections: [
            {
              canonicalId: 'card-directed-impactors',
              entityType: 'card',
              lineNumber: 5,
            },
          ],
        }),
      ),
    );
  });
});
