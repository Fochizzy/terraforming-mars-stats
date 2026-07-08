import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebImportPage } from './web-import-page';

const browserOcrMocks = vi.hoisted(() => ({
  readGameResultEndgameLinesInBrowser: vi.fn(),
}));

vi.mock('@/lib/imports/read-endgame-screenshot-browser', () => ({
  readGameResultEndgameLinesInBrowser:
    browserOcrMocks.readGameResultEndgameLinesInBrowser,
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
    browserOcrMocks.readGameResultEndgameLinesInBrowser.mockReset();
    browserOcrMocks.readGameResultEndgameLinesInBrowser.mockResolvedValue([]);
  });

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
      screen.getByLabelText(/^game result screenshot$/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/single upload mode/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /only one image is needed here\. board screenshots are no longer part of this import flow\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^board screenshots$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^map$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/generation count/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /save import draft/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    ).toBeInTheDocument();
  });

  it('focuses the exported game log textarea when the game log panel is clicked', async () => {
    const user = userEvent.setup();

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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.clear(screen.getByLabelText(/played on/i));
    await user.type(screen.getByLabelText(/played on/i), '2026-07-04');
    await user.selectOptions(screen.getByLabelText(/^map$/i), 'elysium');
    await user.selectOptions(screen.getByLabelText(/player count/i), '3');
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
    const clientEndgameLines = [
      'Victory points breakdown after 12 generations',
      'Friday Mars 18 5 2 0 0 1 26 8',
    ];

    browserOcrMocks.readGameResultEndgameLinesInBrowser.mockResolvedValue(
      clientEndgameLines,
    );

    await user.upload(
      screen.getByLabelText(/^game result screenshot$/i),
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
    expect(submittedFormData.get('mapId')).toBe('elysium');
    expect(submittedFormData.get('generationCount')).toBeNull();
    expect(submittedFormData.get('exportedGameLog')).toBe(
      'Friday Mars won by 6 points.',
    );
    expect(submittedFormData.get('participants')).toBe(
      ['Friday Mars', 'Second Seat', 'Third Seat'].join('\n'),
    );
    expect(submittedFormData.get('endgameScreenshot')).toBe(screenshot);
    expect(submittedFormData.getAll('boardScreenshots')).toEqual([]);
    expect(
      browserOcrMocks.readGameResultEndgameLinesInBrowser,
    ).toHaveBeenCalledWith(screenshot);
    expect(JSON.parse(String(submittedFormData.get('clientEndgameLines')))).toEqual(
      clientEndgameLines,
    );

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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
      screen.getByLabelText(/^game result screenshot$/i),
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
      screen.getByLabelText(/^game result screenshot$/i),
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
      expect(onCreateImportPlayer).toHaveBeenCalledWith('Unknown Friend'),
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
      screen.getByLabelText(/^game result screenshot$/i),
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
      screen.getByLabelText(/^game result screenshot$/i),
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

  it('auto-fills player count from the larger of detected log names and screenshot rows after analysis', async () => {
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
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onCreateImportPlayer={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Earth Catapult.',
    );
    await user.upload(
      screen.getByLabelText(/^game result screenshot$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(screen.getByLabelText(/player count/i)).toHaveValue('3'),
    );
  });

  it('lets the user override the auto-filled player count before confirming the import draft', async () => {
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
      screen.getByLabelText(/^game result screenshot$/i),
      new File(['board'], 'board.png', { type: 'image/png' }),
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    const confirmButton = await screen.findByRole('button', {
      name: /confirm import draft/i,
    });

    await waitFor(() =>
      expect(screen.getByLabelText(/player count/i)).toHaveValue('3'),
    );

    await user.selectOptions(screen.getByLabelText(/player count/i), '2');
    expect(screen.getByLabelText(/player count/i)).toHaveValue('2');

    await user.click(confirmButton);

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    const submittedFormData = onConfirmImportReview.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get('playerCount')).toBe('2');
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
      screen.getByLabelText(/^game result screenshot$/i),
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
          generationCount: 10,
          mapId: 'tharsis',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'elysium', id: 'elysium', name: 'Elysium' },
        ]}
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
      screen.getByLabelText(/^game result screenshot$/i),
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
