import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getImportErrorMessage, WebImportPage } from './web-import-page';

const browserReadMocks = vi.hoisted(() => ({
  readGameResultScreenshotInBrowser: vi.fn(),
}));

vi.mock('@/lib/imports/ocr/read-game-result-screenshot-in-browser', () => ({
  readGameResultScreenshotInBrowser:
    browserReadMocks.readGameResultScreenshotInBrowser,
}));

const review = {
  boardReviewItems: [
    {
      cardName: 'Commercial District',
      itemType: 'card' as const,
      mapId: 'tharsis',
      notes: [
        'The city placement from Commercial District could not be linked safely from the imported log.',
      ],
      playerName: 'Friday Mars',
      sourceType: 'log_and_board' as const,
      status: 'review_needed' as const,
    },
  ],
  detectedParticipantNames: ['Friday Mars'],
  drawInfoLineCount: 1,
  ignoredLineCount: 2,
  logScoreCandidates: [
    {
      awardPoints: 2,
      milestonePoints: 5,
      playerName: 'Friday Mars',
      totalPoints: 61,
      trPoints: 18,
    },
  ],
  parsedEventCount: 3,
  playerLinks: [
    {
      candidates: [
        {
          displayName: 'Friday Mars',
          gamesPlayed: 11,
          id: 'player-1',
          linkedFullName: 'Friday Mars',
          linkedUsername: 'friday-mars',
          matchReason: 'display_name_exact' as const,
          matchScore: 400,
        },
        {
          displayName: 'Second Seat',
          gamesPlayed: 4,
          id: 'player-2',
          linkedFullName: null,
          linkedUsername: null,
          matchReason: 'fallback' as const,
          matchScore: 0,
        },
      ],
      importedName: 'Friday Mars',
      requiresConfirmation: false,
      selectedPlayerId: 'player-1',
      status: 'exact' as const,
    },
    {
      candidates: [
        {
          displayName: 'Second Seat',
          gamesPlayed: 4,
          id: 'player-2',
          linkedFullName: null,
          linkedUsername: null,
          matchReason: 'fallback' as const,
          matchScore: 0,
        },
        {
          displayName: 'Third Seat',
          gamesPlayed: 2,
          id: 'player-3',
          linkedFullName: null,
          linkedUsername: null,
          matchReason: 'fallback' as const,
          matchScore: 0,
        },
      ],
      importedName: 'Unknown Friend',
      requiresConfirmation: true,
      selectedPlayerId: null,
      status: 'unmatched' as const,
    },
  ],
  requiresPlayerConfirmation: true,
  scoreCrossChecks: [
    {
      conflictingFields: ['totalPoints'],
      matchingFields: ['awardPoints', 'milestonePoints', 'trPoints'],
      playerName: 'Friday Mars',
      status: 'conflict' as const,
    },
  ],
  scoreCandidates: [{ playerName: 'Friday Mars', totalPoints: 62, trPoints: 18 }],
};

