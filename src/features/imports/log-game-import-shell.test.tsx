import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogGameImportShell } from './log-game-import-shell';

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}));

vi.mock('@/lib/ocr/browser-tesseract', () => ({
  recognizeScreenshotInBrowser: vi.fn().mockResolvedValue({
    confidence: 0.98,
    text: 'Friday Mars won by 6 points.',
  }),
}));

describe('LogGameImportShell', () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
  });

  it('creates a draft and routes into the shared log-game flow', async () => {
    const user = userEvent.setup();
    const screenshotFile = new File(['evidence'], 'endgame.png', {
      type: 'image/png',
    });
    const onCreateImportDraft = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-1',
      message: 'Import draft saved.',
    });

    render(
      <LogGameImportShell
        groupName="Friday Group"
        initialValues={{
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
        onCreateImportDraft={onCreateImportDraft}
      />,
    );

    await user.clear(screen.getByLabelText(/played on/i));
    await user.type(screen.getByLabelText(/played on/i), '2026-07-04');
    await user.selectOptions(screen.getByLabelText(/map/i), 'elysium');
    await user.selectOptions(screen.getByLabelText(/player count/i), '3');
    await user.clear(screen.getByLabelText(/generation count/i));
    await user.type(screen.getByLabelText(/generation count/i), '12');
    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.upload(
      screen.getByLabelText(/endgame screenshot/i),
      screenshotFile,
    );
    await user.click(
      await screen.findByRole('button', { name: /save import draft/i }),
    );

    await waitFor(() =>
      expect(onCreateImportDraft).toHaveBeenCalledWith({
        endgameScreenshot: screenshotFile,
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: 'Friday Mars won by 6 points.',
        generationCount: 12,
        mapId: 'elysium',
        ocrConfidence: 0.98,
        playedOn: '2026-07-04',
        playerCount: 3,
        rawOcrText: 'Friday Mars won by 6 points.',
      }),
    );

    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith('/log-game?gameId=game-1'),
    );
  });

  it('shows an error message and does not route when import persistence fails', async () => {
    const user = userEvent.setup();
    const onCreateImportDraft = vi
      .fn()
      .mockRejectedValue(new Error('Storage upload failed.'));

    render(
      <LogGameImportShell
        groupName="Friday Group"
        initialValues={{
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
        onCreateImportDraft={onCreateImportDraft}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.click(
      await screen.findByRole('button', { name: /save import draft/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/storage upload failed/i)).toBeInTheDocument(),
    );
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });
});
