import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import { LogGameImportShell } from './log-game-import-shell';

const playerCandidates = [
  {
    firstName: null,
    guestUsername: null,
    id: '11111111-1111-4111-8111-111111111111',
    identityMode: null,
    isAccessible: true,
    isLinked: true,
    lastName: null,
    normalizedPersonalName: null,
    normalizedUsername: 'fridaymars',
    publicName: 'FridayMars',
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
    (name) => ({ awardId: `award-${name}`, awardName: name, mapId: 'map-tharsis' }),
  ),
  cards: [],
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
  'Generation 1',
  'Generation 12',
  'FridayMars claimed Mayor milestone',
  'FridayMars funded Scientist award',
].join('\n');

const navigationMocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationMocks.push }),
}));

vi.mock('@/lib/ocr/browser-tesseract', () => ({
  recognizeScreenshotInBrowser: vi.fn().mockResolvedValue({
    confidence: 0.98,
    text: 'Victory point breakdown after 12 generations',
    words: ['FridayMars', '40', '5', '5', '12', '8', '20', '90', '12'].map(
      (text, index) => ({
        confidence: 0.98,
        height: 20,
        left: index * 100,
        lineKey: '1',
        text,
        top: 30,
        width: 80,
      }),
    ),
  }),
}));

function renderShell(
  onCreateImportDraft: Parameters<typeof LogGameImportShell>[0]['onCreateImportDraft'],
) {
  return render(
    <LogGameImportShell
      groupName="Friday Group"
      playerCandidates={playerCandidates}
      referenceCatalog={referenceCatalog}
      onCreateImportDraft={onCreateImportDraft}
    />,
  );
}

describe('LogGameImportShell', () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
  });

  it('creates a parsed draft and routes into the shared verification flow', async () => {
    const user = userEvent.setup();
    const screenshotFile = new File(['evidence'], 'endgame.png', {
      lastModified: new Date(2026, 6, 4).getTime(),
      type: 'image/png',
    });
    const onCreateImportDraft = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-1',
      message: 'Import draft saved.',
    });
    renderShell(onCreateImportDraft);

    await user.upload(screen.getByLabelText(/end-game screenshot/i), screenshotFile);
    // Paste rather than type: typing re-parses the log on every keystroke, which
    // made the following findByText time out under parallel test load.
    await user.click(screen.getByLabelText(/complete exported game log/i));
    await user.paste(exportedLog);
    expect(
      await screen.findByText(/linked registered player: FridayMars/i),
    ).toBeInTheDocument();
    await user.selectOptions(
      await screen.findByLabelText(/objective setup/i),
      'board_defined',
    );
    await user.click(
      await screen.findByRole('button', { name: /save verified import draft/i }),
    );

    await waitFor(() =>
      expect(onCreateImportDraft).toHaveBeenCalledWith(expect.objectContaining({
        endgameScreenshot: screenshotFile,
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: exportedLog,
        generationCount: 12,
        mapId: 'map-tharsis',
        ocrConfidence: 0.98,
        playedOn: '2026-07-04',
        playerIdentities: [
          {
            mode: 'existing_player',
            selectedPlayerId: playerCandidates[0].id,
            sourcePlayerText: 'FridayMars',
            valueSource: 'imported',
          },
        ],
        playerCount: 1,
        rawOcrText: 'Victory point breakdown after 12 generations',
        scoreRows: expect.arrayContaining([
          expect.objectContaining({ totalPoints: 90, trPoints: 40 }),
        ]),
      })),
    );

    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith('/log-game?gameId=game-1'),
    );
  });

  it('shows persistence errors without routing', async () => {
    const user = userEvent.setup();
    const onCreateImportDraft = vi.fn().mockRejectedValue(
      new Error('Storage upload failed.'),
    );
    renderShell(onCreateImportDraft);

    const screenshotFile = new File(['evidence'], 'endgame.png', {
      lastModified: new Date(2026, 6, 4).getTime(),
      type: 'image/png',
    });
    await user.upload(screen.getByLabelText(/end-game screenshot/i), screenshotFile);
    // Paste rather than type: typing re-parses the log on every keystroke, which
    // made the following findByText time out under parallel test load.
    await user.click(screen.getByLabelText(/complete exported game log/i));
    await user.paste(exportedLog);
    expect(
      await screen.findByText(/linked registered player: FridayMars/i),
    ).toBeInTheDocument();
    await user.selectOptions(
      await screen.findByLabelText(/objective setup/i),
      'board_defined',
    );
    await user.click(
      await screen.findByRole('button', { name: /save verified import draft/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/storage upload failed/i)).toBeInTheDocument(),
    );
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });
});
