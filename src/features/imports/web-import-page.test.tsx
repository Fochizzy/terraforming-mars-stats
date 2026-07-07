import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WebImportPage } from './web-import-page';

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
  groupResolution: {
    action: 'reuse' as const,
    groupName: 'Friday / Second',
    participantCount: 2,
    summary:
      'This import will reuse Friday / Second because its roster exactly matches an existing group.',
  },
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
      screen.getByLabelText(/endgame screenshot/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/board screenshots/i),
    ).toBeInTheDocument();
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
        onConfirmImportReview={vi.fn()}
      />,
    );

    const exportedGameLog = screen.getByLabelText(/exported game log/i);

    exportedGameLog.blur();
    expect(exportedGameLog).not.toHaveFocus();

    await user.click(screen.getByText(/exported game log feed/i));

    expect(exportedGameLog).toHaveFocus();
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
        onConfirmImportReview={onConfirmImportReview}
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
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Second Seat{enter}Third Seat',
    );

    const screenshot = new File(['evidence'], 'endgame.png', {
      type: 'image/png',
    });
    const boardOne = new File(['board-one'], 'board-1.png', {
      type: 'image/png',
    });
    const boardTwo = new File(['board-two'], 'board-2.png', {
      type: 'image/png',
    });

    await user.upload(screen.getByLabelText(/endgame screenshot/i), screenshot);
    await user.upload(screen.getByLabelText(/board screenshots/i), [
      boardOne,
      boardTwo,
    ]);
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));

    const submittedFormData = onAnalyzeImportEvidence.mock.calls[0]?.[0];

    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get('playedOn')).toBe('2026-07-04');
    expect(submittedFormData.get('mapId')).toBe('elysium');
    expect(submittedFormData.get('playerCount')).toBe('3');
    expect(submittedFormData.get('generationCount')).toBe('12');
    expect(submittedFormData.get('exportedGameLog')).toBe(
      'Friday Mars won by 6 points.',
    );
    expect(submittedFormData.get('participants')).toBe(
      ['Friday Mars', 'Second Seat', 'Third Seat'].join('\n'),
    );
    expect(submittedFormData.get('endgameScreenshot')).toBe(screenshot);
    expect(submittedFormData.getAll('boardScreenshots')).toEqual([
      boardOne,
      boardTwo,
    ]);

    expect(screen.getByText(/import evidence analyzed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/parsed 3 actionable log events and ignored 2 filler lines/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/friday mars: log and screenshot disagree on total/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /this import will reuse friday \/ second because its roster exactly matches an existing group\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Friday Mars: 62 total/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/match imported player friday mars/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /create player unknown friend/i }),
    ).not.toBeInTheDocument();
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

  it('does not offer inline player creation for unmatched import rows', async () => {
    const user = userEvent.setup();
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
        onConfirmImportReview={vi.fn()}
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
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    expect(
      screen.queryByRole('button', { name: /create player unknown friend/i }),
    ).not.toBeInTheDocument();
  });

  it('clears the review when analyzed import inputs change before confirmation', async () => {
    const user = userEvent.setup();
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
        onConfirmImportReview={vi.fn()}
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
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    expect(
      await screen.findByRole('button', { name: /confirm import draft/i }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/map/i), 'elysium');

    expect(
      screen.queryByRole('button', { name: /confirm import draft/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /this import will reuse friday \/ second because its roster exactly matches an existing group\./i,
      ),
    ).not.toBeInTheDocument();
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
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Commercial District.',
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

  it('targets a known award winner instead of the funder for award manual-review jumps', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review: {
        ...review,
        boardReviewItems: [
          {
            awardName: 'Cultivator',
            firstPlacePlayerNames: ['Corey'],
            fundedByPlayerName: 'Friday Mars',
            itemType: 'award' as const,
            mapId: 'hellas' as const,
            notes: ['Cultivator still needs winner confirmation before final scoring.'],
            sourceType: 'log' as const,
            status: 'review_needed' as const,
          },
        ],
        playerLinks: [
          {
            candidates: [
              {
                displayName: 'Corey',
                gamesPlayed: 6,
                id: 'player-corey',
                linkedFullName: 'Corey',
                linkedUsername: 'corey',
                matchReason: 'display_name_exact' as const,
                matchScore: 400,
              },
            ],
            importedName: 'Corey',
            requiresConfirmation: false,
            selectedPlayerId: 'player-corey',
            status: 'exact' as const,
          },
        ],
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
          mapId: 'hellas',
          playedOn: '2026-07-03',
          playerCount: 4,
        }}
        mapOptions={[
          { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
          { code: 'hellas', id: 'hellas', name: 'Hellas' },
        ]}
        onAnalyzeImportEvidence={onAnalyzeImportEvidence}
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars funded Cultivator.',
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    expect(
      await screen.findByRole('button', {
        name: /fill manually cultivator for corey/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /fill manually cultivator for corey/i,
      }),
    );
    await user.click(
      screen.getByRole('button', { name: /confirm import draft/i }),
    );

    await waitFor(() => expect(onConfirmImportReview).toHaveBeenCalledTimes(1));

    expect(onConfirmImportReview.mock.calls[0]?.[1]).toEqual({
      itemLabel: 'Cultivator',
      message: 'Cultivator still needs winner confirmation before final scoring.',
      playerId: 'player-corey',
      playerName: 'Corey',
      scoreField: 'awardPoints',
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
        onConfirmImportReview={onConfirmImportReview}
      />,
    );

    await user.type(
      screen.getByLabelText(/exported game log/i),
      'Friday Mars played Earth Catapult.',
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
      screen.getByText(/attached screenshot: pasted-scoreboard\.png/i),
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
