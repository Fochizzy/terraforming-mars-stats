import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WebImportPage } from './web-import-page';

vi.mock('@/lib/ocr/browser-tesseract', () => ({
  recognizeScreenshotInBrowser: vi.fn().mockResolvedValue({
    confidence: 0.98,
    text: 'Friday Mars won by 6 points.',
  }),
}));

describe('WebImportPage', () => {
  it('renders the protected import workflow fields', () => {
    render(
      <WebImportPage
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
        onStartImport={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /web import/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/exported game log/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/endgame screenshot/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save import draft/i }),
    ).toBeInTheDocument();
  });

  it('submits the structured import draft payload', async () => {
    const user = userEvent.setup();
    const onStartImport = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    render(
      <WebImportPage
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
        onStartImport={onStartImport}
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

    const screenshot = new File(['evidence'], 'endgame.png', {
      type: 'image/png',
    });

    await user.upload(screen.getByLabelText(/endgame screenshot/i), screenshot);
    await user.click(
      await screen.findByRole('button', { name: /save import draft/i }),
    );

    await waitFor(() =>
      expect(onStartImport).toHaveBeenCalledWith({
        endgameScreenshot: screenshot,
        exportedGameLog: 'Friday Mars won by 6 points.',
        generationCount: 12,
        mapId: 'elysium',
        ocrConfidence: 0.98,
        playedOn: '2026-07-04',
        playerCount: 3,
        rawOcrText: 'Friday Mars won by 6 points.',
      }),
    );

    expect(screen.getByText(/import draft saved/i)).toBeInTheDocument();
  });
});