describe('WebImportPage', () => {
  beforeEach(() => {
    browserReadMocks.readGameResultScreenshotInBrowser.mockReset();
    browserReadMocks.readGameResultScreenshotInBrowser.mockRejectedValue(
      new Error('The file could not be read.'),
    );
  });

  it('renders the protected import workflow fields', () => {
    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /web import/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/exported game log/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/participants/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/single upload mode/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
    expect(
      screen.getByRole('button', { name: /show upload instructions/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open full guide/i })).toHaveAttribute(
      'href',
      'https://tm-import-instructions-20260714.izzy-hodnett-1470.chatgpt.site',
    );
    expect(
      screen.getByText(
        /only one image is needed here\. board screenshots are no longer part of this import flow\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^board screenshots$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^map$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/player count/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/generation count/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /save import draft/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    ).toBeInTheDocument();
  });

  it('opens upload instructions in an internal dialog without leaving the import page', async () => {
    const user = userEvent.setup();

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /show upload instructions/i }),
    );

    const dialog = screen.getByRole('dialog', {
      name: /web import upload instructions/i,
    });

    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /complete the web import/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /this reader cannot use randomized milestones, awards, or tiles/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open full guide in a new tab/i }),
    ).toHaveAttribute(
      'href',
      'https://tm-import-instructions-20260714.izzy-hodnett-1470.chatgpt.site',
    );

    await user.click(
      screen.getByRole('button', { name: /close upload instructions/i }),
    );

    expect(
      screen.queryByRole('dialog', {
        name: /web import upload instructions/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('places the player list below both import upload sections', () => {
    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    const gameLogHeading = screen.getByRole('heading', { name: /game log/i });
    const screenshotHeading = screen.getByRole('heading', {
      name: /game result screenshot/i,
    });
    const participantsHeading = screen.getByRole('heading', {
      name: /participants/i,
    });

    expect(
      gameLogHeading.compareDocumentPosition(participantsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screenshotHeading.compareDocumentPosition(participantsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('focuses the exported game log textarea when the game log panel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    const exportedGameLog = screen.getByLabelText(/exported game log/i);

    exportedGameLog.blur();
    expect(exportedGameLog).not.toHaveFocus();

    await user.click(screen.getByText(/exported game log feed/i));

    expect(exportedGameLog).toHaveFocus();
  });

  it('loads a dropped game log file into the game log dropzone', async () => {
    const user = userEvent.setup();
    const droppedLog = new File(
      ['Friday Mars played Steel Works.\nFriday Mars funded Benefactor.'],
      'terraforming-mars-log.txt',
      { type: 'text/plain' },
    );
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    const exportedGameLogDropzone = screen.getByLabelText(
      /import log file dropzone/i,
    );
    const exportedGameLog = screen.getByLabelText(/exported game log/i);

    fireEvent.drop(exportedGameLogDropzone, {
      dataTransfer: {
        files: [droppedLog],
      },
    });

    await waitFor(() =>
      expect(exportedGameLog).toHaveValue(
        'Friday Mars played Steel Works.\nFriday Mars funded Benefactor.',
      ),
    );

    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const submittedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0];

    expect(submittedFormData.get('exportedGameLog')).toBe(
      'Friday Mars played Steel Works.\nFriday Mars funded Benefactor.',
    );
  });

  it('focuses the game result screenshot panel and attaches a pasted screenshot there', async () => {
    const user = userEvent.setup();
    const pastedScreenshot = new File(['clipboard-image'], 'pasted-scoreboard.png', {
      type: 'image/png',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    const pasteTarget = screen.getByLabelText(/paste target for game result screenshot/i);

    await user.click(pasteTarget);
    expect(pasteTarget).toHaveFocus();

    fireEvent.paste(pasteTarget, {
      clipboardData: {
        files: [pastedScreenshot],
        items: [
          {
            getAsFile: () => pastedScreenshot,
            kind: 'file',
            type: 'image/png',
          },
        ],
      },
    });

    expect(
      screen.getByText(
        /attached game result screenshot: pasted-scoreboard\.png/i,
      ),
    ).toBeInTheDocument();
  });

  it('accepts a dragged game result screenshot and submits it as the only image evidence', async () => {
    const user = userEvent.setup();
    const draggedScreenshot = new File(['clipboard-image'], 'pasted-board.png', {
      type: 'image/png',
    });
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    const pasteTarget = screen.getByLabelText(/paste target for game result screenshot/i);

    await user.click(pasteTarget);
    expect(pasteTarget).toHaveFocus();

    fireEvent.drop(pasteTarget, {
      dataTransfer: {
        files: [draggedScreenshot],
      },
    });

    expect(
      screen.getByText(/attached game result screenshot: pasted-board\.png/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const submittedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0];

    expect(submittedFormData.get('endgameScreenshot')).toBe(draggedScreenshot);
    expect(submittedFormData.getAll('boardScreenshots')).toEqual([]);
  });

  it('accepts a dropped game result PDF without image preview', async () => {
    const droppedPdf = new File(['%PDF-1.4'], 'game-4.pdf', {
      type: 'application/pdf',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    fireEvent.drop(
      screen.getByLabelText(/paste target for game result screenshot/i),
      { dataTransfer: { files: [droppedPdf] } },
    );

    expect(
      screen.getByText(/attached game result pdf: game-4\.pdf/i),
    ).toBeInTheDocument();
    // A PDF has no image preview, so the panel explains itself instead.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/no ocr is needed/i)).toBeInTheDocument();
  });

  it('keeps a parsed PDF out of action payloads after browser analysis', async () => {
    const user = userEvent.setup();
    const parsedPdfPayload = {
      endgameLayout: 'victory_breakdown' as const,
      endgameLines: [
        'Victory points breakdown after 10 generations',
        'Friday Mars 18 5 2 0 0 1 26 8',
      ],
      generationCount: 10,
      globalParameters: [],
      scoreDetailsColumns: [
        {
          textLines: ['Friday Mars', 'Builder Hall 1'],
        },
      ],
    };
    const pdf = new File(['%PDF-1.4'], 'game-4.pdf', {
      type: 'application/pdf',
    });
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review: {
        ...review,
        playerLinks: [review.playerLinks[0]],
        requiresPlayerConfirmation: false,
      },
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    browserReadMocks.readGameResultScreenshotInBrowser.mockResolvedValue(
      parsedPdfPayload,
    );

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Builder Hall.',
    );
    await user.type(screen.getByLabelText(/participants/i), 'Friday Mars');
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      pdf,
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const analyzedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0] as FormData;
    expect(analyzedFormData.get('endgameScreenshot')).toBeNull();
    expect(JSON.parse(String(analyzedFormData.get('screenshotOcr')))).toMatchObject({
      endgameLines: parsedPdfPayload.endgameLines,
    });

    await user.click(
      await screen.findByRole('button', { name: /confirm import draft/i }),
    );

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const confirmedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    expect(confirmedFormData.get('endgameScreenshot')).toBeNull();
    expect(JSON.parse(String(confirmedFormData.get('screenshotOcr')))).toMatchObject({
      endgameLines: parsedPdfPayload.endgameLines,
    });
    expect(
      browserReadMocks.readGameResultScreenshotInBrowser,
    ).toHaveBeenCalledTimes(1);
  });

  it('keeps parsed screenshot files in action payloads for evidence storage', async () => {
    const user = userEvent.setup();
    const parsedScreenshotPayload = {
      endgameLines: [
        'Victory points breakdown after 10 generations',
        'Friday Mars 18 5 2 0 0 1 26 8',
      ],
      generationCount: 10,
      scoreDetailsColumns: [],
    };
    const screenshot = new File(['image-bits'], 'game-4.png', {
      type: 'image/png',
    });
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review: {
        ...review,
        playerLinks: [review.playerLinks[0]],
        requiresPlayerConfirmation: false,
      },
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    browserReadMocks.readGameResultScreenshotInBrowser.mockResolvedValue(
      parsedScreenshotPayload,
    );

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Builder Hall.',
    );
    await user.type(screen.getByLabelText(/participants/i), 'Friday Mars');
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      screenshot,
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const analyzedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0] as FormData;
    expect(analyzedFormData.get('endgameScreenshot')).toBe(screenshot);

    await user.click(
      await screen.findByRole('button', { name: /confirm import draft/i }),
    );

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const confirmedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    expect(confirmedFormData.get('endgameScreenshot')).toBe(screenshot);
    expect(JSON.parse(String(confirmedFormData.get('screenshotOcr')))).toMatchObject({
      endgameLines: parsedScreenshotPayload.endgameLines,
    });
  });

  it('offers both images and PDFs in the file picker', async () => {
    const user = userEvent.setup();
    const pdf = new File(['%PDF-1.4'], 'game-4.pdf', {
      type: 'application/pdf',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText(/^game result screenshot or pdf$/i);
    const accept = fileInput.getAttribute('accept') ?? '';

    expect(accept).toContain('image/*');
    expect(accept).toContain('application/pdf');

    await user.upload(fileInput, pdf);

    expect(
      screen.getByText(/attached game result pdf: game-4\.pdf/i),
    ).toBeInTheDocument();
  });

  it('reports an unreadable PDF locally instead of submitting it', async () => {
    const user = userEvent.setup();
    // Not a readable PDF, so the in-browser read throws the way a corrupt or
    // unsupported export does.
    const unreadablePdf = new File(['%PDF-1.4 not really'], 'game-5.pdf', {
      type: 'application/pdf',
    });
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    fireEvent.drop(
      screen.getByLabelText(/paste target for game result screenshot/i),
      { dataTransfer: { files: [unreadablePdf] } },
    );

    expect(
      screen.queryByTestId('screenshot-read-error'),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('screenshot-read-error')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('screenshot-read-error')).toHaveTextContent(
      /reading this file in your browser failed/i,
    );
    expect(
      screen.getByText(/pdf could not be read in your browser/i),
    ).toBeInTheDocument();
    expect(onAnalyzeImportEvidence).not.toHaveBeenCalled();
  });

  it('clears a previous read failure when another file is attached', async () => {
    const user = userEvent.setup();
    const unreadablePdf = new File(['%PDF-1.4 not really'], 'game-5.pdf', {
      type: 'application/pdf',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={vi.fn().mockResolvedValue({
          status: 'success' as const,
          message: 'Import evidence analyzed.',
          review,
        })}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    fireEvent.drop(
      screen.getByLabelText(/paste target for game result screenshot/i),
      { dataTransfer: { files: [unreadablePdf] } },
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('screenshot-read-error')).toBeInTheDocument(),
    );

    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['%PDF-1.4 still not really'], 'game-6.pdf', {
        type: 'application/pdf',
      }),
    );

    expect(
      screen.queryByTestId('screenshot-read-error'),
    ).not.toBeInTheDocument();
  });

  it('analyzes the structured import payload and shows the review before confirmation', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });
    const onConfirmImportReview = vi.fn();

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.clear(screen.getByLabelText(/played on/i));
    await user.type(screen.getByLabelText(/played on/i), '2026-07-04');
    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Second Seat{enter}Third Seat',
    );

    const screenshot = new File(['evidence'], 'game-result.png', {
      type: 'image/png',
    });

    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      screenshot,
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const submittedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0];

    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get('playedOn')).toBe('2026-07-04');
    expect(submittedFormData.get('playerCount')).toBe('3');
    expect(submittedFormData.get('mapId')).toBeNull();
    expect(submittedFormData.get('generationCount')).toBeNull();
    expect(submittedFormData.get('exportedGameLog')).toBe(
      'Friday Mars won by 6 points.',
    );
    expect(submittedFormData.get('participants')).toBe(
      ['Friday Mars', 'Second Seat', 'Third Seat'].join('\n'),
    );
    expect(submittedFormData.get('endgameScreenshot')).toBe(screenshot);
    expect(submittedFormData.getAll('boardScreenshots')).toEqual([]);

    expect(screen.getByText(/import evidence analyzed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/parsed 3 actionable log events and ignored 2 filler lines/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/friday mars: log and screenshot disagree on total/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Friday Mars: 62 total/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/match imported player friday mars/i),
    ).toBeInTheDocument();
    expect(onConfirmImportReview).not.toHaveBeenCalled();
  });

  it('requires every imported player to have a selected roster player before confirmation', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Unknown Friend',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    const confirmButton = await screen.findByRole('button', {
      name: /confirm import draft/i,
    });

    expect(confirmButton).toBeDisabled();

    await user.selectOptions(
      screen.getByLabelText(/match imported player unknown friend/i),
      'player-2',
    );

    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const submittedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    expect(JSON.parse(String(submittedFormData.get('confirmedPlayerLinks')))).toEqual([
      { importedName: 'Friday Mars', playerId: 'player-1' },
      { importedName: 'Unknown Friend', playerId: 'player-2' },
    ]);
  });

  it('creates a new roster player from an unmatched import row and selects it', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });
    const onCreateImportPlayer = vi.fn().mockResolvedValue({
      createdPlayer: {
        displayName: 'Unknown Friend',
        id: 'player-new',
      },
      message: 'Player added to the shared roster.',
      status: 'success' as const,
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={onCreateImportPlayer}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Unknown Friend',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    const confirmButton = await screen.findByRole('button', {
      name: /confirm import draft/i,
    });
    expect(confirmButton).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: /create player unknown friend/i }),
    );

    await waitFor(() =>
      expect(onCreateImportPlayer).toHaveBeenCalledWith(
        'Unknown Friend',
        'Unknown Friend',
        '',
      ),
    );

    expect(
      await screen.findByText(/player added to the shared roster\./i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/match imported player unknown friend/i)).toHaveValue(
      'player-new',
    );
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const submittedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    expect(JSON.parse(String(submittedFormData.get('confirmedPlayerLinks')))).toEqual([
      { importedName: 'Friday Mars', playerId: 'player-1' },
      { importedName: 'Unknown Friend', playerId: 'player-new' },
    ]);
    // The matched row carries the candidate's username/full name by default; the
    // created row carries the identity that was created for it.
    expect(JSON.parse(String(submittedFormData.get('playerIdentities')))).toEqual([
      { fullName: 'Friday Mars', importedName: 'Friday Mars', username: 'friday-mars' },
      { fullName: '', importedName: 'Unknown Friend', username: 'Unknown Friend' },
    ]);
  });

  it('lets the reviewer override a matched player username and full name', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    render(
      <WebImportPage
        initialValues={{ playedOn: '2026-07-03' }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Unknown Friend',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    const usernameInput = await screen.findByLabelText(
      /username for friday mars/i,
    );
    expect(usernameInput).toHaveValue('friday-mars');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'friday-2');

    // Match the unmatched row so confirm is enabled.
    await user.selectOptions(
      screen.getByLabelText(/match imported player unknown friend/i),
      'player-2',
    );

    await user.click(
      screen.getByRole('button', { name: /confirm import draft/i }),
    );

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const submittedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    const submittedIdentities = JSON.parse(
      String(submittedFormData.get('playerIdentities')),
    );
    expect(submittedIdentities).toContainEqual({
      fullName: 'Friday Mars',
      importedName: 'Friday Mars',
      username: 'friday-2',
    });
  });

  it('shows unresolved curated board items and lets the user select a manual fill jump target', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review: {
        ...review,
        playerLinks: [review.playerLinks[0]],
        requiresPlayerConfirmation: false,
      },
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Commercial District.',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    expect(
      await screen.findByRole('button', {
        name: /fill manually commercial district for friday mars/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /fill manually commercial district for friday mars/i,
      }),
    );

    expect(
      screen.getByText(
        /after the draft is created, we'll jump to friday mars total card points so you can fill them manually\./i,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /confirm import draft/i }),
    );

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    expect(onConfirmImportReview.mock.calls[0]?.[1]).toEqual({
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerId: 'player-1',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });
  });

  it('auto-fills detected log participants when the manual field is blank', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review: {
        ...review,
        detectedParticipantNames: ['Friday Mars', 'Second Seat'],
        playerLinks: [
          review.playerLinks[0],
          {
            ...review.playerLinks[1],
            candidates: [review.playerLinks[1].candidates[0]],
            importedName: 'Second Seat',
            selectedPlayerId: 'player-2',
            status: 'suggested' as const,
          },
        ],
      },
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Earth Catapult.',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(screen.getByLabelText(/participants/i)).toHaveValue(
        'Friday Mars\nSecond Seat',
      ),
    );

    await user.click(
      await screen.findByRole('button', { name: /confirm import draft/i }),
    );

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const submittedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get('participants')).toBe(
      ['Friday Mars', 'Second Seat'].join('\n'),
    );
  });

  it('submits a player count derived from the larger of detected log names and screenshot rows', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review: {
        ...review,
        detectedParticipantNames: ['Friday Mars', 'Second Seat'],
        playerLinks: [review.playerLinks[0]],
        requiresPlayerConfirmation: false,
        scoreCandidates: [
          { playerName: 'Friday Mars', totalPoints: 62, trPoints: 18 },
          { playerName: 'Second Seat', totalPoints: 58, trPoints: 20 },
          { playerName: 'Third Seat', totalPoints: 55, trPoints: 19 },
        ],
      },
    });
    const onConfirmImportReview = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import draft saved.',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Earth Catapult.',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const analyzedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0] as FormData;
    expect(analyzedFormData.get('playerCount')).toBe('1');

    await user.click(
      await screen.findByRole('button', { name: /confirm import draft/i }),
    );

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const submittedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get('playerCount')).toBe('3');
  });

  it('attaches a pasted screenshot from the clipboard', async () => {
    const user = userEvent.setup();
    const pastedScreenshot = new File(['clipboard-image'], 'pasted-scoreboard.png', {
      type: 'image/png',
    });
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review,
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Second Seat{enter}Third Seat',
    );

    fireEvent.paste(screen.getByLabelText(/exported game log/i), {
      clipboardData: {
        files: [pastedScreenshot],
        items: [
          {
            getAsFile: () => pastedScreenshot,
            kind: 'file',
            type: 'image/png',
          },
        ],
      },
    });

    expect(
      screen.getByText(
        /attached game result screenshot: pasted-scoreboard\.png/i,
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const submittedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0];

    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get('endgameScreenshot')).toBe(pastedScreenshot);
  });

  it('shows a friendlier message when a server action returns a masked production error', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockRejectedValue(
      new Error(
        'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.',
      ),
    );

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Second Seat',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    expect(
      await screen.findByText(
        /the import save failed on the server\. if this only happens in the deployed app, the web import server configuration may be incomplete\./i,
      ),
    ).toBeInTheDocument();
  });

  it('shows the message from a plain server error object instead of the generic fallback', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockRejectedValue({
      code: '42501',
      details: 'new row violates row-level security policy for table "game_log_imports"',
      hint: null,
      message: 'permission denied for table game_log_imports',
    });

    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-03',
        }}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars won by 6 points.',
    );
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Second Seat',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot or pdf$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    expect(
      await screen.findByText(
        /permission denied for table game_log_imports/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/unable to save this import draft right now\./i),
    ).not.toBeInTheDocument();
  });
});

describe('getImportErrorMessage', () => {
  it('maps the duplicate-game ON CONFLICT violation to a friendly message', () => {
    const error = new Error(
      'ON CONFLICT DO UPDATE command cannot affect row a second time Hint: Ensure that no rows proposed for insertion within the same command have duplicate constrained values. Code: 21000',
    );

    expect(getImportErrorMessage(error)).toBe('Cannot Upload a Game Twice');
  });

  it('maps a bare 21000 cardinality violation to the duplicate message', () => {
    expect(getImportErrorMessage(new Error('Something failed. Code: 21000'))).toBe(
      'Cannot Upload a Game Twice',
    );
  });

  it('maps the server duplicate-upload guard message through unchanged', () => {
    expect(getImportErrorMessage(new Error('Cannot Upload a Game Twice'))).toBe(
      'Cannot Upload a Game Twice',
    );
  });

  it('passes unrelated Error messages through unchanged', () => {
    expect(getImportErrorMessage(new Error('network unavailable'))).toBe(
      'network unavailable',
    );
  });

  it('falls back to the generic message for non-Error values', () => {
    expect(getImportErrorMessage(undefined)).toBe(
      'Unable to save this import draft right now.',
    );
  });
});
