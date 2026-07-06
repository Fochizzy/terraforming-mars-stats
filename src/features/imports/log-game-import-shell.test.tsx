import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readImportReviewJumpState } from '@/lib/imports/import-review-jump-state';
import { LogGameImportShell } from './log-game-import-shell';

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}));

describe('LogGameImportShell', () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    window.sessionStorage.clear();
  });

  it('stores the selected manual-review jump target after a successful draft creation and then routes into the shared log-game flow', async () => {
    const user = userEvent.setup();
    const screenshotFile = new File(['evidence'], 'endgame.png', {
      type: 'image/png',
    });
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Import evidence analyzed.',
      review: {
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
        drawInfoLineCount: 1,
        ignoredLineCount: 2,
        parsedEventCount: 3,
        playerLinks: [
          {
            candidates: [
              {
                displayName: 'Friday Mars',
                gamesPlayed: 8,
                id: 'player-1',
                linkedFullName: 'Friday Mars',
                linkedUsername: 'friday-mars',
                matchReason: 'display_name_exact' as const,
                matchScore: 400,
              },
              {
                displayName: 'Second Seat',
                gamesPlayed: 3,
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
        ],
        requiresPlayerConfirmation: false,
        scoreCandidates: [
          { playerName: 'Friday Mars', totalPoints: 62, trPoints: 18 },
        ],
      },
    });
    const onCreateImportDraft = vi.fn().mockResolvedValue({
      status: 'success' as const,
      gameId: 'game-1',
      message: 'Import draft saved.',
    });

    render(
      <LogGameImportShell
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
    await user.type(
      screen.getByLabelText(/participants/i),
      'Friday Mars{enter}Second Seat{enter}Third Seat',
    );
    await user.upload(
      screen.getByLabelText(/endgame screenshot/i),
      screenshotFile,
    );
    await user.click(
      screen.getByRole('button', { name: /analyze import evidence/i }),
    );

    await waitFor(() => expect(onAnalyzeImportEvidence).toHaveBeenCalledTimes(1));
    expect(onCreateImportDraft).not.toHaveBeenCalled();

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
    expect(submittedFormData.get('endgameScreenshot')).toBe(screenshotFile);
    expect(
      screen.getByText(/parsed 3 actionable log events and ignored 2 filler lines/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /fill manually commercial district for friday mars/i,
      }),
    );
    await user.click(screen.getByRole('button', { name: /confirm import draft/i }));

    await waitFor(() => expect(onCreateImportDraft).toHaveBeenCalledTimes(1));

    const confirmedFormData = onCreateImportDraft.mock.calls[0]?.[0] as FormData;
    expect(JSON.parse(String(confirmedFormData.get('confirmedPlayerLinks')))).toEqual([
      { importedName: 'Friday Mars', playerId: 'player-1' },
    ]);
    expect(readImportReviewJumpState('game-1')).toEqual({
      gameId: 'game-1',
      itemLabel: 'Commercial District',
      message:
        'The city placement from Commercial District could not be linked safely from the imported log.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });

    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith('/log-game?gameId=game-1'),
    );
  });

  it('shows an error message and does not route when import persistence fails', async () => {
    const user = userEvent.setup();
    const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
      status: 'success' as const,
      review: {
        drawInfoLineCount: 0,
        ignoredLineCount: 0,
        parsedEventCount: 0,
        playerLinks: [
          {
            candidates: [
              {
                displayName: 'Friday Mars',
                gamesPlayed: 8,
                id: 'player-1',
                linkedFullName: 'Friday Mars',
                linkedUsername: 'friday-mars',
                matchReason: 'display_name_exact' as const,
                matchScore: 400,
              },
            ],
            importedName: 'Friday Mars',
            requiresConfirmation: false,
            selectedPlayerId: 'player-1',
            status: 'exact' as const,
          },
        ],
        requiresPlayerConfirmation: false,
        scoreCandidates: [],
      },
    });
    const onCreateImportDraft = vi
      .fn()
      .mockRejectedValue(new Error('Storage upload failed.'));

    render(
      <LogGameImportShell
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
        onCreateImportDraft={onCreateImportDraft}
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
    await user.click(screen.getByRole('button', { name: /confirm import draft/i }));

    await waitFor(() =>
      expect(screen.getByText(/storage upload failed/i)).toBeInTheDocument(),
    );
    expect(readImportReviewJumpState('game-1')).toBeNull();
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });
});
